# Larp Components

[![CI](https://github.com/ar3yom4ik/Larp-Components/actions/workflows/ci.yml/badge.svg)](https://github.com/ar3yom4ik/Larp-Components/actions/workflows/ci.yml)

A browser-based 3D **factory layout editor and discrete-time simulator**, built with React, Three.js and React Three Fiber. Place machines, conveyors, robots, workers and pallets in a 3D scene, program robots in JavaScript, and run the plant in real time. Release **V2.3** of *Larp Components 5.1*.

> Not affiliated with Visual Components. The simulator and safety guarding are illustrative only; they are **not** certified industrial, safety or robot-control tools.

## Features

- **3D factory editor** — drag-and-drop components, snapping, selection with move/rotate tools, conveyor spline editing, undo/redo, and floor-map navigation.
- **Simulation** — discrete-time engine (fixed 60 Hz physics step) with product flow, machine cycles, robot pick-and-place, feeders, pallets and pedestrian navigation around obstacles. Spatial indexing and a frame-aware time budget keep large plants (hundreds of components) smooth.
- **AI Factory generator (local)** — interprets English and Russian descriptions with deterministic rules (no online AI service) and builds a factory layout you can review before generation.
- **3D model import** — GLB/glTF, FBX, OBJ+MTL, STL, PLY, DAE, 3MF, 3DS, USD, VRML, VTK, AMF, STEP/IGES/BREP, with Draco, Meshopt and KTX2 support where the browser allows.
- **Materials** — per-instance material editing and texture replacement for imported models.
- **Animated workers** — a bundled CC0 rigged human (idle / walk / work clips), custom rigged characters, and per-role animation uploads.
- **Graphics** — shadows, the **Max** preset: WebGPU voxel global illumination (three.js r187 VXGI) with a WebGL approximation fallback (bounce lights + screen-space GTAO), selectable antialiasing (Off / FXAA / MSAA), 3D resolution from 50 % to 200 %, and adaptive quality.
- **Skins** — Larp UI, Visual Components-inspired, R-pro, and a **Custom** skin whose colour scheme (accent, window, title bar, tabs, ribbon, panels, dock, viewport, status bar, chrome text) is fully editable.
- **Dockable workspace** — resize, detach, move, close and reset the catalog, properties and output panels; the floor map opens as its own window.
- **Worker cosmetics** — hard hat, cap, safety glasses, ear defenders and accessories modelled individually; the worker colour sets the T-shirt colour.
- **Projects** — export/import as UTF-8 `.txt`, IndexedDB autosave, and optional File System Access saving.
- **Responsive UI** — desktop layout and a touch-first phone/tablet layout with feature parity.
- **Bilingual UI** — English and Russian (`src/i18n.ts`).
- **Offline standalone build** — the production build is a single self-contained HTML file.

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
| `npm run test:unit` | Browser-free simulation, prompt, navigation, project-size, settings, layout, floor-plan, worker-shirt, performance and server-rendered UI tests (9 suites). |
| `npm run build` | Production build **plus** the asset embedder; writes `dist/index.html` (standalone, ~10 MB). |
| `npm run preview` | Serve the production build locally. |

Use `npm run build`, not plain `vite build`: the embedder appends the packed CAD and worker assets that the standalone HTML needs.

### Browser tests

The scripts in `tests/*.mjs` drive the app with Playwright against a running dev server.

```sh
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort   # in one terminal
npx playwright install chromium                            # once
node tests/browser.mjs
```

Screenshots are written to `tests/artifacts/` (git-ignored). Some tests need an extracted release folder or a local Mixamo fixture; the handoff documents each one.

## Project layout

```
.
├── src/
│   ├── App.tsx              App state, undo/redo, import/export, storage wiring
│   ├── components/          Viewport, 3D models, panels, mobile UI, importers
│   ├── sim/                 Simulation engine, navigation, generator, scripts
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
