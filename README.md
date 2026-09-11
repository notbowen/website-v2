# website-v2

Personal site built with [Astro](https://astro.build): an about page, a Markdown blog with search and tag filters, and a résumé.

## Commands

| Command             | Action                                        |
| :------------------ | :-------------------------------------------- |
| `pnpm install`      | Install dependencies                          |
| `pnpm dev`          | Start the dev server at `localhost:4321`      |
| `pnpm build`        | Build the production site to `./dist/`        |
| `pnpm preview`      | Preview the build locally                     |
| `pnpm astro check`  | Type-check `.astro` and `.ts` files           |
| `pnpm test`         | Test photo metadata extraction               |

## Writing a post

Add a Markdown file to `src/content/blog/`. The filename becomes the URL, so `src/content/blog/my-post.md` is served at `/blog/my-post`.

```md
---
title: Retries are a product decision
date: 2026-05-02
tags: [distributed-systems, reliability]
draft: false
---

Body in Markdown. Headings (`##`), block quotes, fenced code, and lists are styled to match the design.
```

Frontmatter fields:

- `title` and `date` are required. `date` is an ISO date such as `2026-05-02`.
- `tags` is a list of strings. The blog index builds its filter buttons from these.
- `excerpt` is optional. When provided, it appears in search, as the meta description, and as the lede when `lede` is omitted. Without it, the meta description uses the site default. Quote it if it contains a colon.
- `lede` is optional. It adds an opening paragraph shown large above the body. If both `lede` and `excerpt` are omitted, the post starts directly with the Markdown body.
- `draft: true` shows the post in `pnpm dev` but leaves it out of the production build.

Reading time is computed from the word count. Posts are sorted newest first, and the previous/next links at the bottom of each post follow that order.

## Adding photos

Drop images into `src/content/photos/` (subdirectories are supported). The photos index and detail pages are generated automatically at build time. Supported formats are JPEG, PNG, WebP, AVIF, and GIF, with lowercase or uppercase extensions.

The site reads embedded EXIF, IPTC, and XMP metadata for the capture date, camera, lens, exposure, focal length, title, and location. Capture times retain the camera's local clock time. Titles fall back to readable filenames, photos without location names appear under “Unknown location,” and missing camera settings are omitted. Undated photos appear last. Location names must be embedded in the image; GPS coordinates are not reverse-geocoded.

To customize the title and location, add a Markdown file beside the image with the same filename stem. All three fields are optional:

```md
---
caption: "Hakone-Yumoto Station"
city: "Hakone"
country: "Japan"
---
```

These fields override embedded titles and location names. Dates and camera settings are always extracted from the image; do not add `date`, `src`, or `exif` to Markdown. Photos without a Markdown file still appear automatically.

For example, `src/content/photos/hakone-night.jpg` uses `hakone-night.md` and appears at `/photos/hakone-night`. Nested directories are retained in the URL. If two images share a path without the extension, their URLs include their extensions to distinguish them and they share the same Markdown overrides.

Camera names are normalized in `src/lib/photo-metadata.ts`: Sony's `ILCE-6400` (or `ILCE6400`) is displayed as `Sony α6400`. Unrecognized models use their embedded manufacturer/model names.

## Where things live

- `src/site.ts` holds the name, description, email, links, and reading-time setting.
- `src/pages/index.astro` is the about page copy.
- `src/data/resume.ts` is the résumé content.
- `src/styles/global.css` holds the site colors and Markdown typography.
- `src/content.config.ts` defines the blog and optional photo frontmatter schemas.
