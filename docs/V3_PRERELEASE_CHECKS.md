# V3.0.0-alpha.1 release validation

Date: 2026-11-01. This is a prerelease, not a claim of complete or defect-free functionality.

## Checks run

- Clean `npm ci`, `npm run typecheck`, `npm run test:unit` (25 test files), `npm run test:typescript-parity`, `npm run build`, `npm audit` (zero advisories at test time) and `git diff --check` passed. The standard unit runner includes regression tests for previously committed experimental Wasm; no Rust development or native Rust build was performed.
- 28 of 30 Playwright scripts completed successfully with Chromium 148 and software WebGL. These include two diagnostic worker-inspection scripts, desktop and touch UI, signal-port connection/disconnection/undo, `.lcmx` archive save and import, file-handle safety, graphics image differences, import formats, material round-trips, worker behavior, and standalone offline and packaged-example checks. `browser.mjs` initially timed out under software rendering with two live canvases; closing the completed desktop page before opening the phone page allowed the test to pass on rerun.
- `v2-worker-mixamo.mjs` and `v2-retarget-motion.mjs` skipped: no locally licensed Mixamo fixture was supplied. No Mixamo assets are included.
- Production `dist/index.html` was tested offline, including STL and STEP imports and STEP inside a sandboxed iframe. The extracted V3 bundle was tested using `file://` with the bundled sample project; no network request or script-warning dialog occurred.

## Limits and known gaps

The tests sample workflows and formats; they cannot establish that nothing is broken. Software Chromium is not a substitute for hardware-GPU/WebGPU testing, other browsers, real devices, visual comparison of all presets, or live Poly Haven service testing. The Vite build reports existing browser externalization warnings from OCCT for Node `path` and `crypto`; tested offline CAD imports passed. The application and executable project scripts are not a security or industrial-safety boundary.

The physical factory graph supports independent linear lines, not material-flow branching/merging. The viewport signal editor is a limited single-target-per-source signal interface, not a general 3D material connection or controller I/O editor. KUKA/FANUC controller program export/import, Visual Components library conversion, and the remaining deferred roadmap are not implemented. Runtime script confirmations, browser storage limits and archive limitations are described in `USER_GUIDE.md` and `ROADMAP.md`.
