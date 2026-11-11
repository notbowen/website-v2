// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import { satteri } from '@astrojs/markdown-satteri';
import { dropCapPlugin } from './src/lib/drop-cap-plugin.ts';

// https://astro.build/config
export default defineConfig({
  // Set this to the deployed URL once you have one (used for canonical links, sitemaps, RSS).
  // site: 'https://example.com',
  markdown: {
    processor: satteri({ hastPlugins: [dropCapPlugin] }),
    shikiConfig: {
      theme: 'github-light',
    },
  },

  adapter: cloudflare({
    prerenderEnvironment: 'node',
    imageService: 'compile',
  }),
});
