import {defineConfig,passthroughImageService} from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import math from 'remark-math';
import katex from 'rehype-katex';
import {prepareMaterials} from './scripts/import-materials.mjs';

const base = (process.env.STUDYLAB_BASE || '/').replace(/\/$/, '');
const report=prepareMaterials();
console.log('StudyLab · '+report.mode+' · '+report.markdown+' 份 Markdown · '+report.questions+' 道题');

function studyMarkdown(){
  return tree=>{
    for(const node of tree.children){
      const first=node.children?.[0];
      if(node.type==='paragraph' && node.children.length===1 && first.type==='inlineMath'){
        Object.assign(node,{type:'math',value:first.value,data:{hName:'pre',hChildren:[{type:'element',tagName:'code',properties:{className:['language-math','math-display']},children:[{type:'text',value:first.value}]}]}});
      }
    }
    function links(node){
      if(node.type==='link' && /^\/(?!\/)/.test(node.url)) node.url=base+node.url;
      node.children?.forEach(links);
    }
    links(tree);
  };
}
function sections(){
  return tree=>{
    const result=[];
    let hint;
    let solution;
    let nested;
    for(const node of tree.children){
      const title=node.children?.[0]?.value || '';
      if(node.tagName==='h2'){
        hint=undefined;
        if(title==='提示'&&!solution){
          hint={type:'element',tagName:'details',properties:{className:['hint']},children:[{...node,tagName:'summary'}]};
          result.push(hint);
          continue;
        }
      }
      if(node.tagName==='h2' && title==='展开推导与答案'){
        solution={type:'element',tagName:'details',properties:{className:['solution']},children:[{...node,tagName:'summary'}]};
        result.push(solution);
        continue;
      }
      if(solution && (node.tagName==='h2' || node.tagName==='h3') && /^(?:详细推导|标准答案|填空答案|易错点|解析|解法|结果|步骤)/.test(title)){
        nested={type:'element',tagName:'details',properties:{},children:[{...node,tagName:'summary'}]};
        solution.children.push(nested);
        continue;
      }
      (nested?.children || solution?.children || hint?.children || result).push(node);
    }
    tree.children=result;
  };
}
export default defineConfig({
  base:base||'/',trailingSlash:'always',image:{service:passthroughImageService()},
  integrations:[mdx(),react()],markdown:{remarkPlugins:[math,studyMarkdown],rehypePlugins:[katex,sections]},
  devToolbar:{enabled:false}
});
