import "./style.css";
import pairing from "../vendor/upgradelab-runner/VERSION.json";
import { h } from "./dom.ts";
import type { Report } from "./types.ts";
import { parseReportText, TESTED_RUNNER, validateReport, type LoadResult } from "./validate.ts";
import { renderCompare, renderReport } from "./view.ts";

// Recorded reports are real runner output, vendored with a version stamp (see vendor/upgradelab-runner/VERSION.json).
const files = import.meta.glob("../vendor/upgradelab-runner/reports/*.report.json", { import: "default" }) as Record<string, () => Promise<unknown>>;

const LABELS: Record<string, string> = {
  "vault-correct.report.json": "Corrected migration (in-process host)",
  "vault-broken-lose-balance.report.json": "Broken: loses a balance",
  "vault-broken-double-balance.report.json": "Broken: doubles a balance",
  "vault-broken-reinit.report.json": "Broken: unguarded re-initialization",
  "vault-broken-upgrade-auth.report.json": "Broken: unauthorized upgrade path",
  "vault-broken-not-idempotent.report.json": "Broken: migration not idempotent",
  "vault-correct.testnet.report.json": "Corrected path on Stellar testnet",
};

interface Loaded {
  report: Report;
  notes: string[];
  label: string;
}

interface State {
  a: Loaded | null;
  b: Loaded | null;
  error: string | null;
  checkpoint: string;
  ready: boolean;
}

const state: State = { a: null, b: null, error: null, checkpoint: "after:p-migrate-rest", ready: false };

const recorded = Object.keys(files)
  .map((path) => path.split("/").pop()!)
  .sort((x, y) => Object.keys(LABELS).indexOf(x) - Object.keys(LABELS).indexOf(y));

async function loadRecorded(name: string): Promise<Loaded | string> {
  const key = Object.keys(files).find((p) => p.endsWith(`/${name}`));
  if (!key) return `Unknown recorded report ${name}`;
  const r: LoadResult = validateReport(await files[key]!());
  return r.ok ? { report: r.report, notes: r.notes, label: LABELS[name] ?? name } : r.error;
}

function render(): void {
  const root = document.getElementById("app")!;
  root.replaceChildren();

  const optionsFor = (withNone: boolean) => [
    ...(withNone ? [h("option", { value: "" }, "None (single report)")] : []),
    ...recorded.map((n) => h("option", { value: n }, LABELS[n] ?? n)),
  ];
  const selA = h("select", { id: "pick-a", "aria-label": "Report A" }, ...optionsFor(false));
  const selB = h("select", { id: "pick-b", "aria-label": "Compare with" }, ...optionsFor(true));
  const known = (l: Loaded | null) => recorded.find((n) => (LABELS[n] ?? n) === l?.label) ?? "";
  selA.value = known(state.a) || recorded[0] || "";
  selB.value = known(state.b);
  selA.addEventListener("change", async () => {
    const r = await loadRecorded(selA.value);
    typeof r === "string" ? (state.error = r) : ((state.a = r), (state.error = null));
    render();
  });
  selB.addEventListener("change", async () => {
    if (!selB.value) state.b = null;
    else {
      const r = await loadRecorded(selB.value);
      typeof r === "string" ? (state.error = r) : ((state.b = r), (state.error = null));
    }
    render();
  });

  const file = h("input", { id: "file", type: "file", accept: "application/json,.json", "aria-label": "Open a report JSON file from your computer" });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    const r = parseReportText(await f.text());
    if (r.ok) {
      state.a = { report: r.report, notes: r.notes, label: f.name };
      state.b = null;
      state.error = null;
    } else state.error = r.error;
    render();
  });

  root.append(
    h("h1", {}, "UpgradeLab report viewer"),
    h("p", { class: "tag" }, "Rehearse the upgrade using the state your application depends on. This page only displays reports that the UpgradeLab runner generated; it never runs contract code or user code."),
    h(
      "p",
      { class: "boundary" },
      "Every report here is real runner output, not a mock-up. Two execution categories exist and are never merged: ",
      h("strong", {}, "compiled WASM in an in-process Soroban host"),
      " (not a network) and ",
      h("strong", {}, "Stellar testnet"),
      ". A pass means the named invariants held in that scenario; it is not an audit and not proof of safety.",
    ),
    h("p", { class: "small muted" }, `Reads report version ${TESTED_RUNNER.reportVersion} from ${pairing.package} ${pairing.version} (commit ${pairing.commit.slice(0, 10)}). Reports from other runner versions are validated against the same schema and flagged.`),
    h("div", { class: "controls" }, h("label", { for: "pick-a" }, "Report"), selA, h("label", { for: "pick-b" }, "Compare with"), selB, h("label", { for: "file" }, "or open a file"), file),
  );
  if (state.error) root.append(h("p", { class: "error", role: "alert", id: "error" }, state.error));
  if (!state.ready) {
    root.append(h("p", { class: "empty" }, "Loading recorded reports…"));
    return;
  }
  const onCp = (n: string) => {
    state.checkpoint = n;
    render();
  };
  if (state.a && state.b) {
    root.append(renderCompare(state.a.report, state.b.report, state.a.label, state.b.label, state.checkpoint, onCp));
  } else if (state.a) {
    root.append(renderReport(state.a.report, state.a.notes, onCp, state.checkpoint));
  } else {
    root.append(h("p", { class: "empty" }, "Choose a recorded report or open one of your own."));
  }
}

async function boot(): Promise<void> {
  render();
  const a = await loadRecorded("vault-broken-lose-balance.report.json");
  const b = await loadRecorded("vault-correct.report.json");
  if (typeof a === "string") state.error = a;
  else state.a = a;
  if (typeof b === "string") state.error = b;
  else state.b = b;
  state.ready = true;
  render();
}

void boot();
