# 2.5.0-alpha.12 audit (2026-11-01)

This is a maintenance prerelease before the next feature cycle. TypeScript remains the default simulation and Three.js rendering is unchanged. No new simulation optimization was merged in this audit: the existing alpha.11 optimization was re-measured, but additional improvements need profiling and parity validation rather than speculative changes.

## Security and build

- Updated `fflate` 0.8.2 → 0.8.3, Vite 7.3.2 → 7.3.7 and esbuild 0.27.7 → 0.28.2. `npm ci`, `npm audit` (zero reported vulnerabilities), typecheck and production build passed with Node 22.22.3. Audit results are time-dependent and do not guarantee the absence of vulnerabilities.
- The build still reports the existing browser externalization warnings for `path` and `crypto` from OCCT; offline STEP and IGES/BREP imports were exercised successfully.

## Tests

- All 23 unit test files passed after a clean install, including prebuilt experimental Wasm tests. Four-scene TypeScript selected-state parity against the alpha.10 baseline passed every frame over 90 simulated seconds at tolerance 1e-8. Native `cargo test` was not run: Cargo was unavailable in the environment.
- Re-ran the alpha.11 engine benchmark (Node only, no rendering). In a three-trial run, median total step times for the alpha.10 baseline → current engine were 1142.69 → 1024.30 ms for dense multiline and 1473.16 → 1309.83 ms for crowded transfers. These compare against alpha.10, **not** alpha.11; there is no claimed new speedup in alpha.12. Timings are noisy and do not establish browser FPS or universal parity.
- Chromium 148 headless with software WebGL: standalone offline STL/STEP imports and sandboxed iframe STEP import, packaged file launch/example, STL smoke, 3MF units, autosave safety, example project, import sweep, material roundtrip, mobile, malformed import handling, worker smoke/motion/operations/position, animation-only import, IGES/BREP, compressed formats, extra formats, handle safety and script confirmation passed. Worker inspection scripts completed. The packaged and standalone tests were rerun after the clean production build.
- `tests/browser.mjs`, `tests/code-and-tablet.mjs`, `tests/features.mjs` and `tests/v1-graphics.mjs` did **not** complete: their locators waited for Cookie bakery, Компьютер, Hat and Exposure controls respectively. They may need updating for UI changes, but the underlying features have not been fully verified by these scripts. `browser.mjs` was stopped after the timeout. These are not counted as passes.
- Mixamo-specific retargeting and worker tests were skipped because a locally licensed `MIXAMO_FIXTURE` was unavailable. Hardware GPU, visual comparison, live Poly Haven network access and all user workflows were not exhaustively tested. Browser tests ran against the development server where test hooks are required; standalone/packaged checks used the production build.

## Known product gaps

The component graph still does not implement genuine branching/merging or the requested 3D I/O editing mode. Other requested AI Factory and UI functionality remains subject to follow-up and real-user validation; passing this maintenance audit does not mean those features are complete.
