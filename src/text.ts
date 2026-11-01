export interface ParsedPoem {
  title: string | null;
  author: string | null;
  stanzas: string[][];
}

export function parsePoem(src: string): ParsedPoem {
  let title: string | null = null;
  let author: string | null = null;
  const stanzas: string[][] = [];
  let current: string[] = [];
  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const t = line.match(/^#\s*(Titel|Title)\s*:\s*(.*)$/i);
    const a = line.match(/^#\s*(Autor|Author)\s*:\s*(.*)$/i);
    if (t) title = t[2].trim();
    else if (a) author = a[2].trim();
    else if (line.startsWith("#")) continue;
    else if (line.trim() === "") {
      if (current.length) stanzas.push(current);
      current = [];
    } else current.push(line.trim());
  }
  if (current.length) stanzas.push(current);
  if (!stanzas.length) throw new Error("no verse lines");
  return { title, author, stanzas };
}

const VOWEL = /[aeiouyäöüàâéèêîôû]/i;

export function tokenizeLine(line: string): string[] {
  const raw = line
    .split(/\s+/)
    .flatMap((t) => t.split(/(?<=\p{L})[-–—](?=\p{L})/u))
    .map((t) => t.replace(/^[^\p{L}'’]+|[^\p{L}'’]+$/gu, ""))
    .filter((t) => t !== "");
  const out: string[] = [];
  let pending = "";
  for (const tok of raw) {
    if (VOWEL.test(tok)) {
      out.push(pending + tok);
      pending = "";
    } else if (out.length) out[out.length - 1] += tok;
    else pending += tok;
  }
  if (pending) out.push(pending);
  return out;
}

const ACCENTS: Record<string, string> = {
  "é": "e",
  "è": "e",
  "ê": "e",
  "à": "a",
  "â": "a",
  "ô": "o",
  "î": "i",
  "û": "u",
};

export function normWord(w: string): string {
  return w.toLowerCase().replace(/['’]/g, "").replace(/[éèêàâôîû]/g, (c) => ACCENTS[c]);
}
