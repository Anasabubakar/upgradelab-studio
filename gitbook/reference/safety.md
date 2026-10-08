# Safety

- No `innerHTML`, no `eval`; report text is inserted as text nodes (a test injects markup through report fields and checks nothing renders).
- Validator is **precompiled** (`scripts/gen-validator.mjs`, ajv standalone) so the CSP needs no `unsafe-eval`: `default-src 'self'; script-src 'self'; style-src 'self'; ...` (meta tag and `vercel.json` headers).
- No network requests; files you open are read locally in the browser.
- The studio computes no verdicts. Every status is copied from the report; "differs" markers compare recorded values.
