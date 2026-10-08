# ADR 0001: Why a separate viewer, and what it does not replace

Status: accepted, 2026-10-07. Read on that date: the runner's own text output (the primary report format), and, for comparison with the runner ADR, the READMEs summarized in `upgradelab-runner/docs/adr/0001`. Nothing else was installed or run.

## Existing options
- **The runner's text and JSON output** already shows every invariant and operation. A developer in a terminal or CI log needs nothing else.
- **Crucible, soroban-upgrade-safeguard, OpenZeppelin upgradeable** (as read for the runner ADR): a test toolkit, a static WASM diff CLI that prints text/JSON/Markdown/GitHub-Actions output, and contract-side utilities. None of them, as described, offers a viewer for migration-rehearsal results.

## What the viewer adds (narrowly)
1. A **side-by-side** of a broken and a corrected migration paired by invariant, operation and checkpoint, so the cause (one balance read back as 0) is visible next to the healthy run.
2. The **execution category** of each report as a first-class label, with a warning when categories differ.
3. A way to **hand a report to someone without Rust**: a static page that opens a JSON file locally.

It does not add analysis. If the text output is enough for you, use it. Teams may have internal dashboards for this already; no novelty claim.

## Decision
Build a static Vite + vanilla TypeScript page that reads reports only, validates them with a precompiled validator, and keeps all verdict logic in the runner.
