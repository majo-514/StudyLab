export const statuses={new:'未学习',learning:'学习中',review:'待复习',mastered:'已掌握'} as const;
export type Status=keyof typeof statuses;
export interface Item {
  note:string;
  status:Status;
  wrong?:boolean;
  favorite?:boolean;
  bookmark?:boolean;
  visited?:string;
}
export type Records=Record<string,Item>;
export const blank:Item={note:'',status:'new'};
const key='study-lab.records.v1';
export function encode(items:Records){ return JSON.stringify({schemaVersion:1,items},null,2) }
export function parse(raw:string):Records{
  const data=JSON.parse(raw);
  if(data?.schemaVersion!==1 || !data.items || typeof data.items!=='object' || Array.isArray(data.items)){
    throw Error('备份结构或版本无效');
  }
  for(const [id,value] of Object.entries(data.items)){
    const item=value as Item;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || ['constructor','prototype'].includes(id)
      || typeof item?.note!=='string' || !Object.hasOwn(statuses,item.status)
      || [item.favorite,item.wrong,item.bookmark].some(flag=>flag!==undefined&&typeof flag!=='boolean')
      || (item.visited!==undefined && (typeof item.visited!=='string'||!Number.isFinite(Date.parse(item.visited))))){
      throw Error('记录格式无效（'+id+'）');
    }
  }
  return data.items;
}
export function read():Records { return parse(localStorage.getItem(key)??encode({})) }
export function save(items:Records){ localStorage.setItem(key,encode(items)) }
export function update(id:string,changes:Partial<Item>){
  const items=read();
  const item={...(items[id]??blank),...changes};
  save({...items,[id]:item});
  return item;
}
export function hasEdits(item:Item|undefined){
  return !!item && (item.note!=='' || item.status!=='new' || item.favorite!==undefined || item.bookmark!==undefined || item.wrong!==undefined);
}
export function mergeNew(existing:Records,incoming:Records):Records {
  const merged={...existing};
  for(const [id,item] of Object.entries(incoming)){
    const current=existing[id];
    if(!hasEdits(current)) merged[id]={...item,visited:current?.visited??item.visited};
  }
  return merged;
}
