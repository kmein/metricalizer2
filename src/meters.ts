import { lineComplexity } from "./complexity.ts";
import type { MeterFamily, Syllable } from "./types.ts";

export const ODE_MARGIN = 10;
export const FREE_FILLING_MARGIN = 4;
export const MAX_METRICAL_COMPLEXITY = 25;

export const LABELS: Record<MeterFamily, string> = {
  iambic: "jambisch",
  trochaic: "trochäisch",
  dactylic: "daktylisch",
  dactylic_with_pre: "daktylisch mit Auftakt",
  anapestic: "anapästisch",
  cretic: "kretisch",
  free_filling: "Senkungsfreiheit",
  alcaic: "alkäische Strophe",
  sapphic: "sapphische Strophe",
  asclepiadean_a: "asklepiadeische Strophe (2 Asklepiadeen, Pherekrateus, Glykoneus)",
  asclepiadean_b: "asklepiadeische Strophe (3 Asklepiadeen, Glykoneus)",
  distich: "Distichon",
  free_rhythm: "freie Rhythmen",
};

export class MeterNotApplicableError extends Error {
  constructor(family: MeterFamily, counts: number[][]) {
    super(`meter ${family} does not fit: line syllable counts ${counts.map((s) => s.join(",")).join(" | ")}`);
    this.name = "MeterNotApplicableError";
  }
}

/** a poem as stanzas of lines of syllables carrying p_dig */
export type PoemSyllables = Syllable[][][];

export interface MeterChoice {
  family: MeterFamily;
  forced: boolean;
  complexity: number;
  best_fit: { family: MeterFamily; complexity: number } | null;
  /** one template per line, same shape as the poem */
  templates: string[][];
  /** poem complexity of every family that was evaluated */
  scores: Partial<Record<MeterFamily, number>>;
}

interface Candidate {
  family: MeterFamily;
  templates: string[][];
  lines: number[][];
  complexity: number;
}

const ALTERNATING: Record<string, string> = {
  iambic: "-+",
  trochaic: "+-",
  dactylic: "+--",
  anapestic: "--+",
  cretic: "+-+",
};
const AUTO_ALTERNATING: MeterFamily[] = ["iambic", "trochaic", "dactylic_with_pre", "dactylic", "anapestic"];

const ODES: Partial<Record<MeterFamily, string[]>> = {
  alcaic: ["-+-+-+--+-x", "-+-+-+--+-x", "-+-+-+-+x", "+--+--+-+x"],
  sapphic: ["+-+-+--+-+x", "+-+-+--+-+x", "+-+-+--+-+x", "+--+x"],
  asclepiadean_a: ["+-+--++--+-x", "+-+--++--+-x", "+-+--+x", "+-+--+-x"],
  asclepiadean_b: ["+-+--++--+-x", "+-+--++--+-x", "+-+--++--+-x", "+-+--+-x"],
};

function cycle(foot: string, n: number): string {
  return foot.repeat(Math.ceil(n / foot.length)).slice(0, n);
}

function alternatingTemplate(family: MeterFamily, n: number): string {
  return family === "dactylic_with_pre" ? ("-" + cycle("+--", Math.max(0, n - 1))).slice(0, n) : cycle(ALTERNATING[family], n);
}

function candidate(family: MeterFamily, poem: PoemSyllables, templates: string[][]): Candidate {
  const lines = poem.map((st, si) => st.map((l, li) => lineComplexity(l, templates[si][li])));
  return { family, templates, lines, complexity: poemComplexity(lines) };
}

export function poemComplexity(lines: number[][]): number {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return mean(lines.map(mean));
}

function best(cands: Candidate[]): Candidate {
  return cands.reduce((a, b) => (b.complexity < a.complexity ? b : a));
}

/** pick the lowest-complexity template per line from its variants */
function bestPerLine(family: MeterFamily, poem: PoemSyllables, variants: (line: Syllable[], si: number, li: number) => string[]): Candidate {
  const templates = poem.map((st, si) =>
    st.map((l, li) => {
      let bestT = "";
      let bestC = Infinity;
      for (const t of variants(l, si, li)) {
        const c = lineComplexity(l, t);
        if (c < bestC) [bestT, bestC] = [t, c];
      }
      return bestT;
    })
  );
  return candidate(family, poem, templates);
}

const freeCache = new Map<string, string[]>();

/** anacrusis 0–2, k lifts with gaps of 1–2 dips, coda 0–2 */
export function freeFillingTemplates(n: number, k: number): string[] {
  const key = `${n}/${k}`;
  const hit = freeCache.get(key);
  if (hit) return hit;
  const out: string[] = [];
  const build = (prefix: string, lifts: number) => {
    if (lifts === k) {
      const coda = n - prefix.length;
      if (coda >= 0 && coda <= 2) out.push(prefix + "-".repeat(coda));
      return;
    }
    for (const gap of [1, 2]) build(prefix + "-".repeat(gap) + "+", lifts + 1);
  };
  if (k >= 1) {
    for (const a of [0, 1, 2]) {
      const start = "-".repeat(a) + "+";
      if (start.length <= n) build(start, 1);
    }
  }
  freeCache.set(key, out);
  return out;
}

const feasible = (n: number, k: number) => k >= 1 && 2 * k - 1 <= n && n <= 3 * k + 2;

