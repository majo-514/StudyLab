import {useEffect,useRef,useState} from 'react';
import {encode,hasEdits,mergeNew,parse,read,save,statuses,type Records} from '../lib/learning';
type Link={id:string;title:string;url:string;kind:string;chapter:string|null;type?:string};
type Mode='home'|'practice'|'records';
export default function Library({mode,entries,chapters}:{mode:Mode;entries:Link[];chapters:{id:string;title:string}[]}){
  const [items,setItems]=useState<Records>({});
  const [message,say]=useState('');
  const [preview,setPreview]=useState<Records|null>(null);
  const [chapter,setChapter]=useState('');
  const [type,setType]=useState('');
  const [status,setStatus]=useState('');
  const [subset,setSubset]=useState('');
  const request=useRef(0);
  function attempt(action:()=>void){try{action()}catch(error){say('操作失败，'+String(error))}}
  useEffect(()=>{
    attempt(()=>setItems(read()));
    const view=new URLSearchParams(location.search).get('view');
    if(view) setSubset(view);
  },[]);

  const filtered=entries.filter(entry=>(!chapter||entry.chapter===chapter) && (!type||entry.type===type)
    && (!status||(items[entry.id]?.status??'new')===status)
    && (!subset||(subset==='notes'?!!items[entry.id]?.note:subset==='wrong'?!!items[entry.id]?.wrong:subset==='favorite'?!!items[entry.id]?.favorite:!!items[entry.id]?.bookmark)));
  const recent=entries.filter(entry=>items[entry.id]?.visited)
    .sort((a,b)=>(items[b.id].visited??'').localeCompare(items[a.id].visited??'')).slice(0,5);
  const mastered=chapters.filter(entry=>items[entry.id]?.status==='mastered').length;
  const types=[...new Set(entries.map(entry=>entry.type).filter(Boolean))];
  const render=(list:Link[])=><ul className="row-list">{list.map(entry=><li key={entry.id}>
    <a href={entry.url}>{entry.title}</a>
    <small>　{statuses[items[entry.id]?.status??'new']}</small>
    {mode==='records'&&items[entry.id]?.note&&<p style={{whiteSpace:'pre-wrap'}}>{items[entry.id].note}</p>}
  </li>)}</ul>;

  if(mode==='home')return <section className="panel"><h2>学习进度</h2>
    <p>已掌握 {mastered} / {chapters.length} 章</p><progress max={chapters.length||1} value={mastered} aria-label="已掌握章节"/>
    <h3>最近学习</h3>{recent.length?render(recent):<p>打开一个学习条目后，访问记录会显示在这里。</p>}
    <p role="status">{message}</p>
  </section>;
  if(mode==='practice')return <section>
    <div className="controls">
      <label>章节 <select value={chapter} onChange={event=>setChapter(event.target.value)}><option value="">全部</option>{chapters.map(ch=><option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label>
      <label>题型 <select value={type} onChange={event=>setType(event.target.value)}><option value="">全部</option>{types.map(t=><option key={t}>{t}</option>)}</select></label>
      <label>掌握程度 <select value={status} onChange={event=>setStatus(event.target.value)}><option value="">全部</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>范围 <select value={subset} onChange={event=>setSubset(event.target.value)}><option value="">全部</option><option value="wrong">错题</option><option value="favorite">收藏</option></select></label>
      <button disabled={!filtered.length} onClick={()=>location.assign(filtered[Math.floor(Math.random()*filtered.length)].url)}>从结果随机抽题</button>
    </div>
    <p role="status">共 {filtered.length} 道题　{message}</p>
    {filtered.length>0?render(filtered):<p>{subset==='wrong'?'当前筛选范围内没有错题。可在习题页将题目加入错题本。':'当前筛选条件下没有题目。可调整章节、题型或范围。'}</p>}
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
