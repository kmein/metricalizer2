import assert from "node:assert/strict";
import { analyse } from "../src/analyse.ts";

const scheme = (poem: string) => analyse(poem).stanzas[0].lines.map((l) => l.rhyme).join("");

Deno.test("pure and orthographically differing rhymes", () => {
  for (const [a, b] of [["Herz", "Schmerz"], ["Lust", "Brust"], ["Tag", "mag"], ["Säule", "Eule"]]) {
    assert.equal(scheme(`Mein ${a}\nDein ${b}`), "aa", `${a}/${b}`);
  }
});

Deno.test("a word does not rhyme with itself", () => {
  assert.equal(scheme("Mein Herz\nDein Herz"), "ab");
});

Deno.test("cross rhyme in the Fallersleben stanza", () => {
  const stanza = "Ich muß hinaus, ich muß zu dir,\nIch muß es selbst dir sagen:\nDu bist mein Frühling, du nur mir\nIn diesen lichten Tagen.";
  assert.equal(scheme(stanza), "abab");
});

Deno.test("rhymes and letters run across stanzas", () => {
  const a = analyse("Mein Herz\nIm Wald\n\nKein Schmerz\nIm Feld");
  assert.deepEqual(a.stanzas.map((st) => st.lines.map((l) => l.rhyme).join("")), ["ab", "ac"]);
});
