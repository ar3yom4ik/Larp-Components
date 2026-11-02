# Larp Factory Simulator — V3 prerelease 1

An independent browser-based factory-layout and simulation workspace. Its Visual Components-inspired theme is not affiliated with Visual Components. **V3.0.0-alpha.2** is the prerelease number; the interface retains the existing **Larp Components 5.1** branding.

## Start in under a minute

1. Extract the ZIP and open **`Larp_Factory_V3.html`** in a current desktop browser with WebGL enabled. No installation, account, server or internet connection is needed to run the standalone file.
2. The sample layout loads automatically. Try orbit/zoom, select a component and inspect its properties. On a phone or touch tablet use the bottom navigation and sheets.
3. For the requested steel factory, choose **FILE → Import project** and open `examples/Metalworking_demo_V2.txt`. On touch devices choose **Project → Import project**. The sample has two U-shaped lines, cutting, milling and inspection, parallel-jaw grippers, seven workers, feeders set to 12 parts/min and a 3 × 2 × 4 pallet pattern. Guarding is illustrative.
4. Open **AI Factory**. In **Node graph**, the starter graph connects actual feeder, conveyor, robot, machine and pallet parts. Select a node to edit its settings, or use **Add node** to find more physical parts. Connect compatible material ports to change the built line; disconnected nodes are inactive. Independent lines and conveyor merges are supported; material splitters/branches are not. The separate **Form** tab accepts a description such as `examples/Russian_factory_prompt.txt`; interpretation uses local rules, not an online AI service. The feed setting is not a guarantee of finished output.

## Build a merged conveyor line

In **AI Factory → Node graph**, connect a feeder to each incoming conveyor, then drag the output of each conveyor to the same **Material in** on a downstream conveyor. Select that downstream node and choose **Merge layout → Multi-head junction** or **Side entry to main conveyor**. Finish the line with a robot and pallet and click **Build factory**. The generated junctions are physical conveyors visible in the scene. Products queue and take turns entering the shared belt; if the belt is stopped or occupied, incoming lines wait. Click a graph wire to remove just that connection, or use undo. A node drag is committed once on release. Splitters/fan-out are not implemented.

## Signal-controlled feeders, robots and wires

Use the cable button (**Edit signal connections**) in the 3D viewport. Drag an OUT on a sensor, button, laser, PLC or robot to an IN on a feeder, robot, conveyor or PLC. You can also click the ports, and repeat for additional targets or sources. Drag a connected IN away to disconnect it or onto another IN to reroute. If an IN has several sources, first select the OUT whose branch you want to move. The connection list can remove individual targets; **Disconnect signal** removes all destinations for that source. Undo and **Properties → Automation** are also available.

Choose **Wire colour** separately for each source in its properties or the cable editor. All branches from that source use its colour; they follow components when moved or rotated and glow with a travelling pulse on activation. Projects retain both connections and colours. These are simulated signals, not material routing or physical robot-controller I/O.

An unconnected feeder runs automatically. A connected, active feeder produces one part for each off-to-on signal, including separate activations from different sources, not repeatedly while a signal is held on. A request waits for the configured feeder interval, a clear output and any required supply. Turning the feeder off or disconnecting a source clears its queued requests. Pausing does not produce parts.

A robot with direct incoming wires queues rising edges; its visual program consumes one for each pick. Its **Robot output** can be **Moving or holding**, or a short **Pulse on operation end** after a successful place. For custom JavaScript, explicitly call `await robot.waitForSignal()` to consume a direct input; scripts are not automatically gated. Disconnecting or hiding a source discards its pending signals.

## 3D positioning and rotation

Select an object and choose **Move** or **Rotate** on the Home ribbon. Drag the red, green or blue gizmo axis/ring to move or rotate around X, Y or Z. Turn **Snap** on for the current grid step and 15° rotation increments; turn it off for free movement. You can also type X/Y/Z position and rotation values in Properties. The existing ground drag and conveyor/fence spline spheres remain available. Undo and project archives preserve these transforms.

