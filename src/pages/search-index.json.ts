import {chapters, courses, lessons, markdown, url, type Lesson} from '../lib/catalog';
import {labIds, labTitle, registry} from '../lib/labs';
import type {SearchEntry} from '../lib/search';

function plainText(markdownText: string) {
  return markdownText
    .replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*/gm, ' ')
    .replace(/!\[[^\]]*\]\([^\n)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\n)]*\)/g, '$1')
    .replace(/<[^>]+>|\\[a-zA-Z]+\b|[#*_`$>{}\\]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function GET() {
  const entries: SearchEntry[] = [];
  const documents: Lesson[] = [...lessons];
  const problemTitles = new Set(lessons.filter(lesson => lesson.kind === 'problem').map(lesson => lesson.title));
  for (const chapter of chapters) {
    if (!documents.some(lesson => lesson.id === chapter.id)) {
      documents.push({...chapter, chapter: chapter.id, kind: 'chapter', source: '', search: ''});
    }
  }

  for (const lesson of documents) {
    const path = url('study/' + lesson.id + '/');
    const chapter = chapters.findIndex(chapter => chapter.id === lesson.chapter);
    const context = chapters[chapter]?.title ?? courses.find(course => course.id === lesson.course)?.title;
    const isChapter = lesson.kind === 'chapter';
    entries.push({
      id: lesson.id, title: lesson.title, url: path, kind: lesson.kind, chapter: lesson.chapter,
      context, keywords: isChapter ? context : undefined, search: plainText(lesson.search)
    });
    if (lesson.kind !== 'problem') {
      for (const heading of markdown(lesson.id)?.getHeadings() ?? []) {
        if (heading.depth < 2 || heading.depth > 4) continue;
        if (lesson.kind === 'exercise' && problemTitles.has(heading.text)) continue;
        entries.push({
          id: lesson.id + '#' + heading.slug, title: heading.text,
          url: path + '#' + encodeURIComponent(heading.slug), kind: 'section', context: lesson.title
        });
      }
    }
    if (isChapter && lesson.course === 'solid-state-physics') {
      for (const id of labIds(lesson.id, chapter, true)) {
        entries.push({
          id: 'lab-' + id, title: labTitle(id), url: path + '#lab-' + id, kind: 'lab', context,
          search: registry[id]?.description
        });
      }
    }
  }
  for (const course of courses) {
    entries.push({id: 'course-' + course.id, title: course.title, url: url('subjects/' + course.id + '/'), kind: 'course'});
  }
  if (lessons.some(lesson => lesson.course === 'mathematics')) {
    entries.push({id: 'course-mathematics', title: '数学', url: url('subjects/mathematics/'), kind: 'course'});
  }
  entries.push(
    {id: 'practice', title: '习题训练', url: url('practice/'), kind: 'page', keywords: '题库 专项习题'},
    {id: 'review', title: '总复习与习题指导', url: url('review/'), kind: 'page', keywords: '考试复习'},
    {id: 'formulas', title: '公式速查', url: url('formulas/'), kind: 'page', keywords: '公式索引'}
  );
  return Response.json(entries);
}
