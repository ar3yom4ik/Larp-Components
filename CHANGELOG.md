# Changelog

All notable changes to this project are documented here. Versions follow the Larp Factory V2 release numbering.

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
