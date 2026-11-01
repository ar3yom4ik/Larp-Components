# Larp Components

[![CI](https://github.com/ar3yom4ik/Larp-Components/actions/workflows/ci.yml/badge.svg)](https://github.com/ar3yom4ik/Larp-Components/actions/workflows/ci.yml)

A browser-based 3D **factory layout editor and discrete-time simulator**, built with React, Three.js and React Three Fiber. Place machines, conveyors, robots, workers and pallets in a 3D scene, program robots in JavaScript, and run the plant in real time. Prerelease **V3.0.0-alpha.2** of *Larp Components 5.1*.

> Not affiliated with Visual Components. The simulator and safety guarding are illustrative only; they are **not** certified industrial, safety or robot-control tools.

## Features

- **3D factory editor** — drag-and-drop components, snapping, selection with move/rotate tools, conveyor spline editing, undo/redo, and floor-map navigation.
- **Simulation** — discrete-time engine (fixed 60 Hz physics step) with product flow, machine cycles, robot pick-and-place, feeders, pallets and pedestrian navigation around obstacles. Spatial indexing and a frame-aware time budget help with larger plants; performance depends on the scene and device.
- **Factory generator (local)** — wire physical feeder, conveyor, robot, human, machine and pallet nodes into supported linear or independent lines. The Form tab separately accepts English/Russian descriptions using deterministic local rules, not an online AI service. Branching and merging are not yet supported.
- **3D model import** — GLB/glTF, FBX, OBJ+MTL, STL, PLY, DAE, 3MF, 3DS, USD, VRML, VTK, AMF, STEP/IGES/BREP, with Draco, Meshopt and KTX2 support where the browser allows.
- **Materials** — per-instance material editing and texture replacement for imported models.
- **Animated workers** — a bundled CC0 rigged human (idle / walk / work clips), custom rigged characters, and per-role animation uploads.
- **Graphics** — shadows, the **Max** preset: WebGPU voxel global illumination (three.js r187 VXGI) with a WebGL approximation fallback (bounce lights + screen-space GTAO), selectable antialiasing (Off / FXAA / MSAA), 3D resolution from 50 % to 200 %, and adaptive quality.
- **Skins** — Larp UI, Visual Components-inspired, R-pro, and a **Custom** skin whose colour scheme (accent, window, title bar, tabs, ribbon, panels, dock, viewport, status bar, chrome text) is fully editable.
- **Dockable workspace** — resize, detach, move, close and reset the catalog, properties and output panels; the floor map opens as its own window.
- **Worker cosmetics** — hard hat, cap, safety glasses, ear defenders and accessories modelled individually; the worker colour sets the T-shirt colour.
- **Projects** — compressed `.lcmx` archives with embedded assets, legacy text projects, IndexedDB autosave and optional File System Access saving.
- **Responsive UI** — desktop layout and a touch-first phone/tablet layout; some workflows need further touch testing.
- **Bilingual UI** — English and Russian (`src/i18n.ts`).
- **Offline standalone build** — the production build is a single self-contained HTML file.

Release test coverage and known gaps: `docs/V3_PRERELEASE_CHECKS.md`.

## Quick start

Requirements: **Node.js 20.19+ or 22.12+** (see `.nvmrc`) and npm.

```sh
npm ci
npm run dev          # http://localhost:5173 (Vite dev server)
```

Windows users can also double-click `start-larp.bat`, which installs dependencies on first run and starts the app.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server (port 5173 by default; the docs and tests use 4173). |
| `npm run typecheck` | TypeScript type check with `tsc --noEmit`. |
| `npm run test:unit` | Browser-free simulation, prompt, navigation, project-size, settings, layout, floor-plan, worker-shirt, performance and server-rendered UI tests (25 files, including experimental Wasm parity). |
| `npm run test:signals-browser` | Playwright viewport signal-port editing checks against the development server. |
| `npm run test:archive-browser` | Playwright `.LCMX` import/export and save/autosave checks against the development server. |
| `npm run test:browser` | Four core Playwright UI suites against a running development server on port 4173. |
| `npm run test:typescript-parity` | Compare selected simulation state against a Git baseline; see `docs/TYPESCRIPT_OPTIMIZATION.md`. |
| `npm run build` | Production build **plus** the asset embedder; writes `dist/index.html` (standalone, ~10 MB). |
| `npm run preview` | Serve the production build locally. |

Use `npm run build`, not plain `vite build`: the embedder appends the packed CAD and worker assets that the standalone HTML needs.

### Browser tests

The scripts in `tests/*.mjs` drive the app with Playwright against a running dev server.

```sh
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort   # in one terminal
npx playwright install chromium                            # once
npm run test:browser                                       # core UI suites
```

Screenshots are written to `tests/artifacts/` (git-ignored). Some tests need an extracted release folder or a local Mixamo fixture; the handoff documents each one.

## Project layout

```
.
├── src/
│   ├── App.tsx              App state, undo/redo, import/export, storage wiring
│   ├── components/          Viewport, 3D models, panels, mobile UI, importers
│   ├── sim/                 Simulation engine, navigation, generator, scripts
│   ├── gen/                 Node-graph factory generator: tags, prompt intent, nodes, compiler
│   ├── components/factory/  Graph editor: canvas, inspector, studio (palette + preview)
│   ├── data/                Component library, layouts, products
│   ├── utils/               Model import, worker animation, project (de)serialization
│   └── assets/              Bundled CC0 worker, CAD kernel (gzip), fonts/textures
├── tests/                   Node and Playwright tests, fixtures
├── scripts/                 Build-time asset embedder, worker baker, unit-test runner
├── examples/                Sample project (steel plant) and sample AI Factory prompts
├── docs/
│   ├── USER_GUIDE.md        End-user guide
│   └── AI_DEVELOPER_HANDOFF.md  Architecture, formats, tests, licensing, next steps
└── THIRD_PARTY_LICENSES/    Notices for dependencies and bundled assets
```

## Documentation

- [User guide](docs/USER_GUIDE.md) — how to build a layout, import models, run the simulation.
- [Developer handoff](docs/AI_DEVELOPER_HANDOFF.md) — architecture, data flow, verification, limitations and next work.
- [Contributing](CONTRIBUTING.md) and [Changelog](CHANGELOG.md).

## Known limits

- Imported meshes are **visual only**: they do not become machines, colliders or navigation obstacles automatically.
- Robot JavaScript runs as trusted code. It is **not** a security sandbox; only open scripts you trust.
- Max GI is WebGPU VXGI voxel cone tracing when WebGPU is available, otherwise an approximation (bounce lights + GTAO). Neither is path tracing.
- Native `.blend`, DWG, IFC and many proprietary CAD formats are not supported; convert to GLB or STEP.

## Licensing

No top-level license has been chosen for this repository yet. Bundled third-party code and assets keep their own licenses; see `THIRD_PARTY_LICENSES/`. The default worker is Quaternius (CC0) with Mixamo-style bone names; it is not an Adobe Mixamo asset.

### Project archives

Use **Save project** to select an `.lcmx` file when the browser supports the File System Access API, or **FILE → Export copy (.lcmx)** to download one. The compressed archive includes embedded custom models and worker assets. Browsers without writable file handles download a copy instead of autosaving to that file. Legacy `.txt` export and `.txt`/`.json` imports remain supported. See `docs/ROADMAP.md` for format, security and roadmap limitations.

### Viewport signal connections

Use the cable button in the viewport to edit **signal** connections. Select an OUT on an unlocked, visible button, sensor, laser or PLC, then an IN on a visible robot, conveyor or PLC. Select the output again to disconnect; edits support undo. Multiple sources can target one endpoint, but each source has one target. These are existing simulator signals—not material transport, arbitrary robot-controller I/O or multi-output routing. The cable overlay is a schematic, not an electrical routing model.
