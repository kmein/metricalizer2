import { normWord } from "./text.ts";
import type { Line } from "./types.ts";

const NORMALISE: [RegExp, string][] = [
  [/ie/g, "i"],
  [/([aeiouäöüy])h(?=[^aeiouäöüy]|$)/g, "$1"],
  [/aa/g, "a"],
  [/ee/g, "e"],
  [/oo/g, "o"],
  [/äu/g, "eu"],
  [/a[iy]|ey/g, "ei"],
  [/ä/g, "e"],
  [/y/g, "i"],
  [/ß|ss/g, "s"],
  [/th/g, "t"],
  [/dt/g, "t"],
  [/tz/g, "z"],
  [/ck/g, "k"],
  [/ph/g, "f"],
  [/([^aeiouäöü])\1+/g, "$1"],
  [/d$/, "t"],
  [/b$/, "p"],
  [/g$/, "k"],
];

/** sound of the line from its last lift on */
export function rhymeKey(line: Pick<Line, "syllables">): string {
  const syl = line.syllables;
  let start = syl.findLastIndex((s) => s.meter === 1);
  if (start < 0) start = syl.length - 1;
  let key = syl.slice(start).map((s, i) => (i === 0 ? "" : s.onset) + s.nucleus + s.coda).join("");
  key = key.replace(/[^\p{L}]/gu, "");
  for (const [re, to] of NORMALISE) key = key.replace(re, to);
  return key;
}

function letter(i: number): string {
  return String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");
}

/** letters run across the whole poem, so a line can rhyme with one in another stanza */
export function rhymeScheme(lines: Pick<Line, "syllables" | "words">[]): string[] {
  const keys = lines.map(rhymeKey);
  const lastWords = lines.map((l) => normWord(l.words[l.words.length - 1] ?? ""));
  const letters: string[] = [];
  let next = 0;
  lines.forEach((_, i) => {
    const j = keys.findIndex((k, j) => j < i && k === keys[i] && lastWords[j] !== lastWords[i]);
    letters.push(j >= 0 ? letters[j] : letter(next++));
  });
  return letters;
}
