import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

const materialRoot = resolve('materials');
const root = resolve(materialRoot,'solid-state physics');
const output = resolve('.study-cache');
const courses = JSON.parse(readFileSync('courses.json', 'utf8'));
const chapters = courses.find(course=>course.id==='solid-state-physics').chapters;
const ignored = new Set(['node_modules', '.git', '.astro', 'dist']);
const original = 'homework/content/';
const review = 'review/固体物理_总复习习题指导.md';
const chapter1 = 'chapter01/第一章_晶体结构与倒空间_原课件完整整合版.md';
const documents = {
  [chapter1]: [0,'chapter'],
  'chapter02/01-lecture.md': [1,'chapter'],
  'chapter02/02-exercises.md': [1,'exercise'],
  'chapter02/04-quick-review.md': [1,'formula'],
  'chapter03/03-lattice-vibrations.md': [2,'chapter'],
  'chapter03/03-exercises.md': [2,'exercise'],
  'chapter03/03-review-card.md': [2,'formula'],
  'chapter04/ch04-crystal-defects.md': [3,'chapter'],
  'chapter05/chapter05.md': [4,'chapter'],
  'chapter06/01_notes.md': [5,'chapter'],
  'chapter06/02_exercises.md': [5,'exercise'],
  'chapter06/03_review.md': [5,'formula'],
  [review]: [null,'review'],
};

