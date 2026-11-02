# Larp Components

A browser-based 3D factory layout editor and discrete-time simulator built with React, Three.js, and React Three Fiber. Place machines, conveyors, robots, workers, and pallets in a 3D scene, program robots in JavaScript, and run the plant in real time.

> **Disclaimer:** This project is not affiliated with Visual Components. The simulator and safety guarding are illustrative only and are **not** certified industrial, safety, or robot-control tools.

## Quick Start

**Requirements:** Node.js 20.19+ or 22.12+ (see `.nvmrc`) and npm.

```bash
npm ci
npm run dev
# http://localhost:5173 (Vite dev server)
```

Windows users can also double-click `start-larp.bat`, which installs dependencies on first run and starts the app.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (port 5173 by default; docs/tests use 4173). |
| `npm run typecheck` | TypeScript type check with `tsc --noEmit`. |
| `npm run test:unit` | Browser-free simulation, prompt, navigation, project-size, settings, layout, floor-plan, worker-shirt, performance, and server-rendered UI tests. |
| `npm run test:signals-browser` | Playwright viewport signal-port editing checks against the development server. |
| `npm run test:archive-browser` | Playwright `.LCMX` import/export and save/autosave checks. |
| `npm run test:browser` | Four core Playwright UI suites against a running development server on port 4173. |
| `npm run test:typescript-parity` | Compare selected simulation state against a Git baseline (see `docs/TYPESCRIPT_OPTIMIZATION.md`). |
| `npm run build` | Production build **plus** the asset embedder; writes `dist/index.html` (standalone, ~10 MB). |
| `npm run preview` | Serve the production build locally. |

> Use `npm run build`, not plain `vite build`: the embedder appends the packed CAD and worker assets required by the standalone HTML.

### Project Archives

Use **Save project** to select an `.lcmx` file when the browser supports the File System Access API, or **FILE → Export copy (.lcmx)** to download one. The compressed archive includes embedded custom models and worker assets. Browsers without writable file handles download a copy instead of autosaving to that file.
