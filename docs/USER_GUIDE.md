# Larp Factory Simulator — V2

An independent browser-based factory-layout and simulation workspace. Its Visual Components-inspired theme is not affiliated with Visual Components. **V2** is the release number; the interface retains the existing **Larp Components 5.1** branding.

## Start in under a minute

1. Extract the ZIP and open **`Larp_Factory_V2.html`** in a current desktop browser with WebGL enabled. No installation, account, server or internet connection is needed to run the standalone file. The supplied Windows, macOS and Linux launchers open the same HTML.
2. The sample layout loads automatically. Try orbit/zoom, select a component and inspect its properties. On a phone or touch tablet use the bottom navigation and sheets.
3. For the requested steel factory, choose **FILE → Import project** and open `examples/Metalworking_demo_V2.txt`. On touch devices choose **Project → Import TXT**. The sample has two U-shaped lines, cutting, milling and inspection, parallel-jaw grippers, seven workers, feeders set to 12 parts/min and a 3 × 2 × 4 pallet pattern. Guarding is illustrative.
4. For editable generation, open **AI Factory**, paste `examples/Russian_factory_prompt.txt`, choose **Interpret**, check the fields and press **Build factory**. Interpretation uses local rules, not an online AI service. The feed setting is not a guarantee of finished output.

For reliable saving, run the downloaded HTML in a regular browser rather than the in-app file viewer. Sandboxed previews may block browser storage, downloads or fullscreen. Use **Export copy (.txt)** frequently and keep your backup. Storage can be cleared by the browser, be quota-limited, or be isolated between browsers and file paths.

## Import a model and edit materials

- Choose **Import 3D model** in the catalog, ribbon, FILE menu or touch Tools, or drop files on the viewport. Select the model and its referenced `.bin`, `.mtl` and image files together; a ZIP preserves folder structure. External model URLs are blocked; files stay local.
- Supported through browser loaders: GLB/glTF, FBX, OBJ/MTL, STL, PLY, DAE, 3MF, 3DS, USD/USDZ, VRML, VTK, AMF, STEP, IGES and BREP. Complex proprietary features may not be supported; GLB is usually the most portable textured format.
- Select the imported object → **Properties** to adjust units, up-axis, base color, roughness, metalness, opacity and texture maps. Per-map strength controls include base color, normal, roughness, metalness, AO, emission, alpha, bump and displacement. Textures need suitable UVs; roughness/metalness/AO follow standard packed channels. If a map is missing, select a local replacement image.
- Imports are visual objects. They do **not** automatically become functional machines, robot tools, or navigation/collision obstacles. Adjust source units/up-axis if the model is too large, small or sideways.
- Limit per import: 80 MiB including expanded ZIP data and 1,000 files. A replacement texture is limited to 10 MiB and 8192 × 8192 pixels. Projects are limited to 500 scene components and about 180 MB of exported UTF-8 data; browser quotas may be lower.

## Animated workers and Mixamo-compatible models

Each operator defaults to a textured, rigged **Quaternius CC0** human with idle, walk and work clips. It has Mixamo-style humanoid bone names, but it is **not an Adobe Mixamo character** and no Mixamo assets or credentials are included.

To use your own Mixamo character:

1. On Mixamo, download a humanoid FBX **With Skin**, keeping its textures. Do this yourself under your own account and applicable terms.
2. In the simulator select an **Operator** (use the Scene Tree if needed) → **Properties → Animated worker → Import rigged character**, and select the FBX and texture companions. Alternatively import the character as a scene model first, then choose it in **Character appearance**.
3. Optionally upload FBX/GLB/glTF/DAE animation files in the **idle**, **walk** and **work** slots. For Mixamo exports, **Without Skin** and **In Place** walking clips are recommended. Compatible named humanoid bones are required. Clips crossfade; pause and simulation speed affect playback. Horizontal travel is controlled by the simulator, not root motion.
4. Adjust **Height** and **Model forward**. **Keep feet near floor** is a simple correction, not full foot IK; turn it off for intentional jumps. Head accessories follow the head position. A Classic mannequin remains available.

Imported projects embed the original model/animation files and any replacement maps. Before sharing an exported project, make sure you have permission to distribute every embedded asset; Mixamo's restrictions on raw-asset redistribution may apply. Different rigs, rest poses and material implementations can still need adjustment.

## Graphics, privacy and safety

- Graphics settings change real lighting, directional/contact shadows, exposure, resolution and AO. The GI mode is an approximation using bounce lights and screen-space occlusion, **not** path tracing. Use Standard or lower settings on slower/mobile devices.
- Imported project files may contain executable robot JavaScript. Only open and run scripts from people you trust. The confirmation is not a security sandbox. Some V1-generated projects may show this warning because they include older illustrative scripts; confirm only if you trust the file.
- This is an approximate simulator, not a safety-certified engineering, controller-export, or industrial validation system.

## Developers

See `AI_DEVELOPER_HANDOFF.md` for the complete standalone architecture, build, tests, limitations, licensing, and next steps. The React/Three.js/Vite source is in the repository root (see the main README); `THIRD_PARTY_LICENSES/` contains notices.

## Кратко по-русски

Распакуйте архив и откройте `Larp_Factory_V2.html` в браузере с WebGL. Для готового примера выберите **FILE → Import project** и файл `examples/Metalworking_demo_V2.txt`. Для импорта своей модели нажмите **Import 3D model**, выбрав модель вместе с текстурами; её единицы, ось и материалы доступны в свойствах. Чтобы заменить человека, выберите оператора в дереве сцены и в разделе **Animated worker** импортируйте модель со скелетом. Встроенный персонаж — CC0-модель Quaternius с совместимыми именами костей, а не персонаж Adobe Mixamo. Сохраняйте резервные копии через **Export copy (.txt)**.