function freeFilling(poem: PoemSyllables): Candidate {
  const bestFor = (l: Syllable[], k: number) => {
    let t = "";
    let c = Infinity;
    for (const cand of freeFillingTemplates(l.length, k)) {
      const cc = lineComplexity(l, cand);
      if (cc < c) [t, c] = [cand, cc];
    }
    return { t, c };
  };
  const groups = new Map<string, [number, number][]>();
  poem.forEach((st, si) =>
    st.forEach((_, li) => {
      const key = `${st.length}/${li}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push([si, li]);
    })
  );
  const templates = poem.map((st) => st.map(() => ""));
  for (const members of groups.values()) {
    const lengths = members.map(([si, li]) => poem[si][li].length);
    const maxK = Math.max(...lengths);
    let groupBest: { k: number; total: number } | null = null;
    for (let k = 1; k <= maxK; k++) {
      if (!lengths.every((n) => feasible(n, k))) continue;
      const total = members.reduce((sum, [si, li]) => sum + bestFor(poem[si][li], k).c, 0);
      if (!groupBest || total < groupBest.total) groupBest = { k, total };
    }
    for (const [si, li] of members) {
      const line = poem[si][li];
      if (groupBest) templates[si][li] = bestFor(line, groupBest.k).t;
      else {
        let own = { t: "", c: Infinity };
        for (let k = 1; k <= line.length; k++) {
          if (!feasible(line.length, k)) continue;
          const b = bestFor(line, k);
          if (b.c < own.c) own = b;
        }
        templates[si][li] = own.t;
      }
    }
  }
  return candidate("free_filling", poem, templates);
}

function odeFits(family: MeterFamily, poem: PoemSyllables): boolean {
  const t = ODES[family]!;
  return poem.every((st) => st.length === 4 && st.every((l, i) => l.length === t[i].length));
}

function variants(parts: string[][]): string[] {
  return parts.reduce<string[]>((acc, opts) => acc.flatMap((a) => opts.map((o) => a + o)), [""]);
}
const FOOT = ["+--", "+-"];
const HEXAMETER = variants([FOOT, FOOT, FOOT, FOOT, FOOT, ["+x"]]);
const PENTAMETER = variants([FOOT, FOOT, ["+"], ["+--+--+"]]);

function distichFits(poem: PoemSyllables): boolean {
  const flat = poem.flat();
  return flat.length > 0 && flat.length % 2 === 0 &&
    flat.every((l, i) => (i % 2 === 0 ? HEXAMETER : PENTAMETER).some((t) => t.length === l.length));
}

function distich(poem: PoemSyllables): Candidate {
  let index = 0;
  const lineIndex = poem.map((st) => st.map(() => index++));
  return bestPerLine("distich", poem, (l, si, li) =>
    (lineIndex[si][li] % 2 === 0 ? HEXAMETER : PENTAMETER).filter((t) => t.length === l.length));
}

function familyCandidate(family: MeterFamily, poem: PoemSyllables): Candidate {
  if (family in ODES) {
    if (!odeFits(family, poem)) throw new MeterNotApplicableError(family, poem.map((st) => st.map((l) => l.length)));
    return candidate(family, poem, poem.map((st) => [...ODES[family]!]));
  }
  if (family === "distich") {
    if (!distichFits(poem)) throw new MeterNotApplicableError(family, poem.map((st) => st.map((l) => l.length)));
    return distich(poem);
  }
  if (family === "free_filling") return freeFilling(poem);
  return candidate(family, poem, poem.map((st) => st.map((l) => alternatingTemplate(family, l.length))));
}

const prosodyTemplates = (poem: PoemSyllables) =>
  poem.map((st) => st.map((l) => l.map((s) => (s.p_dig ? "+" : "-")).join("")));

export function selectMeter(poem: PoemSyllables, forced?: MeterFamily): MeterChoice {
  if (forced === "free_rhythm") {
    return { family: forced, forced: true, complexity: 0, best_fit: null, templates: prosodyTemplates(poem), scores: {} };
  }
  if (forced) {
    const c = familyCandidate(forced, poem);
    return { family: forced, forced: true, complexity: c.complexity, best_fit: null, templates: c.templates, scores: { [forced]: c.complexity } };
  }

  const scores: Partial<Record<MeterFamily, number>> = {};
  const scored = (c: Candidate) => {
    scores[c.family] = c.complexity;
    return c;
  };
  const alt = best(AUTO_ALTERNATING.map((f) => scored(familyCandidate(f, poem))));
  let chosen = alt;
  const odes = (Object.keys(ODES) as MeterFamily[]).filter((f) => odeFits(f, poem)).map((f) => scored(familyCandidate(f, poem)));
  const ode = odes.length ? best(odes) : null;
  const dist = distichFits(poem) ? scored(distich(poem)) : null;
  if (ode && ode.complexity <= alt.complexity + ODE_MARGIN) chosen = ode;
  else if (dist && dist.complexity <= alt.complexity + ODE_MARGIN) chosen = dist;
  else {
    const free = scored(freeFilling(poem));
    if (alt.complexity - free.complexity >= FREE_FILLING_MARGIN) chosen = free;
  }

  if (chosen.complexity > MAX_METRICAL_COMPLEXITY) {
    return {
      family: "free_rhythm",
      forced: false,
      complexity: 0,
      best_fit: { family: chosen.family, complexity: chosen.complexity },
      templates: prosodyTemplates(poem),
      scores,
    };
  }
  return { family: chosen.family, forced: false, complexity: chosen.complexity, best_fit: null, templates: chosen.templates, scores };
}
