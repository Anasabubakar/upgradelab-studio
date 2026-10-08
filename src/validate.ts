import validateSchema from "./generated/validateReport.js";
import pairing from "../vendor/upgradelab-runner/VERSION.json";
import type { Report } from "./types.ts";

type SchemaError = { instancePath: string; message?: string };
const check = validateSchema as unknown as ((data: unknown) => boolean) & { errors?: SchemaError[] | null };

/** The runner version and report version this studio was built and tested against. */
export const TESTED_RUNNER = { name: pairing.package, version: pairing.version, reportVersion: pairing.reportVersion } as const;

export type LoadResult = { ok: true; report: Report; notes: string[] } | { ok: false; error: string };

export function parseReportText(text: string): LoadResult {
  if (text.length > 5_000_000) return { ok: false, error: "File is larger than 5 MB; reports are far smaller than that." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  return validateReport(raw);
}

export function validateReport(raw: unknown): LoadResult {
  const version = (raw as { reportVersion?: unknown } | null)?.reportVersion;
  if (version !== TESTED_RUNNER.reportVersion) {
    return { ok: false, error: `Unsupported report version ${JSON.stringify(version)}. This studio reads report version ${TESTED_RUNNER.reportVersion} only.` };
  }
  if (!check(raw)) {
    const issues = (check.errors ?? []).slice(0, 5).map((e) => `${e.instancePath || "(root)"} ${e.message ?? ""}`.trim());
    return { ok: false, error: `Report does not match the v1 report schema: ${issues.join("; ")}` };
  }
  const report = raw as unknown as Report;
  const c = { pass: 0, fail: 0, inconclusive: 0 };
  for (const i of report.invariants) c[i.status] += 1;
  const v = report.verdict;
  if (c.pass !== v.passed || c.fail !== v.failed || c.inconclusive !== v.inconclusive) {
    return { ok: false, error: "Report verdict counts do not agree with its invariant results." };
  }
  const expected = c.fail > 0 ? "fail" : c.inconclusive > 0 ? "inconclusive" : "pass";
  if (v.status !== expected) {
    return { ok: false, error: `Inconsistent report: its headline verdict is "${v.status}" but its invariant results give "${expected}".` };
  }
  const ids = new Set(report.executedOps.map((o) => o.id));
  for (const a of report.authChecks) {
    if (!ids.has(a.op)) return { ok: false, error: `Authorization check refers to an unknown operation "${a.op}".` };
  }
  const notes: string[] = [];
  if (report.tool.runnerVersion !== TESTED_RUNNER.version && !pairing.sampleReportsRecordedWith.includes(report.tool.runnerVersion)) {
    notes.push(
      `This report was produced by ${report.tool.name} ${report.tool.runnerVersion}; this studio was tested with ${TESTED_RUNNER.version}. It matches the v1 schema, so it is shown, but newer runner behavior is not covered by this studio's tests.`,
    );
  }
  return { ok: true, report, notes };
}
