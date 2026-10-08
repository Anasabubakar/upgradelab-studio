# Contributing

```bash
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm test && pnpm run build
pnpm vendor ../upgradelab-runner && pnpm gen     # after the runner's reports or schema change
```

- Report text goes in as text nodes only: use `h()` from `src/dom.ts`. No `innerHTML`, no `eval`; a test enforces it.
- Do not compute verdicts in the studio. Show what the report says; "differs" markers compare recorded values.
- Every displayed state must come from a validated report; synthetic examples are not allowed unless labelled synthetic (there are none).
- Keep the categories distinct and label them.
- UI changes need a look in a real browser at desktop and 375 px, measuring `main.scrollWidth` against `clientWidth`.
- One logical change per commit. AI-assisted changes are welcome if you understand and verified them.
