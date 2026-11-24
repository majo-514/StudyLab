import {useState} from 'react';
import {limit,series} from '../lib/madelung';
export default function Lab(){
  const [length,setLength]=useState(8);
  const [distance,setDistance]=useState(1);
  const rows=series(length), last=rows[length-1];
  const selected=rows[Math.min(distance,length)-1];
  const x=(n:number)=>32+(n-1)*480/Math.max(1,length-1);
  const y=(sum:number)=>132-(sum-1)*108;
  const radius=Math.min(4,length);
  const sites=[...new Set([-selected.n,...Array.from({length:2*radius+1},(_,i)=>i-radius),selected.n])].sort((a,b)=>a-b);
  return <section className="panel" id="madelung-1d"><small>晶体结合 · 数值实验</small><h2>一维离子链的级数收敛</h2>
    <label>每侧近邻数 L = {length}<input type="range" min="1" max="200" value={length} onChange={e=>{setLength(+e.target.value);setDistance(Math.min(distance,+e.target.value))}}/></label>
    <label>观察距离 <select value={selected.n} onChange={e=>setDistance(+e.target.value)}>{rows.map(p=><option key={p.n} value={p.n}>{p.n} R₀</option>)}</select></label> <button onClick={()=>{setLength(8);setDistance(1)}}>重置</button>
    <p>局部离子位置（单位 R₀，中心为 0，框选左右近邻）</p>
    <div className="ions">{sites.map(j=><span key={j} className={Math.abs(j)===selected.n?'chosen':''}>{j%2?'−':'+'}<small>{j}</small></span>)}</div>
    <p>第 {selected.n} 对离子贡献 {selected.term.toFixed(6)}。中心离子相互作用能以 e²/(4πε₀R₀) 为单位，取部分和的负值。</p>
    <svg viewBox="0 0 550 165" role="img" aria-label="部分和随近邻数变化，奇数为圆点，偶数为方点，虚线为理论极限" fill="currentColor">
    <text x="3" y="27">2</text><text x="3" y="135">1</text><path d="M25 18 V139 H520" fill="none" stroke="currentColor"/>
    <path d={'M25 '+y(limit)+' H520'} stroke="currentColor" strokeDasharray="5 4"/>
    <polyline points={rows.map(p=>x(p.n)+','+y(p.sum)).join(' ')} fill="none" stroke="currentColor"/>
    {rows.map(p=>p.n%2?<circle key={p.n} cx={x(p.n)} cy={y(p.sum)} r="2.8"/>:<rect key={p.n} x={x(p.n)-2} y={y(p.sum)-2} width="4" height="4"/>)}<text x="25" y="160">1</text><text x="470" y="160">L = {length}</text></svg>
    <p>部分和（无量纲） <b>{last.sum.toFixed(8)}</b> · 极限 2 ln 2 = {limit.toFixed(8)}（虚线）</p><p>绝对误差 {last.error.toFixed(8)} ≤ 上界 {last.bound.toFixed(8)}</p>
    <details><summary>逐项计算（{length} 步）</summary><ol>{rows.map(p=><li key={p.n}>加上 {p.term.toFixed(6)}，部分和 {p.sum.toFixed(6)}</li>)}</ol></details></section>
}
