import { applyTemplate } from "./complexity.ts";
import { LABELS, poemComplexity, selectMeter } from "./meters.ts";
import { applyDominance, predictWord, RULESET } from "./prosody.ts";
import { rhymeScheme } from "./rhyme.ts";
import { syllabify } from "./syllabify.ts";
import { parsePoem, tokenizeLine } from "./text.ts";
import type { Analysis, Line, MeterFamily, Stanza, Syllable } from "./types.ts";

export interface AnalyseOptions {
  meter?: MeterFamily | "auto";
}

const round = (x: number) => Math.round(x * 100) / 100;

function lineSyllables(words: string[]): Syllable[] {
  const out: Syllable[] = [];
  words.forEach((word, wi) => {
    const parts = syllabify(word);
    const stress = predictWord(word, wi === words.length - 1);
    parts.forEach((p, i) => {
      out.push({
        text: p.text,
        word: wi,
        index_in_word: i,
        word_syllables: parts.length,
        nucleus: p.nucleus,
        onset: p.onset,
        coda: p.coda,
        p_num: stress[i].p_num,
        rules: stress[i].rules,
        p_dig: stress[i].p_num >= 1 ? 1 : 0,
        meter: 0,
        complexity: 0,
        reason: null,
      });
    });
  });
  applyDominance(out);
  return out;
}

export function analyse(src: string, opts: AnalyseOptions = {}): Analysis {
  const parsed = parsePoem(src);
  const texts = parsed.stanzas;
  const words = texts.map((st) => st.map(tokenizeLine));
  const syllables = words.map((st) => st.map(lineSyllables));
  const forced = opts.meter && opts.meter !== "auto" ? opts.meter : undefined;
  const choice = selectMeter(syllables, forced);
  const metrical = choice.family !== "free_rhythm";

  const lineScores = syllables.map((st, si) =>
    st.map((l, li) => {
      const c = applyTemplate(l, choice.templates[si][li]);
      return metrical ? c : 0;
    })
  );

  const stanzas: Stanza[] = syllables.map((st, si) => {
    const lines: Line[] = st.map((l, li) => ({
      text: texts[si][li],
      words: words[si][li],
      syllables: l,
      prosody: l.map((s) => (s.p_dig ? "+" : "-")).join(""),
      meter: l.map((s) => (s.meter ? "+" : "-")).join(""),
      stresses: l.filter((s) => s.meter === 1).length,
      complexity: round(lineScores[si][li]),
      rhyme: "",
    }));
    rhymeScheme(lines).forEach((r, i) => (lines[i].rhyme = r));
    const scores = lineScores[si];
    return { lines, complexity: round(scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0) };
  });

  return {
    title: parsed.title,
    author: parsed.author,
    ruleset: RULESET,
    family: choice.family,
    label: LABELS[choice.family],
    forced: choice.forced,
    complexity: round(metrical ? poemComplexity(lineScores) : 0),
    best_fit: choice.best_fit && { family: choice.best_fit.family, complexity: round(choice.best_fit.complexity) },
    stanzas,
  };
}
