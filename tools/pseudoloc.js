// Pseudo-localization: accented expansion for UI overflow testing.
// Placeholders, tags, and escapes pass through untouched so the pseudo
// build still compiles and the QA gate still sees matching placeholders.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER_RE = /%(?:\d+\$)?[sdif@u]|\{[^{}\s]*\}|<[^<>]+>|\\[nt]/g;

const MAP = {
  a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í",
  j: "ĵ", k: "ķ", l: "ļ", m: "ɱ", n: "ñ", o: "ö", p: "þ", q: "ǫ", r: "ŕ",
  s: "š", t: "ţ", u: "ü", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž",
  A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", F: "Ƒ", G: "Ĝ", H: "Ĥ", I: "Í",
  J: "Ĵ", K: "Ķ", L: "Ļ", M: "Ṁ", N: "Ñ", O: "Ö", P: "Þ", Q: "Ǫ", R: "Ŕ",
  S: "Š", T: "Ţ", U: "Ü", V: "Ṽ", W: "Ŵ", X: "Ẍ", Y: "Ý", Z: "Ž",
};

export function pseudolocalize(text) {
  const parts = text.split(PLACEHOLDER_RE);
  const tokens = text.match(PLACEHOLDER_RE) || [];
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    out += [...parts[i]].map(ch => MAP[ch] || ch).join("");
    if (i < tokens.length) out += tokens[i];
  }
  // ~35% expansion, the usual DE/FI headroom rule of thumb
  const pad = "·".repeat(Math.ceil([...text].length * 0.35));
  return "[" + out + pad + "]";
}

export function pseudolocalizeTable(sourceTable) {
  const out = {};
  for (const [key, entry] of Object.entries(sourceTable)) out[key] = pseudolocalize(entry.text);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = JSON.parse(fs.readFileSync("strings/en.json", "utf8"));
  fs.mkdirSync("reports", { recursive: true });
  const outPath = path.join("reports", "pseudo.json");
  fs.writeFileSync(outPath, JSON.stringify(pseudolocalizeTable(src), null, 2));
  console.log(`Pseudo-localized ${Object.keys(src).length} strings -> ${outPath}`);
}
