import type { ReasonCode, Syllable } from "./types.ts";

export const REASON_TEXT: Record<ReasonCode, string> = {
  LICENCE_MONO_UNSTRESSED_ON_LIFT:
    "(Lizenz) einsilbiges Wort, das prosodisch unbetont ist, fällt auf eine Hebung",
  LICENCE_MONO_STRESSED_LINE_START_ON_DIP:
    "(Lizenz) einsilbiges Wort am Versanfang, das prosodisch betont ist, fällt auf eine Senkung",
  LICENCE_FOOT_SUBSTITUTION: "(Lizenz) Fußsubstitution",
  VIOLATION_SCHWA_ON_LIFT: "(Antilizenz) eine Schwa-Silbe fällt auf eine Hebung",
  VIOLATION_DISYLLABLE_STRESS_ON_DIP:
    "die prosodisch betonte Silbe eines zweisilbigen Wortes fällt auf eine Senkung",
  MISMATCH_LIFT: "Die Silbe wird gegen ihre Normalbetonung betont.",
  MISMATCH_DIP: "Die Silbe wird gegen ihre Normalbetonung gesenkt.",
};

export interface Score {
  weight: number;
  reason: ReasonCode | null;
}

/** template alphabet: `+` lift, `-` dip, `x` anceps */
export function scoreSyllable(line: Syllable[], i: number, template: string): Score {
  const s = line[i];
  const p = s.p_dig;
  const m = template[i];
  if (m === "x" || (m === "+") === (p === 1)) return { weight: 0, reason: null };
  // a stressed-unstressed opening on a rising template counts once, split over both syllables
  if (i <= 1 && line[0]?.p_dig === 1 && line[1]?.p_dig === 0 && template.startsWith("-+")) {
    return { weight: 0.5, reason: "LICENCE_FOOT_SUBSTITUTION" };
  }
  if (p === 0) {
    if (s.word_syllables === 1) return { weight: 0.5, reason: "LICENCE_MONO_UNSTRESSED_ON_LIFT" };
    if (s.rules.includes("SCHWA")) return { weight: 1, reason: "VIOLATION_SCHWA_ON_LIFT" };
    return { weight: 1, reason: "MISMATCH_LIFT" };
  }
  if (s.word_syllables === 1 && i === 0) return { weight: 0.5, reason: "LICENCE_MONO_STRESSED_LINE_START_ON_DIP" };
  if (s.word_syllables === 2) return { weight: 2, reason: "VIOLATION_DISYLLABLE_STRESS_ON_DIP" };
  return { weight: 1, reason: "MISMATCH_DIP" };
}

/** line complexity: 100 · Σ weights / syllables */
export function lineComplexity(line: Syllable[], template: string): number {
  let sum = 0;
  for (let i = 0; i < line.length; i++) sum += scoreSyllable(line, i, template).weight;
  return line.length ? (100 * sum) / line.length : 0;
}

/** writes meter, complexity and reason into the syllables; returns the line complexity */
export function applyTemplate(line: Syllable[], template: string): number {
  line.forEach((s, i) => {
    const { weight, reason } = scoreSyllable(line, i, template);
    s.meter = template[i] === "x" ? s.p_dig : template[i] === "+" ? 1 : 0;
    s.complexity = weight;
    s.reason = reason;
  });
  return lineComplexity(line, template);
}