A conveyor or roller path has X, Z and local **Y** fields per point. Select a point's row or sphere, choose **Move**, then use the green Y gizmo or type the height to make a slope. The sphere can still be dragged horizontally; **Reverse flow** reverses both coordinates and heights. Belt length/speed use the 3D path, and coincident belts can run at different heights. For near-vertical paths or severe banking, use conservative slopes; product support is still an approximation.

## Physics and upper floors

1. Select any component and open **Properties → Physics**. For a legacy component, choose **Kinematic** to opt into its collider, or **Dynamic** to add gravity and collisions. Kinematic equipment holds its edited pose; task-driven workers still walk. Dynamic components retain their existing conveyor, feeder, robot, signal or worker behavior. Enter **Weight (kg)** for a dynamic body. The displayed defaults (10 kg for ordinary items, 1 kg for imported models) are placeholders, not engineered mass estimates.
2. Run the simulation: the viewport, signal ports and cables follow moving bodies, while the saved layout remains unchanged. **Reset** returns bodies to the authored positions. Moving or rotating an object in the editor changes that authored pose.
3. Search the catalog for **Elevated Platform** and **Industrial Stairs**. Their dimensions are editable in Properties; align the stair top and platform height and position upper-level equipment on the deck. Workers can follow paths across treads and decks. Routing itself is still planar, so arrange routes manually: there is no automatic multi-floor pathfinding or ledge avoidance.

Physics uses fixed time steps, gravity, mass, sleeping and oriented, low-cost box/compound colliders. Tilted non-belt equipment and support faces are no longer assumed upright. However, colliders are approximations rather than exact imported or machine meshes; robot arms/mechanisms remain animation-driven rather than articulated physics. Conveyor products use the existing specialized belt/stack solver, and contact at complex/steep angles is approximate. Very fast/thin bodies can tunnel (continuous collision detection is not implemented). No industrial safety or precision is implied. Legacy projects without an explicit physics mode retain their lightweight behavior; changing a component's mode opts it into the corresponding collider behavior.

For reliable saving, open the downloaded HTML in a regular browser rather than the in-app file viewer. Use **Save project** to select an `.lcmx` file where supported, or **Export copy (.lcmx)** to download a compressed backup including imported assets. Browsers without file-handle access cannot autosave into a downloaded copy. Legacy `.txt` export and `.txt`/`.json` imports remain available. Imported projects can contain executable scripts: only open trusted files. See `ROADMAP.md` for archive and browser limitations.

## Import a model and edit materials

- Choose **Import 3D model** in the catalog, ribbon, FILE menu or touch Tools, or drop files on the viewport. Select the model and its referenced `.bin`, `.mtl` and image files together; a ZIP preserves folder structure. External model URLs are blocked; files stay local.
- Supported through browser loaders: GLB/glTF, FBX, OBJ/MTL, STL, PLY, DAE, 3MF, 3DS, USD/USDZ, VRML, VTK, AMF, STEP, IGES and BREP. Complex proprietary features may not be supported; GLB is usually the most portable textured format.
- Select the imported object → **Properties** to adjust units, up-axis, base color, roughness, metalness, opacity and texture maps. Per-map strength controls include base color, normal, roughness, metalness, AO, emission, alpha, bump and displacement. Textures need suitable UVs; roughness/metalness/AO follow standard packed channels. If a map is missing, select a local replacement image.
- To use an import as a workpiece, set its units, up-axis, scale and **Physics → Weight**, then choose it from **Spawn product** on a feeder. Machine input/output and pallet product pickers also list imported models. The model's measured bounds define its approximate workpiece size; robots use its configured weight for payload checks. You can hide the source object, but keep it in the project: deleting it removes the definition and the product falls back to the default carton. Older imports without saved bounds acquire them when their source is rendered; make it visible first if necessary.
- Imports do **not** automatically become functional machines or robot tools. When opted into physics they use a simple bounding-box collider, not exact mesh collision; worker route planning does not treat arbitrary imported meshes as detailed navigation obstacles. Adjust source units/up-axis if the model is too large, small or sideways.
- Limit per import: 80 MiB including expanded ZIP data and 1,000 files. A replacement texture is limited to 10 MiB and 8192 × 8192 pixels. Projects are limited to 500 scene components and about 180 MB of exported UTF-8 data; browser quotas may be lower.

