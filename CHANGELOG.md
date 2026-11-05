# Changelog

All notable changes to this project are documented here. Versions follow the Larp Factory release numbering.

## [3.0.0-alpha.9] - 2026-11-05 (prerelease)

- Added opt-in LAN multiplayer: UDP session discovery, nickname and host approval, joinability, kick/disconnect, per-player 3D camera avatars, chat, field-merged shared scenes and host-authoritative simulation. Viewports and graphics settings remain local.
- Added prefilled mixed-product pallets, deterministic shuffled stock and reset, pallet-source robot workflows, color-sensor inspection before sorting, generated scripts and AI Factory source-pallet nodes. Multiple robots can share stock; occupied and reserved slots prevent collisions.
- Added real two-helper/two-browser and packaged-standalone LAN tests, pallet graph/UI and 10,100-part inventory tests. The multiplayer ZIP includes the standalone app, helper, launchers and third-party notices. LAN traffic is unencrypted and intended for trusted participants.

## [3.0.0-alpha.8] - 2026-11-03 (prerelease)

- Unified named, searchable material previews in imported models, color sensors, building surfaces and graph nodes. Original texture thumbnails are embedded when available; platforms, stairs and spline walls can use imported textures and follow source edits. Sensors match base colors, not individual texture pixels.
- Robots can target multiple pallets in both the graph and visual task editor. Unwired pallets fill in order; color-sensor outputs wired to pallets latch the matching signal on each observed part, avoiding misrouting when multiple parts are present. Full pallets can be retained or automatically exchanged.
- Fixed authored restitution on gentle and swept workpiece impacts, including surface/product contacts. Tightened broad-phase queries for small workpieces while conservatively covering moving and oversized parts; precomputed laser blockers reduce repeated geometry work.
- Bloom now uses emissive-only sources rather than bright reflections, with depth and transparency in the WebGL mask. WebGPU uses an emissive render target with transparent blending and a black clear color. Its node/MRT path is pixel-tested with Three’s WebGL backend; a SwiftShader WebGPU device failed during rendering and the app fell back to WebGL. Physical WebGPU hardware has not been tested for this release.
- Improved compatible-port proximity snapping and previews in the node graph and 3D signal view. Catalog requests now have bounded deadlines/downloads and recoverable partial failures, include Gobkit's curated CC0 entries, and remove cancelled/stale loading ghosts. External provider availability and CORS remain outside the editor's control.
- Added simulation, randomized spatial/raycast, browser texture, pallet-routing, signal-snap, catalog-cancellation and bloom pixel regressions.

## [3.0.0-alpha.7] - 2026-11-03 (prerelease)

- Added source-only detectors, independent color-sensor outputs and per-input robot workflows; added editable building surfaces and improved material/texture editing.
- Improved current-view component placement, movable/cancellable import ghosts, catalog controls, model projection, emissive rendering and robot/conveyor behavior.
- Expanded graph, physics, catalog, signal, rendering and standalone browser regression coverage.

## [3.0.0-alpha.6] - 2026-11-03 (prerelease)

- Added viewport box and modifier multi-selection, group move/rotate, middle-button camera orbit, and right-click/keyboard copy, cut and paste with internal signal-link remapping.
- Fixed texture-file chooser cancellation and imported-model thumbnail rendering. The resizable shared catalog editor now offers proportional scale/dimension fields, X-up orientation and an interactive 3D preview.
- Unified search and embedded imports for CC0 Poly Haven, Gobkit and the Kenney mirror, with source and licence information saved in projects. Other linked providers require manual downloads; availability depends on external services and browser CORS.
- Added browser regressions for selection, dynamic bodies, spline handles, thumbnail/preview pixels, chooser cancellation, shared edits, provenance and catalog failures. Provider live checks are separate and non-blocking.

## [3.0.0-alpha.5] - 2026-11-03 (prerelease)

- Made laser, proximity, push-button and PLC triggers editable physical graph nodes. Pickup sensors and their two signal links are created for new conveyor-to-robot connections and placed at the robot's source station; old graphs migrate their existing pickup choices.
- Added expandable numbered IN/function/OUT pairs, per-channel functions and wire colours. Signal feedback is independent of material flow and survives graph and project export; built scene wires use the same colours and glow on activation.
- Added per-channel simulation for detector gates, PLC relays/inverters, feeder pulses, conveyor state, robot moving/operation-end outputs, machine/worker enable and pallet status. Mounted lasers can retain a manually edited beam length.
- Prevented continuous detector signals from stalling queued pickup parts and made graph IDs robust across reloads. Added graph, runtime, serialization, feedback, browser and offline regression coverage; the simulator remains an approximation, not an industrial safety or PLC system.

## [3.0.0-alpha.4] - 2026-11-03 (prerelease)

