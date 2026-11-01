import { syllabify } from "./syllabify.ts";
import { normWord } from "./text.ts";
import type { Syllable } from "./types.ts";
import {
  ADVERB_COMPOUND,
  EXCEPTIONS,
  FUNCTION_WORDS,
  STEM_CLUSTERS,
  STRESSED_PREFIXES,
  STRESSED_SUFFIXES,
  UNSTRESSED_PREFIXES,
  UNSTRESSED_SUFFIXES,
} from "./wordlists.ts";

export const RULES = [
  { id: "EXCEPTION", weight: 4, description: "stressed syllable of a listed exception word" },
  { id: "EXCEPTION_UNSTRESSED", weight: -2, description: "unstressed syllable of a listed exception word" },
  { id: "FUNCTION_MONO", weight: -1, description: "monosyllabic function word" },
  { id: "CONTENT_MONO", weight: 2, description: "monosyllabic content word" },
  { id: "LINE_FINAL_MONO", weight: 2, description: "monosyllable at the end of the line" },
  { id: "ND_MONO", weight: 1, description: "monosyllable containing nd" },
  { id: "INITIAL", weight: 1, description: "first syllable of a polysyllable (stem-initial stress)" },
  { id: "ADVERB_COMPOUND", weight: -2, description: "first part of a pronominal adverb (herunter, darum)" },
  { id: "ADVERB_COMPOUND_STRESS", weight: 3, description: "second part of a pronominal adverb" },
  { id: "PREFIX_UNSTRESSED", weight: -3, description: "unstressed prefix be-, ge-, ver-, zer-, ent-, emp-, er-" },
  { id: "PREFIX_UNSTRESSED_STEM", weight: 1, description: "stem syllable after an unstressed prefix" },
  { id: "PREFIX_STRESSED", weight: 1, description: "stressed prefix un-, ur-" },
  { id: "SUFFIX_UNSTRESSED", weight: -2, description: "unstressed derivational suffix (-lich, -ung, -heit, …)" },
  { id: "SUFFIX_STRESSED", weight: 3, description: "stressed (mostly foreign) suffix (-ie, -ieren, -ion, …)" },
  { id: "SUFFIX_STRESSED_INITIAL", weight: -1, description: "first syllable of a word with a stressed suffix" },
  { id: "SCHWA", weight: -2, description: "non-initial syllable with schwa nucleus e" },
  { id: "OPEN", weight: 1, description: "open non-final syllable with full vowel" },
  { id: "CLOSED_PENULT", weight: 1, description: "closed penult with full vowel before a full final syllable" },
  { id: "UMLAUT", weight: 1, description: "nucleus contains ä, ö or ü" },
  { id: "DIPHTHONG", weight: 1, description: "diphthong nucleus" },
  { id: "LONG_VOWEL", weight: 1, description: "orthographically long vowel (doubled, ie, lengthening h)" },
  { id: "STEM_CLUSTER", weight: 1, description: "stem-typical onset cluster" },
] as const;

export type RuleId = (typeof RULES)[number]["id"];

const WEIGHT = Object.fromEntries(RULES.map((r) => [r.id, r.weight])) as Record<RuleId, number>;

export interface WordStress {
  p_num: number;
  rules: RuleId[];
}

const DIPHTHONGS = ["ei", "ai", "au", "eu", "äu", "ey", "ay"];
const LONG_NUCLEI = ["aa", "ee", "oo", "ie"];

