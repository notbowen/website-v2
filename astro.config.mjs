// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Set this to the deployed URL once you have one (used for canonical links, sitemaps, RSS).
  // site: 'https://example.com',
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },

  adapter: cloudflare({
    prerenderEnvironment: 'node',
    imageService: 'compile',
  }),
});