## Animated workers and Mixamo-compatible models

Each operator defaults to a textured, rigged **Quaternius CC0** human with idle, walk and work clips. It has Mixamo-style humanoid bone names, but it is **not an Adobe Mixamo character** and no Mixamo assets or credentials are included.

To use your own Mixamo character:

1. On Mixamo, download a humanoid FBX **With Skin**, keeping its textures. Do this yourself under your own account and applicable terms.
2. In the simulator select an **Operator** (use the Scene Tree if needed) → **Properties → Animated worker → Import rigged character**, and select the FBX and texture companions. Alternatively import the character as a scene model first, then choose it in **Character appearance**.
3. Optionally upload FBX/GLB/glTF/DAE animation files in the **idle**, **walk** and **work** slots. For Mixamo exports, **Without Skin** and **In Place** walking clips are recommended. Compatible named humanoid bones are required. Clips crossfade; pause and simulation speed affect playback. Horizontal travel is controlled by the simulator, not root motion.
4. Adjust **Height** and **Model forward**. **Keep feet near floor** is a simple correction, not full foot IK; turn it off for intentional jumps. Head accessories follow the head position. A Classic mannequin remains available.

Imported projects embed the original model/animation files and any replacement maps. Before sharing an exported project, make sure you have permission to distribute every embedded asset; Mixamo's restrictions on raw-asset redistribution may apply. Different rigs, rest poses and material implementations can still need adjustment.

## Windows, colours and graphics options

- **Panels** (catalog, properties, output) can be resized by dragging the inner edge, detached
  with the header button into a movable, resizable window, closed with the X, and re-opened from
  **Home → Windows** or **Settings → Interface → Panels**. **Reset layout** restores the default
  arrangement.
- **Settings → Interface & colours → Layout style** offers Larp UI, Visual Components, R-pro and
  **Custom**. The custom skin exposes every surface colour (accent, window, title bar, tabs,
  ribbon, panels, dock, 3D viewport, status bar, chrome text) with a reset button. Colours are
  saved with your settings and travel with settings export/import.
- **Settings → Video** has **3D resolution** (50 % to 200 %; below 100 % is faster and softer)
  and **Antialiasing**: Off, FXAA (fast) or MSAA (smooth).
- **Dialogs and floating windows resize** using their corner grip; focus the grip and use arrow keys as an alternative. On a phone, drag the top edge of a sheet. The settings window also moves by its title bar; double-click the bar or use **Settings → Interface → Settings window → Re-centre** to put it back. Its size, position and **Dim background** choice are remembered. Use **Reset window size** in the same section to restore its default size.
- **Settings → Video → Active rendering** shows what the renderer is really doing: the backend that
  started, whether global illumination is voxel GI or the fallback (and why), the shadow map size and
  centimetres per texel, the frame time and the 3D pixel ratio. The build number and build time sit
  in small text at the bottom of the window; `Ctrl+Alt+J` prints the same line to Output.
- The **floor map** in the corner is drawn from the same plan as the AI Factory preview. The
  expand button opens it as a movable, resizable window; clicking an object selects it.
- **Workers**: the colour you pick in Properties → Appearance is the **T-shirt colour**. The hat
  has its own colour; the hi-visibility default is yellow. Cosmetics (hard hat, cap, safety
  glasses, ear defenders, cat ears, earrings) are modelled individually and follow the head.

