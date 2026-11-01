// scrapes the archived metricalizer.de example analyses into fixtures/m2/
const CDX =
  "https://web.archive.org/cdx/search/cdx?url=metricalizer.de/en/metrikanalyse/poem/analyse/example/&matchType=prefix&filter=statuscode:200&fl=timestamp,original&output=json";
const OUT = "fixtures/m2";
const TIMEOUT_MS = 180_000;
const RETRIES = 5;
const RETRY_WAIT_MS = 10_000;
// wayback refuses connections when hit faster than roughly 15 requests a minute
const PACE_MS = 4_000;

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

async function fetchRetry(url: string): Promise<Response> {
  let last = "";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_WAIT_MS);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status >= 500 || res.status === 429) {
        last = `HTTP ${res.status}`;
        await res.body?.cancel();
        continue;
      }
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith(url)) throw e;
      last = String(e);
    }
  }
  throw new Error(`${url}: giving up after ${RETRIES} retries (${last})`);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1));
    return ENTITIES[e] ?? m;
  });
}

interface M2Syllable {
  text: string;
  word_start: boolean;
  stress: number;
  prosody_level: number;
  complexity: number;
  message: string | null;
}
interface M2Line { rhyme: string; syllables: M2Syllable[] }
interface M2Stanza { lines: M2Line[] }

function attr(tag: string, name: string): string | null {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
}

function parsePage(html: string): M2Stanza[] {
  const messages = new Map<string, string>();
  for (const m of html.matchAll(/<div[^>]*id="syllable-info-(\d+-\d+-\d+)"[^>]*>([\s\S]*?)<\/p>/g)) {
    const msg = m[2].match(/Komplexität:\s*([\s\S]*?)\s*(?:<br>|$)/);
    if (msg) messages.set(m[1], decode(msg[1].replace(/\s+/g, " ").trim()));
  }
  const poemStart = html.indexOf('id="poem"');
  const poem = poemStart < 0 ? "" : html.slice(poemStart);
  const stanzas: M2Stanza[] = [];
  const stanzaChunks = poem.split('<table class="stanza">').slice(1);
  stanzaChunks.forEach((chunk, si) => {
    const lines: M2Line[] = [];
    for (const [vi, verse] of chunk.split('<tr class="m2-vers">').slice(1).entries()) {
      const rhyme = verse.match(/<td class="m2-rhymes">\s*([\s\S]*?)\s*<\/td>/);
      // a capture cut off mid-verse has no rhyme cell yet
      if (!rhyme) break;
      const syllables: M2Syllable[] = [];
      let prevWordEnd = true;
      const cells = verse.matchAll(/<td class="m2-syllable([^"]*)"([^>]*)>\s*<table[^>]*>\s*<tr>\s*<td>([\s\S]*?)<\/td>/g);
      for (const [ii, c] of [...cells].entries()) {
        const tag = c[2];
        syllables.push({
          text: decode(c[3].trim()),
          word_start: prevWordEnd,
          stress: Number(attr(tag, "stress")),
          prosody_level: Number(attr(tag, "prosody_level")),
          complexity: Number((attr(tag, "complexity") ?? "0").replace(",", ".")),
          message: messages.get(`${si}-${vi}-${ii}`) ?? null,
        });
        // the spacer class marks the gap after a syllable, so a word ends where it says wordspacer
        prevWordEnd = c[1].includes("m2-syllable-wordspacer");
      }
      lines.push({ rhyme: decode(rhyme[1].trim()), syllables });
    }
    if (lines.length) stanzas.push({ lines });
  });
  return stanzas;
}

async function main() {
  const rows: string[][] = await (await fetchRetry(CDX)).json();
  const captures = new Map<number, { ts: string; original: string }[]>();
  for (const [ts, original] of rows.slice(1)) {
    const id = Number(original.replace(/\/+$/, "").split("/").pop());
    if (!Number.isInteger(id)) continue;
    if (!captures.has(id)) captures.set(id, []);
    captures.get(id)!.push({ ts, original });
  }
  await Deno.mkdir(OUT, { recursive: true });
  const written: number[] = [];
  const failed: number[] = [];
  for (const id of [...captures.keys()].sort((a, b) => a - b)) {
    // newest first; an older capture is only used when the newer one is truncated
    const list = captures.get(id)!.sort((a, b) => b.ts.localeCompare(a.ts));
    let chosen: { ts: string; original: string; html: string; truncated: boolean } | null = null;
    for (const cap of list) {
      await sleep(PACE_MS);
      try {
        const res = await fetchRetry(`https://web.archive.org/web/${cap.ts}id_/${cap.original}`);
        const html = await res.text();
        const truncated = (res.headers.get("warning") ?? "").includes("truncated") ||
          !html.trimEnd().endsWith("</html>");
        if (!chosen || (chosen.truncated && !truncated)) chosen = { ...cap, html, truncated };
        if (!truncated) break;
      } catch (e) {
        console.error(String(e));
      }
    }
    const stanzas = chosen ? parsePage(chosen.html) : [];
    if (!chosen || !stanzas.length) {
      console.error(`example ${id}: no usable capture`);
      failed.push(id);
      continue;
    }
    const file = `${OUT}/example-${String(id).padStart(2, "0")}.json`;
    const data = {
      id,
      source_url: chosen.original,
      timestamp: chosen.ts,
      truncated: chosen.truncated,
      stanzas,
    };
    await Deno.writeTextFile(file, JSON.stringify(data, null, 1) + "\n");
    written.push(id);
    console.error(`example ${id}: ${chosen.ts}${chosen.truncated ? " (truncated)" : ""} -> ${file}`);
  }
  await Deno.writeTextFile(`${OUT}/index.json`, JSON.stringify({ ids: written, missing: failed }) + "\n");
  console.error(`wrote ${written.length} examples; missing: ${failed.join(", ") || "none"}`);
}

if (import.meta.main) await main();
