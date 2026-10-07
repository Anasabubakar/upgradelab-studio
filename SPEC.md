# UpgradeLab studio: specification (version 1)

## User
Someone reviewing a Soroban upgrade: the author who ran the rehearsal, or a reviewer who was sent a report. They want to see what was rehearsed, what held, what did not, and with which execution category, without installing Rust.

## Scope
- Load recorded reports bundled with the build, or a local JSON file; validate against the vendored report v1 schema; reject unknown versions, schema violations, and reports whose verdict counts or authorization checks contradict their own contents.
- Single-report view: verdict, categories, authorization statement, WASM artifacts, invariants with evidence, operation timeline, authorization checks, checkpoint state, limits.
- Comparison view: two reports side by side by invariant id, operation id and probe at a chosen checkpoint.
- Flag reports from another runner version; warn when compared reports were executed in different categories.

## Non-goals
- Does not run the runner, the contracts or any user code; no WASM execution in the browser.
- Does not compute verdicts, scores or recommendations. It displays the runner's statuses.
- No upload, no accounts, no network requests, no storage of opened files.
- No editing of scenarios.

## Data model
The runner's report v1 (`vendor/upgradelab-runner/report.v1.schema.json`); the studio's `types.ts` describes validated data only.

## Failure classes
| Input | Behavior |
|---|---|
| Not JSON / over 5 MB | error shown, previous view kept |
| `reportVersion` not 1 | error naming the version |
| Violates schema | error listing up to five paths |
| Counts disagree with invariants | error |
| Other runner version | shown with a note |
| Markup in report text | rendered as text |

## Architecture
`validate.ts` (precompiled validator + consistency checks) -> `view.ts` (pure comparison functions + DOM builders using `dom.ts`, text nodes only) -> `main.ts` (state, controls, recorded reports via lazy `import.meta.glob`).

## Acceptance
Tests pass; build succeeds with the validator check; every vendored report validates; browser check at 375 px shows no horizontal overflow; page states what it is not.
