# V3.0.0-alpha.1 release validation

Date: 2026-11-01. This is a historical prerelease validation, not a claim of complete or defect-free functionality. Subsequent development added multiple signal destinations and feeder inputs; see `USER_GUIDE.md` for current behavior.

## Checks run

- Clean `npm ci`, `npm run typecheck`, `npm run test:unit` (25 test files), `npm run test:typescript-parity`, `npm run build`, `npm audit` (zero advisories at test time) and `git diff --check` passed.
- 28 of 30 Playwright scripts completed successfully with Chromium 148 and software WebGL. These include two diagnostic worker-inspection scripts, desktop and touch UI, signal-port connection/disconnection/undo, `.lcmx` archive save and import, file-handle safety, graphics image differences, import formats, material round-trips, worker behavior, and standalone offline and packaged-example checks. `browser.mjs` initially timed out under software rendering with two live canvases; closing the completed desktop page before opening the phone page allowed the test to pass on rerun.
- `v2-worker-mixamo.mjs` and `v2-retarget-motion.mjs` skipped: no locally licensed Mixamo fixture was supplied. No Mixamo assets are included.
- Production `dist/index.html` was tested offline, including STL and STEP imports and STEP inside a sandboxed iframe. The extracted V3 bundle was tested using `file://` with the bundled sample project; no network request or script-warning dialog occurred.

## Limits and known gaps

The tests sample workflows and formats; they cannot establish that nothing is broken. Software Chromium is not a substitute for hardware-GPU/WebGPU testing, other browsers, real devices, visual comparison of all presets, or live Poly Haven service testing. The Vite build reports existing browser externalization warnings from OCCT for Node `path` and `crypto`; tested offline CAD imports passed. The application and executable project scripts are not a security or industrial-safety boundary.

The physical factory graph supports independent linear lines, not material-flow branching/merging. The viewport signal editor is a limited single-target-per-source signal interface, not a general 3D material connection or controller I/O editor. KUKA/FANUC controller program export/import, Visual Components library conversion, and the remaining deferred roadmap are not implemented. Runtime script confirmations, browser storage limits and archive limitations are described in `USER_GUIDE.md` and `ROADMAP.md`.

## Prerelease asset automation

For a same-repository pull request, CI can attach `Larp_Factory_V3.html` to an
already-published prerelease after tests pass. The upload job runs only if the
package version is a prerelease, that release is published, and its tag resolves
exactly to the PR head commit. Forks and unmatched tags are skipped; the normal
build job retains read-only permissions. If the release is published after CI
finishes, re-run CI to attach the asset.

## Alpha.4 follow-up

The alpha.4 work adds unit regressions for signal-controlled conveyors/feeders, button pulses, operation-end robot outputs, mounted pickup sensors, pallet replacement, large scenes, imported catalog bases/submodels and collision choices. Browser checks cover camera and GI-room restoration, thumbnails, shared edits, drag/drop, project reload, AI Factory product pickers and an in-scene loading placeholder. The TypeScript comparison uses explicit historical robot-output mode; the new operation-end default has separate signal tests. Physics, sensor opacity and thumbnail fidelity remain approximations.

## Alpha.5 follow-up

Explicit graph sensor nodes and numbered I/O are covered by `tests/graph-signals.ts` and `tests/factory-signal-nodes-browser.mjs`, including migration, pickup placement, per-port functions/colours, feedback, simulation and archive round-trips. The browser checks run in CI. Current physical graphs support conveyor merges and shared pickup stations; viewport signal sources can have multiple destinations. Signal feedback is stepped, not an industrial PLC or safety controller; laser opacity and beam behavior remain approximate.
