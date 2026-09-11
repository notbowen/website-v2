import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../site';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type Post = CollectionEntry<'blog'> & {
  slug: string;
  href: string;
  year: string;
  dateIso: string;
  dateFull: string;
  readTime: string;
  lede: string;
  tagLine: string;
  /** Lower-cased text used by the client-side search. */
  haystack: string;
};

// Dates in frontmatter are parsed as UTC midnight, so format with UTC getters
// to avoid the day shifting in negative-offset timezones.
function decorate(entry: CollectionEntry<'blog'>): Post {
  const d = entry.data.date;
  const year = String(d.getUTCFullYear());
  const month = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const dateIso = d.toISOString().slice(0, 10);
  const words = (entry.body ?? '').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / site.wordsPerMinute));
  const slug = entry.id;

  return {
    ...entry,
    slug,
    href: `/blog/${slug}`,
    year,
    dateIso,
    dateFull: `${month} ${day}, ${year}`,
    readTime: `${minutes} min read`,
    lede: entry.data.lede ?? entry.data.excerpt,
    tagLine: entry.data.tags.join('  ·  '),
    haystack: [entry.data.title, entry.data.excerpt, ...entry.data.tags].join(' ').toLowerCase(),
  };
}

/** All publishable posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const entries = await getCollection('blog', ({ data }) => !(import.meta.env.PROD && data.draft));
  return entries
    .map(decorate)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.data.title.localeCompare(b.data.title));
}

export function tagCounts(posts: Post[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of posts) for (const t of p.data.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));
}

export function groupByYear(posts: Post[]): { year: string; items: Post[] }[] {
  const groups: { year: string; items: Post[] }[] = [];
  for (const p of posts) {
    const last = groups[groups.length - 1];
    if (last && last.year === p.year) last.items.push(p);
    else groups.push({ year: p.year, items: [p] });
  }
  return groups;
}
