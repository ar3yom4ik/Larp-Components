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
| `npm run bench:beam` | Compare sparse beam/blocker intersection costs against the alpha.7 Git baseline. |
| `npm run test:speed-browser` | Playwright real-time robot, workpiece, worker and overloaded speed checks against the development server. |
| `npm run test:speed-standalone` | Offline packaged-file speed and startup fallback checks (run after `npm run build`). |
| `npm run test:startup-browser` | Playwright startup, blocked-module and error-recovery checks against the development server. |
| `npm run test:factory-browser` | Playwright checks for graph selection, groups, tooltips, wiring, insertion and merge building. |
| `npm run test:factory-signal-browser` | Playwright checks for sensor nodes, numbered signal ports, colors, wiring and pickup placement. |
| `npm run test:alpha8-browser` | Browser checks for imported surface textures, multi-pallet workflow editing and port snapping. |
| `npm run test:factory-standalone` | Checks the production preview, offline graph editing and iframe loading. |
| `npm run test:catalog-browser` | Browser checks for catalog import, shared edits, submodels, drag and loading placeholder. |
| `npm run test:selection-browser` | Marquee, group transforms, clipboard, camera gestures, dynamic bodies and spline-selection safety. |
| `npm run test:web-catalog-browser` | Deterministic mocked-provider search, retry, downloads and provenance checks. |
| `npm run test:web-catalog-live` | Optional real-provider diagnostic; needs internet, a running dev server and `npm run build`. |
| `npm run test:camera-browser` | Browser checks for graphics-setting and GI-room camera restoration. |
| `npm run test:sensor-browser` | Browser checks that mounted sensors, wires and radius follow a moving belt. |
| `npm run test:archive-browser` | Playwright `.LCMX` import/export and save/autosave checks. |
| `npm run test:browser` | Four core Playwright UI suites against a running development server on port 4173. |
| `npm run test:typescript-parity` | Compare selected simulation state against a Git baseline (see `docs/TYPESCRIPT_OPTIMIZATION.md`). |
| `npm run build` | Production build **plus** the asset embedder; writes `dist/index.html` (standalone, ~12 MB). |
| `npm run preview` | Serve the production build locally. |

> Use `npm run build`, not plain `vite build`: the embedder appends the packed CAD and worker assets required by the standalone HTML.

### Simulation speed

