// Pure check functions. Each returns issue objects: { type, severity, msg }.
// Severities: "error" | "warn" | "pass".

export function charCount(s) {
  return [...s].length; // code points, not UTF-16 units
}

export function checkLength(target, limit) {
  if (!limit || limit <= 0) return [];
  const len = charCount(target);
  if (len > limit) return [{ type: "Length", severity: "error", msg: `${len}/${limit} chars, overflow by ${len - limit}` }];
  return [];
}

export function checkPunctuation(source, target) {
  const issues = [];
  const endRe = /[.!?…:;,]$/;
  const srcEnd = (source.match(endRe) || [])[0];
  const tgtEnd = (target.match(endRe) || [])[0];

  if (srcEnd && !tgtEnd)
    issues.push({ type: "Punctuation", severity: "warn", msg: `Missing ending punctuation, source ends with "${srcEnd}"` });
  else if (!srcEnd && tgtEnd)
    issues.push({ type: "Punctuation", severity: "warn", msg: `Extra ending punctuation, target ends with "${tgtEnd}"` });
  else if (srcEnd && tgtEnd && srcEnd !== tgtEnd)
    issues.push({ type: "Punctuation", severity: "warn", msg: `Punctuation mismatch, source "${srcEnd}" vs target "${tgtEnd}"` });

  const counters = [
    [/\.\.\.|…/g, "Ellipsis"],
    [/!/g, "Exclamation mark"],
    [/\?/g, "Question mark"],
  ];
  for (const [re, label] of counters) {
    const sc = (source.match(re) || []).length;
    const tc = (target.match(re) || []).length;
    if (sc !== tc)
      issues.push({ type: "Punctuation", severity: "warn", msg: `${label} count differs, ${sc} in source, ${tc} in target` });
  }
  return issues;
}

const PLACEHOLDER_RES = [
  /%(?:\d+\$)?[sdif@u]/g, // printf: %s %d %1$s %@
  /\{[^{}\s]*\}/g,        // braces: {0} {name}
  /<[^<>]+>/g,            // tags: <b> </b> <color=red>
  /\\[nt]/g,              // escaped \n \t
];

function extract(text, regexes) {
  const found = [];
  for (const re of regexes) found.push(...(text.match(re) || []));
  return found;
}

function diffCounts(a, b) {
  const tally = arr => arr.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {});
  const ca = tally(a), cb = tally(b);
  const missing = [], extra = [];
  for (const k of new Set([...a, ...b])) {
    const d = (ca[k] || 0) - (cb[k] || 0);
    if (d > 0) missing.push(...Array(d).fill(k));
    if (d < 0) extra.push(...Array(-d).fill(k));
  }
  return { missing, extra };
}

export function checkPlaceholders(source, target) {
  const { missing, extra } = diffCounts(extract(source, PLACEHOLDER_RES), extract(target, PLACEHOLDER_RES));
  const issues = [];
  if (missing.length) issues.push({ type: "Placeholder", severity: "error", msg: `Missing in target: ${missing.join(", ")}` });
  if (extra.length) issues.push({ type: "Placeholder", severity: "error", msg: `Extra in target: ${extra.join(", ")}` });
  return issues;
}

export function checkWhitespace(source, target) {
  const issues = [];
  if (/^\s/.test(target) && !/^\s/.test(source))
    issues.push({ type: "Whitespace", severity: "warn", msg: "Leading whitespace in target" });
  if (/\s$/.test(target) && !/\s$/.test(source))
    issues.push({ type: "Whitespace", severity: "warn", msg: "Trailing whitespace in target" });
  const doubles = s => (s.match(/ {2,}/g) || []).length;
  if (doubles(target) > doubles(source))
    issues.push({ type: "Whitespace", severity: "warn", msg: "Double space in target" });
  return issues;
}

const NUMBER_RE = /\d+(?:[.,]\d+)*/g;

export function checkNumbers(source, target) {
  const norm = t => (t.match(NUMBER_RE) || []).map(n => n.replace(/[.,]/g, ""));
  const { missing, extra } = diffCounts(norm(source), norm(target));
  const issues = [];
  if (missing.length) issues.push({ type: "Numbers", severity: "warn", msg: `Number missing in target: ${missing.join(", ")}` });
  if (extra.length) issues.push({ type: "Numbers", severity: "warn", msg: `Number not in source: ${extra.join(", ")}` });
  return issues;
}

export function runChecks(source, target, limit) {
  const issues = [
    ...checkLength(target, limit),
    ...checkPlaceholders(source, target),
    ...checkPunctuation(source, target),
    ...checkWhitespace(source, target),
    ...checkNumbers(source, target),
  ];
  if (issues.length === 0) {
    const info = limit > 0 ? ` (${charCount(target)}/${limit} chars)` : "";
    return [{ type: "All checks", severity: "pass", msg: `No issues found${info}` }];
  }
  return issues;
}

// Paste-mode pairing. Lines are matched strictly by position; interior blank
// lines are preserved so one stray blank line cannot shift every pair below it.
export function pairLines(srcText, tgtText) {
  const clean = t => {
    const lines = t.split("\n");
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    return lines;
  };
  const src = clean(srcText);
  const tgt = clean(tgtText);
  const rows = [];
  for (let i = 0; i < Math.max(src.length, tgt.length); i++) {
    const s = src[i] ?? "";
    const t = tgt[i] ?? "";
    if (!s.trim() && !t.trim()) continue;
    rows.push({ source: s, target: t });
  }
  return rows;
}

export function buildResults(rows, limit) {
  return rows.map(({ source, target }) => {
    if (!source.trim())
      return { source, target, issues: [{ type: "Alignment", severity: "error", msg: "No source for this line, check line pairing" }] };
    if (!target.trim())
      return { source, target, issues: [{ type: "Alignment", severity: "error", msg: "Missing target for this line" }] };
    return { source, target, issues: runChecks(source, target, limit) };
  });
}
