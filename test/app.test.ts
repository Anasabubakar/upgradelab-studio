import { beforeEach, describe, expect, it, vi } from "vitest";
import { settle, waitFor } from "./helpers.ts";

async function boot() {
  document.body.innerHTML = '<main id="app"></main>';
  vi.resetModules();
  await import("../src/main.ts");
  await waitFor(".compare");
  await settle();
}

const pick = async (id: string, v: string) => {
  const el = document.getElementById(id) as HTMLSelectElement;
  el.value = v;
  el.dispatchEvent(new Event("change"));
  await settle();
};

describe("viewer app", () => {
  beforeEach(() => document.body.replaceChildren());

  it("states what it is and what it never does", async () => {
    await boot();
    expect(document.body.textContent).toMatch(/never runs contract code or user code/);
    expect(document.body.textContent).toMatch(/not an audit/);
  });

  it("opens on the broken-versus-corrected comparison of real reports", async () => {
    await boot();
    const sides = [...document.querySelectorAll(".pair.heads .col")];
    expect(sides.length).toBe(2);
    const badges = [...document.querySelectorAll(".pair.heads .badge")].map((b) => b.getAttribute("data-status"));
    expect(badges).toEqual(["fail", "pass"]);
    const row = document.querySelector('[data-invariant="seeded-balances-preserved-after-migration"]')!;
    expect(row.getAttribute("data-differs")).toBe("true");
    expect(row.textContent).toContain("balance-dave is 0 but expected 40");
  });

  it("shows a single report when no comparison is chosen", async () => {
    await boot();
    await pick("pick-b", "");
    await waitFor("section.report");
    expect(document.querySelector(".compare")).toBeNull();
    expect(document.querySelector("section.report")!.getAttribute("data-verdict")).toBe("fail");
    expect(document.querySelectorAll("[data-invariant]").length).toBeGreaterThan(15);
  });

  it("opens failing invariants by default and keeps passing ones collapsed", async () => {
    await boot();
    await pick("pick-b", "");
    const failing = document.querySelector('.inv[data-status="fail"] details')!;
    const passing = document.querySelector('.inv[data-status="pass"] details')!;
    expect((failing as HTMLDetailsElement).open).toBe(true);
    expect((passing as HTMLDetailsElement).open).toBe(false);
  });

  it("renders the executed-operations timeline with signers and rejections", async () => {
    await boot();
    await pick("pick-a", "vault-correct.report.json");
    await pick("pick-b", "");
    const ops = [...document.querySelectorAll("li.op")];
    expect(ops.length).toBeGreaterThan(15);
    const attack = document.querySelector('li.op[data-op="attack-upgrade-self-auth"]')!;
    expect(attack.getAttribute("data-outcome")).toBe("error");
    expect(attack.textContent).toContain("signed by mallory");
    expect(attack.textContent).toContain("auth");
  });

  it("shows the testnet report with its transaction hashes and its different category", async () => {
    await boot();
    await pick("pick-a", "vault-correct.testnet.report.json");
    await pick("pick-b", "");
    expect(document.querySelector('[data-category="testnet-rpc"]')!.getAttribute("data-cat-status")).toBe("executed");
    expect(document.querySelector('[data-category="compiled-wasm"]')!.getAttribute("data-cat-status")).toBe("not-run");
    expect(document.body.textContent).toMatch(/tx [0-9a-f]{64}/);
  });

  it("warns when two reports from different categories are compared", async () => {
    await boot();
    await pick("pick-a", "vault-correct.report.json");
    await pick("pick-b", "vault-correct.testnet.report.json");
    expect(document.querySelector('[role="note"]')!.textContent).toMatch(/different categories/);
  });

  it("changes the checkpoint table when a checkpoint is chosen", async () => {
    await boot();
    await pick("cmp-checkpoint", "after:p-alice-deposit");
    const dave = document.querySelector('[data-probe="balance-dave"]')!;
    expect(dave.getAttribute("data-differs")).toBe("false");
    await pick("cmp-checkpoint", "after:p-migrate-rest");
    expect(document.querySelector('[data-probe="balance-dave"]')!.getAttribute("data-differs")).toBe("true");
  });

  it("rejects an invalid uploaded file with a visible error", async () => {
    await boot();
    const input = document.getElementById("file") as HTMLInputElement;
    const file = new File(["{\"reportVersion\": 1}"], "bad.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change"));
    await settle();
    expect(document.getElementById("error")!.textContent).toMatch(/schema/);
  });

  it("loads a valid uploaded report", async () => {
    await boot();
    const { readFileSync } = await import("node:fs");
    const text = readFileSync("vendor/upgradelab-runner/reports/vault-broken-reinit.report.json", "utf8");
    const input = document.getElementById("file") as HTMLInputElement;
    const file = new File([text], "mine.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change"));
    await settle();
    expect(document.getElementById("error")).toBeNull();
    expect(document.querySelector("h2")!.textContent).toBe("vault-broken-reinit");
  });
});
