import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReportText, validateReport } from "../src/validate.ts";
import { allReportFiles, load, REPORT_DIR } from "./helpers.ts";

describe("report validation", () => {
  it("accepts every vendored runner report", () => {
    const files = allReportFiles();
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const f of files) {
      const r = parseReportText(readFileSync(`${REPORT_DIR}/${f}`, "utf8"));
      expect(r.ok, `${f}: ${r.ok ? "" : r.error}`).toBe(true);
    }
  });

  it("rejects text that is not JSON", () => {
    const r = parseReportText("not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Not valid JSON/);
  });

  it("rejects an oversized file before parsing", () => {
    const r = parseReportText(" ".repeat(5_000_001));
    expect(r.ok).toBe(false);
  });

  it("rejects another report version by name", () => {
    const r = validateReport({ ...load("vault-correct"), reportVersion: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Unsupported report version 2/);
  });

  it("rejects a report that violates the schema", () => {
    const broken = JSON.parse(JSON.stringify(load("vault-correct")));
    delete broken.verdict;
    const r = validateReport(broken);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/schema/);
  });

  it("rejects a wrong invariant status value", () => {
    const broken = JSON.parse(JSON.stringify(load("vault-correct")));
    broken.invariants[0].status = "maybe";
    expect(validateReport(broken).ok).toBe(false);
  });

  it("rejects verdict counts that disagree with the invariants", () => {
    const broken = JSON.parse(JSON.stringify(load("vault-broken-lose-balance")));
    broken.verdict.failed -= 1;
    broken.verdict.passed += 1;
    const r = validateReport(broken);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/do not agree/);
  });

  it("rejects an authorization check that names an unknown operation", () => {
    const broken = JSON.parse(JSON.stringify(load("vault-correct")));
    broken.authChecks[0].op = "ghost";
    const r = validateReport(broken);
    expect(r.ok).toBe(false);
  });

  it("shows a report from another runner version with a note", () => {
    const other = JSON.parse(JSON.stringify(load("vault-correct")));
    other.tool.runnerVersion = "9.9.9";
    const r = validateReport(other);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.notes[0]).toMatch(/9\.9\.9/);
  });
});

describe("headline verdict consistency", () => {
  it("rejects a report whose failed invariants are hidden behind a pass verdict", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const dir = "vendor/upgradelab-runner/reports";
    const f = readdirSync(dir).find((n) => n.includes("lose-balance") && n.endsWith(".json"))!;
    const raw = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
    expect(raw.verdict.status).toBe("fail");
    raw.verdict.status = "pass";
    const r = validateReport(raw);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/headline verdict is "pass"/);
  });
  it("rejects a pass report relabelled as fail, and accepts every real report", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const dir = "vendor/upgradelab-runner/reports";
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
      const raw = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
      expect(validateReport(raw).ok, f).toBe(true);
      raw.verdict.status = raw.verdict.status === "pass" ? "fail" : "pass";
      expect(validateReport(raw).ok, f + " flipped").toBe(false);
    }
  });
});
