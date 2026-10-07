#!/usr/bin/env node
/**
 * Editorial Crimson token guardrail.
 *
 * The app shipped with three coexisting palettes and no design-system layer,
 * and nothing stopped a fourth from appearing. This fails the build when
 * component code reintroduces raw values, so the migration cannot silently rot
 * back.
 *
 *   node scripts/check-tokens.js              diff against the baseline (CI mode)
 *   node scripts/check-tokens.js --no-baseline report the true total (progress metric)
 *   node scripts/check-tokens.js --write      refresh the baseline
 *
 * Escape hatch, for the rare legitimate case:
 *   // token-lint-disable-next-line      (alone on its line — silences below)
 *   className="bg-red-500" // token-lint-disable-next-line   (trailing — silences its own line)
 * The marker is read from the raw source, because comments are blanked before
 * the scan runs.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const BASELINE_PATH = path.join(__dirname, ".token-baseline.json");

/* Files that legitimately define or carry raw values. */
const ALLOW = new Set([
  "index.css", // token definitions
  "icon-codepoints.json",
]);

const SCAN_EXT = new Set([".js", ".jsx"]);

const args = process.argv.slice(2);
const NO_BASELINE = args.includes("--no-baseline");
const WRITE = args.includes("--write");

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

/**
 * `fp(m)` returns the identity of a finding.
 *
 * This is what makes the baseline trustworthy. Keying on `file:rule` alone
 * meant that once a file had one `raw-hex`, every future `raw-hex` in that
 * file was silently grandfathered in — the guardrail could not catch a
 * regression in any file it had already seen. Keying on line numbers is no
 * better: inserting a line shifts everything below and the whole file reads as
 * new.
 *
 * So a finding is identified by the value it actually objects to (the hex, the
 * `text-[9px]`, the `bg-red-500`), and the baseline records how many times
 * each value was seen. Net-new values are caught even inside a file that is
 * already baselined for the same rule.
 */
const RULES = [
  {
    id: "raw-hex",
    // Hex inside a className or style attribute. Hex elsewhere (a chart
    // palette, a jsPDF colour constant) is data, not styling, and is allowed.
    re: /(className|class)\s*=\s*(?:"[^"]*"|\{`[^`]*`\}|\{\s*['"][^'"]*['"])/g,
    inner: /(?<!&)#[0-9a-fA-F]{3,8}\b/,
    fp: (m) => (m[0].match(/(?<!&)#[0-9a-fA-F]{3,8}\b/) || [m[0]])[0].toLowerCase(),
    msg: "raw hex in className — use a c57-* token",
  },
  {
    id: "raw-hex-style",
    re: /style\s*=\s*\{\{[\s\S]*?\}\}/g,
    inner: /(?<!&)#[0-9a-fA-F]{3,8}\b/,
    fp: (m) => (m[0].match(/(?<!&)#[0-9a-fA-F]{3,8}\b/) || [m[0]])[0].toLowerCase(),
    msg: "raw hex in style — use var(--c57-*)",
  },
  {
    id: "tiny-text",
    re: /\btext-\[(\d+(?:\.\d+)?)px\]/g,
    inner: null,
    fp: (m) => m[0].toLowerCase(),
    msg: "text below the 11px floor — use label-sm or larger",
    test: (m) => parseFloat(m[1]) < 11,
  },
  {
    id: "default-palette",
    // The default Tailwind palette is what produced the three-palette problem.
    // c57-* is now the token namespace and is deliberately absent here.
    re: /\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|decoration|shadow|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})\b/g,
    inner: null,
    fp: (m) => m[0].toLowerCase(),
    msg: "default Tailwind palette — use a c57-* token",
  },
  {
    id: "legacy-brand",
    // brand-* is the pre-redesign alias, still load-bearing for un-migrated
    // pages. Reported separately so it can be tracked to zero, but NOT failed
    // on until the final migration batch.
    re: /\b(?:bg|text|border|ring|from|via|to|shadow)-(?:brand)-(\d{2,3})\b/g,
    inner: null,
    fp: (m) => m[0].toLowerCase(),
    msg: "legacy brand-* alias — migrate to c57-*",
    soft: true,
  },
];

/* ------------------------------------------------------------------ */
/* Walk                                                                */
/* ------------------------------------------------------------------ */

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "build") continue;
      walk(full, acc);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      acc.push(full);
    }
  }
  return acc;
}

function isAllowed(file) {
  const base = path.basename(file);
  if (ALLOW.has(base)) return true;
  if (/\.test\.jsx?$/.test(base)) return true;
  return false;
}

/**
 * Strip comments before scanning.
 *
 * Without this the rules match their own documentation — `PageHeader.js` cites
 * `text-[10px]` in a docstring explaining what it replaced, and gets flagged
 * for it. A lint that cries wolf over comments is a lint people disable.
 *
 * `//` is only treated as a comment when it follows whitespace and is not the
 * `//` in a URL, so `https://...` survives.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => {
      const m = line.match(/(^|\s)\/\/(?!\S*:\/\/)/);
      if (!m) return line;
      return line.slice(0, m.index) + " ".repeat(line.length - m.index);
    })
    .join("\n");
}

const findings = [];
const softFingerprints = new Set();
const touchedFiles = new Set();

for (const file of walk(SRC)) {
  if (isAllowed(file)) continue;
  const rel = path.relative(ROOT, file);
  touchedFiles.add(rel);
  const raw = fs.readFileSync(file, "utf8");
  const src = stripComments(raw);

  /* The escape hatch lives inside a comment, so it must be read from the raw
     source — by this point every comment has been blanked. Placement decides
     the target: a marker alone on its line silences the line below it, and a
     marker trailing code silences its own line. stripComments preserves line
     breaks, so the raw indices line up with the scanned ones. */
  const silenced = new Set();
  raw.split("\n").forEach((line, i) => {
    if (!line.includes("token-lint-disable")) return;
    const alone = /^\s*(\/\/|\/\*|\*)/.test(line);
    silenced.add(alone ? i + 1 : i);
  });

  src.split("\n").forEach((line, i) => {
    if (silenced.has(i)) return;

    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        const offending = rule.inner ? rule.inner.test(m[0]) : true;
        const passes = rule.test ? rule.test(m) : true;
        if (rule.inner ? !offending : !passes) continue;
        const fp = rule.fp(m);
        if (rule.soft) {
          softFingerprints.add(`${rel}:${rule.id}:${fp}`);
        } else {
          findings.push({ rel, line: i + 1, rule: rule.id, fp, msg: rule.msg });
        }
      }
    }
  });
}

