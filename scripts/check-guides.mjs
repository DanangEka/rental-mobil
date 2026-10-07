#!/usr/bin/env node
/**
 * Corruption detector for the destination guide dataset.
 *
 * Long Indonesian prose does not survive generation reliably. It fails in
 * three distinct ways, all of which produce plausible-looking Indonesian with
 * one token wrong:
 *
 *   1. Foreign-script insertion   "Tenggar澄leb由此动漫" / "Di底的nya"
 *   2. Foreign-word insertion     "fourni avec", "Cascade", "Guardian"
 *   3. Run-together words         "TunggulahGdalamKabutdingin" standing in for
 *                                 "Tunggu dalam kabut dingin"
 *
 * Only (1) is easy to grep, and (3) is detectable because Indonesian does not
 * camel-case. (2) is NOT reliably detectable: an unknown English word in an
 * Indonesian sentence is indistinguishable from Indonesian vocabulary without
 * a dictionary, and a word-list only ever catches words seen before. This
 * script is therefore a partial net, not a proof. Anything it passes still
 * needs a human to read it.
 *
 * Scoped to the four region files, which are the only ones holding prose.
 * `index.js` holds the timezone map and is skipped: tokens like `UTC+7` are
 * capitalised by design and would otherwise trip the camel-glue rule on every
 * one of its 46 entries.
 *
 * Comments are stripped before scanning, because the files' own documentation
 * is full of English words that would otherwise trip the foreign-word list.
 *
 * Usage: node scripts/check-guides.mjs [dir]
 *   Exits 1 and lists findings when anything looks corrupted.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] || "src/data/destinationGuides";

const FOREIGN_SCRIPTS = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

const FOREIGN_WORDS = [
  "avec", "fourni", "cascade", "guardian", "awaiting", "comprendre", "entends",
  "meme", "halten", "bereich", "wombat", "unravel", "understand", "flicked",
  "shaped", "mediana", "palindung", "rise", "formations",
];

/* Proper nouns legitimately appear capitalised. Exact whole-word matches only;
   anything with an interior capital that is not on this list is treated as
   glued words. */
const PROPER_NOUNS = new Set([
  "Tengger", "Bromo", "Batok", "Semeru", "Ngadisari", "Probolinggo", "Malang",
  "Tumpak", "Sewu", "Lumajang", "Pronojiwo", "Jawa", "Bali", "Indonesia",
  "ASEAN", "Krakatau", "Ijen", "Banyuwangi", "Jepara", "Borobudur", "Prambanan",
  "Malioboro", "Kelinching", "Kelingking", "Tanah", "Lot", "Uluwatu", "Ubud",
  "Raja", "Ampat", "Komodo", "Rinjani", "Danau", "Toba", "Labuan", "Bajo",
  "Wae", "Rebo", "Padar", "Segara", "Anak", "Angkor", "Wat", "Halong", "Bay",
  "Grand", "Palace", "Petronas", "Towers", "Sapa", "Marina", "El", "Nido",
  "Bagan", "Phi", "Boracay", "Luang", "Prabang", "Chocolate", "Hills", "Chiang",
  "Mai", "Gunung", "Pura", "Danau", "Semeru", "Kasama", "Pasir", "Berjo",
  "Kalderanya", "Punyakawung", "Savana", "Ngadisari", "Cemoro", "Lawang",
  "Kawah", "Bromo", "Probolinggo",
]);

/** Strip comments so the file's own documentation is not scanned. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const findings = [];

for (const name of readdirSync(dir)) {
  if (!name.endsWith(".js")) continue;
  /* index.js is the resolver and timezone map, not prose. */
  if (name === "index.js") continue;
  const file = join(dir, name);
  if (!statSync(file).isFile()) continue;

  const lines = stripComments(readFileSync(file, "utf8")).split("\n");

  lines.forEach((line, i) => {
    const where = `${name}:${i + 1}`;

    if (FOREIGN_SCRIPTS.test(line)) {
      findings.push(`[foreign-script] ${where}: ${line.trim().slice(0, 100)}`);
    }

    for (const raw of line.matchAll(/"([^"\\]{4,})"/g)) {
      const text = raw[1];
      const words = text.split(/\s+/);

      for (const rawWord of words) {
        const word = rawWord.replace(/^[("']+|[,;:!?)\]]+$/g, "");
        if (word.length < 4) continue;

        if (FOREIGN_WORDS.includes(word.toLowerCase())) {
          findings.push(`[foreign-word] ${where}: "${word}" in "${text.slice(0, 70)}"`);
        }

        if (!PROPER_NOUNS.has(word)) {
          /* Interior capital => two words were glued. Position 0 does not
             count; a correct phrase always separates with a space. */
          if (/[A-Z]/.test(word.slice(1))) {
            findings.push(`[camel-glue] ${where}: "${word}" in "${text.slice(0, 70)}"`);
          }
          /* All-lowercase glue. Kept deliberately narrow: real Indonesian
             words can reach 15 letters, so this only fires on runs long enough
             that no single word would be plausible, and it still requires a
             plausible vowel ratio so consonant clusters do not trip it. */
          if (/^[a-z]{17,}$/.test(word)) {
            const vowels = (word.match(/[aeiou]/g) || []).length;
            if (vowels / word.length < 0.34) {
              findings.push(`[run-together] ${where}: "${word}" in "${text.slice(0, 70)}"`);
            }
          }
        }
      }
    }
  });
}

if (findings.length === 0) {
  console.log("guide copy: no corruption markers found");
  process.exit(0);
}

console.error(`guide copy: ${findings.length} corruption marker(s)\n`);
for (const f of findings) console.error("  " + f);
console.error(
  "\nLong-form Indonesian copy is unreliable here. Shorten the flagged " +
    "string or re-author it, then re-run."
);
process.exit(1);
