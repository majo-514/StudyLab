import {useEffect,useRef,useState} from 'react';
import {encode,hasEdits,mergeNew,parse,read,save,statuses,type Records} from '../lib/learning';
type Link={id:string;title:string;url:string;kind:string;chapter:string|null;type?:string;search?:string};
type Mode='home'|'practice'|'records'|'search';
export default function Library({mode,entries,chapters,indexUrl}:{mode:Mode;entries:Link[];chapters:{id:string;title:string}[];indexUrl?:string}){
  const [items,setItems]=useState<Records>({});
  const [message,say]=useState('');
  const [preview,setPreview]=useState<Records|null>(null);
  const [chapter,setChapter]=useState('');
  const [type,setType]=useState('');
  const [status,setStatus]=useState('');
  const [subset,setSubset]=useState('');
  const [query,setQuery]=useState('');
  const [index,setIndex]=useState<Link[]>([]);
  const [loaded,setLoaded]=useState(false);
  const request=useRef(0);
  function attempt(action:()=>void){try{action()}catch(error){say('操作失败，'+String(error))}}
  useEffect(()=>{
    attempt(()=>setItems(read()));
    const view=new URLSearchParams(location.search).get('view');
    if(view) setSubset(view);
    if(indexUrl) fetch(indexUrl).then(response=>{
      if(!response.ok) throw Error('搜索索引暂不可用');
      return response.json() as Promise<Link[]>;
    }).then(setIndex).catch(error=>say(String(error))).finally(()=>setLoaded(true));
  },[indexUrl]);

  const filtered=entries.filter(entry=>(!chapter||entry.chapter===chapter) && (!type||entry.type===type)
    && (!status||(items[entry.id]?.status??'new')===status)
    && (!subset||(subset==='notes'?!!items[entry.id]?.note:subset==='wrong'?!!items[entry.id]?.wrong:subset==='favorite'?!!items[entry.id]?.favorite:!!items[entry.id]?.bookmark)));
  const recent=entries.filter(entry=>items[entry.id]?.visited)
    .sort((a,b)=>(items[b.id].visited??'').localeCompare(items[a.id].visited??'')).slice(0,5);
  const mastered=chapters.filter(entry=>items[entry.id]?.status==='mastered').length;
  const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches=words.length?index.filter(entry=>words.every(word=>(entry.title+' '+(entry.search??'')).toLowerCase().includes(word))):[];
  const types=[...new Set(entries.map(entry=>entry.type).filter(Boolean))];
  const render=(list:Link[])=><ul className="row-list">{list.map(entry=><li key={entry.id}>
    <a href={entry.url}>{entry.title}</a>
    {mode!=='search'&&<small>　{statuses[items[entry.id]?.status??'new']}</small>}
    {mode==='records'&&items[entry.id]?.note&&<p style={{whiteSpace:'pre-wrap'}}>{items[entry.id].note}</p>}
  </li>)}</ul>;

  if(mode==='home')return <section className="panel"><h2>学习进度</h2>
    <p>已掌握 {mastered} / {chapters.length} 章</p><progress max={chapters.length||1} value={mastered} aria-label="已掌握章节"/>
    <h3>最近学习</h3>{recent.length?render(recent):<p>打开一个学习条目后，访问记录会显示在这里。</p>}
    <p role="status">{message}</p>
  </section>;
  if(mode==='search')return <section>
    <label>搜索课程、知识点或题目<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    {query.trim()&&<p role="status">{loaded?'找到 '+matches.length+' 条'+(matches.length>80?'，显示前 80 条':''):'加载中'}</p>}
    {render(matches.slice(0,80))}<p role="status">{message}</p>
  </section>;
  if(mode==='practice')return <section>
    <div className="controls">
      <label>章节 <select value={chapter} onChange={event=>setChapter(event.target.value)}><option value="">全部</option>{chapters.map(ch=><option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label>
      <label>题型 <select value={type} onChange={event=>setType(event.target.value)}><option value="">全部</option>{types.map(t=><option key={t}>{t}</option>)}</select></label>
      <label>掌握程度 <select value={status} onChange={event=>setStatus(event.target.value)}><option value="">全部</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>范围 <select value={subset} onChange={event=>setSubset(event.target.value)}><option value="">全部</option><option value="wrong">错题</option><option value="favorite">收藏</option></select></label>
      <button disabled={!filtered.length} onClick={()=>location.assign(filtered[Math.floor(Math.random()*filtered.length)].url)}>从结果随机抽题</button>
    </div>
    <p role="status">共 {filtered.length} 道题　{message}</p>{render(filtered)}
  </section>;
  return <section>
    <label>记录类型 <select value={subset} onChange={event=>setSubset(event.target.value)}>
      <option value="">全部有记录的条目</option><option value="notes">个人笔记</option><option value="wrong">错题</option><option value="favorite">收藏</option><option value="bookmark">书签</option>
    </select></label>
    {render(filtered.filter(entry=>Object.hasOwn(items,entry.id)))}
    <section className="panel"><h2>备份与恢复</h2>
      <p>记录保存在当前站点地址对应的浏览器存储中。备份可能含私人笔记，请单独保存。</p>
      <button onClick={()=>attempt(()=>{
        const link=document.createElement('a');
        link.href=URL.createObjectURL(new Blob([encode(read())],{type:'application/json'}));
        link.download='study-lab-backup.json';
        link.click();
        setTimeout(()=>URL.revokeObjectURL(link.href),1000);
      })}>导出 JSON</button>
      <label>选择 JSON 备份 <input type="file" accept=".json" onChange={async event=>{
        const ticket=++request.current;
        const file=event.target.files?.[0];
        setPreview(null);
        say('');
        if(!file)return;
        try {
          const incoming=parse(await file.text());
          if(ticket!==request.current)return;
          const existing=read();
          const keys=Object.keys(incoming);
          const conflicts=keys.filter(id=>hasEdits(existing[id])).length;
          const available=new Set(entries.map(entry=>entry.id));
          const unknown=keys.filter(id=>!available.has(id)).length;
          say('预览 '+keys.length+' 条，'+conflicts+' 条已有记录保留当前版本，'+unknown+' 条暂时无法匹配课程的记录仍会保存在备份中。');
          setPreview(incoming);
        } catch(error){if(ticket===request.current)say('导入失败，'+String(error))}
      }}/></label>
      {preview&&<button onClick={()=>attempt(()=>{
        const merged=mergeNew(read(),preview);
        save(merged);setItems(merged);setPreview(null);say('合并完成，已有记录优先');
      })}>确认合并新增记录</button>}
      <p role="status">{message}</p>
    </section>
  </section>;
}
