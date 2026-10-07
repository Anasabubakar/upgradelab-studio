import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TESTED_RUNNER } from "../src/validate.ts";
import { allReportFiles, load, REPORT_DIR } from "./helpers.ts";

const compat = JSON.parse(readFileSync("compat.json", "utf8"));
const vendored = JSON.parse(readFileSync("vendor/upgradelab-runner/VERSION.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

describe("runner pairing", () => {
  it("compat.json lists exactly the vendored runner version as tested", () => {
    expect(compat.studio).toBe(pkg.version);
    expect(compat.pairs).toContainEqual({ runner: vendored.package, version: vendored.version, reportVersion: vendored.reportVersion, status: "tested" });
  });

  it("the studio's runtime pairing is the vendored one", () => {
    expect(TESTED_RUNNER).toEqual({ name: vendored.package, version: vendored.version, reportVersion: vendored.reportVersion });
  });

  it("the vendored schema and reports match the recorded hashes", () => {
    expect(sha("vendor/upgradelab-runner/report.v1.schema.json")).toBe(vendored.schemaSha256);
    expect(Object.keys(vendored.reports).sort()).toEqual(allReportFiles().sort());
    for (const [f, h] of Object.entries(vendored.reports)) expect(sha(`${REPORT_DIR}/${f}`)).toBe(h);
  });

  it("every vendored report was produced by the vendored runner version", () => {
    for (const f of allReportFiles()) {
      expect(load(f.replace(".report.json", "")).tool.runnerVersion).toBe(vendored.version);
    }
  });

  it("the vendored commit is a full git hash", () => {
    expect(vendored.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("the checked-in generated validator is current with the vendored schema", () => {
    expect(() => execFileSync("node", ["scripts/gen-validator.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
