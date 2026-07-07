// QA gate: compares every target string table in strings/ against en.json,
// runs the lqa_checker rules per string, writes a report, exits nonzero on errors.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks } from "./checks.js";

export function runQa(stringsDir) {
  const source = JSON.parse(fs.readFileSync(path.join(stringsDir, "en.json"), "utf8"));
  const targets = fs.readdirSync(stringsDir)
    .filter(f => f.endsWith(".json") && f !== "en.json")
    .sort();

  const rows = [];
  for (const file of targets) {
    const locale = file.replace(/\.json$/, "");
    const table = JSON.parse(fs.readFileSync(path.join(stringsDir, file), "utf8"));

    for (const [key, entry] of Object.entries(source)) {
      const target = table[key];
      if (target === undefined) {
        rows.push({ locale, key, severity: "error", type: "Coverage", msg: "Key missing in target" });
        continue;
      }
      for (const issue of runChecks(entry.text, target, entry.limit || 0)) {
        if (issue.severity === "pass") continue;
        rows.push({ locale, key, severity: issue.severity, type: issue.type, msg: issue.msg });
      }
    }
    for (const key of Object.keys(table)) {
      if (!(key in source)) rows.push({ locale, key, severity: "warn", type: "Coverage", msg: "Key not in source, stale or misspelled" });
    }
  }

  const errors = rows.filter(r => r.severity === "error").length;
  const warns = rows.filter(r => r.severity === "warn").length;
  return { rows, errors, warns, locales: targets.map(f => f.replace(/\.json$/, "")) };
}

export function reportMarkdown(result) {
  const lines = [
    "# String QA report",
    "",
    `Locales checked: ${result.locales.join(", ") || "none"}. Errors: ${result.errors}. Warnings: ${result.warns}.`,
    "",
  ];
  if (result.rows.length) {
    lines.push("| Locale | Key | Severity | Check | Detail |", "|---|---|---|---|---|");
    for (const r of result.rows) lines.push(`| ${r.locale} | ${r.key} | ${r.severity} | ${r.type} | ${r.msg} |`);
  } else {
    lines.push("All strings pass.");
  }
  return lines.join("\n") + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] || "strings";
  const result = runQa(dir);
  fs.mkdirSync("reports", { recursive: true });
  fs.writeFileSync("reports/qa-report.md", reportMarkdown(result));
  fs.writeFileSync("reports/qa-report.json", JSON.stringify(result, null, 2));
  console.log(reportMarkdown(result));
  if (result.errors > 0) {
    console.error(`QA gate failed: ${result.errors} error(s).`);
    process.exit(1);
  }
}
