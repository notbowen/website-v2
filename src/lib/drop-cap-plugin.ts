import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';
import { splitInitial } from './dropcaps';

type HastPluginEntry = NonNullable<SatteriProcessorOptions['hastPlugins']>[number];

/**
 * Sätteri hast plugin that wraps the opening letter of a blog post's first
 * paragraph in `<span class="dropcap"><span>T</span></span>`; the post page
 * picks the design. Posts with a lede (or an excerpt standing in for one) get
 * the drop cap on the lede instead, and `dropcap: none` turns it off.
 */
export const dropCapPlugin: HastPluginEntry = ({ fileURL, data }) => {
  if (!fileURL?.pathname.includes('/content/blog/')) return null;

  const frontmatter = data.astro?.frontmatter ?? {};
  if (frontmatter.dropcap === 'none' || frontmatter.lede || frontmatter.excerpt) return null;

  let done = false;
  return {
    name: 'drop-cap',
    element: {
      filter: ['p'],
      visit(node, ctx) {
        // Only the first top-level paragraph, not one inside a list or quote.
        if (done || ctx.parent(node)?.type !== 'root') return;
        done = true;

        const first = node.children[0];
        if (first?.type !== 'text') return;
        const split = splitInitial(first.value);
        if (!split) return;

        ctx.removeChildAt(node, 0);
        ctx.prependChild(node, [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['dropcap'] },
            children: [{ type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: split[0] }] }],
          },
          { type: 'text', value: split[1] },
        ]);
      },
    },
  };
};
