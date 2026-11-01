import assert from "node:assert/strict";
import { scoreSyllable } from "../src/complexity.ts";
import type { Bit, Syllable } from "../src/types.ts";

/** each entry: [p_dig, syllables of its word, rules] */
function line(spec: [Bit, number, string[]?][]): Syllable[] {
  return spec.map(([p_dig, word_syllables, rules = []], i) => ({
    text: "x", word: i, index_in_word: 0, word_syllables, nucleus: "a", onset: "", coda: "",
    p_num: p_dig, rules, p_dig, meter: 0, complexity: 0, reason: null,
  }));
}

Deno.test("each row of the licence/violation table", () => {
  const cases: [string, Syllable[], number, string, number, string | null][] = [
    ["match", line([[1, 1], [0, 1]]), 0, "+-", 0, null],
    ["anceps", line([[1, 1], [0, 1]]), 1, "+x", 0, null],
    ["match on dip", line([[0, 1], [1, 1]]), 0, "--", 0, null],
    ["mono unstressed on lift", line([[1, 1], [0, 1], [0, 1]]), 2, "+-+", 0.5, "LICENCE_MONO_UNSTRESSED_ON_LIFT"],
    ["mono stressed line start on dip", line([[1, 1], [1, 1]]), 0, "-+", 0.5, "LICENCE_MONO_STRESSED_LINE_START_ON_DIP"],
    ["schwa on lift", line([[1, 2], [0, 2, ["SCHWA"]]]), 1, "++", 1, "VIOLATION_SCHWA_ON_LIFT"],
    ["disyllable stress on dip", line([[0, 1], [1, 2], [0, 2]]), 1, "+--", 2, "VIOLATION_DISYLLABLE_STRESS_ON_DIP"],
    ["mismatch lift", line([[1, 3], [0, 3], [0, 3]]), 2, "+-+", 1, "MISMATCH_LIFT"],
    ["mismatch dip, polysyllable", line([[0, 1], [1, 3]]), 1, "--", 1, "MISMATCH_DIP"],
    ["mismatch dip, mono not line-initial", line([[0, 1], [1, 1]]), 1, "+-", 1, "MISMATCH_DIP"],
  ];
  for (const [name, l, i, template, weight, reason] of cases) {
    assert.deepEqual(scoreSyllable(l, i, template), { weight, reason }, name);
  }
});

Deno.test("foot substitution covers both opening syllables and beats the monosyllable licences", () => {
  const l = line([[1, 1], [0, 1], [0, 1], [1, 1]]);
  for (const i of [0, 1]) {
    assert.deepEqual(scoreSyllable(l, i, "-+-+"), { weight: 0.5, reason: "LICENCE_FOOT_SUBSTITUTION" });
  }
  // the same syllables later in the line get the ordinary licence
  assert.deepEqual(scoreSyllable(line([[0, 1], [1, 1], [0, 1]]), 2, "-++"), {
    weight: 0.5,
    reason: "LICENCE_MONO_UNSTRESSED_ON_LIFT",
  });
});
