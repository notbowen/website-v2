// Boxed drop caps for the first letter of each post. Each design is a framed
// 80 × 80 SVG in `public/dropcaps/<name>.svg`, drawn behind the letter.
// To add a design, drop its SVG in that folder and add its name here.

export const dropCaps = [
  'seigaiha',
  'shippo',
  'vine',
  'sunburst',
  'engraved',
  'night-sky',
  'illuminated',
  'woodcut',
] as const;

export type DropCap = (typeof dropCaps)[number];

/** Used when a post doesn't set `dropcap` in its frontmatter. */
export const defaultDropCap: DropCap = 'seigaiha';

export const dropCapUrl = (name: DropCap) => `/dropcaps/${name}.svg`;

/**
 * Splits off the opening letter when the text starts with one. Text that opens
 * with punctuation, a digit, or an emoji gets no drop cap.
 */
export function splitInitial(text: string): [string, string] | null {
  const match = /^\p{L}/u.exec(text);
  return match ? [match[0], text.slice(match[0].length)] : null;
}
