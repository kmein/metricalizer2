import { analyse } from "./analyse.ts";
import { evaluateGold, evaluateM2, formatReport, loadM2Fixtures } from "./evaluate.ts";
import { LABELS, MeterNotApplicableError } from "./meters.ts";
import { renderText } from "./render.ts";
import type { MeterFamily } from "./types.ts";

const USAGE = `usage:
  metricalizer2 analyse [FILE|-] [--format text|json] [--meter auto|<family>]
  metricalizer2 evaluate gold <tsv> [--json]
  metricalizer2 evaluate m2 <fixtures-dir> [--json]

families: ${Object.keys(LABELS).join(", ")}`;

class UsageError extends Error {}

/** splits argv into positionals and `--key value` / `--flag` options */
function parseArgs(args: string[], valued: string[]): { pos: string[]; opts: Record<string, string> } {
  const pos: string[] = [];
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-" || !a.startsWith("-")) {
      pos.push(a);
      continue;
    }
    const [key, inline] = a.replace(/^--?/, "").split("=", 2);
    if (key === "h" || key === "help") throw new UsageError("");
    if (valued.includes(key)) {
      const v = inline ?? args[++i];
      if (v === undefined) throw new UsageError(`--${key} needs a value`);
      opts[key] = v;
    } else if (inline === undefined) opts[key] = "true";
    else throw new UsageError(`unknown option --${key}`);
  }
  return { pos, opts };
}

async function readInput(path: string | undefined): Promise<string> {
  if (path === undefined || path === "-") return await new Response(Deno.stdin.readable).text();
  return await Deno.readTextFile(path);
}

async function run(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  if (cmd === "analyse") {
    const { pos, opts } = parseArgs(rest, ["format", "meter"]);
    const extra = Object.keys(opts).filter((k) => k !== "format" && k !== "meter");
    if (pos.length > 1 || extra.length) throw new UsageError(`unexpected argument ${pos[1] ?? "--" + extra[0]}`);
    const format = opts.format ?? "text";
    if (format !== "text" && format !== "json") throw new UsageError(`unknown format ${format}`);
    const meter = opts.meter ?? "auto";
    if (meter !== "auto" && !(meter in LABELS)) throw new UsageError(`unknown meter ${meter}`);
    const a = analyse(await readInput(pos[0]), { meter: meter as MeterFamily | "auto" });
    console.log(format === "json" ? JSON.stringify(a, null, 2) : renderText(a).trimEnd());
    return;
  }
  if (cmd === "evaluate") {
    const { pos, opts } = parseArgs(rest, []);
    const extra = Object.keys(opts).filter((k) => k !== "json");
    if (pos.length !== 2 || extra.length) throw new UsageError("evaluate needs <gold|m2> <path>");
    const [kind, path] = pos;
    let report: object;
    if (kind === "gold") report = evaluateGold(await Deno.readTextFile(path));
    else if (kind === "m2") report = evaluateM2(await loadM2Fixtures(path));
    else throw new UsageError(`unknown evaluation ${kind}`);
    console.log(opts.json ? JSON.stringify(report, null, 2) : formatReport(`evaluate ${kind}: ${path}`, report).trimEnd());
    return;
  }
  throw new UsageError(cmd === undefined ? "" : `unknown command ${cmd}`);
}

if (import.meta.main) {
  try {
    await run(Deno.args);
  } catch (e) {
    if (e instanceof MeterNotApplicableError) {
      console.error(e.message);
      Deno.exit(2);
    }
    if (e instanceof UsageError) console.error((e.message ? e.message + "\n" : "") + USAGE);
    else console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