function walk(directory) {
  return readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))
    .flatMap(entry => entry.isDirectory() && !ignored.has(entry.name) ? walk(join(directory,entry.name))
      : entry.isFile() ? [join(directory,entry.name)] : []);
}
function removeSection(text,start,end) {
  const begin=text.indexOf(start);
  const finish=text.indexOf(end,begin+1);
  if(begin<0 || finish<0) throw Error('源文件的开发说明边界已改变，请检查导入规则');
  return text.slice(0,begin)+text.slice(finish);
}
const digest = value => createHash('sha256').update(value).digest('hex');
const nameOf = path => relative(root,path).split(sep).join('/');
const idOf = (path,heading) => digest(path+'\n'+heading).slice(0,12);
const read = path => readFileSync(path,'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
const front = /^---\n([\s\S]*?)\n---\n/;
const headingPattern = /^(#{2,4}) (.+)$/gm;
const altTitle = /^# (.+)$/m;

function splitExercise(body, heading, type) {
  if(type==='简答') return { question:heading, hint:'', solution:body };
  const lines=body.trim().split('\n');
  if (/^(\*\*)?题\s*[目干]\s*[：:]/.test(lines[0]||'')) {
    const end=lines.findIndex(line=>!line.trim());
    const boundary=end<0 ? lines.length : end;
    const question=lines.slice(0,boundary).join('\n');
    const solution=lines.slice(boundary).join('\n').trim();
    if(solution) return {question,hint:'',solution};
  }
  const explicit = body.match(/^([\s\S]+?)\n(?:\n)?(?=(?:\*\*)?(?:解法[一二]|解答|解|方法|推导|答案|提示)[：:])/);
  if(explicit) return {question:explicit[1].trim(),hint:'',solution:body.slice(explicit[1].length).trim()};
  return {question:heading,hint:'',solution:body};
}

function exerciseHeading(file, header) {
  const {level,title,section}=header;
  if(level===3 && title.startsWith('简答：')) return true;
  if(file===review) return level===3 && /^[QC]\d{2}[A-Z]?\b/.test(title);
  if(file===chapter1) return level===3 && /^7\.[12]\b/.test(section) && /例题/.test(title);
  if(file.startsWith('chapter02/02-')) return (level===2 && /^例\d/.test(title)) || (level===3 && /^\d+\./.test(title));
  if(file.startsWith('chapter03/03-ex')) return level===2 && /^(例\d|补充作业)/.test(title);
  if(file.startsWith('chapter04/')) return level===3 && /^例\d/.test(title);
  if(file.startsWith('chapter05/')) return level===3 && /^课件例题/.test(title);
  if(file.startsWith('chapter06/02_')) return level===3 && /^[AB]\d+\b/.test(title);
  return false;
}

export function prepareMaterials() {
  mkdirSync(output,{recursive:true});
  const publish=process.env.STUDYLAB_PUBLIC==='1';
  const files=publish || !existsSync(root) ? [] : walk(root);
  const markdown=files.filter(path=>path.endsWith('.md'));
  const records=[];
  const manifest=[];
  const sourceIds=new Map();
  for(const path of markdown) {
    const source=nameOf(path);
    const raw=read(path);
    const classification=documents[source];
    if(!classification && !source.startsWith(original)) {
      manifest.push({source,status:'开发资料或模板',bytes:Buffer.byteLength(raw)});
      continue;
    }
    let body=raw.replace(front,'');
    if(source===chapter1) body=removeSection(body,'# 附录 A.','# 附录 B.');
    if(source===review) body=removeSection(body,'## 4. 网站整合规范','## 5. 原课件勘误');
    const existingId=raw.match(/^id: ([\w-]+)$/m)?.[1];
    const [chapterIndex,kind]=classification ?? [[1,1,2,3,3][Number(existingId?.slice(-1))-1] ?? null,existingId?.startsWith('ssp-')?'problem':'topic'];
    const chapter=chapters[chapterIndex]?.[0] ?? null;
    const id=existingId ?? (kind==='chapter' ? chapter : kind==='review' ? 'final-review' : chapter+'-'+kind);
    const course=existingId==='math-taylor' ? 'mathematics' : 'solid-state-physics';
    const title=body.match(altTitle)?.[1]??basename(path,'.md');
    body=body.replace(altTitle,'').trimStart();
    const entry={id,course,chapter,kind,title,source,path,body,search:body.replace(/<[^>]+>/g,' ').slice(0,150000)};
    records.push(entry);
    sourceIds.set(resolve(path),id);
    let questions=0;
    if(kind==='problem') {
      const question=body.match(/## 原始题目\n([\s\S]*?)(?=\n## )/)?.[1].trim() ?? title;
      entry.body='## 题目\n\n'+question+'\n\n## 展开推导与答案\n\n'+body.slice(body.indexOf(question)+question.length).trim();
      entry.type='专项';
      questions=1;
    } else {
      if(source.startsWith('chapter03/03-ex')||source.startsWith('chapter04/')){
        body=body.replace(/(^## (?:复习自测|课堂讨论题)[^\n]*\n+)((?:\d+\. [^\n]+\n?)+)/m,(_,header,list)=>{
          return header+list.trimEnd().split('\n').map(line=>{
            const [question,...answer]=line.replace(/^\d+\. /,'').split(/(?<=[？?])(?:答：)?/);
            return '### 简答：'+question+'\n\n'+answer.join('')+'\n\n';
          }).join('');
        });
      }
      entry.body=body;
      let section='';
      const headings=[...body.matchAll(headingPattern)].map(match=>{
        const level=match[1].length;
        if(level===2) section=match[2];
        return {level,title:match[2],section,start:match.index,end:match.index+match[0].length};
      });
      const replacements=[];
      headings.forEach((header,index)=>{
        if(!exerciseHeading(source,header)) return;
        const end=headings.slice(index+1).find(next=>next.level<=header.level)?.start??body.length;
        const exerciseId=header.title.match(/^[QC]\d{2}[A-Z]?\b/)?.[0].toLowerCase();
        const questionId=exerciseId ? 'review-'+exerciseId : 'question-'+idOf(source,header.title);
        const chapterNumber=header.title.match(/第([1-6])(?:、[1-6])?章/)?.[1];
        const type=/^Q|^\d+\.|简答|判断/.test(header.title)?'简答':'计算与推导';
        const {question,solution}=splitExercise(body.slice(header.end,end),header.title,type);
        records.push({...entry,id:questionId,title:header.title,kind:'problem',chapter:chapterNumber?chapters[Number(chapterNumber)-1][0]:chapter,type,parent:id,
          search:question+'\n'+solution,body:'## 题目\n\n'+question+'\n\n## 展开推导与答案\n\n'+solution});
        replacements.push({start:header.end,end,link:'\n\n[开始练习](/study/'+questionId+'/)\n\n'});
        questions++;
      });
      for(const item of replacements.reverse()) entry.body=entry.body.slice(0,item.start)+item.link+entry.body.slice(item.end);
    }
    manifest.push({source,status:'本地收录',id,questions,bytes:Buffer.byteLength(raw)});
  }
  if(!markdown.length){
    const examples=['crystal','binding','vibrations','defects','electron','bands'];
    chapters.forEach(([id,title],i)=>{
      const path=resolve('examples/'+examples[i]+'.md');
      const body=read(path).replace(altTitle,'').trimStart();
      records.push({id,title,course:'solid-state-physics',kind:'chapter',chapter:id,source:'',path,body,search:body});
    });
    const path=resolve('published/solid-state-exercises.json');
    const approved=JSON.parse(read(path));
    for(const exercise of approved){
      const {id,title,chapter,type,source,body}=exercise;
      if(typeof title!=='string' || typeof source!=='string' || !/^(?:ssp-\d{3}|question-[a-f0-9]{12}|review-[qc]\d{2}[a-z]?)$/.test(id) ||
        !chapters.some(([chapterId])=>chapterId===chapter) || !['计算与推导','简答','专项'].includes(type) ||
        typeof body!=='string' || !/^## 题目$/m.test(body) || !/^## 展开推导与答案$/m.test(body) ||
        /!\[|<img\b|<svg\b|我的学习心得|homework\/|assets\/questions\//i.test(body)){
        throw Error('已授权习题快照格式或发布范围不符 '+id);
      }
      records.push({id,title,chapter,type,source,kind:'problem',course:'solid-state-physics',path,body,search:body});
    }
  }
  const practiceDirectory=resolve('examples/exercises');
  const publicExercises=readdirSync(practiceDirectory).filter(name=>name.endsWith('.md')).sort();
  for(const file of publicExercises){
    const path=join(practiceDirectory,file);
    const raw=read(path);
    const metadata=raw.match(front)?.[1]??'';
    const chapter=metadata.match(/^chapter: ([a-z0-9-]+)$/m)?.[1];
    const type=metadata.match(/^type: (计算与推导|简答)$/m)?.[1];
    const text=raw.replace(front,'');
    const title=text.match(altTitle)?.[1];
    const body=text.replace(altTitle,'').trimStart();
    if(!chapters.some(([id])=>id===chapter)||!type||!title||!/^## 题目$/m.test(body)||!/^## 提示$/m.test(body)||!/^## 展开推导与答案$/m.test(body)){
      throw Error('原创练习缺少章节、题型、题干、提示或题解 '+file);
    }
    records.push({id:basename(file,'.md'),title,course:'solid-state-physics',chapter,kind:'problem',source:'StudyLab 原创练习',type,path,body,search:body});
  }
  if(!publish) for(const course of courses.filter(entry=>entry.id!=='solid-state-physics')){
    const directory=resolve(materialRoot,course.directory);
    if(relative(materialRoot,directory).startsWith('..'))throw Error('课程路径须位于 materials 中');
    if(!existsSync(directory))continue;
    for(const path of walk(directory).filter(file=>file.endsWith('.md'))){
      const raw=read(path);
      const metadata=raw.match(front)?.[1]??'';
      const field=key=>metadata.match(new RegExp('^'+key+': ([a-z0-9-]+)$','m'))?.[1];
      const source=relative(materialRoot,path).split(sep).join('/');
      const id=field('id');
      const chapter=field('chapter');
      if(!id){manifest.push({source,status:'未登记正文 ID',bytes:Buffer.byteLength(raw)});continue;}
      const section=course.chapters.find(([key])=>key===chapter);
      if(!section)throw Error('课程章节尚未注册 '+source);
      const kind=field('kind')??'topic';
      if(!['chapter','topic','formula','problem'].includes(kind))throw Error('课程文档类型无效 '+source);
      if(kind==='chapter'&&id!==chapter)throw Error('章首页 id 必须与章节 ID 一致 '+source);
      const text=raw.replace(front,'');
      const title=text.match(altTitle)?.[1]??basename(path,'.md');
      const body=text.replace(altTitle,'').trimStart();
      records.push({id,course:course.id,chapter,kind,title,source,path,body,search:body,...(kind==='problem'?{type:'专项'}:{})});
      sourceIds.set(resolve(path),id);
      manifest.push({source,status:'本地收录',id,questions:kind==='problem'?1:0,bytes:Buffer.byteLength(raw)});
    }
  }
  const assets=new Set();
  const ids=new Set();
  for(const record of records) {
    if(ids.has(record.id)) throw Error('重复的学习条目 ID '+record.id);
    ids.add(record.id);
    const links=/(!?)\[([^\]\n]*)\]\(([^()\n]+)\)/g;
    record.body=record.body.replace(links,(match,image,label,url)=>{
      if(/^(?:[a-z]+:|#|\/)/i.test(url))return match;
      const [target,fragment]=url.split('#');
      const resolved=resolve(dirname(record.path),target);
      const id=sourceIds.get(resolved);
      if(id) return '['+label+'](/study/'+id+'/'+(fragment?'#'+fragment:'')+')';
      if(image && existsSync(resolved) && !relative(materialRoot,resolved).startsWith('..')){
        assets.add(nameOf(resolved));
        return '!['+label+'](<'+relative(output,resolved).split(sep).join('/')+'>)';
      }
      throw Error('无法解析本地资料链接 '+record.source+' → '+url);
    });
    const {path,body,search,...metadata}=record;
    writeFileSync(join(output,record.id+'.md'),'---\n'+Object.entries(metadata).map(([key,value])=>key+': '+JSON.stringify(value)).join('\n')+'\n---\n\n'+body);
  }
  for(const entry of readdirSync(output)) if(entry.endsWith('.md')&&!ids.has(basename(entry,'.md'))) unlinkSync(join(output,entry));
  writeFileSync(join(output,'index.json'),JSON.stringify(records.map(({body,path,...entry})=>entry)));
  const audit={mode:publish?'public':'local',markdown:manifest.length,sources:manifest,images:[...assets],other:files.filter(path=>!path.endsWith('.md')).map(path=>({source:nameOf(path),status:assets.has(nameOf(path))?'本地引用':'保留原档'})),questions:records.filter(x=>x.kind==='problem').length};
  writeFileSync(join(output,'import-report.json'),JSON.stringify(audit,null,2));
  return audit;
}
