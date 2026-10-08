// Copy the report schema and the recorded reports from an upgradelab-runner checkout and stamp the pairing.
// Usage: node scripts/vendor-runner.mjs ../upgradelab-runner
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const runnerDir = resolve(process.argv[2] ?? "../upgradelab-runner");
const out = resolve("vendor/upgradelab-runner");
mkdirSync(join(out, "reports"), { recursive: true });

const cargo = readFileSync(join(runnerDir, "Cargo.toml"), "utf8");
const version = /^version\s*=\s*"([^"]+)"/m.exec(cargo)?.[1];
if (!version) throw new Error("cannot read runner version from Cargo.toml");
const commit = execFileSync("git", ["-C", runnerDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

copyFileSync(join(runnerDir, "schema/report.v1.schema.json"), join(out, "report.v1.schema.json"));
const reports = {};
const hostDir = join(runnerDir, "evidence/host");
for (const f of readdirSync(hostDir).filter((n) => n.endsWith(".report.json")).sort()) {
  copyFileSync(join(hostDir, f), join(out, "reports", f));
  reports[f] = sha(join(out, "reports", f));
}
const tnDir = join(runnerDir, "evidence/testnet");
for (const f of readdirSync(tnDir).filter((n) => n.endsWith(".report.json")).sort()) {
  copyFileSync(join(tnDir, f), join(out, "reports", f));
  reports[f] = sha(join(out, "reports", f));
}

// Testnet recordings are real on-chain runs and keep the runner version that recorded them.
const sampleReportsRecordedWith = [...new Set(Object.keys(reports).map((f) => JSON.parse(readFileSync(join(out, "reports", f), "utf8")).tool.runnerVersion))].sort();
writeFileSync(
  join(out, "VERSION.json"),
  JSON.stringify(
    { package: "upgradelab-runner", version, commit, reportVersion: 1, sampleReportsRecordedWith, schemaSha256: sha(join(out, "report.v1.schema.json")), reports, vendoredFor: "upgradelab-studio" },
    null,
    2,
  ) + "\n",
);
console.log(`vendored upgradelab-runner@${version} (${commit.slice(0, 12)}), ${Object.keys(reports).length} reports`);
