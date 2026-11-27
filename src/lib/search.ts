export interface SearchEntry {
  id: string;
  title: string;
  url: string;
  kind: string;
  chapter?: string | null;
  context?: string;
  keywords?: string;
  search?: string;
}

const aliases = [
  ['米勒指数', '密勒指数', '晶面指数', 'Miller indices', 'Miller index'],
  ['布里渊区', 'Brillouin zone'],
  ['布拉格', 'Bragg'],
  ['马德隆常数', '马德隆系数', 'Madelung constant'],
  ['德拜', 'Debye'],
  ['费米狄拉克', '费米 狄拉克', '费米分布', 'Fermi Dirac'],
  ['霍尔效应', 'Hall effect'],
  ['体心立方', 'BCC'],
  ['面心立方', 'FCC'],
  ['六方密堆积', 'HCP']
];

function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const aliasGroups = aliases.map(group => group.map(normalize));
const hasHan = /\p{Script=Han}/u;

export function prepareSearchIndex(entries: SearchEntry[]) {
  return entries.map(entry => {
    const title = normalize(entry.title);
    const keywords = normalize(entry.keywords ?? '');
    const keyText = title + ' ' + keywords;
    const relatedNames = aliasGroups.filter(group => group.some(alias => contains(keyText, alias))).flat();
    return {
      entry, title, keywords, body: normalize(entry.search ?? ''),
      terms: [keyText, ...relatedNames].join(' ').match(/[a-z0-9]+|\p{Script=Han}+/gu) ?? []
    };
  });
}

function contains(text: string, word: string) {
  if (hasHan.test(word)) return text.includes(word);
  // Match short acronyms as words so SC does not match “description”.
  if (/^[a-z0-9]{1,3}$/.test(word)) return (' ' + text + ' ').includes(' ' + word + ' ');
  return text.includes(word);
}

function oneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let start = 0;
  while (start < a.length && a[start] === b[start]) start++;
  const tail = a.slice(start);
  const other = b.slice(start);
  if (a.length !== b.length) {
    return tail.length > other.length ? tail.slice(1) === other : tail === other.slice(1);
  }
  return tail.slice(1) === other.slice(1) ||
    (tail[0] === other[1] && tail[1] === other[0] && tail.slice(2) === other.slice(2));
}

function nearMatch(word: string, terms: string[]) {
  if (/^[a-z]{4,24}$/.test(word)) return terms.some(term => oneEdit(word, term));
  if (!/^\p{Script=Han}{3,16}$/u.test(word)) return false;
  return terms.some(term => {
    if (!hasHan.test(term) || term.length < word.length - 1) return false;
    for (let start = 0; start <= term.length - word.length + 1; start++) {
      for (const size of [word.length - 1, word.length, word.length + 1]) {
        if (start + size <= term.length && oneEdit(word, term.slice(start, start + size))) return true;
      }
    }
    return false;
  });
}

type SearchIndex = ReturnType<typeof prepareSearchIndex>;

export function searchSite(index: SearchIndex, input: string) {
  const query = normalize(input.slice(0, 120));
  if (!query) return [];
  const wholeAlias = aliasGroups.find(group => group.includes(query));
  const words = wholeAlias ? [query] : [...new Set(query.split(' '))];
  const alternatives = words.map(word => aliasGroups.find(group => group.includes(word))?.filter(alias => alias !== word) ?? []);
  const phrase = query.replace(/(\p{Script=Han}) (?=\p{Script=Han})/gu, '$1');

  return index.flatMap(({entry, title, keywords, body, terms}) => {
    let score = 0;
    let corrections = 0;
    for (const [i, word] of words.entries()) {
      const related = alternatives[i];
      if (contains(title, word)) score += 48;
      else if (contains(keywords, word) || related.some(alias => contains(title, alias))) score += 36;
      else if (related.some(alias => contains(keywords, alias))) score += 24;
      else if (contains(body, word)) score += 12;
      else if (related.some(alias => contains(body, alias))) score += 8;
      else if (corrections === 0 && nearMatch(word, terms)) { score += 4; corrections++; }
      else return [];
    }
    if (title === query) score += 40;
    else if (contains(title, query) || (phrase !== query && contains(title, phrase))) score += 12;
    return [{entry, score, approximate: corrections > 0}];
  }).sort((a, b) => Number(a.approximate) - Number(b.approximate) || b.score - a.score);
}
