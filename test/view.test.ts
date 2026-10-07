import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { commonCheckpoints, compareInvariants, compareOps, compareProbes, renderReport } from "../src/view.ts";
import { load } from "./helpers.ts";

const correct = load("vault-correct");
const lose = load("vault-broken-lose-balance");

describe("comparison logic", () => {
  it("pairs invariants by id and marks exactly the rows whose recorded status differs", () => {
    const rows = compareInvariants(lose, correct);
    const differing = rows.filter((r) => r.differs).map((r) => r.id).sort();
    expect(differing).toEqual(["migration-converts-every-entry", "seeded-balances-preserved-after-migration", "supply-equals-sum-after-migration"]);
    for (const r of rows) {
      expect(r.a).not.toBeNull();
      expect(r.b).not.toBeNull();
    }
  });

  it("copies statuses from the reports instead of deciding them", () => {
    for (const r of compareInvariants(lose, correct)) {
      expect(r.a!.status).toBe(lose.invariants.find((i) => i.id === r.id)!.status);
      expect(r.b!.status).toBe(correct.invariants.find((i) => i.id === r.id)!.status);
    }
  });

  it("shows the lost balance at the migration checkpoint", () => {
    const rows = compareProbes(lose, correct, "after:p-migrate-rest");
    const dave = rows.find((r) => r.probe === "balance-dave")!;
    expect(dave.differs).toBe(true);
    expect(dave.a!.value).toBe("0");
    expect(dave.b!.value).toBe("40");
    expect(rows.find((r) => r.probe === "balance-alice")!.differs).toBe(false);
  });

  it("finds the same operations in both reports and none differing in outcome for the lose-balance defect", () => {
    const rows = compareOps(lose, correct);
    expect(rows.every((r) => r.a && r.b)).toBe(true);
    expect(rows.filter((r) => r.differs)).toEqual([]);
  });

  it("flags the operation outcome that differs for the unauthorized-upgrade defect", () => {
    const rows = compareOps(load("vault-broken-upgrade-auth"), correct);
    expect(rows.filter((r) => r.differs).map((r) => r.id)).toEqual(["attack-upgrade-no-auth"]);
  });

  it("lists the checkpoints both reports have", () => {
    expect(commonCheckpoints(lose, correct)).toContain("after:p-migrate-rest");
  });

  it("handles reports with different invariant sets (host versus testnet)", () => {
    const tn = load("vault-correct.testnet");
    const rows = compareInvariants(correct, tn);
    expect(rows.some((r) => r.a && !r.b)).toBe(true);
  });
});

describe("report rendering", () => {
  it("never writes HTML from report content", () => {
    const evil = JSON.parse(JSON.stringify(correct));
    evil.invariants[3].summary = '<img src=x onerror="window.__pwned=1">';
    evil.scenario.name = "<script>window.__pwned=1</script>";
    const el = renderReport(evil, [], () => {}, "after:upgrade");
    document.body.replaceChildren(el);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(document.body.textContent).toContain("<img src=x");
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it("source files never use innerHTML, outerHTML, insertAdjacentHTML, eval or Function", () => {
    for (const f of ["dom", "main", "validate", "view"]) {
      const text = readFileSync(`src/${f}.ts`, "utf8");
      for (const banned of ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function"]) {
        expect(text.includes(banned), `${f}.ts uses ${banned}`).toBe(false);
      }
    }
  });

  it("states the limits of every report", () => {
    const el = renderReport(correct, [], () => {}, "after:upgrade");
    document.body.replaceChildren(el);
    expect(document.body.textContent).toContain("What this does not show");
    expect(document.querySelectorAll(".limits li").length).toBe(correct.limits.length);
  });

  it("marks execution categories distinctly", () => {
    const el = renderReport(correct, [], () => {}, "after:upgrade");
    document.body.replaceChildren(el);
    const cats = [...document.querySelectorAll("[data-category]")].map((c) => [c.getAttribute("data-category"), c.getAttribute("data-cat-status")]);
    expect(cats).toEqual([["compiled-wasm", "executed"], ["native-sdk", "recorded-input"], ["testnet-rpc", "not-run"]]);
  });
});
