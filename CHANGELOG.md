# Changelog

All notable changes to this project are documented here. Versions follow the Larp Factory V2 release numbering.

## [2.5.0-alpha.6] - 2026-11-01 (prerelease)

- Experimental Rust/Wasm bounded A* route planning for humans (`?rustNavigation=1`). Destination projection, task logic, steering and motion remain TypeScript; the default remains TypeScript.
- In 500 route comparisons, reachability and grid cost matched but five routes took different equal-cost paths. Four human-task scenarios completed with the Rust planner; full behavior parity and browser performance are not established.
- The complete Rust port is still unfinished.

## [2.5.0-alpha.5] - 2026-11-01 (prerelease)

- Experimental Rust/Wasm automation signals for buttons, lasers, proximity sensors and PLCs (`?rustLogic=1`), with ordered signal propagation. Wiring, user input and robot signals remain host-managed. The default remains TypeScript.
- Added 3,000 randomized circuit comparisons and an engine integration test. The full Rust migration, full-engine parity, browser behavior and performance remain unverified.

## [2.5.0-alpha.4] - 2026-11-01 (prerelease)

- Experimental Rust/Wasm automatic machine workflow (`?rustMachineWorkflow=1`): selection, assembly and cycle decisions. The TypeScript host retains spatial candidate ordering, product mutations and explicit robot/human process calls. The default remains TypeScript.
- Added generated-factory hybrid comparisons and machine edge-case/randomized tests. Browser behavior, performance and full-engine parity are not established; the Rust migration is still incomplete.

## [2.5.0-alpha.3] - 2026-11-01 (prerelease)

- Experimental Rust/Wasm machine cycle clock, independently opt-in via `?rustMachines=1`. All machine decisions and product transitions still run in TypeScript; this is not a complete machine or engine port.
- Added numerical edge-case and actual machine-cycle comparisons, and enabled the clock in the hybrid factory tests. Browser behavior and performance remain unverified.
- The full Rust engine migration, full-engine parity, physical graph branching/merging and 3D I/O editing remain unfinished.

## [2.5.0-alpha.2] - 2026-11-01 (prerelease)

- Experimental batched Rust/Wasm feeder decisions can be enabled with `?rustFeeders=1`; the default remains TypeScript. The rest of the factory simulation still runs in TypeScript with Three.js rendering.
- Added side-by-side tests of selected state for generated factories and feeder edge cases. Both sides share all non-feeder systems; this is not full-engine parity. Browser behavior and performance have not been validated.
- The full Rust migration, physical graph branching and merging, and 3D I/O editing remain incomplete. See `docs/RUST_ENGINE_MIGRATION.md`.

## [2.5.0-alpha.1] - 2026-11-01 (prerelease)

### Experimental: Rust engine migration
- A Rust/WebAssembly navigation prototype implements point-to-segment distance and obstacle/barrier checks against a packed scene. The real Wasm module is tested against the TypeScript reference (10,000 distance cases and 20,000 scene queries), alongside the existing simulator regression suite.
- **The migration is not complete.** The released application still runs the TypeScript simulation, including its JavaScript robot programs. The Rust prototype is not wired into the production simulation; no claim of full feature parity, improved speed or Rust-based app runtime is made.
- A Node microbenchmark of the prototype showed no performance benefit in this environment; further batched engine work and browser measurements are needed before switching production paths. See `docs/RUST_ENGINE_MIGRATION.md`.

### Other work in progress
- The graph editor contains early physical feeder, conveyor, robot, machine, human and pallet nodes; it supports selected linear production setups, not arbitrary branching/merging. Node insertion, search, copy/paste and disconnected nodes are experimental.
- Includes fixes for the settings-header dim toggle, Poly Haven catalogue response parsing, and simulation elapsed-time handling. Live Poly Haven connectivity was not verified in this sandbox.

## [2.4.0] - 2026-10-31

