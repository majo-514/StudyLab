import {useEffect,useState} from 'react';
import {blank,read,statuses,update,type Item,type Status} from '../lib/learning';

export default function Notes({id,problem=false}:{id:string;problem?:boolean}){
  const [item,setItem]=useState<Item>(blank);
  const [note,setNote]=useState('');
  const [message,say]=useState('');
  function attempt(action:()=>void){ try{action()}catch(error){say('学习记录操作失败，'+String(error))} }
  useEffect(()=>{
    attempt(()=>{
      const previous=read()[id]??blank;
      setNote(previous.note);
      setItem(previous);
      update(id,{visited:new Date().toISOString()});
    });
  },[id]);

  return <section id="notes" className="panel">
    <h2>学习记录</h2>
    <div className="controls">
      <label>掌握程度 <select value={item.status} onChange={event=>attempt(()=>setItem(update(id,{status:event.target.value as Status})))}>
        {Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select></label>
      <label><input type="checkbox" checked={!!item.bookmark} onChange={event=>attempt(()=>setItem(update(id,{bookmark:event.target.checked})))}/> 书签</label>
      {problem&&<>
        <label><input type="checkbox" checked={!!item.favorite} onChange={event=>attempt(()=>setItem(update(id,{favorite:event.target.checked})))}/> 收藏</label>
        <label><input type="checkbox" checked={!!item.wrong} onChange={event=>attempt(()=>setItem(update(id,{wrong:event.target.checked})))}/> 加入错题本</label>
      </>}
    </div>
    <label>个人笔记<textarea value={note} onChange={event=>{setNote(event.target.value);say('笔记尚未保存')}}/></label>
    <button onClick={()=>attempt(()=>{setItem(update(id,{note}));say('笔记已保存在当前浏览器')})}>保存笔记</button>
    <p role="status">{message}</p>
  </section>;
}
