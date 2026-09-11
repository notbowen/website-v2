import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    /** ISO date, e.g. 2026-07-14 */
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    /** Optional summary used in search and as the meta description. */
    excerpt: z.string().optional(),
    /** Opening paragraph shown large at the top of the post. Falls back to `excerpt`. */
    lede: z.string().optional(),
    /** Drafts are visible in `astro dev` but excluded from the production build. */
    draft: z.boolean().default(false),
  }),
});

const photos = defineCollection({
  loader: glob({ base: './src/content/photos', pattern: '**/*.md' }),
  schema: z.object({
    /** Optional editorial overrides; technical metadata comes from the image. */
    caption: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
});

export const collections = { blog, photos };
