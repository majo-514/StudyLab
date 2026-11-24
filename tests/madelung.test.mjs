import test from 'node:test';
import assert from 'node:assert/strict';
import {series,limit} from '../src/lib/madelung.ts';
test('前三项与理论极限',()=>{
  assert.deepEqual(series(2).map(p=>p.sum),[2,1]);
  assert.ok(Math.abs(series(3)[2].sum-5/3)<1e-12);
  assert.ok(Math.abs(limit-1.3862943611)<1e-10);
});
test('全部 200 个部分和满足误差界与奇偶方向',()=>{
  for(const p of series(200)){
    assert.ok(p.error<=p.bound);
    assert.equal(p.sum>limit,Boolean(p.n%2));
  }
});
test('非法截断长度',()=>{for(const n of [0,201,NaN,2.5])assert.throws(()=>series(n),RangeError)});
