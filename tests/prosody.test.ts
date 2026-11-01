import assert from "node:assert/strict";
import { analyse } from "../src/analyse.ts";
import { predictWord } from "../src/prosody.ts";
import { syllabify } from "../src/syllabify.ts";
import { EXCEPTIONS } from "../src/wordlists.ts";

Deno.test("blühen gets the five points of the 2009 paper", () => {
  const [blue, hen] = predictWord("blühen", false);
  assert.equal(blue.p_num, 5);
  assert.deepEqual(new Set(blue.rules), new Set(["INITIAL", "UMLAUT", "LONG_VOWEL", "OPEN", "STEM_CLUSTER"]));
  assert.equal(hen.p_num, -2);
  assert.deepEqual(hen.rules, ["SCHWA"]);
});

Deno.test("stressed syllable of polysyllables", () => {
  const cases: [string, number][] = [
    ["Gebirge", 1],
    ["Erde", 0],
    ["Gegend", 0],
    ["Verse", 0],
    ["herunter", 1],
    ["darum", 1],
    ["Melodie", 2],
    ["regieren", 1],
    ["Frühling", 0],
    ["lebendig", 1],
  ];
  for (const [word, want] of cases) {
    const p = predictWord(word, false).map((s) => s.p_num);
    const max = Math.max(...p);
    assert.equal(p.indexOf(max), want, `${word}: ${p}`);
    assert.equal(p.filter((x) => x === max).length, 1, `${word}: tie in ${p}`);
  }
});

Deno.test("line prosody after dominance", () => {
  const cases: [string, string][] = [
    ["Was glänzt dort vom Walde im Sonnenschein", "-+--+--+-+"],
    ["Hör's näher und näher brausen", "-+--+-+-"],
    ["Es zieht sich herunter in düsteren Reihn", "-+--+--+--+"],
  ];
  for (const [line, want] of cases) assert.equal(analyse(line).stanzas[0].lines[0].prosody, want, line);
});

Deno.test("every exception pattern fits the syllabification of its word", () => {
  for (const [word, pattern] of Object.entries(EXCEPTIONS)) {
    assert.equal(pattern.length, syllabify(word).length, word);
  }
});
