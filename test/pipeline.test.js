import { describe, it, expect } from "vitest";
import { pseudolocalize } from "../tools/pseudoloc.js";
import { runQa } from "../tools/run-qa.js";

describe("pseudolocalize", () => {
  it("keeps placeholders and tags byte-identical", () => {
    const out = pseudolocalize("You earned {0} <b>coins</b>!");
    expect(out).toContain("{0}");
    expect(out).toContain("<b>");
    expect(out).toContain("</b>");
  });

  it("expands length for overflow testing", () => {
    const src = "Press START to begin.";
    expect([...pseudolocalize(src)].length).toBeGreaterThan(src.length);
  });

  it("wraps in brackets so truncation is visible", () => {
    const out = pseudolocalize("Quit");
    expect(out.startsWith("[")).toBe(true);
    expect(out.endsWith("]")).toBe(true);
  });
});

describe("runQa on broken fixtures", () => {
  const result = runQa("fixtures");

  it("catches the dropped placeholder as an error", () => {
    expect(result.rows.some(r => r.key === "hud.coins" && r.type === "Placeholder" && r.severity === "error")).toBe(true);
  });

  it("catches the length overflow as an error", () => {
    expect(result.rows.some(r => r.key === "menu.start" && r.type === "Length" && r.severity === "error")).toBe(true);
  });

  it("catches the missing key as an error", () => {
    expect(result.rows.some(r => r.key === "menu.quit" && r.type === "Coverage" && r.severity === "error")).toBe(true);
  });

  it("flags the stale key as a warning", () => {
    expect(result.rows.some(r => r.key === "menu.extra" && r.severity === "warn")).toBe(true);
  });

  it("exit condition: errors counted", () => {
    expect(result.errors).toBeGreaterThanOrEqual(3);
  });
});

describe("runQa on the real string tables", () => {
  it("main stays green: de and hr pass with zero errors", () => {
    const result = runQa("strings");
    expect(result.errors).toBe(0);
  });
});