/* file -> rule -> fingerprint -> count */
const counts = new Map();
for (const f of findings) {
  if (!counts.has(f.rel)) counts.set(f.rel, new Map());
  const byRule = counts.get(f.rel);
  if (!byRule.has(f.rule)) byRule.set(f.rule, new Map());
  const byFp = byRule.get(f.rule);
  byFp.set(f.fp, (byFp.get(f.fp) || 0) + 1);
}

/* ------------------------------------------------------------------ */
/* Baseline                                                             */
/* ------------------------------------------------------------------ */

/* v2 shape: { v, hard: { file: { rule: { fingerprint: count } } } } */
let baseline = { v: 2, hard: {} };
if (fs.existsSync(BASELINE_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
    if (parsed && parsed.v === 2) {
      baseline = parsed;
    } else {
      console.log(
        "  baseline is v1 (file:rule, no fingerprints) — re-baselining from\n" +
          "  current findings. Safe now because the v1 format could not detect\n" +
          "  regressions, so it never over-reported."
      );
    }
  } catch {
    console.log("  baseline unreadable — treating as empty");
  }
}

const serialise = (src) => {
  const hard = {};
  for (const [rel, byRule] of [...src.entries()].sort()) {
    const rules = {};
    for (const [rule, byFp] of [...byRule.entries()].sort()) {
      rules[rule] = Object.fromEntries([...byFp.entries()].sort());
    }
    hard[rel] = rules;
  }
  return { v: 2, hard };
};

if (WRITE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(serialise(counts), null, 2) + "\n");
  const n = [...counts.values()].reduce(
    (a, byRule) => a + [...byRule.values()].reduce((x, byFp) => x + byFp.size, 0),
    0
  );
  console.log(
    `Baseline written: ${counts.size} files, ${n} distinct values -> ${path.relative(
      ROOT,
      BASELINE_PATH
    )}`
  );
  process.exit(0);
}

/* A finding is new when its value is unseen, or appears more often than the
   baseline recorded. Repositioning code is therefore free; adding a raw hex to
   an already-flagged file is not. */
const newHard = [];
for (const f of findings) {
  const allowed = baseline.hard?.[f.rel]?.[f.rule]?.[f.fp] || 0;
  const seenSoFar = newHard.filter((n) => n.rel === f.rel && n.rule === f.rule && n.fp === f.fp).length;
  if (seenSoFar >= allowed) newHard.push(f);
}

const baselinedCount = findings.length - newHard.length;

/* ------------------------------------------------------------------ */
/* Report                                                               */
/* ------------------------------------------------------------------ */

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const byRule = (list) => {
  const o = {};
  for (const f of list) o[f.rule] = (o[f.rule] || 0) + 1;
  return o;
};

if (NO_BASELINE) {
  console.log(C.bold("\nToken lint — true totals (no baseline)\n"));
  for (const [rule, n] of Object.entries(byRule(findings)).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${rule}`);
  }
  console.log(`  ${String(softFingerprints.size).padStart(5)}  legacy-brand (tracked, not failing)\n`);
  console.log(C.bold(`  total hard violations: ${findings.length}`));
  console.log(C.bold(`  files affected        : ${counts.size}\n`));
  process.exit(0);
}

console.log(C.bold("\nToken lint\n"));
for (const [rule, n] of Object.entries(byRule(findings)).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${rule}`);
}
console.log(C.dim(`  ${softFingerprints.size}  legacy brand-* (tracked, not failing)`));
console.log(C.dim(`  ${baselinedCount}  previously baselined`));
console.log(C.dim(`  ${newHard.length}  new\n`));

if (newHard.length > 0) {
  console.log(C.red(C.bold("New token violations — use a c57-* token or add an explicit opt-out:\n")));
  const grouped = new Map();
  for (const f of newHard) {
    if (!grouped.has(f.rel)) grouped.set(f.rel, []);
    grouped.get(f.rel).push(f);
  }
  for (const [rel, list] of grouped) {
    console.log(C.bold(rel));
    for (const f of list.slice(0, 12)) {
      console.log(
        `  ${C.yellow(String(f.line).padStart(5))}  ${f.rule.padEnd(16)} ${f.fp.padEnd(18)} ${C.dim(f.msg)}`
      );
    }
    if (list.length > 12) console.log(C.dim(`  ... and ${list.length - 12} more in this file`));
    console.log();
  }
  console.log(
    C.dim("  Existing violations stay baselined. Run `npm run lint:tokens:report`\n") +
      C.dim("  for the true total, or `npm run lint:tokens:write` to re-baseline.\n")
  );
  process.exit(1);
}

console.log(C.green("  no new token violations\n"));
