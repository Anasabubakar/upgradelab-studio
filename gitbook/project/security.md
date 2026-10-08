# Security policy

The studio is a static page that reads JSON you open or that is bundled with it. It makes no network requests, runs no contract or user code, and renders report text as text nodes under a strict CSP (no `unsafe-eval`).

Report vulnerabilities (for example a way to make report content execute as markup or script, or the page to fetch something) through GitHub's private vulnerability reporting for this repository. Please do not open a public issue for them.
