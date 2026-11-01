import { analyse } from "./analyse.ts";
import type { Analysis, Line, MeterFamily } from "./types.ts";

const pct = (a: number, b: number) => (b ? Math.round((10000 * a) / b) / 100 : 0);

function histogram(families: MeterFamily[]): Partial<Record<MeterFamily, number>> {
  const h: Partial<Record<MeterFamily, number>> = {};
  for (const f of families) h[f] = (h[f] ?? 0) + 1;
  return h;
}

/** relabel letters in order of first occurrence, so `cdcd` and `abab` compare equal */
function canonicalScheme(labels: string[]): string {
  const seen = new Map<string, string>();
  return labels.map((l) => {
    if (!seen.has(l)) seen.set(l, String.fromCharCode(97 + seen.size));
    return seen.get(l)!;
  }).join("");
}

function unquote(field: string): string {
  return field.length >= 2 && field.startsWith('"') && field.endsWith('"') ? field.slice(1, -1).replaceAll('""', '"') : field;
}

export interface GoldReport {
  poems: number;
  lines: number;
  syllable_count_agreement: number;
  exact_line_match: number;
  syllable_accuracy: number;
  stanzas: number;
  rhyme_scheme_match: number;
  families: Partial<Record<MeterFamily, number>>;
}

interface GoldRow {
  poem: number;
  stanza: number;
  line: number;
  text: string;
  meter: string;
  rhyme: string;
}

export function evaluateGold(tsv: string): GoldReport {
  const [head, ...rows] = tsv.replace(/\r\n?/g, "\n").split("\n").filter((l) => l !== "");
  const col = Object.fromEntries(head.split("\t").map((h, i) => [h, i]));
  const gold: GoldRow[] = rows.map((r) => {
    const f = r.split("\t").map(unquote);
    return {
      poem: +f[col.poem_id],
      stanza: +f[col.stanza_id],
      line: +f[col.line_id],
      text: f[col.line_text],
      meter: f[col.meter],
      rhyme: f[col.rhyme_schema],
    };
  });
  const poems = new Map<number, Map<number, GoldRow[]>>();
  for (const g of gold) {
    if (!poems.has(g.poem)) poems.set(g.poem, new Map());
    const st = poems.get(g.poem)!;
    if (!st.has(g.stanza)) st.set(g.stanza, []);
    st.get(g.stanza)!.push(g);
  }

  let lines = 0, countOk = 0, exact = 0, sylTotal = 0, sylOk = 0, stanzas = 0, rhymeOk = 0;
  const families: MeterFamily[] = [];
  for (const [, st] of [...poems].sort((a, b) => a[0] - b[0])) {
    const goldStanzas = [...st].sort((a, b) => a[0] - b[0]).map(([, ls]) => ls.sort((a, b) => a.line - b.line));
    const a = analyse(goldStanzas.map((ls) => ls.map((l) => l.text).join("\n")).join("\n\n"));
    families.push(a.family);
    goldStanzas.forEach((ls, si) => {
      const ours: (Line | undefined)[] = a.stanzas[si]?.lines ?? [];
      ls.forEach((g, li) => {
        const m = ours[li]?.meter ?? "";
        lines++;
        if (m.length === g.meter.length) {
          countOk++;
          sylTotal += m.length;
          for (let i = 0; i < m.length; i++) if (m[i] === g.meter[i]) sylOk++;
        }
        if (m === g.meter) exact++;
      });
      stanzas++;
      const scheme = canonicalScheme(ours.map((l) => l?.rhyme ?? "?"));
      if (scheme === canonicalScheme([...ls[0].rhyme])) rhymeOk++;
    });
  }
  return {
    poems: poems.size,
    lines,
    syllable_count_agreement: pct(countOk, lines),
    exact_line_match: pct(exact, lines),
    syllable_accuracy: pct(sylOk, sylTotal),
    stanzas,
    rhyme_scheme_match: pct(rhymeOk, stanzas),
    families: histogram(families),
  };
}

interface M2Syllable {
  text: string;
  word_start: boolean;
  stress: number;
  complexity: number;
}
interface M2Fixture {
  id: number;
  stanzas: { lines: { syllables: M2Syllable[] }[] }[];
}

export interface M2Report {
  examples: number;
  lines: number;
  syllable_count_agreement: number;
  exact_line_match: number;
  syllable_agreement: number;
  complexity_precision: number;
  complexity_recall: number;
  families: Partial<Record<MeterFamily, number>>;
}

export function m2PoemText(f: M2Fixture): string {
  return f.stanzas
    .map((st) =>
      st.lines
        .map((l) => l.syllables.map((s, i) => (i > 0 && s.word_start ? " " : "") + s.text).join(""))
        .join("\n")
    )
    .join("\n\n");
}

export function evaluateM2(fixtures: M2Fixture[]): M2Report {
  let lines = 0, countOk = 0, exact = 0, sylTotal = 0, sylOk = 0, tp = 0, predicted = 0, actual = 0;
  const families: MeterFamily[] = [];
  for (const f of fixtures) {
    const a: Analysis = analyse(m2PoemText(f));
    families.push(a.family);
    f.stanzas.forEach((st, si) =>
      st.lines.forEach((l, li) => {
        lines++;
        const ours = a.stanzas[si]?.lines[li]?.syllables ?? [];
        const theirs = l.syllables;
        const stress = theirs.map((s) => (s.stress ? "+" : "-")).join("");
        const meter = ours.map((s) => (s.meter ? "+" : "-")).join("");
        if (meter === stress) exact++;
        if (ours.length !== theirs.length) return;
        countOk++;
        theirs.forEach((t, i) => {
          sylTotal++;
          if (meter[i] === stress[i]) sylOk++;
          const p = ours[i].complexity > 0, g = t.complexity > 0;
          if (p) predicted++;
          if (g) actual++;
          if (p && g) tp++;
        });
      })
    );
  }
  return {
    examples: fixtures.length,
    lines,
    syllable_count_agreement: pct(countOk, lines),
    exact_line_match: pct(exact, lines),
    syllable_agreement: pct(sylOk, sylTotal),
    complexity_precision: pct(tp, predicted),
    complexity_recall: pct(tp, actual),
    families: histogram(families),
  };
}

export async function loadM2Fixtures(dir: string): Promise<M2Fixture[]> {
  const index: { ids: number[] } = JSON.parse(await Deno.readTextFile(`${dir}/index.json`));
  return Promise.all(
    index.ids.map(async (id) => JSON.parse(await Deno.readTextFile(`${dir}/example-${String(id).padStart(2, "0")}.json`))),
  );
}

const COUNT_KEYS = ["poems", "lines", "stanzas", "examples"];

export function formatReport(title: string, report: object): string {
  const out = [title];
  for (const [k, v] of Object.entries(report)) {
    if (v && typeof v === "object") {
      out.push(`${k}:`);
      for (const [fk, fv] of Object.entries(v as Record<string, number>).sort((x, y) => y[1] - x[1])) out.push(`  ${fk}: ${fv}`);
    } else out.push(`${k}: ${v}${COUNT_KEYS.includes(k) ? "" : " %"}`);
  }
  return out.join("\n") + "\n";
}
