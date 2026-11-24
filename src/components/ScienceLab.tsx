import {useEffect,useRef,useState} from 'react';
import {registry} from '../lib/labs';
import {brillouinZone,displacement,evjen,reciprocal2D,spectrum} from '../lib/physics';

type Point=[number,number,number];
const colors=['var(--accent)','#ca6a34','#7164c4','#a77719'];
function Crystal({values}:{values:number[]}){
  const [type,turn,tilt]=values.map((value,i)=>i?value*Math.PI/180:value);
  const cube:Point[]=Array.from({length:8},(_,i)=>[(i&1)-.5,((i>>1)&1)-.5,((i>>2)&1)-.5]);
  const hex:Point[]=Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/3),Math.sin(i*Math.PI/3),(i<6?-1:1)*Math.sqrt(8/3)/2]);
  const vertices=type===3?hex:cube;
  const extra:Point[]=type===1?[[0,0,0]]:type===2?[[.5,0,0],[-.5,0,0],[0,.5,0],[0,-.5,0],[0,0,.5],[0,0,-.5]]:type===3?[[0,0,-Math.sqrt(8/3)/2],[0,0,Math.sqrt(8/3)/2],...[0,1,2].map(i=>[Math.cos(2*i*Math.PI/3+Math.PI/6)/Math.sqrt(3),Math.sin(2*i*Math.PI/3+Math.PI/6)/Math.sqrt(3),0] as Point)]:[];
  const project=([x,y,z]:Point)=>{
    const u=x*Math.cos(turn)-y*Math.sin(turn);
    const v=x*Math.sin(turn)+y*Math.cos(turn);
    const zoom=type===3?90:120;
    return [200+zoom*u,128-zoom*(z*Math.cos(tilt)-v*Math.sin(tilt)),v*Math.cos(tilt)+z*Math.sin(tilt)];
  };
  return <svg viewBox="0 0 400 256" role="img" aria-label="按转角和仰角投影的晶胞">
    {vertices.flatMap((point,i)=>vertices.map((neighbor,j)=>{
      const edge=type===3 ? ((Math.floor(i/6)===Math.floor(j/6)&&[1,5].includes(j-i))||j-i===6) : [1,2,4].includes(i^j);
      if(j<=i||!edge)return null;
      const [x1,y1]=project(point),[x2,y2]=project(neighbor);
      return <line key={i+'-'+j} {...{x1,x2,y1,y2}} stroke="currentColor"/>;
    }))}
    {[...vertices,...extra].map(project).sort((a,b)=>a[2]-b[2]).map(([cx,cy],i)=><circle key={i} {...{cx,cy}} r="8" fill="var(--surface)" stroke="var(--accent)" strokeWidth="3"/>)}
  </svg>;
}
function Diagram({kind,values,phase,pick}:{kind:string;values:number[];phase:number;pick:(x:number,y:number)=>void}){
  const [a,b,c]=values;
  if(kind==='crystal')return <Crystal values={values}/>;
  if(kind==='zones'){
    const extent=9,side=324,count=54,scale=18;
    const {vectors}=reciprocal2D(a,b,c*Math.PI/180,2*Math.SQRT2*extent);
    const paths=['','',''];
    for(let row=0;row<count;row++)for(let col=0;col<count;col++){
      const point=brillouinZone((col+.5)*2*extent/count-extent,extent-(row+.5)*2*extent/count,vectors);
      if(point.count<=2) paths[point.count]+='M'+col*6+','+row*6+'h6v6h-6z';
    }
    const [,,,kx,ky]=values;
    const position=(x:number,y:number)=>[side/2+x*scale,side/2-y*scale];
    return <svg viewBox="0 0 324 348" role="img" aria-label="二维布里渊区，绿色第一区，棕色第二区">
      <rect width={side} height={side} fill="var(--paper)"/>
      <path d={paths[1]} fill="var(--accent)" opacity=".35"/><path d={paths[2]} fill={colors[1]} opacity=".45"/>
      <path d="M162 0V324 M0 162H324" stroke="currentColor" opacity=".4"/>
      {vectors.filter(g=>Math.abs(g.x)<=extent&&Math.abs(g.y)<=extent).map(g=>{
        const [cx,cy]=position(g.x,g.y);
        return <circle key={cx+','+cy} cx={cx} cy={cy} r="3" fill="currentColor"/>;
      })}
      {vectors.map(g=>{
        const norm=Math.hypot(g.x,g.y);
        if(norm>2*extent)return null;
        const [x1,y1]=position(g.x/2-g.y*extent/norm,g.y/2+g.x*extent/norm);
        const [x2,y2]=position(g.x/2+g.y*extent/norm,g.y/2-g.x*extent/norm);
        return <line key={x1+','+y1} {...{x1,y1,x2,y2}} stroke="currentColor" strokeDasharray="3 3" opacity=".25"/>;
      })}
      <circle cx={position(kx,ky)[0]} cy={position(kx,ky)[1]} r="5" fill="var(--surface)" stroke="currentColor"/>
      <text x="3" y="343" fill="currentColor" fontSize="12">kₓ、kᵧ：−9 至 9 nm⁻¹　绿色第一区 · 棕色第二区</text>
    </svg>;
  }
  if(kind==='evjen'){
    const size=2*a+1;
    return <svg viewBox={'0 0 '+size*25+' '+size*25} role="group" aria-label="中性区离子格点">
      {evjen(a).points.map(point=>{
        const x=(point.x+a+.5)*25,y=(point.y+a+.5)*25;
        const selected=point.x===b&&point.y===c;
        const label='坐标 '+point.x+'，'+point.y+'，权重 '+point.weight;
        return <g key={x+'-'+y} role="button" tabIndex={selected?0:-1} aria-label={label} onClick={()=>pick(point.x,point.y)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')pick(point.x,point.y)}}>
          <circle cx={x} cy={y} r="10" fill={selected?'var(--line)':'var(--surface)'} stroke={point.sign>0?'var(--accent)':colors[1]}/>
          <text x={x} y={y+4} textAnchor="middle" fontSize="11" fill="currentColor">{point.sign>0?'+':'−'}</text>
        </g>;
      })}
    </svg>;
  }
  if(kind==='atoms'){
    const [light,heavy]=displacement(b,a,c===2?1:0);
    const frequency=c?spectrum(b,a)[c-1]:2*Math.abs(Math.sin(b/2));
    return <svg viewBox="0 0 400 72" role="img" aria-label="纵向原子振动，双原子的大小区分质量">
      <line x1="15" x2="385" y1="35" y2="35" stroke="currentColor"/>
      {Array.from({length:14},(_,i)=>{
        const position=c?i/2:i;
        const amplitude=c?(i%2?heavy:light):1;
        return <circle key={i} cx={25+i*27+6*amplitude*Math.cos(position*b-frequency*phase)} cy="35" r={c&&i%2?8:5} fill={colors[i%2]}/>;
      })}
    </svg>;
  }
  if(kind==='defect'){
    return <svg viewBox="0 0 320 210" role="img" aria-label="随模式变化的二维缺陷点阵">
      {Array.from({length:35},(_,i)=>{
        const vacancy=(a===1&&i===15+b)||(a===2&&i===17);
        const impurity=a===4&&i===17;
        const sign=(i%7+Math.floor(i/7))%2===0;
        const species=a===5?(i===17||i===18?!sign:sign):false;
        const x=25+(i%7)*45,y=20+Math.floor(i/7)*41;
        return <g key={i}><circle cx={x} cy={y} r="10" fill={vacancy?'none':impurity||species?colors[1]:colors[0]} stroke="currentColor" strokeDasharray={vacancy?'3 3':undefined}/>
          {(vacancy||impurity||a===5)&&<text x={x} y={y+4} textAnchor="middle" fontSize="10" fill={vacancy?'currentColor':'var(--paper)'}>{vacancy?'空':impurity?'杂':species?'B':'A'}</text>}</g>;
      })}
      {(a===2||a===3)&&<text x="123" y="92" fontSize="13" fill="currentColor">{a===2?'自':'杂'}</text>}
    </svg>;
  }
  if(kind==='fermi-sphere')return <svg viewBox="0 0 300 160" role="img" aria-label="以费米半径为单位的球截面">
    <circle cx="150" cy="80" r="65" fill="none" stroke="currentColor" strokeDasharray="4 3"/>
    <circle cx="150" cy="80" r={65*Math.sqrt(1-b*b)} fill="none" stroke="var(--accent)" strokeWidth="4"/>
  </svg>;
  return <svg viewBox="0 0 420 150" role="img" aria-label="导带、价带和杂质能级示意">
    <path d="M25 25H345 M25 120H345" stroke="currentColor"/>
    <text x="350" y="29" fill="currentColor">导带</text><text x="350" y="125" fill="currentColor">价带</text>
    {a!==0&&<><path d={'M85 '+(a===1?48:96)+'H310'} stroke={colors[1]} strokeDasharray="5 4"/>
    <text x="100" y={a===1?68:90} fill="currentColor">{a===1?'施主':'受主'}{b?(a===1?'⁺':'⁻'):' · 中性'}</text>
    {b===1&&<text x="220" y={a===1?20:144} fill="currentColor">{a===1?'可动电子 e⁻':'可动空穴 h⁺'}</text>}</>}
  </svg>;
}

export default function ScienceLab({id}:{id:string}){
  const model=registry[id];
  const defaults=()=>model.controls.map(control=>control[4]);
  const [values,setValues]=useState(defaults);
  const [running,setRunning]=useState(false);
  const [phase,setPhase]=useState(0);
  const container=useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!running)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    if(reduced.matches){setRunning(false);return;}
    const stop=()=>{if(reduced.matches)setRunning(false)};
    reduced.addEventListener('change',stop);
    const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)setRunning(false)});
    if(container.current)observer.observe(container.current);
    const timer=window.setInterval(()=>setPhase(value=>value+.07),40);
    return ()=>{clearInterval(timer);observer.disconnect();reduced.removeEventListener('change',stop)};
  },[running]);
  const [start,end]=model.domain??[0,1];
  const samples=model.curves?.map(([name,fn])=>({name,values:Array.from({length:151},(_,i)=>fn(start+(end-start)*i/150,values))}))??[];
  const all=samples.flatMap(curve=>curve.values);
  const min=Math.min(...all),max=Math.max(...all);
  const y=(value:number)=>176-150*(value-min)/(max-min||1);
  const set=(index:number,value:number)=>setValues(previous=>previous.map((item,i)=>i===index?value:item));

  return <section className="panel" ref={container}>
    <p>{model.description}</p>
    {model.controls.map(([label,min,max,step],index)=><label key={label}>{label}　{Number(values[index].toFixed(4))}
      <input type="range" {...{min,max,step}} value={values[index]} onChange={event=>set(index,+event.target.value)}/>
    </label>)}
    <div className="controls">
      <button onClick={()=>{setValues(defaults());setRunning(false);setPhase(0)}}>恢复默认值</button>
      {model.diagram==='atoms'&&<>
        <button onClick={()=>setRunning(!running)}>{running?'暂停':'播放'}</button>
        <button onClick={()=>setPhase(value=>value+.15)}>单步</button>
        <button onClick={()=>set(1,0)}>Γ 点</button><button onClick={()=>set(1,Math.PI)}>区边界</button>
      </>}
    </div>
    <p aria-live="polite">{model.readout(values)}</p>
    {model.diagram&&<Diagram kind={model.diagram} values={values} phase={phase} pick={(x,y)=>setValues([values[0],x,y])}/>}
    {samples.length>0&&<figure>
      <svg viewBox="0 0 450 224" role="img" aria-label={model.axes?.join('，')}>
        <path d="M68 20V181H435" stroke="currentColor" fill="none"/>
        <text x="3" y="30" fill="currentColor" fontSize="12">{Number(max.toPrecision(4))}</text>
        <text x="3" y="178" fill="currentColor" fontSize="12">{Number(min.toPrecision(4))}</text>
        <text x="69" y="202" fill="currentColor" fontSize="12">{Number(start.toPrecision(3))}</text>
        <text x="413" y="202" fill="currentColor" fontSize="12">{Number(end.toPrecision(3))}</text>
        {samples.map((curve,i)=><polyline key={curve.name} points={curve.values.map((v,j)=>(69+j*2.42)+','+y(v)).join(' ')} fill="none" stroke={colors[i]} strokeWidth="2" strokeDasharray={['','7 4','2 3','8 3 2 3'][i]}/>)}
      </svg>
      <figcaption>横轴 {model.axes?.[0]} · 纵轴 {model.axes?.[1]}。{samples.map((curve,i)=>['实线','长虚线','短虚线','点划线'][i]+' '+curve.name).join('；')}</figcaption>
    </figure>}
  </section>;
}
