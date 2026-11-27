import {useEffect, useMemo, useState} from 'react';
import {prepareSearchIndex, searchSite, type SearchEntry} from '../lib/search';

const pageSize = 24;
const kinds: Record<string, string> = {
  course: '课程', chapter: '讲义', section: '知识点', lab: '实验', problem: '习题',
  formula: '公式', review: '复习', exercise: '习题索引', topic: '专题', page: '页面'
};

function excerpt(entry: SearchEntry, query: string) {
  if (entry.kind === 'problem' || !entry.search) return '';
  const text = entry.search;
  const lower = text.toLowerCase();
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const firstMatch = words.map(word => lower.indexOf(word)).find(index => index >= 0);
  if (firstMatch === undefined && entry.kind !== 'lab') return '';
  const start = Math.max(0, (firstMatch ?? 0) - 24);
  const end = Math.min(text.length, start + 100);
  return (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export default function SiteSearch({indexUrl}: {indexUrl: string}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<ReturnType<typeof prepareSearchIndex> | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get('q')?.slice(0, 120) ?? '');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(indexUrl, {signal: controller.signal}).then(response => {
      if (!response.ok) throw new Error('无法读取搜索索引');
      return response.json() as Promise<SearchEntry[]>;
    }).then(entries => {
      if (!controller.signal.aborted) setIndex(prepareSearchIndex(entries));
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [indexUrl, retry]);

  const results = useMemo(() => index ? searchSite(index, query) : [], [index, query]);

  function update(value: string) {
    setQuery(value);
    setLimit(pageSize);
    const address = new URL(location.href);
    if (value.trim()) address.searchParams.set('q', value.trim());
    else address.searchParams.delete('q');
    history.replaceState(history.state, '', address);
  }

  return <section aria-label="站内检索">
    <label htmlFor="site-search-query">搜索讲义、知识点、习题或实验</label>
    <input id="site-search-query" className="search-input" type="search" maxLength={120} value={query}
      placeholder="输入关键词，例如：布里渊区" onChange={event => update(event.target.value)}/>
    {failed ? <p role="status">暂时无法加载搜索。 <button type="button" onClick={() => {
      setFailed(false);
      setRetry(retry + 1);
    }}>重试</button></p> : query.trim() ? <p className="meta" role="status">
      {!index ? '正在加载搜索索引…' : results.length
        ? '找到 ' + results.length + ' 条结果'
        : '没有找到相关内容。试试更短的关键词，或用空格分开多个词。'}
    </p> : <div className="links search-examples">
      <span className="meta">试试搜索</span>
      {['布里渊区', '马德隆常数', '德拜 热容'].map(word =>
        <button key={word} type="button" onClick={() => update(word)}>{word}</button>)}
    </div>}
    {results.length > 0 && <ul className="row-list search-results">
      {results.slice(0, limit).map(({entry, approximate}) => {
        const snippet = excerpt(entry, query);
        const context = entry.context === entry.title ? undefined : entry.context;
        return <li key={entry.id}>
          <a href={entry.url} className="search-result">
            <strong>{entry.title}</strong>
            <small>{[kinds[entry.kind] ?? '资料', context, approximate ? '近似匹配' : undefined].filter(Boolean).join(' · ')}</small>
            {snippet && <span className="meta">{snippet}</span>}
          </a>
        </li>;
      })}
    </ul>}
    {results.length > limit && <button type="button" onClick={() => setLimit(limit + pageSize)}>显示更多结果</button>}
  </section>;
}
