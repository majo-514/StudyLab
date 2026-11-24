import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const output=resolve('dist');
const base=(process.env.STUDYLAB_BASE||'').replace(/\/$/,'');
const publish=process.env.STUDYLAB_PUBLIC==='1';
const report=JSON.parse(readFileSync('.study-cache/import-report.json','utf8'));
const paths=readdirSync(output,{recursive:true}).filter(path=>path.endsWith('.html'));
const errors=[];
const seen=new Map();
for(const path of paths){
  const html=readFileSync(resolve(output,path),'utf8');
  seen.set(path,html);
  if(html.includes('katex-error')) errors.push(path+' contains a KaTeX error');
  if(publish && /原始题目|homework\/|课件勘误快速索引/.test(html))errors.push(path+' may contain local material');
  for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const value=match[1];
    if(!value.startsWith('/')||value.startsWith('//'))continue;
    const pathname=decodeURIComponent(value.split(/[?#]/)[0]);
    if(base&&!pathname.startsWith(base+'/')){
      errors.push(path+' escapes the project base '+value);continue;
    }
    const file=resolve(output,'.'+pathname.slice(base.length));
    const exists=existsSync(file)&&(statSync(file).isFile()||existsSync(resolve(file,'index.html')));
    if(!exists)errors.push(path+' → '+value);
  }
}
const search=JSON.parse(readFileSync(resolve(output,'search-index.json'),'utf8'));
if(publish&& (report.mode!=='public'||report.markdown!==0||report.images.length||search.some(item=>item.source)))errors.push('Public build contains unapproved materials');
const exercises=search.filter(item=>item.kind==='problem');
if(report.questions!==exercises.length)errors.push('Question count differs from the import report');
if(publish){
  for(const chapter of search.filter(item=>item.kind==='chapter')){
    if(!exercises.some(item=>item.chapter===chapter.id))errors.push(chapter.id+' missing a public exercise');
  }
  const practice=seen.get(relative(output,resolve(output,'practice/index.html')));
  if(!exercises.length||!exercises.every(item=>item.id.startsWith('public-')&&practice?.includes('href="'+item.url+'"'))){
    errors.push('Public practice list is empty, incomplete, or contains local coursework');
  }
}
for(const entry of exercises){
  const path=relative(output,resolve(output,'.'+entry.url.slice(base.length),'index.html'));
  const html=seen.get(path);
  if(!html?.includes('<details class="solution"'))errors.push(entry.id+' missing collapsed solution');
  if(entry.id.startsWith('public-')&&!html?.includes('<details class="hint"'))errors.push(entry.id+' missing collapsed hint');
}
if(!publish){
  if(report.markdown && ![...seen.values()].some(html=>html.includes('katex-display')))errors.push('No displayed mathematical formulas');
  const imageSources=new Set([...seen.values()].flatMap(html=>[...html.matchAll(/<img\s+[^>]*?src="([^"]+)"/g)].map(match=>match[1])));
  if(imageSources.size!==report.images.length)errors.push('Expected '+report.images.length+' imported images, found '+imageSources.size);
}
if(errors.length)throw Error(errors.slice(0,30).join('\n'));
console.log(paths.length+' 个页面通过路径、公式输出与'+(publish?'公开内容范围':'题解折叠')+'检查。');
