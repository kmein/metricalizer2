import { normWord } from "./text.ts";
import { UNSTRESSED_PREFIXES } from "./wordlists.ts";

export interface SyllablePart {
  text: string;
  start: number;
  end: number;
  nucleus: string;
  onset: string;
  coda: string;
}

const VOWELS = new Set("aeiouäöüy");
const NUCLEUS_DIGRAPHS = new Set(["äu", "eu", "ei", "ai", "au", "ey", "ay", "ie", "aa", "ee", "oo"]);
const CONSONANT_UNITS = ["sch", "ch", "ck", "ph", "th", "qu"];
export const COMPLEX_ONSETS = new Set([
  "bl", "br", "dr", "fl", "fr", "gl", "gr", "kl", "kn", "kr", "pl", "pr", "tr", "zw",
  "schl", "schm", "schn", "schr", "schw", "pfl", "pfr", "spr", "str",
]);
// onsets a prefix may be followed by; keeps `gel|len|de` and `ber|ge` from being read as ge-/be- words
const PREFIX_ONSETS = new Set([...COMPLEX_ONSETS, "st", "sp", "pf"]);

function units(cluster: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < cluster.length;) {
    const u = CONSONANT_UNITS.find((c) => cluster.startsWith(c, i)) ?? cluster[i];
    out.push(u);
    i += u.length;
  }
  return out;
}

/** number of characters of `cluster` that move to the next syllable */
function onsetLength(cluster: string): number {
  const us = units(cluster);
  if (us.length <= 1) return cluster.length;
  for (let k = 0; k < us.length - 1; k++) {
    const suffix = us.slice(k).join("");
    if (COMPLEX_ONSETS.has(suffix)) return suffix.length;
  }
  return us[us.length - 1].length;
}

export function syllabify(word: string): SyllablePart[] {
  // normalised characters, each remembering its offset in `word`
  const chars: string[] = [];
  const orig: number[] = [];
  for (let i = 0; i < word.length; i++) {
    const n = normWord(word[i]);
    for (const c of n) {
      chars.push(c);
      orig.push(i);
    }
  }
  const w = chars.join("");
  const isVowel = (i: number) => VOWELS.has(w[i]) && !(w[i] === "u" && w[i - 1] === "q");

  const nuclei: [number, number][] = [];
  for (let i = 0; i < w.length;) {
    if (!isVowel(i)) {
      i++;
      continue;
    }
    const two = isVowel(i + 1) && NUCLEUS_DIGRAPHS.has(w.slice(i, i + 2));
    const len = two ? 2 : 1;
    nuclei.push([i, i + len]);
    i += len;
  }
  if (!nuclei.length) return [{ text: word, start: 0, end: word.length, nucleus: "", onset: w, coda: "" }];

  const prefix = UNSTRESSED_PREFIXES.find((p) => w.startsWith(p));
  let prefixBoundary = -1;
  if (prefix && nuclei.length > 1) {
    const rest = w.slice(prefix.length);
    const restOnset = rest.match(/^[^aeiouäöüy]+/)?.[0] ?? "";
    if (
      restOnset && nuclei[1][0] >= prefix.length && nuclei[0][1] <= prefix.length &&
      (units(restOnset).length === 1 || PREFIX_ONSETS.has(restOnset))
    ) prefixBoundary = prefix.length;
  }

  // boundaries[k] = normalised index where syllable k starts
  const boundaries = [0];
  for (let k = 0; k + 1 < nuclei.length; k++) {
    const from = nuclei[k][1];
    const to = nuclei[k + 1][0];
    if (k === 0 && prefixBoundary >= 0) boundaries.push(prefixBoundary);
    else boundaries.push(to - onsetLength(w.slice(from, to)));
  }

  return nuclei.map(([ns, ne], k) => {
    const s = boundaries[k];
    const e = k + 1 < nuclei.length ? boundaries[k + 1] : w.length;
    const start = k === 0 ? 0 : orig[s];
    const end = k + 1 < nuclei.length ? orig[e] : word.length;
    return {
      text: word.slice(start, end),
      start,
      end,
      nucleus: w.slice(ns, ne),
      onset: w.slice(s, ns),
      coda: w.slice(ne, e),
    };
  });
}
