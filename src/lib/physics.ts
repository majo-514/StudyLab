export const electronCharge=1.602176634e-19;
export const boltzmannEV=8.617333262e-5;
export const hbar=6.62607015e-34/(2*Math.PI);
export const electronMass=9.1093837e-31;
export const potential=(x:number,m:number,n:number)=>({
  energy:(m*x**(-n)-n*x**(-m))/(n-m),
  force:m*n/(n-m)*(x**(-n-1)-x**(-m-1)),
});
export function evjen(level:number){
  let alpha=0,charge=0;
  const points=[];
  for(let x=-level;x<=level;x++)for(let y=-level;y<=level;y++){
    const sign=(x+y)%2===0?1:-1;
    const weight=(Math.abs(x)===level?.5:1)*(Math.abs(y)===level?.5:1);
    const contribution=x||y?-sign*weight/Math.hypot(x,y):0;
    charge+=sign*weight;
    alpha+=contribution;
    points.push({x,y,sign,weight,contribution});
  }
  return {alpha,charge,points};
}
export function bragg(d:number,wavelength:number,order:number){
  const sine=order*wavelength/(2*d);
  return sine<=1 ? Math.asin(sine)*180/Math.PI : null;
}
export type Cubic='SC'|'BCC'|'FCC';
export function allowed(type:Cubic,h:number,k:number,l:number){
  const parity=(n:number)=>Math.abs(n%2);
  return type==='SC'||(type==='BCC'?parity(h+k+l)===0:parity(h)===parity(k)&&parity(k)===parity(l));
}
export function spectrum(q:number,r:number){
  const a=1+1/r;
  const t=4*Math.sin(q/2)**2/r;
  const b=Math.hypot(1-1/r,2*Math.cos(q/2)/Math.sqrt(r));
  return [Math.sqrt(t/(a+b)),Math.sqrt(a+b)];
}
export function displacement(q:number,r:number,branch:number){
  const angle=Math.atan2(4*Math.cos(q/2)/Math.sqrt(r),2-2/r)/2;
  const pair=branch?[Math.cos(angle),-Math.sin(angle)/Math.sqrt(r)]:[Math.sin(angle),Math.cos(angle)/Math.sqrt(r)];
  const scale=Math.max(...pair.map(Math.abs));
  return pair.map(value=>value/scale);
}
export function einstein(x:number){
  if(!Number.isFinite(x)||x>700)return 0;
  if(x===0)return 1;
  return (x/-Math.expm1(-x))**2*Math.exp(-x);
}
export function debye(t:number){
  if(t<=0)return 0;
  if(t<.015)return 4*Math.PI**4*t**3/5;
  const max=Math.min(1/t,60);
  const step=max/160;
  let sum=0;
  for(let i=1;i<=160;i++){
    const x=i*step;
    sum+=(i===160?1:i%2?4:2)*x*x*einstein(x);
  }
  return 3*t**3*sum*step/3;
}
export function arrivals(t:number,q:number,d0=1e-5){return d0*Math.exp(-q/(boltzmannEV*t))}
export function complementaryError(x:number){
  if(x===0)return 1;
  const t=1/(1+.3275911*Math.abs(x));
  // Abramowitz–Stegun 7.1.26，最大绝对误差约 1.5×10⁻⁷。
  const tail=t*(.254829592+t*(-.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))))*Math.exp(-x*x);
  return x>0?tail:2-tail;
}
export function fick(x:number,d:number,t:number,surface:number,finite:boolean){
  const width=Math.sqrt(d*t);
  return finite?surface/(Math.sqrt(Math.PI)*width)*Math.exp(-x*x/(4*width*width)):surface*complementaryError(x/(2*width));
}
export function occupiedBand(mode:number,shift:number,points=120){
  const half=mode===0?points/2:mode===1?points/4:mode===2?points/2-3:0;
  const count=2*half;
  let current=0;
  for(let i=0;i<count;i++){
    const k=2*Math.PI*(i+.5-half)/points+shift;
    current-=Math.sin(k)/points;
  }
  return {current,count};
}
export function fermi(energy:number,temp:number,chemical=1){
  if(temp===0)return energy===chemical?.5:Number(energy<chemical);
  return 1/(1+Math.exp((energy-chemical)/temp));
}
export function electronGas(n:number){
  const k=Math.cbrt(3*Math.PI**2*n);
  return {k,e:hbar**2*k*k/(2*electronMass*electronCharge),speed:hbar*k/electronMass};
}
export const hall=(current:number,field:number,thickness:number,density:number,sign:number)=>current*field/(density*sign*electronCharge*thickness);
export const gapBands=(x:number,v:number)=>[1+x*x-Math.hypot(v,2*x),1+x*x+Math.hypot(v,2*x)];

export function reciprocal2D(a:number,b:number,angle:number,radius:number){
  const sin=Math.sin(angle),cos=Math.cos(angle);
  if(a<=0||b<=0||Math.abs(sin)<1e-6)throw RangeError('正格基矢必须非零且不共线');
  const first=[2*Math.PI/a,-2*Math.PI*cos/(a*sin)];
  const second=[0,2*Math.PI/(b*sin)];
  // h = a₁·G/(2π)，k = a₂·G/(2π)。用 Cauchy–Schwarz 确定完备的枚举范围。
  const hMax=Math.floor(a*radius/(2*Math.PI)+1e-10),kMax=Math.floor(b*radius/(2*Math.PI)+1e-10);
  const vectors=[];
  for(let h=-hMax;h<=hMax;h++)for(let k=-kMax;k<=kMax;k++){
    const x=h*first[0],y=h*first[1]+k*second[1];
    if((h||k)&&Math.hypot(x,y)<=radius+1e-9)vectors.push({x,y});
  }
  return {first,second,vectors};
}

export function brillouinZone(x:number,y:number,vectors:{x:number;y:number}[]){
  let count=1,boundary=false;
  for(const g of vectors){
    const delta=2*(x*g.x+y*g.y)-g.x*g.x-g.y*g.y;
    if(Math.abs(delta)<1e-8)boundary=true;
    else if(delta>0)count++;
  }
  return {count,boundary};
}
