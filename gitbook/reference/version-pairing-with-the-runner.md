# Version pairing with the runner

Not a sibling-path import. `vendor/upgradelab-runner/` holds the runner's `report.v1.schema.json`, the recorded reports and `VERSION.json` (runner version, git commit, schema sha256, sha256 of every report). `pnpm vendor ../upgradelab-runner` refreshes it; `pnpm gen` regenerates the validator.

| studio | upgradelab-runner | report version | status |
|---|---|---|---|
| 0.1.1 | 0.1.1 | 1 | tested |

Tests check `compat.json`, `VERSION.json`, the report hashes, that every vendored report validates and carries the vendored runner version, and that the generated validator is current with the vendored schema.
