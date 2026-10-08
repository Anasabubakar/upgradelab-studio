# What you can do

- **Compare** two recorded reports side by side (default: "Broken: loses a balance" vs "Corrected migration"). Rows are paired by invariant id and operation id; rows where the runner's recorded statuses differ are highlighted. Pick any checkpoint (`before:<op>`, `after:<op>`) to see probe values for both.
- **Read one report**: verdict, execution categories, WASM sha256, every invariant (failing ones open by default) with the compared values, the operation timeline (phase, signers, outcome, authorizations, transaction hashes for testnet), authorization checks, and the report's own list of what it does not show.
- **Open your own report file** (`upgradelab run ... --out report.json`). It is validated against the vendored v1 schema and, if it came from a different runner version, flagged.

Recorded reports (all in `vendor/upgradelab-runner/reports/`): the corrected migration; broken variants that lose a balance, double one, allow re-initialization, leave `upgrade` unauthorized, and are not idempotent; and one real Stellar testnet run of the corrected path. Nothing on the page is scripted: remove a report and it is gone.

Evidence from a real browser (2026-10-07, Chromium-based pane): [comparison, desktop](https://github.com/Upgrade-Lab/upgradelab-studio/blob/main/docs/evidence/compare-desktop.jpg), [narrow screen](https://github.com/Upgrade-Lab/upgradelab-studio/blob/main/docs/evidence/narrow-375-top.jpg). Overflow was measured with `main.scrollWidth` against `clientWidth` at 375 px for the comparison, the single report, the testnet report and two broken reports: equal in every case.