- Removed fixed scene, workpiece, signal-target and live-product count ceilings; rendering grows as needed. The 180 MB project-size limit and device resources still apply.
- Added shared imported-model catalog entries with generated previews, fullscreen browsing, drag-to-scene, animated import placeholder and a resizable base editor. Material/unit changes propagate across instances; submodels can be removed or restored with updated bounds/collision. Poly Haven imports directly; links to Sloyd, Poly Pizza and Thingiverse support manual downloads under each model's licence.
- Feeder and machine product pickers in AI Factory include searchable built-in and imported products. Robot pickup defaults to a mounted laser; proximity and no-sensor options are available.
- Connected buttons control conveyors; buttons can toggle or use retriggerable timed pulses. Robot operation-end output can request another feeder part. Added low mounted laser/proximity sensors, adjustable placement and proximity-range visualization.
- Added conveyor width, belt/roller selection and signed typed speed, welded straight-belt colliders, accurate/box collision options, and retained full pallets that wait for replacement. These remain approximate physics, not engineering guarantees.
- Preserve the viewport across settings changes and restore the Cornell GI benchmark toggle. Added a layout context menu while keeping camera gestures.
- Added focused unit and browser tests for large scenes, signals, belt support, pallet replacement, sensors, catalog editing, camera restoration and persistence. Existing 180 MB project, per-import and browser/device limits remain.

## [Unreleased]

## [3.0.0-alpha.3] - 2026-11-02 (prerelease)

- Fixed simulation-speed scaling for scripted and visual robots, conveyor workpieces, workers, feeders, machine cycles and rigid-body physics. JavaScript robot commands can resume between fixed substeps even when several substeps share one rendered frame.
- Belt textures, worker mixers and equipment animations now follow completed simulation time; slow GPUs receive a larger bounded simulation slice. A measured-rate warning identifies device-limited speeds, and stale overloaded demand is cleared on pause or a speed change.
- Added a startup/recovery screen for disabled or blocked JavaScript and a workspace error boundary. This helps diagnose startup failures but does not guarantee an external preview proxy can be reached.
- Added fixed-step, real-time browser, overload, pause/resume, visual synchronization and startup-failure regressions. The release includes a downloadable standalone HTML file.

- Added delayed button-name tooltips, deeper graph zoom and fit-to-view; collapsed nodes retain connected ports and physical node types have distinct colours.
- Added box/shift selection, multi-node move/copy with internal wires, rearrangement and persistent named, custom-coloured group frames that become overview nodes at distant zoom. Inserting a node into a wire makes room automatically.
- Feeders, robots and operators can feed a shared conveyor directly with automatically generated physical inlets. Multiple robots/operators can share a conveyor output with automatically placed stations, product reservations and queueing. General conveyor-to-conveyor splitters remain unsupported.

- AI Factory now merges multiple conveyor inputs into a shared, simulated line, with selectable multi-head and side-entry junction geometry, backpressure and fair access. Splitters remain unsupported.
- Graph node dragging previews locally and persists one undoable edit on release; unchanged topology does not recompile the factory. Wire hit targets and multi-input removal were improved.
- Signal ports support mouse/touch drag, rerouting and disconnect; direct robot inputs queue edges for visual programs and `robot.waitForSignal()`, and robot outputs can pulse after a successful place.
- Added XYZ move/rotation gizmos, snapping, editable height and persisted three-axis rotations. Conveyor spline points have Y gizmos/fields for 3D slopes and stacked layers; elevated platforms and stairs provide adjustable upper floors.
- Added fixed-step dynamic/kinematic rigid bodies, configurable mass, gravity, sleep, oriented compound proxy collisions and rotated support surfaces. Added swept compound collision checks for fast bodies/products, including relative motion and conservative rotational sweeps. Existing operational simulation remains in control of belts, mechanisms and worker tasks; complex collision geometry remains approximate.
- Imported models can serve as feeder, machine and pallet workpieces using their configured weight and mesh-derived compound collision patches. The saved workpiece and embedded asset remain available after the source scene object is deleted.
- Added floor-aware stair/deck routing, ledge checks, relative-height patrol controls and cross-floor worker tasks. Added physics, imported-product, moving-wire, autosave and browser regressions plus a reproducible headless physics benchmark.
- Added unit and browser regressions for merges, robot signals, transformed scenes, gesture interactions and graph editing.

- Added resizable dialogs, floating windows, simulation settings and touch sheets. Settings window size and position are remembered, with reset controls.
- Feeders can receive signals from buttons, proximity sensors, lasers, PLCs and robot outputs. Each incoming rising edge requests one part, respecting the interval, output clearance and any supply requirements; unconnected feeders stay automatic.
- Signal sources can connect to multiple destinations. Each source has an independent saved wire colour; active wires glow and show a directional pulse. Connections remain undoable and persist in project archives.
- Added engine and browser regression coverage for feeder signals, wire appearance, connections and desktop/touch resizing.

