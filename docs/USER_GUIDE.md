# Larp Factory Simulator — V3 prerelease 6

An independent browser-based factory-layout and simulation workspace. Its Visual Components-inspired theme is not affiliated with Visual Components. **V3.0.0-alpha.8** is the prerelease number; the interface retains the existing **Larp Components 5.1** branding.

## Start in under a minute

1. Download **`Larp_Factory_V3.html`** from the GitHub prerelease and open it in a current desktop browser with JavaScript and WebGL enabled. No installation, account, server or internet connection is needed to run the standalone file. Searching and downloading from the optional Web catalog does require internet access.
2. The sample layout loads automatically. Try orbit/zoom, select a component and inspect its properties. On a phone or touch tablet use the bottom navigation and sheets.
3. For the requested steel factory, choose **FILE → Import project** and open `examples/Metalworking_demo_V2.txt`. On touch devices choose **Project → Import project**. The sample has two U-shaped lines, cutting, milling and inspection, parallel-jaw grippers, seven workers, feeders set to 12 parts/min and a 3 × 2 × 4 pallet pattern. Guarding is illustrative.
4. Open **AI Factory**. In **Node graph**, the starter graph connects actual feeder, conveyor, robot, machine and pallet parts. Select a node to edit its settings, or use **Add node** to find more physical parts. Connect compatible material ports to change the built line; disconnected nodes are inactive. Independent lines, direct multi-source merges and multiple worker stations on one conveyor are supported; general conveyor-to-conveyor splitters are not. The separate **Form** tab accepts a description such as `examples/Russian_factory_prompt.txt`; interpretation uses local rules, not an online AI service. The feed setting is not a guarantee of finished output.

## Viewport selection, camera and clipboard

Choose **Select** and drag with the left mouse button to select components whose visible bounds intersect the rectangle. Shift/Ctrl-click toggles individual objects; Shift/Ctrl-drag adds a rectangle to the existing selection. Properties still show the primary (last selected) object. Choose **Move** or **Rotate** to transform the selected group together, with snapping and undo. To move conveyor spline handles, choose **Move** first.

Hold and drag the middle mouse button to orbit; scroll to zoom and right-drag to pan. Right-click without dragging opens the context menu, including **Copy**, **Cut** and **Paste**; Ctrl+C/X/V also work. The clipboard is local to this editor session. Copies preserve relative placement and remap connections within the copied group; references to unselected objects still refer to the originals. The first paste after a cut restores the same IDs, so existing incoming links can reconnect. Shift-right-click still sets the centre of interest. On touch screens, one finger orbits and pinch zooms.

## Simulation speed and performance

Use the multiplier field, slider or +/− buttons next to the simulation clock. Robots (including JavaScript programs), workpieces, feeders, machine cycles, workers and dynamic physics all follow the same fixed simulation clock. Pause freezes simulation motion; changing the multiplier takes effect without replaying an old high-speed backlog. Signal-wire packets remain a real-time visual aid so brief button presses are visible even while paused.

The requested rate is a target, not a guarantee: a large factory or a high multiplier can exceed the device's capacity. When the achieved rate is substantially lower, an amber `~…x` indicator shows the measured rate. Animations follow completed simulation time in that case, rather than appearing to outrun the products. Unprocessed wall-time demand is bounded; simulation steps and their events are never skipped to advance the clock. Reduce the multiplier or scene complexity if the device cannot keep up.

## Build a merged conveyor line

In **AI Factory → Node graph**, connect several feeder, robot, operator or conveyor outputs directly to the same conveyor **Material in**; the necessary physical inlets are created for you. Select the conveyor and choose **Merge layout → Multi-head junction** or **Side entry to main conveyor**. Products queue and take turns entering the shared belt. You can also connect the same conveyor output to several robots or operators; the generator spaces them around the belt and assigns products fairly. General conveyor-to-conveyor material splitters are not implemented. Click a graph wire to remove that connection, or use undo.

