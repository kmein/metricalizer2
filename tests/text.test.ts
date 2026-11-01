import assert from "node:assert/strict";
import { parsePoem, tokenizeLine } from "../src/text.ts";

Deno.test("header lines set title and author, other comments are skipped", () => {
  const p = parsePoem("#Titel: Erlkönig\n# Autor : Goethe\n# irgendwas\nWer reitet so spät\n");
  assert.equal(p.title, "Erlkönig");
  assert.equal(p.author, "Goethe");
  assert.deepEqual(p.stanzas, [["Wer reitet so spät"]]);
});

Deno.test("CRLF input and multiple blank lines between stanzas", () => {
  const p = parsePoem("\r\n\r\neins\r\nzwei  \r\n\r\n\r\n\r\ndrei\r\n\r\n");
  assert.deepEqual(p.stanzas, [["eins", "zwei"], ["drei"]]);
});

Deno.test("input without verse lines is rejected", () => {
  assert.throws(() => parsePoem(""), { message: "no verse lines" });
  assert.throws(() => parsePoem("#Titel: leer\n\n"), { message: "no verse lines" });
});

Deno.test("apostrophes stay inside tokens, vowelless clitics merge", () => {
  assert.deepEqual(tokenizeLine("Hör's näher und näher brausen."), ["Hör's", "näher", "und", "näher", "brausen"]);
  assert.deepEqual(tokenizeLine("Wie geht 's dir?"), ["Wie", "geht's", "dir"]);
});

Deno.test("hyphens between letters split words, dashes as tokens vanish", () => {
  assert.deepEqual(tokenizeLine("Berg-und-Tal — fern"), ["Berg", "und", "Tal", "fern"]);
});
