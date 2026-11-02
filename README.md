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
| `npm run test:physics-browser` | Playwright checks for point-height gizmos, imported workpieces, dynamic poses and moving wires. |
| `npm run test:physics-standalone` | Offline packaged-file checks for custom products, physics, multi-level components and export (run after `npm run build`). |
| `npm run bench:physics` | Headless fixed-step benchmark for falling and sleeping rigid bodies. |
| `npm run test:factory-browser` | Playwright checks for graph selection, groups, tooltips, wiring, insertion and merge building. |
| `npm run test:factory-standalone` | Checks the production preview, offline graph editing and iframe loading. |
| `npm run test:archive-browser` | Playwright `.LCMX` import/export and save/autosave checks. |
| `npm run test:browser` | Four core Playwright UI suites against a running development server on port 4173. |
| `npm run test:typescript-parity` | Compare selected simulation state against a Git baseline (see `docs/TYPESCRIPT_OPTIMIZATION.md`). |
| `npm run build` | Production build **plus** the asset embedder; writes `dist/index.html` (standalone, ~12 MB). |
| `npm run preview` | Serve the production build locally. |

> Use `npm run build`, not plain `vite build`: the embedder appends the packed CAD and worker assets required by the standalone HTML.

### Merged conveyors and 3D transforms

In **AI Factory → Node graph**, connect multiple feeders, conveyors, robots or operators directly to one conveyor input; the physical inlets are built automatically. Choose **Multi-head junction** or **Side entry to main conveyor** on that node. Multiple robots/operators can also take turns from the same conveyor: stations and queueing are configured automatically. General conveyor-to-conveyor splitters are not supported.

Drag on empty graph space to box-select, Shift-click to add/remove nodes, and drag a selected node to move the selection. Use middle mouse or Space-drag to pan, the wheel to zoom, and **Fit all nodes** (or Home) to frame the graph. Right-click a selection to rearrange or group it; choose a group name and colour in its inspector. Drag the group frame to move its contents, and use Ctrl+C/V or Shift+D to copy nodes, internal wires and complete groups. Groups become named overview frames at distant zoom. Double-click a node to collapse it while keeping its ports visible. Hover over any button briefly to see its name beside the pointer. Changes remain undoable and survive graph export/import and reload.

Select an object and use **Move** or **Rotate** for X/Y/Z gizmos. To make a sloped or multi-level conveyor, select a spline sphere or point row and drag its green Y arrow, or enter its local Y height. Existing sphere dragging, snapping, undo and project archives still work. Add **Elevated Platform** and **Industrial Stairs** from the Building catalog and align their heights to arrange upper floors.

Every component has **Properties → Physics → Kinematic/Dynamic** and **Weight (kg)**. Choose a mode for legacy components. Kinematic equipment stays at its edited pose (task-driven workers still walk); dynamic objects fall, collide and keep their usual simulated function. Reset returns them to the authored layout. Tilted equipment uses oriented support faces, fast bodies and products receive swept collision checks, and workers can route between connected floors. Imported geometry uses mesh-derived compound colliders; complex contacts are still approximate. See the [user guide](docs/USER_GUIDE.md#physics-and-upper-floors).

To use an imported model as a product, import it, set its units/scale/weight, then select it in a feeder's **Spawn product** picker (or a machine/pallet product picker). Its saved workpiece definition and embedded asset remain available even if the source scene object is deleted.

### Signal-controlled feeders and robots

1. Turn on **Edit signal connections** in the viewport. Drag a sensor, button, laser, PLC or robot **OUT** to a feeder or robot **IN** (or click the ports). Drag a connected IN away to disconnect, or onto another IN to reroute. For a shared IN, select the source OUT first. Additional sources and destinations, individual wire colours, glow, undo and project persistence are supported.
2. A connected, active feeder produces one part per rising signal, waiting for its interval, a clear output and any required supply. Unconnected feeders run automatically; a held signal does not repeatedly produce parts.
3. A connected robot visual program queues one activation per pick. Set **Robot output** to **Moving or holding** or **Pulse on operation end** (a pulse after a successful place). JavaScript programs explicitly consume input with `await robot.waitForSignal()`.

Dialog and floating window sizes can be changed by dragging their resize grip (with a mouse or touch), or by focusing it and using the arrow keys. Settings remembers its size and position; use **Settings → Interface → Settings window** to reset them. On phones, drag the top edge of a sheet to resize it.

### Project Archives

Use **Save project** to select an `.lcmx` file when the browser supports the File System Access API, or **FILE → Export copy (.lcmx)** to download one. The compressed archive includes embedded custom models and worker assets. Browsers without writable file handles download a copy instead of autosaving to that file.
