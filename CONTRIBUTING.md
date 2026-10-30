# Contributing

Thanks for helping improve Larp Components.

## Setup

1. Install Node.js 22 (see `.nvmrc`; 20.19+ also works).
2. `npm ci`
3. `npm run dev` and open the URL Vite prints.

## Before opening a pull request

```sh
npm run typecheck
npm run test:unit
npm run build
```

All three run in CI. For UI or rendering changes, also run the relevant Playwright test in `tests/` against a dev server on port 4173 and check the change visually: renderer and camera regressions often pass type checks and unit tests.

## Guidelines

- Keep changes focused; one fix or feature per pull request.
- Use `npm run build` (not plain `vite build`) when checking the standalone output.
- Do not commit `node_modules/`, `dist/`, test artifacts, or release bundles (`Larp_Factory_V2*.html/.zip`).
- Do not add credentials, tokens, or Adobe/Mixamo assets. Only CC0 or otherwise redistributable assets may be added, with their license in `THIRD_PARTY_LICENSES/`.
- User-facing strings go through `src/i18n.ts` (English and Russian).
- Update `CHANGELOG.md` under "Unreleased" for user-visible changes.

## Reporting bugs

Use the bug report template. Include the browser, OS, GPU if known, steps to reproduce, and whether the problem occurs on desktop or touch.
