// A small parser for the subset of Typst markup used by résumé documents
// (RenderCV-style). It is not a full Typst implementation: it understands
// markup (headings, paragraphs, lists, `*strong*`, `_emph_`, escapes, dashes),
// `#function(args)[content]` calls with code-mode arguments (strings, numbers,
// idents, arrays, nested calls, content blocks), and `#show`/`#set`/`#import`
// preamble lines. Anything it doesn't understand is skipped rather than fatal.

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'emph'; children: Inline[] }
  | { type: 'super'; children: Inline[] }
  | { type: 'sub'; children: Inline[] }
  | { type: 'link'; url: string; children: Inline[] }
  /** A styling wrapper with no semantic meaning (`#text(...)[…]`, `#underline[…]`, …). */
  | { type: 'span'; children: Inline[] }
  | { type: 'break' };

export type Block =
  | { type: 'heading'; level: number; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; items: Inline[][] }
  /** A `#name(...)` call that isn't a built-in inline function. */
  | { type: 'call'; name: string; args: Args }
  /** `#show: name.with(...)` — `call` is null for `#show: none` and friends. */
  | { type: 'show'; call: { name: string; args: Args } | null };

export type Value =
  | { type: 'str'; value: string }
  | { type: 'content'; blocks: Block[] }
  | { type: 'num'; value: number; unit: string }
  | { type: 'ident'; name: string }
  | { type: 'call'; name: string; args: Args }
  | { type: 'array'; items: Value[] }
  | { type: 'code'; raw: string };

export type Args = { positional: Value[]; named: Record<string, Value> };

export class TypstSyntaxError extends Error {
  readonly offset: number;
  constructor(message: string, offset: number) {
    super(`${message} (at offset ${offset})`);
    this.offset = offset;
  }
}

