import {allowed,arrivals,boltzmannEV,bragg,brillouinZone,debye,einstein,electronGas,evjen,fermi,gapBands,hall,potential,reciprocal2D,spectrum,type Cubic} from './physics';
import {extraLabs} from './extraLabs';
type Parameters=number[];
type Slider=[label:string,min:number,max:number,step:number,initial:number];
export interface Model {
  title:string;
  description:string;
  controls:Slider[];
  domain?:[number,number];
  axes?:[string,string];
  curves?:[string,(x:number,p:Parameters)=>number][];
  readout:(p:Parameters)=>string;
  diagram?:'crystal'|'evjen'|'atoms'|'defect'|'fermi-sphere'|'doping'|'zones';
}
const pi=Math.PI;
const format=(value:number)=>Number.isFinite(value)?Number(value.toPrecision(6)).toString():'不适用';
const structures=['SC','BCC','FCC','HCP'] as const;
export const registry:Record<string,Model>={
  ...extraLabs,
  crystal:{
    title:'晶胞与密堆积',description:'旋转理想硬球结构的晶胞投影。HCP 使用理想轴比 √(8/3) 的六棱柱，球半径在图中缩小。',
    controls:[['结构（0 SC、1 BCC、2 FCC、3 HCP）',0,3,1,2],['转角（°）',-180,180,1,24],['仰角（°）',-85,85,1,26]],diagram:'crystal',
    readout:([type])=>structures[type]+' · 配位数 '+[6,8,12,12][type]+' · 堆积率 '+[.5236,.6802,.7405,.7405][type],
  },
  miller:{
    title:'米勒指数与布拉格衍射',description:'立方晶系。由指数计算晶面间距，再用布拉格方程求衍射峰位置。消光按相同散射因子的点阵模型计算。',
    controls:[['点阵（0 SC、1 BCC、2 FCC）',0,2,1,2],['h',-4,4,1,1],['k',-4,4,1,1],['l',-4,4,1,1],['晶格常数（nm）',.2,1,.001,.405],['波长（nm）',.05,.4,.001,.154],['级次',1,4,1,1]],
    readout:([type,h,k,l,a,wavelength,order])=>{
      const norm=Math.hypot(h,k,l);
      if(!norm)return '请选择非零晶面指数。';
      const d=a/norm;
      const theta=bragg(d,wavelength,order);
      const active=allowed(structures[type] as Cubic,h*order,k*order,l*order);
      return '晶面间距 '+format(d)+' nm，'+(theta===null?'该波长下无实数衍射角':'衍射角 2θ = '+format(2*theta)+'°，'+(active?'点阵允许反射':'几何结构因子消光'));
    },
  },
  reciprocal1:{
    title:'一维正格子、倒格子与布里渊区',description:'区界为倒格点间的垂直平分点。横坐标为波矢；第一布里渊区包含以 Γ 为中心的区间。',
    controls:[['周期 a（nm）',.2,3,.01,1],['输入 k（nm⁻¹）',-20,20,.1,6]],
    readout:([a,k])=>{
      const g=2*pi/a;
      const reduced=k-g*Math.floor(k/g+.5);
      const edge=Math.abs(Math.abs(reduced)-g/2)<1e-9;
      return '倒格周期 '+format(g)+' nm⁻¹，第一、二区外边界分别为 ±'+format(g/2)+'、±'+format(g)+' nm⁻¹；折回波矢 '+format(reduced)+' nm⁻¹'+(edge?'（等价区边界）':'');
    },
  },
  reciprocal2:{
    title:'二维倒格子与第一、第二布里渊区',
    description:'改变正格基矢长度和夹角。第一、第二布里渊区按原点与倒格点的垂直平分线计数，底色采用网格采样。虚线标出布拉格线。',
    controls:[['第一基矢长度（nm）',.65,2.5,.01,1],['第二基矢长度（nm）',.65,2.5,.01,1],['基矢夹角（°）',45,135,1,60],['kₓ（nm⁻¹）',-9,9,.1,0],['kᵧ（nm⁻¹）',-9,9,.1,0]],
    diagram:'zones',
    readout:([a,b,angle,x,y])=>{
      const lattice=reciprocal2D(a,b,angle*pi/180,26);
      const zone=brillouinZone(x,y,lattice.vectors);
      return '倒基矢（nm⁻¹） ('+lattice.first.map(format).join(', ')+') 和 ('+lattice.second.map(format).join(', ')+')；选择点：'+(zone.boundary?'区边界':'第 '+zone.count+' 区');
    },
  },
  potential:{
    title:'两项幂势与作用力',description:'x=r/r₀，势能以势阱深度 Eᵦ 为单位，作用力以 Eᵦ/r₀ 为单位。曲线范围为 0.8–3。',
    controls:[['吸引指数 m',1,8,1,1],['排斥指数 n',9,20,1,9],['观察 x',.8,3,.01,1]],
    domain:[.8,3],axes:['r/r₀','归一化势能或力'],
    curves:[['势能',(x,[m,n])=>potential(x,m,n).energy],['力',(x,[m,n])=>potential(x,m,n).force]],
    readout:([m,n,x])=>{const {energy,force}=potential(x,m,n);return '势能 '+format(energy)+'，力 '+format(force)+'，平衡点 x=1，曲率 mn='+m*n},
  },
  evjen:{
    title:'二维 Evjen 中性区',description:'正方交替离子点阵。外边贡献权重 1/2，四角 1/4，中心只参加净电荷检验。距离单位为最近邻间距。',
    controls:[['中性区层数 L',1,12,1,2],['观察点 x',-12,12,1,1],['观察点 y',-12,12,1,0]],diagram:'evjen',
    readout:([layer,x,y])=>{
      const result=evjen(layer);
      const point=result.points.find(p=>p.x===x&&p.y===y);
      return 'α='+format(result.alpha)+'，净电荷/e='+result.charge+'，绝对误差 '+format(Math.abs(result.alpha-1.61554263))+
        (point?'；选中位置权重 '+point.weight+'，对 α 的贡献 '+format(point.contribution):'；观察点位于当前区域之外');
    },
  },
  dispersion:{
    title:'单原子链与双原子链色散',description:'最近邻简谐模型；两条链的 ka 分别采用各自原胞长度，频率以 √(β/m) 归一化。动画中的时间为归一化相位。',
    controls:[['重轻质量比 M/m',1,10,.1,4],['观察波矢 ka',-pi,pi,.001,0],['动画（0 单链、1 声学、2 光学）',0,2,1,1]],
    domain:[-pi,pi],axes:['ka','ω / √(β/m)'],diagram:'atoms',
    curves:[['单原子链',(x)=>2*Math.abs(Math.sin(x/2))],['声学支',(x,[r])=>spectrum(x,r)[0]],['光学支',(x,[r])=>spectrum(x,r)[1]]],
    readout:([r,q])=>{const [a,o]=spectrum(q,r);return '声学 '+format(a)+'，光学 '+format(o)+'，双链禁带宽度 '+format(Math.SQRT2-Math.sqrt(2/r))},
  },
  heat:{
    title:'爱因斯坦与德拜热容',description:'谐振晶格的定容热容，以 3Nkᴮ 归一化。爱因斯坦取单一振动频率，德拜积分考虑三维连续声学频谱。',
    controls:[['特征温度比 θE/θD',.25,4,.05,1],['观察 T/θD',0,3,.01,.5]],
    domain:[0,3],axes:['T/θD','Cᵥ/(3Nkᴮ)'],
    curves:[['爱因斯坦',(x,[ratio])=>einstein(ratio/x)],['德拜',x=>debye(x)],['经典极限',()=>1]],
    readout:([ratio,t])=>'爱因斯坦 '+format(einstein(ratio/t))+'，德拜 '+format(debye(t)),
  },
  phononDos:{
    title:'周期边界与德拜态密度',description:'一维周期链取 N 个波矢，端点不重复。三维线性色散的归一化态密度为 3x²，频率范围截至德拜频率。',
    controls:[['原胞总数 N',3,40,1,12],['观察 ω/ωD',0,1,.01,.5]],
    domain:[0,1],axes:['ω/ωD','归一化态密度'],curves:[['三维态密度',(x)=>3*x*x]],
    readout:([n,x])=>'截止观察频率的模式比例 '+format(x**3)+'；允许 ka/π：'+Array.from({length:n},(_,i)=>format(2*(i-Math.floor(n/2))/n)).join('、'),
  },
  defect:{
    title:'点缺陷与空位扩散',description:'二维点阵的单步示意。空位跃迁中原子填入旧空位，留下新空位。步数只表示示意过程。',
    controls:[['模式（0 理想、1 空位、2 Frenkel、3 间隙、4 替位、5 反位）',0,5,1,1],['空位迁移步数',0,4,1,0]],diagram:'defect',
    readout:([mode])=>['无缺陷','一个空位','一个空位加一个自间隙原子','一个间隙杂质','一个替位杂质','一对交换子晶格的原子'][mode],
  },
  arrhenius:{
    title:'扩散系数与激活能',description:'Arrhenius 热激活模型，D₀ 单位 m²/s，Q 以 eV/原子输入。对数纵坐标取相对前因子的比值。',
    controls:[['激活能（eV/原子）',.2,2,.01,1],['温度（K）',300,1500,1,800],['log₁₀[D₀/(m²/s)]',-9,-3,.1,-5]],
    domain:[300,1500],axes:['T（K）','ln(D/D₀)'],curves:[['扩散系数比',(t,[q])=>-q/(boltzmannEV*t)]],
    readout:([q,t,d])=>'D = '+arrivals(t,q,10**d).toExponential(4)+' m²/s；ln(D/D₀) 对 1/T 的斜率 '+format(-q/boltzmannEV)+' K',
  },
  equilibrium:{
    title:'平衡空位与 Frenkel 缺陷',description:'稀缺陷近似，采用相同的有效形成能参数，Frenkel 对浓度另含间隙位置比例。',
    controls:[['形成能（eV）',.5,3,.01,1],['间隙位置数 / 晶格位置数',.1,4,.1,1],['温度（K）',300,1800,5,1000]],
    domain:[300,1800],axes:['T（K）','log₁₀(浓度)'],
    curves:[['空位',(t,[e])=>-e/(boltzmannEV*t*Math.LN10)],['Frenkel 对',(t,[e,r])=>.5*(Math.log10(r)-e/(boltzmannEV*t*Math.LN10))]],
    readout:([e,r,t])=>{const v=Math.exp(-e/(boltzmannEV*t));const f=Math.sqrt(r*v);return '空位 '+v.toExponential(3)+'，Frenkel 对 '+f.toExponential(3)+(f>.01?'；浓度升高时稀缺陷近似需谨慎':'')},
  },
  fermi:{
    title:'费米–狄拉克分布',description:'能量用 Eꜰ 归一化。化学势可取固定值或采用低温 Sommerfeld 二阶近似。',
    controls:[['T/Tꜰ',0,.1,.001,.035],['化学势低温修正（0 关闭、1 开启）',0,1,1,1],['观察 E/Eꜰ',.6,1.4,.001,1]],
    domain:[.6,1.4],axes:['E/Eꜰ','占据概率'],
    curves:[['有限温度',(x,[t,m])=>fermi(x,t,1-m*pi*pi*t*t/12)],['零温',(x)=>fermi(x,0)]],
    readout:([t,m,x])=>{const chemical=1-m*pi*pi*t*t/12;return '占据概率 '+format(fermi(x,t,chemical))+'，μ/Eꜰ='+format(chemical)},
  },
  electronGas:{
    title:'费米球与自由电子态密度',description:'三维含自旋简并的自由电子气。图中截面属于波矢空间；态密度以 D(Eꜰ) 归一化。',
    controls:[['电子密度（10²⁸ m⁻³）',1,20,.01,8.47],['切片位置 kz/kꜰ',-1,1,.01,0],['T/Tꜰ（固定化学势）',0,.1,.001,.03]],
    domain:[0,2],axes:['E/Eꜰ','D(E)/D(Eꜰ)'],diagram:'fermi-sphere',
    curves:[['态密度',(x)=>Math.sqrt(x)],['已占据态密度',(x,[,,t])=>Math.sqrt(x)*fermi(x,t)]],
    readout:([n,z])=>{const gas=electronGas(n*1e28);return 'kꜰ = '+format(gas.k/1e9)+' nm⁻¹，Eꜰ = '+format(gas.e)+' eV，截面半径 '+format(gas.k*Math.sqrt(1-z*z)/1e9)+' nm⁻¹'},
  },
  copper:{
    title:'铜模型参数计算器',description:'FCC 每晶胞 4 个原子，使用自由电子质量和单带 Drude 模型。',
    controls:[['晶格常数（nm）',.3,.5,.0001,.3615],['价电子数',1,3,1,1],['电阻率（10⁻⁸ Ω·m）',.5,10,.1,1.7]],
    readout:([a,z,rho])=>{const n=4*z/(a*1e-9)**3;const gas=electronGas(n);const tau=9.1093837e-31/(n*(1.602176634e-19)**2*rho*1e-8);return 'n='+n.toExponential(4)+' m⁻³，Eꜰ='+format(gas.e)+' eV，vꜰ='+gas.speed.toExponential(4)+' m/s，τ='+format(tau*1e15)+' fs，平均自由程 '+format(tau*gas.speed*1e9)+' nm'},
  },
  hall:{
    title:'单载流子霍尔效应',description:'电流沿 +x，磁场沿 z。以横向电场的符号定义霍尔电压，反转磁场或电荷会翻转电压。',
    controls:[['电流（A）',-2,2,.01,1],['磁场（T）',-2,2,.01,1],['厚度（mm）',.1,5,.1,1],['密度（10²⁸ m⁻³）',1,20,.1,8.5],['载流子（0 电子、1 空穴）',0,1,1,0]],
    readout:([i,b,d,n,c])=>'霍尔电压 '+format(hall(i,b,d*1e-3,n*1e28,c?1:-1)*1e6)+' μV',
  },
  bloch:{
    title:'布洛赫波',description:'示意周期因子 u=1+A cos(2πx/a)。概率密度具有晶格周期，波函数平移一个晶胞时带有相位。',
    controls:[['ka',-pi,pi,.01,pi/2],['调制深度 A',0,.8,.01,.4]],
    domain:[0,4],axes:['x/a','归一化振幅或密度'],
    curves:[['实部',(x,[k,a])=>(1+a*Math.cos(2*pi*x))*Math.cos(k*x)],['虚部',(x,[k,a])=>(1+a*Math.cos(2*pi*x))*Math.sin(k*x)],['概率密度',(x,[,a])=>(1+a*Math.cos(2*pi*x))**2]],
    readout:([k])=>'平移相位因子实部 '+format(Math.cos(k))+'，虚部 '+format(Math.sin(k)),
  },
  gap:{
    title:'近自由电子的区边界开隙',description:'第一布里渊区边缘附近的局部两态近似。能量用自由电子区边界能量 T₁ 归一化。',
    controls:[['势能傅里叶系数 |V₁|/T₁',0,.4,.001,.1]],
    domain:[-.3,.3],axes:['相对区界波矢 Δ','E/T₁'],
    curves:[['下支',(x,[v])=>gapBands(x,v)[0]],['上支',(x,[v])=>gapBands(x,v)[1]],['未耦合左支',(x)=>((1-x)**2)],['未耦合右支',(x)=>((1+x)**2)]],
    readout:([v])=>'区界带隙 '+format(2*v)+' T₁；带边 '+gapBands(0,v).map(format).join(' 和 ')+' T₁',
  },
  tight:{
    title:'SC / FCC 最近邻紧束缚能带',description:'单 s 轨道，参考能量 E₀=0。横轴按实际累计波矢路径占整条路径的比例标注。',
    controls:[['晶格（0 SC、1 FCC）',0,1,1,0],['跃迁积分 J（eV）',.05,1,.01,.2],['晶格常数 a（Å）',2,6,.1,4]],
    domain:[0,1],axes:['归一化累计路径','E（eV）'],
    curves:[['紧束缚', (fraction,[fcc,j])=>{
      const nodes=fcc?[[0,0,0],[0,0,2*pi],[0,0,0],[pi,pi,pi]]:[[0,0,0],[0,0,pi],[pi,pi,pi],[0,0,0]];
      const lengths=nodes.slice(1).map((point,i)=>Math.hypot(...point.map((v,d)=>v-nodes[i][d])));
      let distance=fraction*lengths.reduce((a,b)=>a+b,0), segment=0;
      while(segment<2&&distance>lengths[segment])distance-=lengths[segment++];
      const point=nodes[segment].map((v,d)=>v+(nodes[segment+1][d]-v)*distance/lengths[segment]);
      const [x,y,z]=point.map(q=>Math.cos(q/(fcc?2:1)));
      return fcc?-4*j*(x*y+y*z+z*x):-2*j*(x+y+z);
    }]],
    readout:([fcc,j,a])=>(fcc?'Γ–X–Γ–L':'Γ–Z–R–Γ')+'，带宽 '+format((fcc?16:12)*j)+' eV，带底 m*/m₀='+format(3.809982/(j*a*a)),
  },
  curvature:{
    title:'能带曲率与有效质量',description:'一维最近邻能谱 E/J=−2 cos(ka)。群速度用 2Ja/ℏ 归一化，逆质量用 2Ja²/ℏ² 归一化。',
    controls:[['观察波矢 ka',-pi,pi,.001,0]],
    domain:[-pi,pi],axes:['ka','E/J'],
    curves:[['色散',x=>-2*Math.cos(x)],['局部切线',(x,[q])=>-2*Math.cos(q)+2*Math.sin(q)*(x-q)]],
    readout:([q])=>'速度 '+format(Math.sin(q))+'，逆有效质量 '+format(Math.cos(q))+(Math.abs(Math.cos(q))<1e-6?'，曲率约零，无有限二次有效质量':''),
  },
  semiconductor:{
    title:'直接与间接带隙',description:'抛物线带边示意。间接模型还需声子参与动量守恒；能量超过阈值并不能确定跃迁强度。',
    controls:[['带隙类型（0 直接、1 间接）',0,1,1,0],['带隙（eV）',.2,3,.01,1.1],['光波长（nm）',300,2200,1,900],['声子能量（eV）',0,.15,.001,.04]],
    domain:[-2,2],axes:['归一化波矢','E（eV）'],
    curves:[['价带',x=>-x*x],['导带',(x,[indirect,g])=>g+(x-indirect)**2]],
    readout:([indirect,g,w,p])=>'光子 '+format(1239.841984/w)+' eV；'+(indirect?'吸收声子阈值 '+format(g-p)+' eV，发射声子阈值 '+format(g+p)+' eV':'直接阈值 '+format(g)+' eV'),
  },
  doping:{
    title:'施主、受主与电离',description:'能级和载流子的定性图。仅示意单个杂质的电荷平衡，能级位置不按比例。',
    controls:[['材料（0 本征、1 N 型、2 P 型）',0,2,1,1],['杂质（0 中性、1 电离）',0,1,1,0]],diagram:'doping',
    readout:([type,ionized])=>!type?'本征半导体':type===1?(ionized?'一个可动电子和一个固定正施主':'中性施主占据一个束缚电子'):(ionized?'一个可动空穴和一个固定负受主':'中性受主能级尚未捕获价带电子'),
  }
};
const chapters=[
  ['crystal','miller','reciprocal1','reciprocal2'],
  ['potential','madelung-1d','evjen'],
  ['dispersion','phononDos','heat','phonon2'],
  ['defect','equilibrium','arrhenius','fick','boundary'],
  ['fermi','electronGas','copper','hall','metalHeat','emission'],
  ['bloch','gap','tight','curvature','semiconductor','doping','holes','fullBand']
];
const exercises:Record<string,string[]>={
  'public-bragg-extinction':['miller'],'public-pair-force':['potential'],'public-phonon-gap':['dispersion'],
  'public-diffusion-temperature':['arrhenius'],'public-hall-polarity':['hall'],'public-band-curvature':['curvature'],
  'ssp-001':['madelung-1d'],'ssp-002':['evjen'],'ssp-003':['dispersion'],'ssp-004':['crystal'],'ssp-005':['defect','arrhenius'],
  'review-c04':['miller'],'review-c15':['madelung-1d'],'review-c16':['potential'],'review-c17':['potential'],
  'review-c06':['reciprocal2'],'review-c10':['reciprocal2'],'review-c13':['reciprocal2'],'review-c14':['reciprocal2'],
  'review-c18':['dispersion'],'review-c19':['heat'],'review-c20':['phononDos'],'review-c21':['electronGas'],
  'review-c21a':['copper'],'review-c22':['curvature'],'review-c23':['tight'],
};
export function labIds(id:string,chapter:number,isChapter:boolean):string[]{return isChapter?chapters[chapter]??[]:exercises[id]??[]}
export const labTitle=(id:string)=>id==='madelung-1d'?'一维马德隆常数':registry[id].title;
