import { h } from "./dom.ts";
import type { AuthCheck, ExecutedOp, InvariantResult, Json, ProbeReading, Report, Status } from "./types.ts";

const STATUS_LABEL: Record<Status, string> = { pass: "PASS", fail: "FAIL", inconclusive: "INCONCLUSIVE" };

export function badge(status: Status): HTMLElement {
  return h("span", { class: `badge ${status}`, "data-status": status }, STATUS_LABEL[status]);
}

export function short(hash: string | null | undefined, n = 12): string {
  return hash ? hash.slice(0, n) : "-";
}

export function jsonText(v: Json | undefined): string {
  if (v === undefined) return "-";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export const CATEGORY_NAME: Record<string, string> = {
  "compiled-wasm": "Compiled WASM in the in-process Soroban host",
  "native-sdk": "Native SDK tests (Rust, mocked auth, not the VM)",
  "testnet-rpc": "Stellar testnet",
};

function categoryChips(r: Report): HTMLElement {
  return h(
    "ul",
    { class: "cats", "aria-label": "Execution categories" },
    ...r.categories.map((c) =>
      h(
        "li",
        { class: `cat ${c.status}`, "data-category": c.id, "data-cat-status": c.status },
        h("strong", {}, CATEGORY_NAME[c.id] ?? c.title),
        h("span", { class: "cat-status" }, c.status.replace("-", " ")),
        h("p", { class: "muted small" }, c.detail),
        c.native
          ? h("p", { class: "small" }, `Native log: ${c.native.passed} passed, ${c.native.failed} failed, ${c.native.ignored} ignored (sha256 ${short(c.native.logSha256, 16)}). Shown for context only; the invariants below were produced by the ${c.id === "native-sdk" ? "runner" : c.id} category.`)
          : null,
      ),
    ),
  );
}

function evidenceView(inv: InvariantResult): HTMLElement {
  const ev = inv.evidence as { rows?: Array<Record<string, Json>> } | null;
  const wrap = h("div", { class: "evidence" });
  if (ev && Array.isArray(ev.rows) && ev.rows.length > 0) {
    const keys = Array.from(new Set(ev.rows.flatMap((row) => Object.keys(row))));
    const grid = h("div", { class: "rows", role: "table", "aria-label": `Evidence for ${inv.id}` });
    grid.append(h("div", { class: "row head", role: "row" }, ...keys.map((k) => h("span", { role: "columnheader" }, k))));
    for (const row of ev.rows) {
      const bad = row["equal"] === false;
      grid.append(h("div", { class: `row${bad ? " bad" : ""}`, role: "row", "data-mismatch": bad ? "true" : undefined }, ...keys.map((k) => h("span", { role: "cell", class: "mono-small" }, jsonText(row[k])))));
    }
    wrap.append(grid);
  } else {
    wrap.append(h("pre", { class: "mono-small" }, JSON.stringify(inv.evidence, null, 2)));
  }
  return wrap;
}

export function invariantItem(inv: InvariantResult): HTMLElement {
  return h(
    "li",
    { class: `inv ${inv.status}`, "data-invariant": inv.id, "data-status": inv.status },
    h(
      "details",
      { open: inv.status !== "pass" ? true : undefined },
      h("summary", {}, badge(inv.status), h("code", {}, inv.id), inv.builtin ? h("span", { class: "tag-pill" }, "built-in") : null, h("span", { class: "tag-pill" }, inv.category)),
      h("p", { class: "inv-title" }, inv.title),
      h("p", { class: "inv-summary" }, inv.summary),
      evidenceView(inv),
    ),
  );
}

function outcomeText(o: ExecutedOp): string {
  if (o.outcome.status === "ok") {
    const v = o.outcome.value;
    return v === undefined || v === null ? "ok" : `ok -> ${jsonText(v)}`;
  }
  const e = o.outcome.error;
  return e ? `rejected: ${e.class} ${e.hostError}${e.message ? ` (${e.message})` : ""}` : "rejected";
}

export function timelineItem(o: ExecutedOp): HTMLElement {
  const args = o.args.map((a) => `${a.name}=${jsonText(a.value)}`).join(", ");
  const signed = o.signers.length > 0 ? `signed by ${o.signers.join(" + ")}` : o.phase === "system" ? "runner step" : "no authorization";
  return h(
    "li",
    { class: `op ${o.outcome.status}`, "data-op": o.id, "data-outcome": o.outcome.status, "data-expectation": o.expectation },
    h("span", { class: "seq" }, String(o.seq)),
    h(
      "div",
      { class: "op-body" },
      h("div", {}, h("span", { class: `phase ${o.phase}` }, o.phase), h("code", {}, o.id), " ", h("code", { class: "fn" }, `${o.fn}(${args})`)),
      h("div", { class: "small" }, signed, " | ", h("strong", { class: o.outcome.status === "ok" ? "ok-text" : "err-text" }, outcomeText(o)), o.expectation === "unmet" ? h("strong", { class: "err-text" }, " | expectation UNMET") : null),
      o.txHash ? h("div", { class: "small mono-small" }, `tx ${o.txHash}`) : null,
      o.executableAfter ? h("div", { class: "small muted mono-small" }, `executable after: ${short(o.executableAfter, 16)}`) : null,
    ),
  );
}

function authRow(a: AuthCheck): HTMLElement {
  return h(
    "li",
    { class: "authcheck", "data-op": a.op, "data-rejected": String(a.rejected) },
    h("code", {}, a.op),
    ` signers [${a.signers.join(", ") || "none"}] (${a.signatureScheme}): `,
    h("strong", { class: a.rejected ? "ok-text" : "err-text" }, a.rejected ? `rejected (${a.errorClass ?? "?"})` : "ACCEPTED"),
    `; executable ${a.executableUnchanged === true ? "unchanged" : a.executableUnchanged === false ? "CHANGED" : "hash not available"}`,
  );
}

export function probeTable(r: Report, checkpoint: string): HTMLElement {
  const cp = r.checkpoints[checkpoint] ?? {};
  const grid = h("div", { class: "rows", role: "table", "aria-label": `Probes at ${checkpoint}` });
  grid.append(h("div", { class: "row head three", role: "row" }, h("span", {}, "probe"), h("span", {}, "shape"), h("span", {}, "value")));
  for (const [id, p] of Object.entries(cp)) {
    grid.append(probeRow(id, p));
  }
  return grid;
}

function probeRow(id: string, p: ProbeReading): HTMLElement {
  return h(
    "div",
    { class: `row three${p.ok ? "" : " bad"}`, role: "row", "data-probe": id },
    h("span", { class: "mono-small" }, id),
    h("span", { class: "mono-small" }, p.ok ? (p.shape ?? "-") : "unreadable"),
    h("span", { class: "mono-small" }, p.ok ? jsonText(p.value) : (p.error ?? "")),
  );
}

export function checkpointNames(r: Report): string[] {
  return Object.keys(r.checkpoints);
}

export function renderReport(r: Report, notes: string[], onCheckpoint: (name: string) => void, checkpoint: string): HTMLElement {
  const root = h("section", { class: "report", "data-verdict": r.verdict.status, "aria-label": `Report ${r.scenario.name}` });
  root.append(
    h(
      "header",
      { class: "verdict-card" },
      h("div", {}, h("h2", {}, r.scenario.name), r.scenario.definition.description ? h("p", { class: "muted" }, String(r.scenario.definition.description)) : null),
      h("div", { class: "verdict" }, badge(r.verdict.status), h("span", { class: "counts" }, `${r.verdict.passed} passed, ${r.verdict.failed} failed, ${r.verdict.inconclusive} inconclusive`)),
    ),
    ...notes.map((n) => h("p", { class: "note", role: "note" }, n)),
    h("p", { class: "small muted" }, `mode ${r.tool.mode} | runner ${r.tool.runnerVersion} | soroban-sdk ${r.tool.sorobanSdk} | host protocol ${r.tool.hostProtocol} | scenario sha256 ${short(r.scenario.sha256, 16)}`),
    h("h3", {}, "How this was executed"),
    categoryChips(r),
    h("p", { class: "small" }, h("strong", {}, "Authorization: "), r.tool.authEnforcement),
    h("h3", {}, "WASM artifacts"),
    h(
      "dl",
      { class: "wasm" },
      h("dt", {}, "old"),
      h("dd", { class: "mono-small" }, `${r.wasm.old.path} (${r.wasm.old.bytes} bytes) sha256 ${r.wasm.old.sha256}`),
      h("dt", {}, "new"),
      h("dd", { class: "mono-small" }, `${r.wasm.new.path} (${r.wasm.new.bytes} bytes) sha256 ${r.wasm.new.sha256}`),
      ...(r.network ? [h("dt", {}, "contract"), h("dd", { class: "mono-small" }, `${r.network.contractId} on ${r.network.network}`)] : []),
    ),
    h("h3", {}, "Invariants"),
    h("ul", { class: "invs" }, ...r.invariants.map(invariantItem)),
    h("h3", {}, "Executed operations"),
    h("ol", { class: "timeline" }, ...r.executedOps.map(timelineItem)),
  );
  if (r.authChecks.length > 0) root.append(h("h3", {}, "Authorization checks"), h("ul", { class: "auths" }, ...r.authChecks.map(authRow)));
  const names = checkpointNames(r);
  const sel = h("select", { id: "checkpoint", "aria-label": "Checkpoint" }, ...names.map((n) => h("option", { value: n }, n)));
  sel.value = names.includes(checkpoint) ? checkpoint : (names[0] ?? "");
  sel.addEventListener("change", () => onCheckpoint(sel.value));
  root.append(h("h3", {}, "State at a checkpoint"), h("label", { for: "checkpoint" }, "Checkpoint "), sel, probeTable(r, sel.value));
  root.append(limitsSection(r));
  return root;
}

export function limitsSection(r: Report): HTMLElement {
  return h("section", { class: "limits", "aria-label": "What this does not show" }, h("h3", {}, "What this does not show"), h("ul", {}, ...r.limits.map((l) => h("li", {}, l))));
}

// ---- comparison -----------------------------------------------------------------------------

export interface CompareRow {
  id: string;
  title: string;
  a: InvariantResult | null;
  b: InvariantResult | null;
  differs: boolean;
}

/** Pairs invariants by id. Marks rows where the two reports' recorded statuses differ; it never decides a verdict. */
export function compareInvariants(a: Report, b: Report): CompareRow[] {
  const ids = new Map<string, string>();
  for (const i of [...a.invariants, ...b.invariants]) if (!ids.has(i.id)) ids.set(i.id, i.title);
  return [...ids].map(([id, title]) => {
    const x = a.invariants.find((i) => i.id === id) ?? null;
    const y = b.invariants.find((i) => i.id === id) ?? null;
    return { id, title, a: x, b: y, differs: x?.status !== y?.status };
  });
}

export interface OpRow {
  id: string;
  a: ExecutedOp | null;
  b: ExecutedOp | null;
  differs: boolean;
}

export function compareOps(a: Report, b: Report): OpRow[] {
  const ids: string[] = [];
  for (const o of [...a.executedOps, ...b.executedOps]) if (!ids.includes(o.id)) ids.push(o.id);
  return ids.map((id) => {
    const x = a.executedOps.find((o) => o.id === id) ?? null;
    const y = b.executedOps.find((o) => o.id === id) ?? null;
    const sig = (o: ExecutedOp | null) => (o ? `${o.outcome.status}|${jsonText(o.outcome.value)}|${o.outcome.error?.class ?? ""}` : "missing");
    return { id, a: x, b: y, differs: sig(x) !== sig(y) };
  });
}

export interface ProbeDiffRow {
  probe: string;
  a: ProbeReading | null;
  b: ProbeReading | null;
  differs: boolean;
}

export function compareProbes(a: Report, b: Report, checkpoint: string): ProbeDiffRow[] {
  const ca = a.checkpoints[checkpoint] ?? {};
  const cb = b.checkpoints[checkpoint] ?? {};
  const ids = Array.from(new Set([...Object.keys(ca), ...Object.keys(cb)]));
  return ids.map((probe) => {
    const x = ca[probe] ?? null;
    const y = cb[probe] ?? null;
    const sig = (p: ProbeReading | null) => (p ? `${p.ok}|${p.shape ?? ""}|${jsonText(p.value)}` : "missing");
    return { probe, a: x, b: y, differs: sig(x) !== sig(y) };
  });
}

export function commonCheckpoints(a: Report, b: Report): string[] {
  const set = new Set(Object.keys(b.checkpoints));
  return Object.keys(a.checkpoints).filter((n) => set.has(n));
}

function side(s: string): HTMLElement {
  return h("span", { class: "side-tag", "aria-label": `report ${s}` }, s);
}

function cell(inv: InvariantResult | null, s: string): HTMLElement {
  return inv ? h("div", { class: `cell ${inv.status}`, "data-status": inv.status }, side(s), badge(inv.status), h("span", { class: "small" }, inv.summary)) : h("div", { class: "cell missing" }, side(s), h("span", { class: "muted small" }, "not in this report"));
}

function opCell(o: ExecutedOp | null, s: string): HTMLElement {
  return o ? h("div", { class: `cell ${o.outcome.status === "ok" ? "pass" : "fail"}`, "data-outcome": o.outcome.status }, side(s), h("span", { class: "small" }, `${o.fn}: ${outcomeText(o)}`)) : h("div", { class: "cell missing" }, side(s), h("span", { class: "muted small" }, "not in this report"));
}

export function renderCompare(a: Report, b: Report, labelA: string, labelB: string, checkpoint: string, onCheckpoint: (n: string) => void): HTMLElement {
  const root = h("section", { class: "compare", "aria-label": "Side by side comparison" });
  const sameCategory = a.categories.filter((c) => c.status === "executed").map((c) => c.id).join() === b.categories.filter((c) => c.status === "executed").map((c) => c.id).join();
  root.append(
    h("h2", {}, "Side by side"),
    h("p", { class: "muted small" }, "Rows are paired by invariant id and operation id. Highlighted rows are where the two reports differ; the verdicts and every status shown are the runner's, copied from the reports."),
    ...(sameCategory ? [] : [h("p", { class: "note", role: "note" }, "These two reports were executed in different categories (for example in-process host versus testnet). They are not directly comparable.")]),
    h(
      "div",
      { class: "pair heads" },
      h("div", { class: "col", "data-side": "a" }, h("h3", {}, `A: ${labelA}`), h("div", { class: "verdict" }, badge(a.verdict.status), h("span", { class: "counts" }, `${a.verdict.passed} passed, ${a.verdict.failed} failed`)), h("p", { class: "mono-small muted" }, `new wasm ${short(a.wasm.new.sha256, 16)}`)),
      h("div", { class: "col", "data-side": "b" }, h("h3", {}, `B: ${labelB}`), h("div", { class: "verdict" }, badge(b.verdict.status), h("span", { class: "counts" }, `${b.verdict.passed} passed, ${b.verdict.failed} failed`)), h("p", { class: "mono-small muted" }, `new wasm ${short(b.wasm.new.sha256, 16)}`)),
    ),
    h("h3", {}, "Invariants"),
  );
  const invs = h("div", { class: "pairs" });
  for (const row of compareInvariants(a, b)) {
    invs.append(h("div", { class: `pair${row.differs ? " differs" : ""}`, "data-invariant": row.id, "data-differs": String(row.differs) }, h("div", { class: "pair-title" }, h("code", {}, row.id), h("span", { class: "small muted" }, row.title)), cell(row.a, "A"), cell(row.b, "B")));
  }
  root.append(invs, h("h3", {}, "Operations"));
  const ops = h("div", { class: "pairs" });
  for (const row of compareOps(a, b)) {
    ops.append(h("div", { class: `pair${row.differs ? " differs" : ""}`, "data-op": row.id, "data-differs": String(row.differs) }, h("div", { class: "pair-title" }, h("code", {}, row.id)), opCell(row.a, "A"), opCell(row.b, "B")));
  }
  root.append(ops);
  const names = commonCheckpoints(a, b);
  if (names.length > 0) {
    const sel = h("select", { id: "cmp-checkpoint", "aria-label": "Checkpoint to compare" }, ...names.map((n) => h("option", { value: n }, n)));
    sel.value = names.includes(checkpoint) ? checkpoint : (names[0] ?? "");
    sel.addEventListener("change", () => onCheckpoint(sel.value));
    const rows = h("div", { class: "rows", role: "table", "aria-label": "State comparison" }, h("div", { class: "row head three", role: "row" }, h("span", {}, "probe"), h("span", {}, labelA), h("span", {}, labelB)));
    for (const p of compareProbes(a, b, sel.value)) {
      const f = (x: ProbeReading | null) => (x ? (x.ok ? jsonText(x.value) : `unreadable: ${x.error ?? ""}`) : "-");
      rows.append(h("div", { class: `row three${p.differs ? " bad" : ""}`, role: "row", "data-probe": p.probe, "data-differs": String(p.differs) }, h("span", { class: "mono-small" }, p.probe), h("span", { class: "mono-small" }, f(p.a)), h("span", { class: "mono-small" }, f(p.b))));
    }
    root.append(h("h3", {}, "State at a checkpoint"), h("label", { for: "cmp-checkpoint" }, "Checkpoint "), sel, rows);
  }
  root.append(limitsSection(b));
  return root;
}
