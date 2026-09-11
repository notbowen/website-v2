// Turns the Typst résumé in src/content/resume.typ into a structured model
// the /resume page can render. The Typst file uses RenderCV's functions
// (`education-entry`, `regular-entry`, `connections`, …); this module knows
// what those mean. Generic Typst parsing lives in ./typst.ts.

import source from '../content/resume.typ?raw';
import {
  parseTypst,
  plainText,
  argContent,
  argBlocks,
  argBool,
  argString,
  blocksToInlines,
  type Args,
  type Block,
  type Inline,
} from './typst';

export type Entry = {
  type: 'entry';
  kind: 'education' | 'regular';
  /** First row of the main column: institution / company / project name. */
  title: Inline[];
  /** Role or programme, when the title follows RenderCV's `*Org*, Role -- Location` shape. */
  role: Inline[];
  location: Inline[];
  date: Inline[];
  /** `Dip.`, `BS`, … — only education entries have one. */
  degree: Inline[];
  /** Summary lines shown before the highlights. */
  notes: Inline[][];
  highlights: Inline[][];
};

export type Grid = { type: 'grid'; columns: number; rows: Inline[][][] };
export type Paragraph = { type: 'paragraph'; children: Inline[] };
export type List = { type: 'list'; items: Inline[][] };

export type ResumeBlock = Entry | Grid | Paragraph | List;
export type Section = { title: string; blocks: ResumeBlock[] };

export type Resume = {
  name: string;
  /** Location, email, profile links — each already rendered as inline content. */
  connections: Inline[][];
  /** The `top-note` from the RenderCV settings, e.g. "Last updated in Aug 2026". */
  topNote?: Inline[];
  sections: Section[];
};

export const resume: Resume = interpret(parseTypst(source));

function interpret(blocks: Block[]): Resume {
  const out: Resume = { name: '', connections: [], sections: [] };
  let section: Section | null = null;

  for (const b of blocks) {
    if (b.type === 'show') {
      if (b.call && argBool(b.call.args, 'page-show-top-note') !== false) {
        const note = argContent(b.call.args, 'top-note');
        if (note.length) out.topNote = note;
      }
      if (!out.name && b.call) out.name = argString(b.call.args, 'name') ?? '';
      continue;
    }
    if (b.type === 'heading') {
      if (b.level === 1) {
        out.name = plainText(b.children);
      } else {
        section = { title: plainText(b.children), blocks: [] };
        out.sections.push(section);
      }
      continue;
    }
    if (b.type === 'call' && b.name === 'connections') {
      out.connections.push(...b.args.positional.map((v) => blocksToInlines(argBlocks({ positional: [v], named: {} }, 0))));
      continue;
    }
    const converted = toResumeBlock(b);
    if (!converted) continue;
    if (!section) {
      section = { title: '', blocks: [] };
      out.sections.push(section);
    }
    section.blocks.push(converted);
  }
  return out;
}

function toResumeBlock(b: Block): ResumeBlock | null {
  switch (b.type) {
    case 'paragraph':
    case 'list':
      return b;
    case 'call':
      switch (b.name) {
        case 'education-entry':
          return entry('education', b.args);
        case 'regular-entry':
        case 'experience-entry':
        case 'normal-entry':
          return entry('regular', b.args);
        case 'grid':
        case 'table':
          return grid(b.args);
        case 'summary':
          return { type: 'paragraph', children: argContent(b.args, 0) };
        default: {
          const children = blocksToInlines(argBlocks(b.args, 0));
          return children.length ? { type: 'paragraph', children } : null;
        }
      }
    default:
      return null;
  }
}

function entry(kind: Entry['kind'], args: Args): Entry {
  const notes: Inline[][] = [];
  const highlights: Inline[][] = [];
  for (const b of argBlocks(args, 'main-column-second-row')) {
    if (b.type === 'list') highlights.push(...b.items);
    else if (b.type === 'call' && b.name === 'summary') notes.push(argContent(b.args, 0));
    else if (b.type === 'paragraph') notes.push(b.children);
  }
  const { title, role, location } = splitTitle(argContent(args, 0));
  return {
    type: 'entry',
    kind,
    title,
    role,
    location,
    date: argContent(args, 1),
    degree: argContent(args, 'degree-column'),
    notes,
    highlights,
  };
}

/**
 * RenderCV writes an entry's first row as `*Organisation*, Role -- Location`.
 * Pull those apart so the page can lay them out separately. Titles that don't
 * follow the shape (e.g. a project name) come back unchanged.
 */
function splitTitle(inlines: Inline[]): { title: Inline[]; role: Inline[]; location: Inline[] } {
  if (inlines[0]?.type !== 'strong' || inlines.length < 2) return { title: inlines, role: [], location: [] };
  const title = [inlines[0]];
  const rest = inlines.slice(1).map((n) => ({ ...n }));
  const first = rest[0];
  if (first.type === 'text') first.value = first.value.replace(/^\s*,\s*/, '');

  // The location follows the last " – " / " — " in the text.
  let role = rest;
  let location: Inline[] = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const n = rest[i];
    if (n.type !== 'text') continue;
    const m = /\s+[–—]\s+(?!.*\s[–—]\s)/.exec(n.value);
    if (!m) continue;
    role = [...rest.slice(0, i), { type: 'text', value: n.value.slice(0, m.index) }];
    location = [{ type: 'text', value: n.value.slice(m.index + m[0].length) }, ...rest.slice(i + 1)];
    break;
  }
  const clean = (list: Inline[]) => list.filter((n) => n.type !== 'text' || n.value.trim() !== '');
  return { title, role: clean(role), location: clean(location) };
}

function grid(args: Args): Grid {
  const columnsArg = args.named['columns'];
  const columns =
    columnsArg?.type === 'array' ? columnsArg.items.length : columnsArg?.type === 'num' && !columnsArg.unit ? columnsArg.value : 1;
  const cells = args.positional.map((v) => blocksToInlines(argBlocks({ positional: [v], named: {} }, 0)));
  const rows: Inline[][][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
  return { type: 'grid', columns, rows };
}

// ---- HTML rendering ---------------------------------------------------------

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** Renders inline content to an HTML string. Safe to use with `set:html`. */
export function html(inlines: Inline[]): string {
  return inlines
    .map((n) => {
      switch (n.type) {
        case 'text':
          return escape(n.value);
        case 'break':
          return '<br />';
        case 'strong':
          return `<strong>${html(n.children)}</strong>`;
        case 'emph':
          return `<em>${html(n.children)}</em>`;
        case 'super':
          return `<sup>${html(n.children)}</sup>`;
        case 'sub':
          return `<sub>${html(n.children)}</sub>`;
        case 'span':
          return html(n.children);
        case 'link': {
          const external = /^https?:/.test(n.url);
          return `<a href="${escape(n.url)}"${external ? ' rel="noopener"' : ''}>${html(n.children)}</a>`;
        }
      }
    })
    .join('');
}

export { plainText };
