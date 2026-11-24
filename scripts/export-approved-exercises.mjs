import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {prepareMaterials} from './import-materials.mjs';

// Run locally after confirming the publication scope. The Pages build only
// reads the reviewed text snapshot. It never reads from materials.
if(process.env.STUDYLAB_PUBLIC==='1')throw Error('请在本地课程模式下导出已授权的题目');
prepareMaterials();
const cache='.study-cache';
const entries=JSON.parse(readFileSync(cache+'/index.json','utf8'));
const questions=entries.filter(entry=>entry.kind==='problem'&&entry.course==='solid-state-physics'&&
  /^(?:ssp-\d{3}|question-[a-f0-9]{12}|review-[qc]\d{2}[a-z]?)$/.test(entry.id));

const groups=[
  ['review-',69,'固体物理总复习习题指导'],
  ['question-',59,'固体物理章节习题'],
  ['ssp-',5,'固体物理专项作业'],
];
if(questions.length!==133||groups.some(([prefix,count])=>questions.filter(question=>question.id.startsWith(prefix)).length!==count)){
  throw Error('本地题库已超出已确认的 133 道题范围，请核对发布清单');
}

const allowedIds=new Set([
  ...questions.map(entry=>entry.id),
  ...entries.filter(entry=>entry.kind==='chapter'&&entry.course==='solid-state-physics').map(entry=>entry.id),
]);
let omittedImages=0;
const snapshot=questions.map(({id,title,chapter,type})=>{
  const markdown=readFileSync(cache+'/'+id+'.md','utf8').replace(/\r\n/g,'\n');
  const body=markdown.replace(/^---\n[\s\S]*?\n---\n/,'').trim()
    .replace(/^\s*!\[[^\]\n]*\]\((?:<[^>\n]+>|[^)\n]*)\)\s*$/gm,()=>{
      omittedImages++;
      return '\n';
    })
    .replace(/^## 我的学习心得\s*\n[\s\S]*?(?=^## |(?![\s\S]))/gm,'')
    .replace(/^## 交互实验\s*\n[\s\S]*?(?=^## |(?![\s\S]))/gm,'')
    .replace(/\[([^\]\n]+)\]\(\/study\/([\w-]+)\/([^\s)]*)\)/g,(match,label,target)=>allowedIds.has(target)?match:label)
    .replace(/\n{3,}/g,'\n\n');
  if(/!\[|<img\b|<svg\b|我的学习心得|homework\/|assets\/questions\//i.test(body)){
    throw Error('导出文字出现图像、本地路径或心得段落 '+id);
  }
  const source=groups.find(([prefix])=>id.startsWith(prefix))[2];
  return {id,title,chapter,type,source,body};
});
if(omittedImages!==5)throw Error('原题截图排除数量与授权范围不符，实际为 '+omittedImages);
mkdirSync('published',{recursive:true});
writeFileSync('published/solid-state-exercises.json','[\n'+snapshot.map(entry=>'  '+JSON.stringify(entry)).join(',\n')+'\n]\n');
console.log('导出 '+snapshot.length+' 道已授权习题文字，排除 '+omittedImages+' 张截图和个人心得段落。');
