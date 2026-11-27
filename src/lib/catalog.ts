import type { MarkdownInstance } from 'astro';
import courseConfig from '../../courses.json';
import input from '../../.study-cache/index.json';

export interface Lesson {
  id:string;
  title:string;
  course:string;
  chapter:string|null;
  kind:string;
  parent?:string;
  type?:string;
  source:string;
  search:string;
}
export const courses=courseConfig;
export const chapters=courses.flatMap(course=>course.chapters.map(([id,title])=>({id,title,course:course.id})));
export const lessons:Lesson[]=input;
export const pages=import.meta.glob<MarkdownInstance<Lesson>>('../../.study-cache/*.md',{eager:true});
export const markdown=(id:string)=>pages['../../.study-cache/'+id+'.md'];
export const url=(path='')=>import.meta.env.BASE_URL.replace(/\/$/,'')+'/'+path.replace(/^\//,'');
export function listItems(entries:Lesson[]){
  return entries.map(({id,title,chapter,kind,type})=>({
    id,title,chapter,kind,type,url:url('study/'+id+'/')
  }));
}
