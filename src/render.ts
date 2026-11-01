import { REASON_TEXT } from "./complexity.ts";
import { LABELS } from "./meters.ts";
import type { Analysis, Line } from "./types.ts";

function header(a: Analysis): [string, string][] {
  const rows: [string, string][] = [];
  if (a.title) rows.push(["Titel", a.title]);
  if (a.author) rows.push(["Autor", a.author]);
  rows.push(["Metrum", a.label + (a.forced ? " (erzwungen)" : "")]);
  rows.push(["Komplexität", String(a.complexity)]);
  rows.push(["Regelsatz", a.ruleset]);
  if (a.best_fit) rows.push(["Beste Anpassung", `${LABELS[a.best_fit.family]} (${a.best_fit.complexity})`]);
  return rows;
}

const MARK: Record<string, string> = { "0.5": "½", "1": "1", "2": "2" };

function textLine(line: Line): string[] {
  const widths = line.syllables.map((s) => Math.max([...s.text].length, 1));
  const row = (cell: (i: number) => string, sep: (i: number) => string) =>
    line.syllables.map((_, i) => (i ? sep(i) : "") + cell(i).padEnd(widths[i])).join("");
  const wordSep = (i: number) => (line.syllables[i].index_in_word === 0 ? " " : "·");
  const out = [
    row((i) => line.syllables[i].text, wordSep) + `  ${line.rhyme} ${line.complexity}`,
    row((i) => (line.syllables[i].meter ? "+" : "-"), () => " "),
  ];
  if (line.syllables.some((s) => s.complexity > 0)) {
    out.push(row((i) => MARK[String(line.syllables[i].complexity)] ?? ".", () => " "));
  }
  return out.map((l) => l.trimEnd());
}

export function renderText(a: Analysis): string {
  const out = header(a).map(([k, v]) => `${k}: ${v}`);
  a.stanzas.forEach((st, si) => {
    out.push("", `Strophe ${si + 1}`);
    for (const line of st.lines) out.push(...textLine(line));
  });
  return out.join("\n") + "\n";
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);
const LEVEL: Record<string, string> = { "0.5": "c05", "1": "c10", "2": "c20" };

export function renderHtml(a: Analysis): string {
  const out = ['<dl class="header">'];
  for (const [k, v] of header(a)) out.push(`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`);
  out.push("</dl>");
  for (const st of a.stanzas) {
    out.push('<table class="stanza">');
    for (const line of st.lines) {
      const cells = line.syllables.map((s) => {
        const cls = ["syl"];
        if (s.index_in_word === 0) cls.push("ws");
        if (s.meter) cls.push("stressed");
        if (LEVEL[String(s.complexity)]) cls.push(LEVEL[String(s.complexity)]);
        const title = s.reason ? ` title="${esc(REASON_TEXT[s.reason])}"` : "";
        return `<td class="${cls.join(" ")}"${title}>${esc(s.text)}<br>${s.meter ? "+" : "-"}</td>`;
      });
      out.push(`<tr>${cells.join("")}<td class="rhyme">${esc(line.rhyme)}</td><td class="lc">${line.complexity}</td></tr>`);
    }
    out.push("</table>");
  }
  return out.join("\n");
}