### Added
- **Node-based AI Factory generator.** The generator is now a graph editor, in the spirit of Unreal Blueprints and ComfyUI: every section of the plant is a node with typed, colour-coded ports, and the factory follows the wires instead of a single option record. Ten node types ship today — *Prompt*, *Recipe & products*, *Process chain*, *Line speed*, *Robot & tool*, *Staff*, *Safety*, *Line layout*, *Pallet pattern*, *Factory output*. Drag a wire from an output port to an input port, click a wire to cut it, double-click a node to collapse it, drag nodes and pan/zoom the canvas. A starter graph reproduces the previous generator exactly, so the old workflow is still one click away in the *Form* tab.
- **Live preview and diagnostics.** The studio compiles the wiring as you edit and shows the same floor plan the form dialog uses, the tags the prompt produced, the intent notes ("a kiln implies the brick recipe"), the compile time and per-node error/warning badges. *Build factory* is disabled while the graph has errors, and clicking a diagnostic selects the node that caused it.
- **Modular node registry.** A node is a plain object: `type`, `title`, `category`, typed `inputs`/`outputs`, parameter definitions with defaults/ranges/options, and one pure `evaluate`. Registering a new section (or a whole future node pack) is one `registerNode()` call; the palette, inspector, validation and compiler pick it up with no other changes. Ports carry a `PortType` so a *Robot* output cannot be wired into a *Pallet* input; fan-out is allowed and marked with `many`.
- **Graph safety.** Wires that would create a cycle are rejected at the moment of connection, and `validateGraph` reports missing required inputs, type mismatches, single-wire inputs with two sources, dangling links and unknown node types. Each node evaluates inside its own try/catch, so one broken node produces a diagnostic instead of an empty factory. The whole graph is compiled in topological order (Kahn) rather than node by node.
- **Precedence you can predict.** An explicit node value beats the prompt, the prompt beats the defaults. Only the values a user actually touches are stored, so a settings node never silently overrides the sentence it sits next to.
- **Better prompt coherence and tagging.** The natural-language parser was rebuilt around a bilingual tag lexicon: recipe, process, robot, gripper, style, safety and scale rules, Russian stem wildcards ("кобот\*" matches "коботами"), negation windows ("no fences", "без ограждений"), and a coherence pass that resolves contradictions instead of applying rules in file order — a kiln forces the brick recipe and a clay → brick flow, a magnetic gripper is downgraded for non-magnetic products, stage count is matched to the chain, staff is zeroed for an unmanned plant, and conflicting tags are settled by weight with an explanation. Labelled product fields now resolve fuzzy phrases ("готовая металлическая деталь" → *Machined part*) instead of falling back to the recipe default.
- **Graph files.** Export the graph as JSON and import it back; the current graph is remembered between sessions.

### Changed
- `parsePrompt` (used by the form) now delegates to the same analyzer as the graph, so both paths understand a sentence identically.
- The generator dialog opens in graph mode; the previous form is available from the *Form* toggle in its header.

## [2.3.0] - 2026-10-31

### Added
- **Web catalogue tab (Poly Haven).** The catalog now has a third tab, *Web*, that browses the Poly Haven model library (thousands of CC0 assets), searches it locally, downloads glTF at 1k / 2k / 4k and drops the model into the scene through the normal import pipeline. The model, its buffer and all of its textures are stored inside the project file, so a saved factory still opens offline. The panel credits "Powered by Poly Haven" and its licence.
- **Movable settings window with an optional backdrop.** Drag the window by its title bar, double-click the bar (or use Settings → Interface → Settings window) to re-centre, and switch off *Dim background* to watch the factory while tuning lighting and shadows. Position and the dim choice are remembered between sessions.
- **Live rendering diagnostics** (Settings → Video → Active rendering): renderer that actually started, GI path that is actually running (including the reason for a fallback), real shadow map size, area and centimetres per texel, frame time/FPS and 3D pixel ratio.
- **Build stamp**: the settings window shows the app name, version and build time in small text at the bottom; `Ctrl+Alt+J` prints the same line to the Output panel.
- **Graphical knobs that match the descriptions**: shadow softness (1–16 texels), shadow area (8–200 m), *shadows follow the camera*, VXGI voxel resolution (64/96/128) and voxel refresh interval (0.25–30 s).
- **Visual Components shortcut set**: `F` fit all, `Ctrl+Alt+F` fit selection, `Shift+R` / Shift+right-click centre of interest, `=` / `-` zoom, `Tab` show/hide side panels, `Shift+G` floor grid, `Ctrl+F` component search, `Ctrl+Alt+J` version to Output, `Ctrl+N` new factory, `Ctrl+O` open a project file, `Ctrl` + double-click duplicate. All of them are rebindable in Settings → Keybinds and can be exported with the settings.

### Fixed
- **Image-based lighting in the Max preset.** The old environment used drei's `Environment`, which renders into a WebGL cube render target and therefore could not feed the WebGPU renderer — the preset with the most lighting detail was the one without reflections. A renderer-matched PMREM studio environment now builds the same studio look on both backends and disposes cleanly when the renderer changes.
- **Global illumination being overdrawn.** The post-processing composer rendered the scene a second time after the VXGI render pipeline, painting over the indirect light. Whichever pipeline owns the frame now renders it alone.
- **Soft shadows did nothing.** `PCFSoftShadowMap` is deprecated in r186 and no longer filters; shadows now use `PCFShadowMap` with `light.shadow.radius`, and the Low preset uses the cheaper basic filter.
- **Blurry, crawling shadows.** The sun shadow camera covered the whole building (10–20 cm per texel on a large plant). The frustum now keeps a snug, configurable area around the view, snaps to the texel grid to stop crawling, and refreshes only when something changed instead of every frame.
- **VXGI fallback was silent.** When WebGPU or the pipeline is unavailable the app now says so in the settings, in the diagnostics and in the event log, and uses the approximation instead of quietly rendering unlit geometry.
- Saved or imported graphics settings can no longer contain out-of-range values: every numeric field is clamped (exposure, light intensities, shadow radius/area, voxel size and refresh, occlusion, fog distance, sun angles) and unsupported enum values fall back to the preset.

