import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowed,arrivals,bragg,brillouinZone,debye,displacement,electronGas,einstein,evjen,fermi,fick,gapBands,hall,occupiedBand,potential,reciprocal2D,spectrum} from '../src/lib/physics.ts';
import {blank,encode,mergeNew,parse} from '../src/lib/learning.ts';
const near=(actual,expected,tolerance=1e-7)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} ≠ ${expected}`);

test('布拉格角与系统消光',()=>{
  near(bragg(.2341,.154,1),19.2024,.01);
  assert.equal(bragg(.1,.3,1),null);
  assert.equal(allowed('FCC',-1,1,1),true);
  assert.equal(allowed('FCC',1,0,1),false);
  assert.equal(allowed('BCC',1,0,0),false);
});
test('势函数平衡与 Evjen 权重',()=>{
  near(potential(1,1,9).energy,-1);
  near(potential(1,1,9).force,0);
  assert.ok(potential(.9,1,9).force>0);
  assert.ok(potential(1.1,1,9).force<0);
  near(evjen(1).alpha,2-1/Math.sqrt(2));
  near(evjen(2).alpha,3-9*Math.sqrt(2)/4+4/Math.sqrt(5));
  for(let layer=1;layer<=12;layer++)assert.equal(evjen(layer).charge,0);
});
test('双链长波、边界、简并与位移模式',()=>{
  near(spectrum(0,4)[1],Math.sqrt(2.5));
  near(spectrum(Math.PI,4)[0],Math.sqrt(.5));
  near(spectrum(Math.PI,1)[0],spectrum(Math.PI,1)[1]);
  const [light,heavy]=displacement(0,4,1);
  near(light+4*heavy,0);
  near(spectrum(0,4)[0],0);
});
test('热容极限与热激活扩散',()=>{
  assert.equal(debye(0),0);
  near(debye(.002)/debye(.001),8);
  near(debye(50),1,.001);
  near(einstein(.005),1,.001);
  near(arrivals(800,1),5.015e-12,1e-14);
  assert.ok(arrivals(801,1)>arrivals(800,1));
});
test('倒格对偶性与前两布里渊区',()=>{
  const angle=Math.PI/3;
  const {first,second}=reciprocal2D(2,1,angle,20);
  near(2*first[0],2*Math.PI);
  near(first[0]*Math.cos(angle)+first[1]*Math.sin(angle),0);
  near(second[1]*Math.sin(angle),2*Math.PI);
  const square=reciprocal2D(1,1,Math.PI/2,20).vectors;
  assert.equal(brillouinZone(0,0,square).count,1);
  assert.equal(brillouinZone(Math.PI,0,square).boundary,true);
  assert.equal(brillouinZone(4,0,square).count,2);
});
test('半无限扩散边界及满带净电流',()=>{
  near(fick(0,1e-12,100,1,false),1);
  const dx=1e-7;
  const total=Array.from({length:1400},(_,i)=>fick((i+.5)*dx,1e-12,100,3,true)*dx).reduce((a,b)=>a+b,0);
  near(total,3);
  near(occupiedBand(0,.42).current,0,1e-12);
  near(occupiedBand(1,0).current,0,1e-12);
  assert.ok(Math.abs(occupiedBand(1,.42).current)>.01);
});
test('费米占据、铜参数、霍尔和开隙',()=>{
  near(fermi(1,0),.5);
  near(fermi(1.1,0),0);
  near(electronGas(8.47e28).e,7.04,.04);
  near(hall(1,1,.001,8.5e28,-1),-hall(1,-1,.001,8.5e28,-1),1e-15);
  assert.ok(hall(1,1,.001,8.5e28,-1)<0);
  near(gapBands(0,.1)[1]-gapBands(0,.1)[0],.2);
});
test('兼容旧备份并保护用户编辑',()=>{
  const local={'ssp-001':{...blank,note:'本地笔记'}};
  const incoming={'ssp-001':{...blank,note:'旧笔记'},'ssp-002':{...blank,wrong:true}};
  assert.deepEqual(parse(encode(incoming)),incoming);
  assert.equal(mergeNew(local,incoming)['ssp-001'].note,'本地笔记');
  assert.equal(mergeNew(local,incoming)['ssp-002'].wrong,true);
  assert.throws(()=>parse('{"schemaVersion":9,"items":{}}'));
  assert.throws(()=>parse(encode({'question-1':{...blank,wrong:'yes'}})));
});