## [3.0.0-alpha.2] - 2026-11-01 (prerelease)

- Keep the workspace visible when 3D renderer creation fails, with a retry button and guidance for enabling WebGL. The viewport still requires a working renderer.
- Allow the production preview through proxied hostnames; verified embedded preview with and without WebGL.

## [3.0.0-alpha.1] - 2026-11-01 (prerelease)

- Added an opt-in viewport signal editor for existing button, sensor, laser and PLC outputs, with robot, conveyor and PLC inputs. Supports multiple sources per endpoint, disconnect, undo and project persistence; connections use existing simulation behavior.
- Reduced signal wire lookup from repeated scene scans to a memoized ID map. No measured FPS improvement is claimed.
- Documentation, packaged examples and release instructions refreshed for V3; clean build, unit, parity, offline and browser checks were run (see `docs/V3_PRERELEASE_CHECKS.md`).
- This is not full material-flow or robot-controller I/O editing: each source still has one target, graph branching remains incomplete, and there is no wire-drag gesture. See `docs/ROADMAP.md`.

## [2.5.0-alpha.14] - 2026-11-01 (prerelease)

- Added `.LCMX` compressed project archives, including deduplicated embedded custom model, texture and worker assets, alongside legacy text project support. Archive imports validate structure, limits and checksums before accepting a scene.
- Save picks `.lcmx` where browser file access is available and autosaves to the chosen handle; ordered writes prevent older autosaves overtaking newer ones. Other browsers download a copy instead. Browser sandboxes cannot set an arbitrary default local folder.
- Added project archive unit and browser tests and an incremental roadmap. Remaining roadmap features, VC interoperability and robot-controller code are not implemented.

## [2.5.0-alpha.13] - 2026-11-01 (prerelease)

- Fixed high products incorrectly colliding with a fence after a lower product populated the reusable collision buffer; added a regression test.
- Updated four browser suites to the current graph, worker cosmetics and settings UI; added a command to run them together. Localized settings navigation labels in Russian. The former generator-form reach-control browser check no longer applies to the graph UI.
- Added a selectable Git baseline to the TypeScript parity/benchmark harness. Two proposed optimizations were rejected after inconclusive measurements; no new simulation speedup is claimed.
- Graph branching/merging and 3D I/O remain incomplete; see `docs/AUDIT_2.5.0-alpha.12.md` and `docs/TYPESCRIPT_OPTIMIZATION.md` for limitations.

## [2.5.0-alpha.12] - 2026-11-01 (prerelease)

- Updated vulnerable fflate, Vite and esbuild dependencies; `npm audit` reported zero vulnerabilities after a clean install.
- Rechecked TypeScript simulation parity and benchmarks, production and offline builds, import formats and worker workflows. No new simulation optimization was merged in this maintenance audit.
- Four older UI test scripts did not complete, Mixamo-specific tests were skipped. Existing component graph branching and 3D I/O work remain incomplete. See `docs/AUDIT_2.5.0-alpha.12.md` for coverage and limitations.

## [2.5.0-alpha.11] - 2026-11-01 (prerelease)

- Continued simulation optimization in TypeScript. Larger product sets use conveyor-specific candidate groups for blocking checks; product contact checks avoid temporary axis arrays. No visual quality or simulation fidelity settings were reduced.
- Fixed spatial-index query stamps colliding when the same object belongs to multiple indexes. Added a before/after TypeScript parity test and benchmark, including crowded conveyor transfers.
- In one Node benchmark, median total simulation-step time was 9.7–10.7% lower in two dense scenarios; the human-cell result was 0.6% higher. Browser FPS and broader workloads were not measured. See `docs/TYPESCRIPT_OPTIMIZATION.md`.

## [2.5.0-alpha.3] - 2026-11-01 (prerelease)

- At that release, physical graph branching/merging and 3D I/O editing remained unfinished.

## [2.5.0-alpha.1] - 2026-11-01 (prerelease)

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

- Added delayed button-name tooltips, deeper graph zoom and fit-to-view; collapsed nodes retain connected ports and physical node types have distinct colours.
- Added box/shift selection, multi-node move/copy with internal wires, rearrangement and persistent named, custom-coloured group frames that become overview nodes at distant zoom. Inserting a node into a wire makes room automatically.
- Feeders, robots and operators can feed a shared conveyor directly with automatically generated physical inlets. Multiple robots/operators can share a conveyor output with automatically placed stations, product reservations and queueing. General conveyor-to-conveyor splitters remain unsupported.

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