## [2.2.0] - 2026-10-31

### Changed
- **Simulation performance on large factories.** Measured with a 276-component plant (24 workers, 12 lines) at 8× speed, one frame of simulation CPU went from **13.4 ms to 3.9 ms** (about 3.4× faster); a 72-component plant went from 2.8 ms to 1.4 ms. Results are unchanged: nine generated recipes were compared frame-by-frame against the previous build and produce identical statistics.
  - Products, supports and walk barriers are found through a spatial hash instead of scanning every belt, table and worker.
  - Conveyor lookups only inspect the belt segments under the product, not the whole spline.
  - The per-substep work of robots and workers (item lookups, station resolution, reachable-point projection, product pick-up search) is cached or indexed instead of re-scanning the scene.
  - Walk collision tests only look at obstacles within a metre, and the hottest tests no longer allocate.
  - The timer/condition queues and the throughput history are recycled instead of allocated and grown per frame.
- **The simulation now shares the frame budget instead of taking a fixed 12 ms.** The renderer measures the actual frame time and gives the simulation up to 8 ms while frames are comfortable, then 5 / 2.5 / 1.2 ms as frames slip, so a large plant no longer drags the frame rate down. High speed multipliers simply advance less simulated time per frame on a slow device — nothing is skipped or faked.
- Shadow maps are refreshed every other frame (every third frame on low quality) instead of every frame.
- Contact shadows are refreshed four times per second while the plant is running instead of rendering the whole scene into an extra target on every frame, and they are computed once when paused.

### Fixed
- The simulation-settings panel opened by the gear button in the player bar now opens **downward** from the bar (it still opens upward on phone layouts, where the player sits at the bottom of the screen).

## [2.1.0] - 2026-10-30

### Added
- **Custom skin** (`Larp UI` / `Visual Components` / `R-pro` / `Custom`) with a fully customizable colour scheme: window, title bar, tabs, ribbon, panels, dock, 3D viewport, status bar, chrome text and accent are each pickable. The scheme is saved with the settings and included in settings export/import.
- **Antialiasing** setting next to 3D resolution: Off, FXAA (fast) and MSAA (smooth). Changing it rebuilds the render context cleanly.
- **3D resolution below 100%** (50/65/75/90 %) in addition to 100/125/150/200 %.
- **Dockable panels**: the catalog, properties and output panels can be resized by dragging their inner edge, detached into movable floating windows, closed and re-opened (ribbon → Windows, or Settings → Interface → Panels). A **Reset layout** button restores the defaults.
- **Floor map window**: the corner map is now drawn from the same plan geometry as the AI Factory preview, with a legend, robot/worker/machine shapes, conveyor polylines and fences; it opens as a movable, resizable window and selects objects on click.
- Worker cosmetics rebuilt from photographic PPE references: a hard hat with brim, front peak, centre ridge, vents, ratchet knob and chin strap; a panelled cap with a curved bill; wraparound safety glasses with rims, bridge and temple arms; ear defenders with band, yokes, cups and cushions.
- **Hat colour** and **T-shirt colour** controls for workers.

### Changed
- The worker's T-shirt follows the worker colour (`Appearance` swatches or the new T-shirt colour field). Only the clothing band of the character texture is recoloured, so face, hands and boots keep their colours.
- The simulation player's "toggle side panels" button now opens/closes the real dock panels instead of hiding them with CSS.

### Fixed
- Worker robustness: invalid saved worker settings (NaN height, unknown forward axis, zero scale) no longer produce NaN transforms that hide the character; animated skinned meshes are never frustum-culled; a failed rig falls back to the mannequin through an error boundary instead of vanishing.
- Panel/texture state after a renderer switch (antialiasing, VXGI) is rebuilt rather than reused, and post effects are skipped on the WebGPU path where the VXGI pipeline owns the frame.
- The settings help text no longer claims panels are fixed.

## [Unreleased]

### Fixed
- Camera no longer snaps back to the default view when an object is selected. Only explicit camera actions (view buttons, Fit, or a new layout) re-frame the view.

### Changed
- Repository reorganized: the app is at the repository root; documentation moved to `docs/`; the sample project stays in `examples/`.
- Added `typecheck` and `test:unit` scripts, a CI workflow, `.nvmrc`, `.editorconfig` and `.gitattributes`.

## [2.0.0] - 2026-10-30

### Added
- Local 3D model import (GLB/glTF, FBX, OBJ+MTL, STL, PLY, DAE, 3MF, 3DS, USD, VRML, VTK, AMF, STEP/IGES/BREP).
- Material and texture editing for imported models.
- Rigged, animated workers with a bundled CC0 character and per-role clip uploads.
- Deterministic local AI Factory generator (English and Russian).
- Standalone single-file build.

### Notes
- Application branding remains "Larp Components 5.1"; V2 is the numbered release.
