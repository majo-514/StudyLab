import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareSearchIndex, searchSite} from '../src/lib/search.ts';

const index=prepareSearchIndex([
  {id:'review', title:'期末总复习', kind:'review', url:'/review/', search:'布里渊区与衍射的对比。'},
  {id:'zone', title:'第一布里渊区', kind:'section', url:'/study/crystal/#zone'},
  {id:'miller', title:'米勒指数与布拉格衍射', kind:'lab', url:'/study/crystal/#lab-miller'},
  {id:'metal', title:'自由电子论', kind:'chapter', url:'/study/metal/', search:'description'},
  {id:'debye', title:'Debye 低温近似', kind:'section', url:'/study/phonon/#debye', search:'晶格热容'},
  {id:'bcc', title:'BCC 结构因子', kind:'problem', url:'/study/test/'}
]);

test('搜索优先返回标题与知识点，保留正文匹配和原有跳转链接',()=>{
  const matches=searchSite(index,'布里渊区');
  assert.deepEqual(matches.slice(0,2).map(match=>match.entry.id),['zone','review']);
  assert.equal(matches[0].entry.url,'/study/crystal/#zone');
  assert.equal(searchSite(index,'德拜 热容')[0].entry.id,'debye');
});

test('搜索支持中文别名、全角字母、单字错漏和颠倒',()=>{
  assert.equal(searchSite(index,'密勒指数')[0].entry.id,'miller');
  assert.equal(searchSite(index,'ｂｃｃ')[0].entry.id,'bcc');
  for(const typo of ['布里渊驱','布渊区','布渊里区']){
    const match=searchSite(index,typo)[0];
    assert.equal(match.entry.id,'zone');
    assert.equal(match.approximate,true);
  }
  assert.equal(searchSite(index,'debey')[0].entry.id,'debye');
  assert.deepEqual(searchSite(index,'SC'),[]);
  assert.deepEqual(searchSite(index,'不存在的天文术语'),[]);
  assert.deepEqual(searchSite(index,'！？'),[]);
});
