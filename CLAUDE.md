# upgradelab-studio: working notes

Commands: `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm run typecheck`, `pnpm test`, `pnpm run build`, `pnpm vendor ../upgradelab-runner` (refresh vendored schema + reports + stamp), `pnpm gen` (regenerate validator after the schema changes). Use a port other than 4173 for `vite preview` (other projects use it).
Constraints: no `innerHTML`; strict CSP (no unsafe-eval); studio computes no verdicts; categories stay distinct; verify UI in a real browser at 375 px (main.scrollWidth vs clientWidth); local only; no AI co-author trailers.
Unfinished: nothing known beyond the README limits.