const IDENT_RE = /[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*(?:\.[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*)*/y;
const NUMBER_RE = /-?\d+(?:\.\d+)?(?:%|[a-zA-Z]+)?/y;

/** Built-in Typst functions that produce inline content. */
const INLINE_CALLS: Record<string, Inline['type'] | 'plain'> = {
  strong: 'strong',
  emph: 'emph',
  super: 'super',
  sub: 'sub',
  underline: 'plain',
  smallcaps: 'plain',
  text: 'plain',
  box: 'plain',
  raw: 'plain',
};

type Stops = { bracket?: boolean; star?: boolean; underscore?: boolean; newline?: boolean };

class Parser {
  private pos = 0;
  private readonly src: string;
  constructor(src: string) {
    this.src = src;
  }

  parseDocument(): Block[] {
    const blocks = this.parseContent({});
    if (this.pos < this.src.length) throw new TypstSyntaxError(`Unexpected "${this.src[this.pos]}"`, this.pos);
    return blocks;
  }

  // ---- markup mode -------------------------------------------------------

  private parseContent(stops: Stops): Block[] {
    const blocks: Block[] = [];
    let current: { kind: 'paragraph' | 'item'; children: Inline[] } | null = null;
    let atLineStart = true;
    let depth = 0; // literal, balanced `[` `]` inside markup

    const push = (node: Inline) => {
      if (!current) current = { kind: 'paragraph', children: [] };
      appendInline(current.children, node);
    };
    const flush = () => {
      if (!current) return;
      const children = trimInlines(current.children);
      if (current.kind === 'item') {
        const last = blocks[blocks.length - 1];
        if (last?.type === 'list') last.items.push(children);
        else blocks.push({ type: 'list', items: [children] });
      } else if (children.length) {
        blocks.push({ type: 'paragraph', children });
      }
      current = null;
    };

    const src = this.src;
    while (this.pos < src.length) {
      const ch = src[this.pos];

      // Whitespace: a single newline is a space; a blank line ends the block.
      if (/\s/.test(ch)) {
        let newlines = 0;
        const start = this.pos;
        while (this.pos < src.length && /\s/.test(src[this.pos])) {
          if (src[this.pos] === '\n') newlines++;
          this.pos++;
        }
        if (stops.newline && newlines > 0) {
          this.pos = start + src.slice(start, this.pos).indexOf('\n');
          break;
        }
        if (newlines >= 2) flush();
        else if (current) push({ type: 'text', value: ' ' });
        if (newlines > 0) atLineStart = true;
        continue;
      }

      if (atLineStart) {
        atLineStart = false;
        // Line comment
        if (src.startsWith('//', this.pos)) {
          this.skipLine();
          continue;
        }
        // Heading: `= Title`
        const heading = /^(=+)[ \t]+/.exec(src.slice(this.pos, this.pos + 8));
        if (heading) {
          flush();
          this.pos += heading[0].length;
          const inner = this.parseContent({ ...stops, newline: true });
          blocks.push({ type: 'heading', level: heading[1].length, children: blocksToInlines(inner) });
          continue;
        }
        // List item: `- text`
        if (ch === '-' && /[ \t]/.test(src[this.pos + 1] ?? '')) {
          flush();
          this.pos += 2;
          current = { kind: 'item', children: [] };
          continue;
        }
      }

      if (ch === ']') {
        if (depth > 0) {
          depth--;
          this.pos++;
          push({ type: 'text', value: ']' });
          continue;
        }
        if (stops.bracket) break;
        throw new TypstSyntaxError('Unmatched "]"', this.pos);
      }
      if (ch === '[') {
        depth++;
        this.pos++;
        push({ type: 'text', value: '[' });
        continue;
      }
      if (ch === '*') {
        if (stops.star) break;
        this.pos++;
        const inner = this.parseContent({ ...stops, star: true });
        this.expect('*');
        push({ type: 'strong', children: blocksToInlines(inner) });
        continue;
      }
      if (ch === '_') {
        if (stops.underscore) break;
        const prev = src[this.pos - 1] ?? ' ';
        const next = src[this.pos + 1] ?? ' ';
        if (!/[\w]/.test(prev) && /\S/.test(next)) {
          this.pos++;
          const inner = this.parseContent({ ...stops, underscore: true });
          this.expect('_');
          push({ type: 'emph', children: blocksToInlines(inner) });
          continue;
        }
      }
      if (ch === '\\') {
        const next = src[this.pos + 1];
        this.pos += 2;
        if (next === undefined) break;
        if (next === '\n' || (next === ' ' && (src[this.pos] === '\n' || this.pos >= src.length))) {
          push({ type: 'break' });
        } else if (next === 'u' && src[this.pos] === '{') {
          const end = src.indexOf('}', this.pos);
          push({ type: 'text', value: String.fromCodePoint(parseInt(src.slice(this.pos + 1, end), 16)) });
          this.pos = end + 1;
        } else {
          push({ type: 'text', value: next });
        }
        continue;
      }
      if (ch === '/' && src[this.pos + 1] === '/') {
        this.skipLine();
        continue;
      }
      if (ch === '#') {
        const node = this.parseHashExpr();
        if (node === null) continue;
        if ('type' in node && (node.type === 'call' || node.type === 'show')) {
          flush();
          blocks.push(node);
        } else {
          push(node as Inline);
        }
        continue;
      }
      if (ch === '-' && src.startsWith('---', this.pos)) {
        this.pos += 3;
        push({ type: 'text', value: '—' });
        continue;
      }
      if (ch === '-' && src[this.pos + 1] === '-') {
        this.pos += 2;
        push({ type: 'text', value: '–' });
        continue;
      }
      if (ch === '~') {
        this.pos++;
        push({ type: 'text', value: ' ' });
        continue;
      }

      // Plain text run.
      let end = this.pos + 1;
      while (end < src.length && !/[\s\[\]*_\\#~\-/]/.test(src[end])) end++;
      push({ type: 'text', value: src.slice(this.pos, end) });
      this.pos = end;
    }

    flush();
    return blocks;
  }

  /** Parses what follows a `#` in markup. Returns an inline, a block, or null. */
  private parseHashExpr(): Inline | Block | null {
    this.pos++; // '#'
    const start = this.pos;
    const name = this.readIdent();
    if (!name) throw new TypstSyntaxError('Expected identifier after "#"', start);

    switch (name) {
      case 'import':
      case 'let':
        this.skipLine();
        return null;
      case 'set':
        this.skipSpaces();
        this.readIdent();
        if (this.src[this.pos] === '(') this.parseArgs();
        return null;
      case 'show': {
        this.skipSpaces();
        if (this.src[this.pos] !== ':') {
          this.skipLine();
          return null;
        }
        this.pos++;
        this.skipSpaces();
        const target = this.readIdent();
        if (!target) {
          this.skipLine();
          return null;
        }
        this.skipSpaces();
        const args = this.src[this.pos] === '(' ? this.parseArgs() : { positional: [], named: {} };
        return { type: 'show', call: target === 'none' ? null : { name: target, args } };
      }
    }

    const args = this.src[this.pos] === '(' ? this.parseArgs() : { positional: [], named: {} };
    while (this.src[this.pos] === '[') args.positional.push(this.parseContentBlock());
    return inlineCall(name, args) ?? { type: 'call', name, args };
  }

  private parseContentBlock(): Value {
    this.expect('[');
    const blocks = this.parseContent({ bracket: true });
    this.expect(']');
    return { type: 'content', blocks };
  }

  // ---- code mode ---------------------------------------------------------

  private parseArgs(): Args {
    this.expect('(');
    const args: Args = { positional: [], named: {} };
    for (;;) {
      this.skipCodeSpace();
      if (this.src[this.pos] === ')') break;
      if (this.pos >= this.src.length) throw new TypstSyntaxError('Unterminated argument list', this.pos);

      const save = this.pos;
      const key = this.readIdent();
      this.skipCodeSpace();
      if (key && this.src[this.pos] === ':') {
        this.pos++;
        this.skipCodeSpace();
        args.named[key] = this.parseExpr();
      } else {
        this.pos = save;
        args.positional.push(this.parseExpr());
      }
      this.skipCodeSpace();
      if (this.src[this.pos] === ',') this.pos++;
      else if (this.src[this.pos] !== ')') throw new TypstSyntaxError('Expected "," or ")"', this.pos);
    }
    this.pos++; // ')'
    return args;
  }

  private parseExpr(): Value {
    const src = this.src;
    const ch = src[this.pos];

    if (ch === '"') return { type: 'str', value: this.readString() };
    if (ch === '[') return this.parseContentBlock();
    if (ch === '{') return { type: 'code', raw: this.skipBalanced() };
    if (ch === '(') {
      // Parenthesised expression, array, or dictionary. Arrays are what we need.
      this.pos++;
      const items: Value[] = [];
      for (;;) {
        this.skipCodeSpace();
        if (src[this.pos] === ')') break;
        const save = this.pos;
        const key = this.readIdent();
        this.skipCodeSpace();
        if (key && src[this.pos] === ':') {
          this.pos++;
          this.skipCodeSpace();
          this.parseExpr(); // dictionary value; keys are dropped
        } else {
          this.pos = save;
          items.push(this.parseExpr());
        }
        this.skipCodeSpace();
        if (src[this.pos] === ',') this.pos++;
        else if (src[this.pos] !== ')') throw new TypstSyntaxError('Expected "," or ")"', this.pos);
      }
      this.pos++;
      return items.length === 1 ? items[0] : { type: 'array', items };
    }

    NUMBER_RE.lastIndex = this.pos;
    const num = NUMBER_RE.exec(src);
    if (num && /\d/.test(num[0][0] === '-' ? num[0][1] : num[0][0])) {
      this.pos = NUMBER_RE.lastIndex;
      const m = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(num[0])!;
      return { type: 'num', value: Number(m[1]), unit: m[2] };
    }

    const name = this.readIdent();
    if (!name) throw new TypstSyntaxError(`Unexpected "${ch}" in code`, this.pos);
    if (name === 'context') {
      this.skipCodeSpace();
      const inner = this.parseExpr();
      return { type: 'code', raw: inner.type === 'code' ? inner.raw : '' };
    }
    if (src[this.pos] === '(' || src[this.pos] === '[') {
      const args = src[this.pos] === '(' ? this.parseArgs() : { positional: [], named: {} };
      while (src[this.pos] === '[') args.positional.push(this.parseContentBlock());
      return { type: 'call', name, args };
    }
    return { type: 'ident', name };
  }

  // ---- low-level helpers -------------------------------------------------

  private readIdent(): string | null {
    IDENT_RE.lastIndex = this.pos;
    const m = IDENT_RE.exec(this.src);
    if (!m) return null;
    this.pos = IDENT_RE.lastIndex;
    return m[0];
  }

  private readString(): string {
    this.expect('"');
    let out = '';
    while (this.pos < this.src.length && this.src[this.pos] !== '"') {
      const ch = this.src[this.pos++];
      if (ch === '\\') {
        const next = this.src[this.pos++];
        out += next === 'n' ? '\n' : next === 't' ? '\t' : (next ?? '');
      } else out += ch;
    }
    this.expect('"');
    return out;
  }

  /** Skips a balanced `{...}` / `(...)` / `[...]` group and returns its raw text. */
  private skipBalanced(): string {
    const start = this.pos;
    let depth = 0;
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === '"') {
        this.readString();
        continue;
      }
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') {
        depth--;
        if (depth === 0) {
          this.pos++;
          return this.src.slice(start, this.pos);
        }
      }
      this.pos++;
    }
    throw new TypstSyntaxError('Unterminated block', start);
  }

  private skipSpaces() {
    while (this.pos < this.src.length && /[ \t]/.test(this.src[this.pos])) this.pos++;
  }

  private skipCodeSpace() {
    for (;;) {
      while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
      if (this.src.startsWith('//', this.pos)) this.skipLine();
      else if (this.src.startsWith('/*', this.pos)) {
        const end = this.src.indexOf('*/', this.pos + 2);
        this.pos = end === -1 ? this.src.length : end + 2;
      } else return;
    }
  }

  private skipLine() {
    const end = this.src.indexOf('\n', this.pos);
    this.pos = end === -1 ? this.src.length : end;
  }

  private expect(ch: string) {
    if (this.src[this.pos] !== ch) throw new TypstSyntaxError(`Expected "${ch}"`, this.pos);
    this.pos++;
  }
}

/** Maps a built-in inline function call to an inline node, or null if `name` isn't one. */
export function inlineCall(name: string, args: Args): Inline | null {
  if (name === 'link') {
    const [target, body] = args.positional;
    const url = target?.type === 'str' ? target.value : '';
    const children = body ? valueToInlines(body) : [{ type: 'text', value: url.replace(/^mailto:/, '') } as Inline];
    return { type: 'link', url, children };
  }
  if (name === 'linebreak') return { type: 'break' };
  const kind = INLINE_CALLS[name];
  if (!kind) return null;
  const body = args.positional[args.positional.length - 1];
  const children = body ? valueToInlines(body) : [];
  if (kind === 'plain') return children.length === 1 ? children[0] : { type: 'span', children };
  return { type: kind, children } as Inline;
}

/** Flattens a code-mode value to inline content. */
export function valueToInlines(v: Value): Inline[] {
  switch (v.type) {
    case 'str':
      return [{ type: 'text', value: v.value }];
    case 'content':
      return blocksToInlines(v.blocks);
    case 'call':
      return [inlineCall(v.name, v.args) ?? { type: 'text', value: plainText(callChildren(v.args)) }];
    case 'num':
      return [{ type: 'text', value: `${v.value}${v.unit}` }];
    case 'array':
      return v.items.flatMap(valueToInlines);
    default:
      return [];
  }
}

function callChildren(args: Args): Inline[] {
  return args.positional.filter((a) => a.type === 'content').flatMap(valueToInlines);
}

/** Joins the inline content of blocks with line breaks (for content used inline). */
export function blocksToInlines(blocks: Block[]): Inline[] {
  const out: Inline[] = [];
  for (const b of blocks) {
    const part: Inline[] =
      b.type === 'paragraph' || b.type === 'heading'
        ? b.children
        : b.type === 'list'
          ? b.items.flatMap((item, i) => (i ? [{ type: 'break' } as Inline, ...item] : item))
          : b.type === 'call'
            ? callChildren(b.args)
            : [];
    if (!part.length) continue;
    if (out.length) out.push({ type: 'break' });
    out.push(...part);
  }
  return out;
}

export function plainText(inlines: Inline[]): string {
  return inlines
    .map((n) => (n.type === 'text' ? n.value : n.type === 'break' ? '\n' : plainText(n.children)))
    .join('');
}

function appendInline(list: Inline[], node: Inline) {
  const last = list[list.length - 1];
  if (node.type === 'text' && last?.type === 'text') {
    if (node.value === ' ' && last.value.endsWith(' ')) return;
    last.value += node.value;
  } else if (node.type === 'text' && node.value === ' ' && !last) {
    return; // no leading whitespace
  } else list.push(node);
}

function trimInlines(list: Inline[]): Inline[] {
  const out = list.slice();
  const first = out[0];
  if (first?.type === 'text') first.value = first.value.replace(/^\s+/, '');
  const last = out[out.length - 1];
  if (last?.type === 'text') last.value = last.value.replace(/\s+$/, '');
  return out.filter((n) => n.type !== 'text' || n.value !== '');
}

/** Parses Typst source into a list of blocks. */
export function parseTypst(src: string): Block[] {
  return new Parser(src.replace(/\r\n?/g, '\n')).parseDocument();
}

// ---- convenience accessors for code-mode values ----------------------------

export function argContent(args: Args, key: string | number): Inline[] {
  const v = typeof key === 'number' ? args.positional[key] : args.named[key];
  return v ? valueToInlines(v) : [];
}

export function argBlocks(args: Args, key: string | number): Block[] {
  const v = typeof key === 'number' ? args.positional[key] : args.named[key];
  if (!v) return [];
  if (v.type === 'content') return v.blocks;
  return [{ type: 'paragraph', children: valueToInlines(v) }];
}

export function argString(args: Args, key: string): string | undefined {
  const v = args.named[key];
  if (!v) return undefined;
  if (v.type === 'str') return v.value;
  if (v.type === 'ident') return v.name;
  if (v.type === 'num') return `${v.value}${v.unit}`;
  return plainText(valueToInlines(v));
}

export function argBool(args: Args, key: string): boolean | undefined {
  const v = args.named[key];
  if (v?.type === 'ident' && (v.name === 'true' || v.name === 'false')) return v.name === 'true';
  return undefined;
}