Drag over empty space to box-select nodes. Shift-click adds or removes a node; dragging any selected node moves the selection. Use middle mouse or Space-drag to pan and the wheel to zoom. **Fit all nodes** or Home frames the graph. Right-click multiple selected nodes to rearrange or group them. The group inspector sets its name and colour; drag the coloured frame to move all its members. Ctrl+C/V copies selected nodes and their internal wires, including any complete groups; Shift+D duplicates. At distant zoom, group members fade into a named overview frame and external wires meet its edge. Double-click a node to collapse or expand it; collapsed nodes keep visible, usable ports. To connect several selected compatible outputs at once, drag one of them to a multi-input conveyor. Dropping a loose compatible node onto a wire inserts it and moves downstream nodes to make space. Each drag is one undoable edit. Hover over a UI button for a moment to see its name by the pointer.

## Sensor nodes and numbered signal I/O

The starter graph has explicit **Laser trigger** nodes between each source conveyor and robot, with a separate material wire plus signal wires from conveyor → sensor → robot. Connecting a conveyor to a robot creates these nodes and wires automatically. The robot's **Automatic pickup sensor** setting chooses laser, proximity or none for the next connection; existing sensors are edited on their own nodes. Older component graphs migrate their pickup settings to visible nodes when opened. Deleting a sensor removes it; it is not recreated unless a new pickup connection is made.

Choose **Add node** for a laser, proximity sensor, push button or PLC. A loose detector dropped onto a conveyor-to-robot material wire attaches to that belt and robot without replacing the material wire. In the node inspector, edit the sensor's address, initial state, normally-closed setting, detection radius or beam range, automatic beam fitting, mount and position, as applicable. **Automatic** mount follows the connected conveyor and places the detector near the connected robot's pickup; choose a specific conveyor or **Free standing** to override it. A position of −1 follows the pickup station; 0–1 fixes a position along the belt. A laser automatically fits the belt width unless automatic fitting is turned off or the beam range is edited. Transparent workpieces may pass the beam; use proximity for those.

Each physical node starts with a numbered **IN 1 / function / OUT 1** signal pair. Connecting either side exposes the next pair; every pair has its own dropdown and can have its own output colour. Select a node and use **Signal I/O** in the inspector for descriptions and colours; without a per-output override, wires inherit the component's **Wire colour**. Drag an OUT to an IN, click a wire to remove it, or drag a connected IN away. Yellow material/attachment connections and signal wires are independent: a robot's operation-end signal may feed an upstream feeder without forming a material cycle. Material-flow loops are still rejected. Signal feedback is evaluated in simulation substeps rather than recursively.

Functions describe both sides: feeders accept rising edges and pulse on release; robots queue starts and report operation-end or moving; conveyor inputs run the belt and outputs report running or stopped. Sensor and button inputs enable their corresponding outputs; PLC channels relay or invert their own inputs. A machine input enables starting a cycle, and a worker input enables a task; cycles already underway can finish. Pallet channels report full/available, optionally enabled by an input. Inverters with no input remain off. Scene **Properties → Signal I/O** can adjust the numbered functions and colours after building. Short pulses are queued for feeders and robots. For visual robot programs, a high detector also remains a presence gate so touching queued parts do not stall behind a continuously blocked beam; push-button presses remain discrete. Custom robot JavaScript must call `await robot.waitForSignal()` explicitly. Graph export/import and `.lcmx` project files retain the numbered settings and connections.

## Signal-controlled feeders, robots and wires

Use the cable button (**Edit signal connections**) in the 3D viewport. Drag an OUT on a sensor, button, laser, PLC or robot to an IN on a feeder, robot, conveyor or PLC. You can also click the ports, and repeat for additional targets or sources. Drag a connected IN away to disconnect it or onto another IN to reroute. If an IN has several sources, first select the OUT whose branch you want to move. The connection list can remove individual targets; **Disconnect signal** removes all destinations for that source. Undo and **Properties → Automation** are also available.

Choose **Wire colour** separately for each source in its properties or the cable editor. Branches inherit that colour unless a numbered output has its own colour; they follow components when moved or rotated and glow with a travelling pulse on activation. Projects retain both connections and colours. These are simulated signals, not material routing or physical robot-controller I/O.

An unconnected feeder runs automatically. A connected, active feeder produces one part for each off-to-on signal, including separate activations from different sources, not repeatedly while a signal is held on. A request waits for the configured feeder interval, a clear output and any required supply. Turning the feeder off or disconnecting a source clears its queued requests. Pausing does not produce parts.