export function predictWord(word: string, isLineFinal: boolean): WordStress[] {
  const w = normWord(word);
  const S = syllabify(word);
  const n = S.length;
  const out: WordStress[] = S.map(() => ({ p_num: 0, rules: [] }));
  const fire = (i: number, id: RuleId) => {
    out[i].p_num += WEIGHT[id];
    out[i].rules.push(id);
  };

  const pattern = EXCEPTIONS[w];
  if (pattern && pattern.length === n) {
    for (let i = 0; i < n; i++) fire(i, pattern[i] === "+" ? "EXCEPTION" : "EXCEPTION_UNSTRESSED");
    return out;
  }

  // normalised offsets of every nucleus, for locating suffix matches
  const nucleusRange: [number, number][] = [];
  let pos = 0;
  for (const s of S) {
    nucleusRange.push([pos + s.onset.length, pos + s.onset.length + s.nucleus.length]);
    pos += s.onset.length + s.nucleus.length + s.coda.length;
  }
  const syllableAt = (p: number) => nucleusRange.findIndex(([, e]) => e > p);

  if (n === 1) {
    fire(0, FUNCTION_WORDS.has(w) ? "FUNCTION_MONO" : "CONTENT_MONO");
    if (isLineFinal) fire(0, "LINE_FINAL_MONO");
  } else {
    fire(0, "INITIAL");
    const first = S[0].onset + S[0].nucleus + S[0].coda;
    if (ADVERB_COMPOUND.test(w)) {
      fire(0, "ADVERB_COMPOUND");
      fire(1, "ADVERB_COMPOUND_STRESS");
    } else if (UNSTRESSED_PREFIXES.includes(first) && (n >= 3 || S[1].nucleus !== "e")) {
      fire(0, "PREFIX_UNSTRESSED");
      fire(1, "PREFIX_UNSTRESSED_STEM");
    } else if (STRESSED_PREFIXES.includes(first)) fire(0, "PREFIX_STRESSED");

    const unstressed = UNSTRESSED_SUFFIXES.map((re) => w.match(re)).find((m) => m);
    if (unstressed) {
      const i = syllableAt(unstressed.index!);
      if (i >= 0) fire(i, "SUFFIX_UNSTRESSED");
    } else {
      for (const { re, vowel } of STRESSED_SUFFIXES) {
        const m = w.match(re);
        if (!m) continue;
        const i = syllableAt(m.index! + m[0].indexOf(vowel));
        fire(i, "SUFFIX_STRESSED");
        if (i !== 0) fire(0, "SUFFIX_STRESSED_INITIAL");
        break;
      }
    }

    for (let i = 1; i < n; i++) if (S[i].nucleus === "e") fire(i, "SCHWA");
    for (let i = 0; i < n - 1; i++) if (!S[i].coda && S[i].nucleus !== "e") fire(i, "OPEN");
    const penult = S[n - 2];
    if (n >= 3 && penult.coda && penult.nucleus !== "e" && !out[n - 1].rules.includes("SCHWA")) {
      fire(n - 2, "CLOSED_PENULT");
    }
  }

  for (let i = 0; i < n; i++) {
    const s = S[i];
    if (/[äöü]/.test(s.nucleus)) fire(i, "UMLAUT");
    if (DIPHTHONGS.includes(s.nucleus)) fire(i, "DIPHTHONG");
    if (LONG_NUCLEI.includes(s.nucleus) || s.coda.startsWith("h") || S[i + 1]?.onset === "h") fire(i, "LONG_VOWEL");
    const cluster = (i > 0 ? S[i - 1].coda : "") + s.onset;
    if (STEM_CLUSTERS.some((c) => cluster.endsWith(c)) || (i === 0 && /^s[tp]/.test(cluster))) {
      fire(i, "STEM_CLUSTER");
    }
  }
  if (n === 1 && w.includes("nd")) fire(0, "ND_MONO");
  return out;
}

/** a stressed syllable demotes weaker neighbours, and equal ones inside its own word */
export function applyDominance(line: Syllable[]): void {
  const order = line.map((_, i) => i).sort((a, b) => line[b].p_num - line[a].p_num || a - b);
  const fixed = new Array<boolean>(line.length).fill(false);
  for (const i of order) {
    if (line[i].p_dig !== 1 || fixed[i]) continue;
    fixed[i] = true;
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= line.length || fixed[j]) continue;
      const lower = line[j].p_num < line[i].p_num;
      const sameWordTie = line[j].p_num === line[i].p_num && line[j].word === line[i].word;
      if (lower || sameWordTie) {
        line[j].p_dig = 0;
        fixed[j] = true;
      }
    }
  }
}

function fnv1a32(s: string): string {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(s)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const RULESET = "fnv1a32:" + fnv1a32(JSON.stringify({
  rules: RULES.map(({ id, weight }) => [id, weight]),
  function_words: [...FUNCTION_WORDS],
  unstressed_prefixes: UNSTRESSED_PREFIXES,
  stressed_prefixes: STRESSED_PREFIXES,
  adverb_compound: ADVERB_COMPOUND.source,
  unstressed_suffixes: UNSTRESSED_SUFFIXES.map((r) => r.source),
  stressed_suffixes: STRESSED_SUFFIXES.map(({ re, vowel }) => [re.source, vowel]),
  exceptions: EXCEPTIONS,
  stem_clusters: STEM_CLUSTERS,
}));
