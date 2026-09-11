import { resolve } from 'node:path';
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { readPhotoMetadata } from './photo-metadata';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/photos/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP,AVIF,GIF}',
);

type PhotoEntry = {
  id: string;
  data: Awaited<ReturnType<typeof readPhotoMetadata>> & { src: ImageMetadata };
};

export type Photo = PhotoEntry & {
  href: string;
  place: string;
  year: string;
  dateFull: string;
  time: string;
  stamp: string;
  alt: string;
  rows: { k: string; v: string }[];
  /** Camera wall-clock time, independent of the build machine's timezone. */
  sortKey: number;
};

export type Place = {
  name: string;
  meta: string;
  /** Oldest first, so a trip reads in order. Undated photos come last. */
  photos: Photo[];
};

function decorate(entry: PhotoEntry): Photo {
  const [day, clock] = entry.data.date.split('T');
  const [y, m, d] = day.split('-').map(Number);
  const [h = 0, min = 0, sec = 0] = clock?.split(':').map(Number) || [];
  const time = clock ? `${h % 12 || 12}:${String(min).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}` : '';
  const dateFull = day ? `${MONTHS[m - 1]} ${d}, ${y}` : 'Date unknown';
  const stamp = time ? `${dateFull} · ${time}` : dateFull;
  const place = entry.data.place || 'Unknown location';

  return {
    ...entry,
    href: `/photos/${entry.id.split('/').map(encodeURIComponent).join('/')}`,
    place,
    year: day ? String(y) : '',
    dateFull,
    time,
    stamp,
    alt: [entry.data.caption, entry.data.place].filter(Boolean).join(', '),
    rows: [
      ...(day ? [{ k: 'Date', v: stamp }] : []),
      ...(entry.data.place ? [{ k: 'Location', v: place }] : []),
      ...Object.entries(entry.data.exif).map(([k, v]) => ({ k, v })),
    ],
    sortKey: day ? Date.UTC(y, m - 1, d, h, min, sec) : Number.NEGATIVE_INFINITY,
  };
}

/** Discover every image directly, applying optional editorial Markdown overrides. */
export async function getPhotos(): Promise<Photo[]> {
  const entries = await getCollection('photos');
  const overrides = new Map(entries.map((entry) => [
    entry.filePath?.replace(/^src\/content\/photos\//, '').replace(/\.md$/, '') || entry.id,
    entry.data,
  ]));
  const paths = Object.keys(images);
  const stems = paths.map((path) => path.replace('/src/content/photos/', '').replace(/\.[^.]+$/, ''));
  const photos = await Promise.all(paths.map(async (path, index) => {
    const [image, metadata] = await Promise.all([
      images[path](),
      readPhotoMetadata(resolve(path.slice(1))),
    ]);
    // Keep existing URLs, but distinguish files with the same stem and different formats.
    const stem = stems[index];
    const editorial = overrides.get(stem);
    const place = [editorial?.city, editorial?.country].filter(Boolean).join(', ');
    const id = stems.indexOf(stem) !== stems.lastIndexOf(stem)
      ? path.replace('/src/content/photos/', '')
      : stem;
    return decorate({ id, data: {
      ...metadata,
      caption: editorial?.caption || metadata.caption,
      place: place || metadata.place,
      src: image.default,
    } });
  }));
  return photos.sort((a, b) => b.sortKey - a.sortKey || a.id.localeCompare(b.id));
}

/** Photos of one place, oldest first, with undated photos last. */
export function fromPlace(photos: Photo[], place: string): Photo[] {
  return photos.filter((p) => p.place === place).sort((a, b) =>
    Number(!a.data.date) - Number(!b.data.date) || a.sortKey - b.sortKey || a.id.localeCompare(b.id),
  );
}

/** Places ordered by their most recent photo. */
export function groupByPlace(photos: Photo[]): Place[] {
  return [...new Set(photos.map((photo) => photo.place))].map((name) => {
    const shots = fromPlace(photos, name);
    const years = shots.map((photo) => photo.year).filter(Boolean);
    const first = years[0];
    const last = years[years.length - 1];
    const span = first === last ? first : `${first}–${last}`;
    const count = `${shots.length} ${shots.length === 1 ? 'frame' : 'frames'}`;
    return { name, meta: span ? `${count} · ${span}` : count, photos: shots };
  });
}