A robot with direct incoming wires queues rising edges; its visual program consumes one for each pick. Its **Robot output** can be **Moving or holding**, or a short **Pulse on operation end** after a successful place. For custom JavaScript, explicitly call `await robot.waitForSignal()` to consume a direct input; scripts are not automatically gated. Disconnecting or hiding a source discards its pending signals. Operation-end is the default for new robots, so wire OUT to a feeder IN to request the next part after placement. A connected conveyor runs while any visible connected source is active and stops when all are inactive; disconnect to regain its manual control.

Buttons toggle on each click by default. **Initially active** sets their reset state; a positive **Active duration** makes a retriggerable timed pulse (zero keeps toggle behavior). Lasers and proximity sensors can be attached to a conveyor and slid along it in Properties. The low mounted laser ignores transparent workpieces; choose proximity for transparent items. Proximity ranges appear in signal view. The AI Factory robot setting chooses the automatic pickup sensor for new connections; the Form pickup-sensor control also offers laser, proximity and none.

## 3D positioning and rotation

Select an object and choose **Move** or **Rotate** on the Home ribbon. Drag the red, green or blue gizmo axis/ring to move or rotate around X, Y or Z. Turn **Snap** on for the current grid step and 15° rotation increments; turn it off for free movement. You can also type X/Y/Z position and rotation values in Properties. The existing ground drag and conveyor/fence spline spheres remain available. Undo and project archives preserve these transforms.

A conveyor or roller path has X, Z and local **Y** fields per point. Select a point's row or sphere, choose **Move**, then use the green Y gizmo or type the height to make a slope. The sphere can still be dragged horizontally; **Reverse flow** reverses both coordinates and heights. Belt length/speed use the 3D path, and coincident belts can run at different heights. For near-vertical paths or severe banking, use conservative slopes; product support is still an approximation.

## Physics and upper floors

1. Select any component and open **Properties → Physics**. For a legacy component, choose **Kinematic** to opt into its collider, or **Dynamic** to add gravity and collisions. Kinematic equipment holds its edited pose; task-driven workers still walk. Dynamic components retain their existing conveyor, feeder, robot, signal or worker behavior. Enter **Weight (kg)** for a dynamic body. The displayed defaults (10 kg for ordinary items, 1 kg for imported models) are placeholders, not engineered mass estimates.
2. Run the simulation: the viewport, signal ports and cables follow moving bodies, while the saved layout remains unchanged. **Reset** returns bodies to the authored positions. Moving or rotating an object in the editor changes that authored pose.
3. Search the catalog for **Elevated Platform** and **Industrial Stairs**. Their dimensions are editable in Properties; align the stair top and platform height and position upper-level equipment on the deck. Workers automatically route across connected stair treads and decks and avoid unsupported upper edges. For patrols, set each waypoint's X/Z and relative Y in **Patrol waypoints**; blank automatic heights choose the highest surface. A disconnected floor makes the worker wait. Align stair ends with the two floors; narrow or very steep connections may not fit the sampled route.

Choose **Accurate (compound)** or **Box (fast)** next to Physics. Conveyor Properties also lets you switch belt/roller type, set width and type a signed speed without a fixed speed cap; very high speeds are subject to the simulation and collision approximations. A pallet can **Keep full pallet and wait** until you press **Clear / replace pallet**. Visual robots, generator scripts and workers resume afterwards; a custom script should await `pallet.swap()` before requesting another slot on a full pallet.

Physics uses fixed time steps, gravity, mass, sleeping, oriented compound colliders and swept checks for fast bodies and products. Tilted equipment and support faces are no longer assumed upright. Imported meshes generate surface-following compounds that preserve many openings, but fine details and complex contacts remain approximate; robot arms/mechanisms are animation-driven rather than articulated physics. Angular sweeps are conservative, initial overlaps use the normal solver, and no simulation can guarantee every extreme case. Conveyor products retain the specialized belt/stack solver. No industrial safety or precision is implied. Legacy projects keep their lightweight normal-speed behavior; selecting a physics mode opts a component into ordinary contacts.

For reliable saving, open the downloaded HTML in a regular browser rather than the in-app file viewer. Use **Save project** to select an `.lcmx` file where supported, or **Export copy (.lcmx)** to download a compressed backup including imported assets. Browsers without file-handle access cannot autosave into a downloaded copy. Legacy `.txt` export and `.txt`/`.json` imports remain available. Imported projects can contain executable scripts: only open trusted files. See `ROADMAP.md` for archive and browser limitations.

## Import a model and edit materials

