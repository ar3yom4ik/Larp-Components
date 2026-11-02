**Read in:** [English](README.md) | [Русский](READMERU.md)

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
| `npm run test:interaction-browser` | Playwright checks for feeder signals, colored/animated wires and desktop/touch window resizing. |
| `npm run test:gizmos-browser` | Playwright checks for 3D gizmos, snapping, undo and spline handles. |
| `npm run test:factory-browser` | Playwright checks for graph dragging, multiple inputs, insertion and merge building. |
| `npm run test:archive-browser` | Playwright `.LCMX` import/export and save/autosave checks. |
| `npm run test:browser` | Four core Playwright UI suites against a running development server on port 4173. |
| `npm run test:typescript-parity` | Compare selected simulation state against a Git baseline (see `docs/TYPESCRIPT_OPTIMIZATION.md`). |
| `npm run build` | Production build **plus** the asset embedder; writes `dist/index.html` (standalone, ~10 MB). |
| `npm run preview` | Serve the production build locally. |

> Use `npm run build`, not plain `vite build`: the embedder appends the packed CAD and worker assets required by the standalone HTML.

### Merged conveyors and 3D transforms

In **AI Factory → Node graph**, connect several conveyor outputs to one downstream conveyor input. Choose **Multi-head junction** or **Side entry to main conveyor** on that node, then complete the line with a robot and pallet. Junctions are built and simulated, with backpressure and fair access to the shared belt. Material splitters are not supported. Node movements are previewed locally and saved once on release.

Select an object and use **Move** or **Rotate** for X/Y/Z gizmos, including vertical movement; the Snap control also applies to rotation. Existing ground and spline-handle dragging still works. Elevated equipment is supported, but tilted equipment's physical collisions and some operations use upright approximations; keep working equipment upright for reliable simulation.

### Signal-controlled feeders and robots

1. Turn on **Edit signal connections** in the viewport. Drag a sensor, button, laser, PLC or robot **OUT** to a feeder or robot **IN** (or click the ports). Drag a connected IN away to disconnect, or onto another IN to reroute. For a shared IN, select the source OUT first. Additional sources and destinations, individual wire colours, glow, undo and project persistence are supported.
2. A connected, active feeder produces one part per rising signal, waiting for its interval, a clear output and any required supply. Unconnected feeders run automatically; a held signal does not repeatedly produce parts.
3. A connected robot visual program queues one activation per pick. Set **Robot output** to **Moving or holding** or **Pulse on operation end** (a pulse after a successful place). JavaScript programs explicitly consume input with `await robot.waitForSignal()`.

Dialog and floating window sizes can be changed by dragging their resize grip (with a mouse or touch), or by focusing it and using the arrow keys. Settings remembers its size and position; use **Settings → Interface → Settings window** to reset them. On phones, drag the top edge of a sheet to resize it.

### Project Archives

Use **Save project** to select an `.lcmx` file when the browser supports the File System Access API, or **FILE → Export copy (.lcmx)** to download one. The compressed archive includes embedded custom models and worker assets. Browsers without writable file handles download a copy instead of autosaving to that file.