The player multiplier applies to robots and scripts, conveyor workpieces, workers, machines, feeders and physics. If the device cannot keep up, an amber `~…x` shows the measured rate; visual animations stay synchronized with the simulation. Pause and speed changes do not replay stale overloaded work. See the [user guide](docs/USER_GUIDE.md#simulation-speed-and-performance).

### Merged conveyors and 3D transforms

In **AI Factory → Node graph**, connect multiple feeders, conveyors, robots or operators directly to one conveyor input; the physical inlets are built automatically. Choose **Multi-head junction** or **Side entry to main conveyor** on that node. Multiple robots/operators can also take turns from the same conveyor: stations and queueing are configured automatically. General conveyor-to-conveyor splitters are not supported.

Drag on empty graph space to box-select, Shift-click to add/remove nodes, and drag a selected node to move the selection. Use middle mouse or Space-drag to pan, the wheel to zoom, and **Fit all nodes** (or Home) to frame the graph. Right-click a selection to rearrange or group it; choose a group name and colour in its inspector. Drag the group frame to move its contents, and use Ctrl+C/V or Shift+D to copy nodes, internal wires and complete groups. Groups become named overview frames at distant zoom. Double-click a node to collapse it while keeping its ports visible. Hover over any button briefly to see its name beside the pointer. Changes remain undoable and survive graph export/import and reload.

In the 3D viewport, use **Select** and left-drag to box-select, or Shift/Ctrl-click to toggle individual objects. Shift/Ctrl-drag adds a box to the selection. Middle-drag orbits, the wheel zooms and right-drag pans. Right-click for **Copy**, **Cut** and **Paste** (also Ctrl+C/X/V); copied selections retain relative positions and internal connections. In **Move** or **Rotate**, the gizmo transforms the group.

Select an object and use **Move** or **Rotate** for X/Y/Z gizmos. To make a sloped or multi-level conveyor, select a spline sphere or point row and drag its green Y arrow, or enter its local Y height. Existing sphere dragging, snapping, undo and project archives still work. Add **Elevated Platform** and **Industrial Stairs** from the Building catalog and align their heights to arrange upper floors.

Every component has **Properties → Physics → Kinematic/Dynamic** and **Weight (kg)**. Choose a mode for legacy components. Kinematic equipment stays at its edited pose (task-driven workers still walk); dynamic objects fall, collide and keep their usual simulated function. Reset returns them to the authored layout. Tilted equipment uses oriented support faces, fast bodies and products receive swept collision checks, and workers can route between connected floors. Imported geometry uses mesh-derived compound colliders; complex contacts are still approximate. See the [user guide](docs/USER_GUIDE.md#physics-and-upper-floors).

To use an imported model as a product, import it, set its units/scale/weight, then select it in a feeder's **Spawn product** picker (or a machine/pallet product picker). Its saved workpiece definition and embedded asset remain available even if the source scene object is deleted. The catalog shows cached thumbnails and supports fullscreen and drag-to-scene. **Edit catalog model** offers a resizable right-hand 3D preview, X/Y/Z-up orientation, proportional scale and size fields, plus shared materials, mass and colliders. **Submodels** removes or restores meshes across instances. The **Web** tab searches Poly Haven, Gobkit and a Kenney CC0 mirror together; imported files are embedded in the project. Sloyd, Poly Pizza, Thingiverse and 3DAssets.dev are manual-download links, subject to their licences and browser access.

### Sensor nodes and numbered signals

In **AI Factory → Node graph**, laser, proximity, push-button and PLC triggers are editable nodes. Connecting a conveyor to a robot automatically adds a source-only pickup sensor; it mounts near that robot on the source belt and has signal outputs, not inputs. The robot’s **Automatic pickup sensor** setting chooses laser, proximity or none for new connections. Select an existing sensor to edit its settings, mount, beam/radius and wire colour. You can also drop a loose sensor onto a conveyor-to-robot material wire to attach it without replacing the material connection.

Material and signal wires are separate. Receivers start with **IN 1 → function → OUT 1**; sensors and buttons have outputs only. Wiring a numbered port exposes the next one. Choose each pair’s function and optional output colour in the node or its inspector. For example, a robot can report moving on one output and pulse operation-end on another. Signal feedback to an upstream feeder is allowed; material loops are not. Saved graphs and `.lcmx` projects retain numbered ports, functions and colours.

### Materials and pallet sorting

Material pickers in sensors, imported-model editing, platform/stair/wall properties and the node graph share a searchable list with names and previews. Imported materials can retain their textures on building surfaces; a sensor compares the base material color, not individual texture pixels. Previews of readable original textures are saved with new imports; older or unsupported textures fall back to a color swatch.

In the node graph, connect one robot's material output to multiple pallet inputs. In the regular **Program → Visual builder**, select the first destination and check **Additional pallets** in the desired order. Unwired pallets fill the first completely before advancing to the next, even while full pallets are being exchanged. To sort, wire a color sensor's numbered output to each pallet's signal input and configure its material. A matching signal is remembered on the individual part as it crosses the sensor; an unwired pallet can serve as a catch-all. If a matching pallet is full, the robot waits rather than sending the part to the wrong one.

Connection drags snap to the nearest compatible input within a screen-space radius, including when zoomed out. Dragging an existing input away still disconnects it.

### Signal-controlled feeders and robots

1. Turn on **Edit signal connections** in the viewport. Drag a sensor, button, laser, PLC or robot **OUT** to a feeder or robot **IN** (or click the ports). Drag a connected IN away to disconnect, or onto another IN to reroute. For a shared IN, select the source OUT first. Additional sources and destinations, individual wire colours, glow, undo and project persistence are supported.
2. A connected, active feeder produces one part per rising signal, waiting for its interval, a clear output and any required supply. Unconnected feeders run automatically; a held signal does not repeatedly produce parts.
3. A connected conveyor follows its sources; buttons can toggle or generate a timed pulse. Attach a low laser or proximity sensor to a conveyor for pickup detection. A connected robot visual program queues one activation per pick. Set **Robot output** to **Moving or holding** or **Pulse on operation end** (a pulse after a successful place). JavaScript programs explicitly consume input with `await robot.waitForSignal()`.

Conveyor properties expose type, width and signed speed. Select accurate compound or fast box collision beside Physics. Full pallets can wait for a manual clear/replacement. Right-click the viewport for context actions; the GI benchmark is available under interface settings without resetting the factory camera.

Dialog and floating window sizes can be changed by dragging their resize grip (with a mouse or touch), or by focusing it and using the arrow keys. Settings remembers its size and position; use **Settings → Interface → Settings window** to reset them. On phones, drag the top edge of a sheet to resize it.

### Project Archives

Use **Save project** to select an `.lcmx` file when the browser supports the File System Access API, or **FILE → Export copy (.lcmx)** to download one. The compressed archive includes embedded custom models and worker assets. Browsers without writable file handles download a copy instead of autosaving to that file.