- Choose **Import 3D model** in the catalog, ribbon, FILE menu or touch Tools, or drop files on the viewport. Select the model and its referenced `.bin`, `.mtl` and image files together; a ZIP preserves folder structure. For local imports, external companion URLs are blocked and selected files stay local. The separate Web catalog fetches the selected provider’s files over the network.
- Supported through browser loaders: GLB/glTF, FBX, OBJ/MTL, STL, PLY, DAE, 3MF, 3DS, USD/USDZ, VRML, VTK, AMF, STEP, IGES and BREP. Complex proprietary features may not be supported; GLB is usually the most portable textured format.
- Imported models appear as thumbnail cards in the catalog. Drag a card into the viewport or click it to add an instance; use the fullscreen button for larger icons and details. The model stays in the catalog after its scene instances are deleted. Edit its shared base in the catalog (or edit imported-model settings on an instance) to change units, X/Y/Z-up axis, materials and textures across every instance. The resizable shared editor has a 3D preview on the right, proportional scale and size fields, mass, physics and collider settings. Drag in the preview to orbit and scroll to zoom. Expand **Submodels** to remove unwanted meshes from all instances or restore them; bounds and compound collisions are recalculated.
- Select the imported object → **Properties** to adjust units, up-axis, base color, roughness, metalness, opacity and texture maps. Per-map strength controls include base color, normal, roughness, metalness, AO, emission, alpha, bump and displacement. Textures need suitable UVs; roughness/metalness/AO follow standard packed channels. If a map is missing, select a local replacement image; cancelling the file chooser returns to the editor without applying a change.
- To use an import as a workpiece, set its units, up-axis, scale and **Physics → Weight**, then choose it from **Spawn product** on a feeder. Machine input/output and pallet product pickers also list imported models. The model's measured bounds define its approximate workpiece size; robots use its configured weight for payload checks. The workpiece definition and asset are saved separately, so you can delete the source scene object and continue using it, including after export or reload. To free project space later, delete all scene instances of that asset, select the saved workpiece in a feeder, machine or pallet's product picker and choose **Remove saved workpiece**. Confirming changes components using it to cartons; the action can be undone. Reset the simulation if existing products need to be cleared. Older imports without saved bounds or collider metadata are measured in the background, even when their source is hidden or deleted.
- Imports do **not** automatically become functional machines or robot tools. Their surface-derived compound colliders approximate the mesh rather than reproducing every triangle; worker route planning does not treat arbitrary imported meshes as detailed navigation obstacles. Adjust source units/up-axis if the model is too large, small or sideways.
- Limit per import: 80 MiB including expanded ZIP data and 1,000 files. A replacement texture is limited to 10 MiB and 8192 × 8192 pixels. There is no fixed component or live-product count cap. Projects remain limited to about 180 MB of exported UTF-8 data; browser storage quotas and available CPU/GPU/memory may be lower.

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
- **Settings → Interface & colours → GI benchmark scene** temporarily shows the Cornell room; turn it off to restore the factory and camera. Ordinary graphics/settings changes also preserve the viewport. Right-click the viewport for layout or selected-object actions; right-drag still pans and Shift-right-click retains its centre-of-interest gesture.
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

## Web catalogue

The catalog’s **Web** tab searches **Poly Haven**, **Gobkit** and **Kenney** together by default; use the source buttons to narrow the results and **Show more** to reveal additional matches. Kenney's CC0 models and thumbnails are served by the independently maintained [Tiny Game Engine mirror](https://github.com/Hidencod/tge-assets); Gobkit includes free curated and community models. Some curated Gobkit models have no provider thumbnail and show a placeholder. Provider availability, browser CORS rules and network access can change; errors include a retry button.

Choose a model to download and embed it, along with its source, title and CC0 licence, in the project. Poly Haven offers 1k/2k/4k texture choices and downloads glTF companions; Gobkit and the Kenney mirror provide self-contained GLBs. The 80 MiB per-import and approximately 180 MB project limits still apply. Imported assets work offline after saving. The optional online catalog contacts the selected providers; local-file import does not.

**More sources (manual download)** links to Sloyd, Poly Pizza, Thingiverse and 3DAssets.dev. They are not direct in-app search/download integrations; download a file from the provider and use **Import 3D model**. Their terms may require accounts, attribution or have other restrictions. Check each model’s licence before use or redistribution.

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
