import assert from "node:assert/strict";
import { syllabify } from "../src/syllabify.ts";

const split = (w: string) => syllabify(w).map((s) => s.text).join("|");

Deno.test("syllable boundaries", () => {
  const cases: [string, string][] = [
    ["blühen", "blü|hen"],
    ["düsteren", "düs|te|ren"],
    ["herunter", "he|run|ter"],
    ["quicket", "qui|cket"],
    ["Sonnenschein", "Son|nen|schein"],
    ["gellende", "gel|len|de"],
    ["darein", "da|rein"],
    ["verschlang", "ver|schlang"],
  ];
  for (const [word, want] of cases) assert.equal(split(word), want, word);
});

Deno.test("syllable counts", () => {
  const cases: [string, number][] = [
    ["Hexameter", 4],
    ["Springquells", 2],
    ["Vaterlandsstädte", 5],
    ["Hör's", 1],
    ["Poesie", 3],
  ];
  for (const [word, n] of cases) assert.equal(syllabify(word).length, n, word);
});

Deno.test("offsets cover the original word, parts are normalised", () => {
  const s = syllabify("Hör's");
  assert.deepEqual(s[0], { text: "Hör's", start: 0, end: 5, nucleus: "ö", onset: "h", coda: "rs" });
  const t = syllabify("Blühen");
  assert.deepEqual(t.map((x) => [x.start, x.end, x.onset, x.nucleus, x.coda]), [[0, 3, "bl", "ü", ""], [3, 6, "h", "e", "n"]]);
});
