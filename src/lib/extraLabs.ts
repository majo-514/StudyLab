import type {Model} from './labs';
import {boltzmannEV,fick,occupiedBand} from './physics';

const pi=Math.PI;
const format=(value:number)=>Number(value.toPrecision(6)).toString();
export const extraLabs:Record<string,Model>={
  fick:{
    title:'Fick 扩散的深度剖面',
    description:'半无限固体，初始浓度为零且 D 恒定。恒定源参数表示表面浓度（mol/m³），有限源参数表示单位面积的总剂量（mol/m²）。',
    controls:[['边界（0 恒定源、1 有限源）',0,1,1,0],['log₁₀[D/(m²/s)]',-16,-11,.1,-13],['时间（s）',1,7200,1,3600],['源强（按边界解释单位）',.001,1,.001,.01]],
    domain:[0,120],axes:['深度（μm）','浓度（mol/m³）'],
    curves:[['扩散剖面',(x,[mode,d,t,s])=>fick(x*1e-6,10**d,t,s,mode===1)]],
    readout:([mode,d,t,s])=>'√(Dt) = '+format(1e6*Math.sqrt(10**d*t))+' μm，表面浓度 '+format(fick(0,10**d,t,s,mode===1))+' mol/m³',
  },
  boundary:{
    title:'小角倾斜晶界',
    description:'单一刃位错阵列的几何模型，间距 D=b/[2 sin(θ/2)]。角度升高后离散位错近似的适用性下降。',
    controls:[['倾角（°）',.5,15,.1,4],['柏氏矢量模（nm）',.15,.5,.01,.25]],
    domain:[.5,15],axes:['倾角（°）','位错平均间距（nm）'],
    curves:[['平均间距',(x,[,b])=>b/(2*Math.sin(x*pi/360))]],
    readout:([angle,b])=>'这个倾角的平均间距 '+format(b/(2*Math.sin(angle*pi/360)))+' nm',
  },
  phonon2:{
    title:'二维正方点阵的方向色散',
    description:'标量位移、最近邻相同弹簧，比较 Γ→X 和 Γ→M。横轴为各路径中波矢分量的归一化位置，路径长度分别为 π/a 与 √2π/a。',
    controls:[['路径位置（0 Γ，1 终点）',0,1,.01,.5]],
    domain:[0,1],axes:['路径分数','ω / √(c/M)'],
    curves:[['Γ→X',x=>2*Math.sin(pi*x/2)],['Γ→M',x=>2*Math.SQRT2*Math.sin(pi*x/2)]],
    readout:([x])=>'Γ→X：'+format(2*Math.sin(pi*x/2))+'；Γ→M：'+format(2*Math.SQRT2*Math.sin(pi*x/2)),
  },
  metalHeat:{
    title:'低温电子和晶格热容',
    description:'用 C=γT+bT³ 拟合低温摩尔热容。C/T 对 T² 的截距为 γ，斜率为 b。',
    controls:[['γ（mJ mol⁻¹ K⁻²）',.1,8,.1,1],['b（mJ mol⁻¹ K⁻⁴）',.005,.2,.005,.05],['观察温度（K）',0,12,.1,4]],
    domain:[0,12],axes:['T（K）','C（mJ mol⁻¹ K⁻¹）'],
    curves:[['电子',(t,[g])=>g*t],['晶格',(t,[,b])=>b*t**3],['总和',(t,[g,b])=>g*t+b*t**3]],
    readout:([g,b,t])=>'C='+format(g*t+b*t**3)+' mJ mol⁻¹ K⁻¹；C/T='+format(g+b*t*t)+' mJ mol⁻¹ K⁻²（T=0 时给出极限）',
  },
  emission:{
    title:'热电子发射',
    description:'理想 Richardson–Dushman 模型，忽略表面场和空间电荷限制。前因子使用理想自由电子常数近似值。',
    controls:[['功函数（eV）',1,6,.01,4.5],['温度（K）',700,3000,1,1800]],
    domain:[1/3000,1/700],axes:['1/T（K⁻¹）','ln[(J/T²)/(A m⁻² K⁻²)]'],
    curves:[['发射直线',(inverseT,[work])=>Math.log(1.2e6)-work*inverseT/boltzmannEV]],
    readout:([work,t])=>'电流密度 '+(1.2e6*t*t*Math.exp(-work/(boltzmannEV*t))).toExponential(4)+' A/m²，斜率 '+format(-work/boltzmannEV)+' K',
  },
  holes:{
    title:'轻空穴与重空穴',
    description:'相同带顶的两条抛物线，曲率的绝对值随空穴质量增大而减小。横轴和纵轴均为归一化量。',
    controls:[['质量比',1,5,.1,3],['图示（0 价带电子、1 空穴激发）',0,1,1,0],['观察波矢',-1.6,1.6,.01,1]],
    domain:[-1.6,1.6],axes:['归一化波矢','归一化能量'],
    curves:[['较重',(x,[r,h])=>(h?1:-1)*x*x/r],['较轻',(x,[,h])=>(h?1:-1)*x*x]],
    readout:([r,h,x])=>'较重带偏离带顶 '+format((h?1:-1)*x*x/r)+'，较轻带 '+format((h?1:-1)*x*x),
  },
  fullBand:{
    title:'满带、半满带与空穴',
    description:'使用 120 个均匀分布的周期波矢状态，以整体波矢偏移模拟瞬态外场响应，电子净电流按 −Σ sin(ka)/N 归一化。',
    controls:[['占据（0 满带、1 半满带、2 近满带、3 空带）',0,3,1,1],['波矢平移 δ(ka)',-pi,pi,.01,0]],
    domain:[-pi,pi],axes:['波矢平移 δ(ka)','归一化净电流'],
    curves:[['净电流',(x,[mode])=>occupiedBand(mode,x).current]],
    readout:([mode,shift])=>{const {current,count}=occupiedBand(mode,shift);return '占据 '+count+' / 120，当前归一化净电流 '+format(Math.abs(current)<1e-14?0:current)},
  },
};
