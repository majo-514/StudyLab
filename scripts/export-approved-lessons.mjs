import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {prepareMaterials} from './import-materials.mjs';

// Publish a reviewed text snapshot of the course notes. Keep the source
// Markdown and course illustrations in the local materials directory.
if(process.env.STUDYLAB_PUBLIC==='1')throw Error('请在本地课程模式下导出讲义');
prepareMaterials();
const load=file=>JSON.parse(readFileSync(file,'utf8'));
const approved=new Set([
  'chapter-01-crystal-structure',
  'chapter-02-crystal-binding',
  'chapter-02-crystal-binding-exercise',
  'chapter-02-crystal-binding-formula',
  'chapter-03-lattice-vibrations',
  'chapter-03-lattice-vibrations-exercise',
  'chapter-03-lattice-vibrations-formula',
  'chapter-04-crystal-defects',
  'chapter-05-free-electron',
  'chapter-06-band-theory',
  'chapter-06-band-theory-exercise',
  'chapter-06-band-theory-formula',
  'solid-physics-final-review',
]);
const entries=load('.study-cache/index.json').filter(entry=>approved.has(entry.id)&&entry.course==='solid-state-physics'&&entry.kind!=='problem');
if(entries.length!==approved.size)throw Error('本地讲义与已确认的发布清单不符');
const questions=load('published/solid-state-exercises.json');
const allowedLinks=new Set([...approved,...questions.map(item=>item.id)]);
let omittedImages=0;
const snapshot=entries.map(({id,title,chapter,kind,source})=>{
  const markdown=readFileSync('.study-cache/'+id+'.md','utf8').replace(/\r\n/g,'\n');
  const body=markdown.replace(/^---\n[\s\S]*?\n---\n/,'').trim()
    .replace(/^[ \t]*!\[([^\]\n]*)\]\((?:<[^>\n]+>|[^)\n]*)\)[ \t]*$/gm,(_,caption)=>{
      omittedImages++;
      return '> '+caption+'（插图见本地资料）';
    })
    .replace(/\[([^\]\n]+)\]\(\/study\/([\w-]+)\/([^\s)]*)\)/g,(link,label,target)=>allowedLinks.has(target)?link:label);
  if(/!\[|<img\b|<svg\b|我的学习心得|homework\/|assets\/questions\//i.test(body)){
    throw Error('导出讲义包含未授权图像、私人笔记或本地路径 '+id);
  }
  return {id,title,chapter,kind,source,body};
});
if(omittedImages!==2)throw Error('讲义插图排除数量有变，请重新核对发布范围');
mkdirSync('published',{recursive:true});
writeFileSync('published/solid-state-lessons.json','[\n'+snapshot.map(entry=>'  '+JSON.stringify(entry)).join(',\n')+'\n]\n');
console.log('导出 '+snapshot.length+' 份讲义与复习资料文字，排除 '+omittedImages+' 张课件插图。');
