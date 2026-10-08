# upgradelab-studio

A static viewer for [UpgradeLab](https://github.com/Anasabubakar/upgradelab-runner) migration-rehearsal reports. It opens on a broken migration next to the corrected one, using **real reports the runner generated**, and shows invariants with their evidence, the executed-operations timeline, the state at any checkpoint, and which execution category produced each result.

It never executes contract code or user code. It only reads JSON, validates it with a precompiled validator and draws it with text nodes. Hosted demo: https://upgradelab-studio-anasamasama.vercel.app. Run it locally below.

## Run

Node 22 or newer and pnpm.

```bash
git clone <this repo> && cd upgradelab-studio
pnpm install --frozen-lockfile
pnpm dev            # or: pnpm build && pnpm preview
```

## What you can do
- **Compare** two recorded reports side by side (default: "Broken: loses a balance" vs "Corrected migration"). Rows are paired by invariant id and operation id; rows where the runner's recorded statuses differ are highlighted. Pick any checkpoint (`before:<op>`, `after:<op>`) to see probe values for both.
- **Read one report**: verdict, execution categories, WASM sha256, every invariant (failing ones open by default) with the compared values, the operation timeline (phase, signers, outcome, authorizations, transaction hashes for testnet), authorization checks, and the report's own list of what it does not show.
- **Open your own report file** (`upgradelab run ... --out report.json`). It is validated against the vendored v1 schema and, if it came from a different runner version, flagged.

Recorded reports (all in `vendor/upgradelab-runner/reports/`): the corrected migration; broken variants that lose a balance, double one, allow re-initialization, leave `upgrade` unauthorized, and are not idempotent; and one real Stellar testnet run of the corrected path. Nothing on the page is scripted: remove a report and it is gone.

Evidence from a real browser (2026-10-07, Chromium-based pane): [comparison, desktop](docs/evidence/compare-desktop.jpg), [narrow screen](docs/evidence/narrow-375-top.jpg). Overflow was measured with `main.scrollWidth` against `clientWidth` at 375 px for the comparison, the single report, the testnet report and two broken reports: equal in every case.

## Two categories, never merged
`compiled-wasm` (compiled WASM in an in-process Soroban host, not a network), `testnet-rpc` (real testnet transactions) and `native-sdk` (native Rust tests, only ever shown as a recorded input). The page labels each report's categories, and warns when you compare reports from different categories.

## Safety
- No `innerHTML`, no `eval`; report text is inserted as text nodes (a test injects markup through report fields and checks nothing renders).
- Validator is **precompiled** (`scripts/gen-validator.mjs`, ajv standalone) so the CSP needs no `unsafe-eval`: `default-src 'self'; script-src 'self'; style-src 'self'; ...` (meta tag and `vercel.json` headers).
- No network requests; files you open are read locally in the browser.
- The studio computes no verdicts. Every status is copied from the report; "differs" markers compare recorded values.

## Version pairing with the runner
Not a sibling-path import. `vendor/upgradelab-runner/` holds the runner's `report.v1.schema.json`, the recorded reports and `VERSION.json` (runner version, git commit, schema sha256, sha256 of every report). `pnpm vendor ../upgradelab-runner` refreshes it; `pnpm gen` regenerates the validator.

| studio | upgradelab-runner | report version | status |
|---|---|---|---|
| 0.1.1 | 0.1.1 | 1 | tested |

Tests check `compat.json`, `VERSION.json`, the report hashes, that every vendored report validates and carries the vendored runner version, and that the generated validator is current with the vendored schema.

## Develop
```bash
pnpm run typecheck && pnpm test && pnpm run build     # 36 tests (vitest, jsdom)
```

## Status
Engineering complete for v0.1; verified in a real browser at desktop and 375 px. Pushed to GitHub with CI green; not published to npm. No Soroban upgrade or security reviewer has looked at the invariants the reports show.

MIT licensed.