## Speed and frame rate

- The simulation and the 3D view share one frame budget. On a large plant the engine gives the
  simulation less CPU whenever frames start to slip, so the view stays smooth; at very high
  speed multipliers a slow device simply advances less simulated time per second. Nothing is
  approximated, skipped or faked — the same events happen in the same order.
- The gear button in the player bar opens the **simulation settings** downward from the bar on
  desktop (upward on phones, where the bar sits at the bottom).
- If a big layout still feels heavy, lower **3D resolution** to 75–90 % or pick **FXAA** instead
  of **MSAA** in **Settings → Video**; both keep the plant identical and only change how it is
  drawn.

## Web catalogue (Poly Haven)

The catalog's third tab, **Web**, lists the Poly Haven model library (thousands of CC0 models).
Type to search, choose the texture size (1k / 2k / 4k — 1k is the sensible default) and click a
model. It downloads the glTF and all of its textures, and the model is added to the scene like a
file you imported yourself: the data lives inside the project file, so the factory opens offline
afterwards. Big models at 4k can be tens of megabytes; the 80 MB import limit still applies.
Credit belongs to Poly Haven (`polyhaven.com`, CC0) — the panel links it.

## Keyboard shortcuts

New in this version, mirroring Visual Components: `F` fit all, `Ctrl+Alt+F` fit selection,
`Shift+R` (or Shift+right-click on the view) set the centre of interest, `=` / `-` zoom, `Tab`
show/hide the side panels, `Shift+G` floor grid, `Ctrl+F` search the catalog, `Ctrl+Alt+J` print
the build to Output, `Ctrl+N` new factory, `Ctrl+O` open a project file and `Ctrl` + double-click
to duplicate. Everything stays rebindable in Settings → Keybinds.

## Graphics, privacy and safety

- Graphics settings change real lighting, directional/contact shadows, exposure, resolution and AO. The **Max** mode uses WebGPU voxel global illumination (VXGI) when the browser supports WebGPU, with bounce lights disabled to avoid double counting. Otherwise it uses an approximation with bounce lights and screen-space occlusion. Neither is path tracing. Imported-model per-map strength controls require the WebGL renderer.
- Imported project files may contain executable robot JavaScript. Only open and run scripts from people you trust. The confirmation is not a security sandbox. Some V1-generated projects may show this warning because they include older illustrative scripts; confirm only if you trust the file.
- This is an approximate simulator, not a safety-certified engineering, controller-export, or industrial validation system.

## Developers

See `AI_DEVELOPER_HANDOFF.md` for the complete standalone architecture, build, tests, limitations, licensing, and next steps. The React/Three.js/Vite source is in the repository root (see the main README); `THIRD_PARTY_LICENSES/` contains notices.

## Кратко по-русски

Распакуйте архив и откройте `Larp_Factory_V3.html` в браузере с WebGL. Для готового примера выберите **FILE → Import project** и файл `examples/Metalworking_demo_V2.txt`. Для импорта своей модели нажмите **Import 3D model**, выбрав модель вместе с текстурами; её единицы, ось и материалы доступны в свойствах. Чтобы заменить человека, выберите оператора в дереве сцены и в разделе **Animated worker** импортируйте модель со скелетом. Кнопка с шестерёнкой на панели плеера открывает настройки симуляции вниз от панели (на телефоне — вверх, там панель внизу). Симуляция и 3D-вид делят бюджет кадра: на большой фабрике симуляция отдаёт часть процессорного времени отрисовке, поэтому вид не «дёргается»; на слабом устройстве при большом ускорении просто прокручивается меньше модельного времени за секунду, но события не пропускаются и не подменяются. Встроенный персонаж — CC0-модель Quaternius с совместимыми именами костей, а не персонаж Adobe Mixamo. Сохраняйте резервные копии через **Export copy (.lcmx)** или **Export copy (.txt)**.
