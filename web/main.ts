/// <reference lib="dom" />
import { analyse } from "../src/analyse.ts";
import { renderHtml } from "../src/render.ts";
import type { MeterFamily } from "../src/types.ts";

const poem = document.getElementById("poem") as HTMLTextAreaElement;
const meter = document.getElementById("meter") as HTMLSelectElement;
const result = document.getElementById("result") as HTMLDivElement;

document.getElementById("analyse")!.addEventListener("click", () => {
  try {
    result.innerHTML = renderHtml(analyse(poem.value, { meter: meter.value as MeterFamily | "auto" }));
  } catch (e) {
    const p = document.createElement("p");
    p.className = "error";
    p.textContent = e instanceof Error ? e.message : String(e);
    result.replaceChildren(p);
  }
});
