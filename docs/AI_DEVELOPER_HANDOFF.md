# Larp Factory V2 — independent AI/developer handoff

**Release date:** 2026-10-30  
**Audience:** a developer or another AI starting without any prior conversation.  
**Identity:** independent simulator, not affiliated with Visual Components. The application itself still displays “Larp Components 5.1”; V2 is the numbered release of this work.

## 1. Goal and acceptance criteria

This is a browser-based React/Three.js factory scene editor and discrete-time simulation. V2 adds practical local 3D model import, texture/material editing, and rigged animated humans, without losing the factory, navigation, graphics and touch features of V1. Deliver each future release as a new **numbered ZIP** and provide a live preview when possible; do not overwrite the user's previous release. A standalone HTML is also supplied for zero-install use.

The important reference scenario is a Russian-described steel-processing plant: **two parallel U-shaped lines**, each with cutting, milling and quality inspection cells; industrial robots with **mechanical parallel-jaw grippers**; feeder setting **12 products/min**; **seven workers plant-wide**, steel billets transformed into finished machined parts, pallet pattern **3 columns × 2 rows × 4 layers**, and illustrative guarding. `examples/Metalworking_demo_V2.txt` implements it, and `examples/Russian_factory_prompt.txt` gives the original text/settings. The generator is deterministic/local pattern matching, not an LLM. A feeder setting is not a finished-throughput guarantee. In a regression run 230 simulated seconds spawned 62 items, placed 22, lost 0, and all six machines cycled; that is a test result, not an industrial capacity claim.

Do not regress V1's visible floor shadows and graphics controls, approximate GI, Visual Components-inspired skin, desktop/touch feature parity, or pedestrian avoidance of conveyors/fences/each other. GI is bounce lights + screen-space GTAO, not physical path tracing; the simulator and safety guarding are not certified industrial tools.

## 2. Distribution and quick start

- Release ZIP (built separately from this repository): `Larp_Factory_V2.html` (single offline file), platform launchers, quick README, `examples/`, these docs and `THIRD_PARTY_LICENSES/`. The repository root is the buildable source tree (`package.json`, `src/`, `tests/`, `scripts/`).
- Double-click the HTML or use a launcher. A current WebGL-capable browser and hardware acceleration are recommended; no Node.js, account, server, or internet is required for the standalone app.
- An embedded/sandboxed file viewer may forbid storage, downloads, Web Workers or fullscreen. The tested sandbox `allow-scripts` can render and import a STEP file, but browser/platform policies differ. Download the HTML and open it in a regular browser when in doubt.
- Projects are explicitly exported/imported as UTF-8 `.txt` (JSON inside a `LARP COMPONENTS 5.1` header). Simulation counters and in-flight items reset after load. Imported assets are embedded, so backup files can become large and can contain licensed source assets. The user should keep exported backups.

For source development use Node.js **20.19+ or 22.12+** and npm:

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 4173 --strictPort
# Open the Vite URL. In a local-only deployment bind to 127.0.0.1 instead.
npx tsc --noEmit
npm run build
```

`npm run build` must run its post-build asset embedder; invoking plain `vite build` alone produces an HTML missing the worker/CAD packed assets. The complete output is `dist/index.html`. `npm run preview` is optional; direct `file://` execution was tested in Chromium. In hosted previews, browser code must use the same origin and the server must accept the preview host; `vite.config.ts` allows proxied hosts. Exposing the dev server on `0.0.0.0` makes it reachable from the surrounding network and is for development only.

## 3. User workflows

### Model import

Use the catalog/ribbon/FILE **Import 3D model** button, touch Tools, or drop files onto the viewport. Select a model plus companion `.bin`, `.mtl` and texture images together, or a ZIP preserving relative paths. If several models occur, choose the intended entry. External URLs are blocked; local companions are resolved using normalized paths, then a unique basename fallback. Missing/ambiguous dependencies surface an error instead of silently fetching the network. FBX/GLB animations on a normal scene model are imported as a static pose; use the worker editor for animation.

Available format loaders: GLB/glTF, FBX, OBJ + MTL, STL, PLY, COLLADA/DAE, 3MF, 3DS, USD/USDZ/USDA/USDC, VRML, VTK, AMF, STEP/STP, IGES/IGS and BREP/BRP. GLB/glTF supports Draco, Meshopt and KTX2/Basis when the browser/GPU can decode them. Actual support is limited by the respective Three.js loaders and OCCT; not every vendor extension or complex material is guaranteed. Native `.blend`, DWG, IFC and many proprietary CAD formats are not supported. Convert difficult assets to GLB (materials) or STEP (CAD). Imported meshes are visual only: they are not automatically registered as simulation machines, grippers, colliders or human-navigation obstacles.

Default units and orientation matter. GLB/glTF, DAE, USD and VRML use meter output from their loaders; FBX uses recognized `UnitScaleFactor` metadata; 3MF respects declared units and Z-up; AMF is normalized to millimeters and Z-up; STEP/IGES output millimeters and Z-up; STL defaults to millimeters but contains no reliable unit/axis metadata. BREP units may be unknown. For formats without trustworthy metadata, Auto heuristically treats a model larger than 50 units as millimeters. **Properties → Model units / Up axis** always lets the user correct an assumption. For custom workers, height is normalized separately. An incorrect source declaration cannot be detected perfectly.

`ModelMaterialEditor.tsx` inspects material slots and offers base color, emissive color/intensity, roughness, metalness, opacity, double-sided and individual maps. Strength controls exist for base color, normal, roughness, metalness, ambient occlusion, emissive, opacity, bump and displacement. Roughness/metalness/AO use standard glTF green/blue/red channels; maps require compatible UVs. Replace or remove a local PNG/JPEG/WebP/GIF/BMP/AVIF map per material/instance, and restore source maps. Physical scalar values remain separate from map strengths. Custom shader chunk edits in `ImportedModel.tsx` are coupled to the pinned Three.js revision; verify them before upgrading Three.

Limits: **80 MiB** selected/expanded per import and **1,000** files, protected ZIP central-directory checks, **2,000 materials** per model, replacement image **10 MiB** and at most **8192 × 8192**, maximum **500** scene items, and exported project ceiling **180,000,000 UTF-8 bytes** (with a small safety reserve). Browser memory and storage quota can be lower; CAD tessellation occurs on the main thread and large or pathological models can block the UI. ZIP64 and encrypted ZIPs are not supported. Uploaded data stays in the browser; no external model URL is contacted.

### Workers and animation

The bundled default is **Quaternius Animated Human, CC0**, a textured 41-bone humanoid with Mixamo-style names; it is **not an Adobe Mixamo asset**. The original FBX, palette, derivative GLB, and license are in `src/assets`. The palette and foot UVs were modified to provide high-visibility clothing and dark footwear; the default hard hat/accessories are separate app geometry. The default library contains idle, walk and work clips.

Select an operator in the Scene Tree and open **Properties → Animated worker**. Choose built-in rigged worker, classic mannequin, a previously imported skinned scene model, or **Import rigged character** for a local FBX/GLB With Skin. Imported appearance/settings are copied to the worker, so deleting the source scene object does not erase it. For per-role animation use the upload buttons beside idle/walk/work; FBX, GLB, glTF and DAE are accepted. Animation-only GLB skeletons may be ordinary named `Object3D`s rather than `Bone`s and are intentionally supported. Mixamo **Without Skin** animation with **In Place** walking is recommended. Clip selectors appear if the file has multiple clips.

`workerAnimation.ts` canonicalizes Mixamo names, matches humanoid joints, aligns major rest-pose directions including T/A pose differences, transforms quaternion deltas between joint bases, and caches retargeted clips. The simulator controls horizontal movement; horizontal hips/root motion is removed. `RiggedHuman.tsx` drives idle/walk/work from simulation state with a 0.25 s crossfade, respects pause and simulation speed, follows head position for accessories, and uses a bounded approximate foot-ground correction. **Keep feet near floor** can be disabled for jumping clips. This is not a general animation-retargeting/foot-IK system; differently named/non-humanoid rigs, uncommon joints, very different axes/twists and special motions can still need manual conversion. Adjust forward axis and height. Mixamo's rules restrict distribution of raw files; this package does not include Adobe assets or login information, and exported projects embed user-selected files. Users are responsible for their own asset rights.

### Factory, graphics and touch

AI Factory interprets English/Russian keywords locally and exposes recognized recipe, geometry, staffing, products, gripper, rate and pallet controls for correction before generation. Navigation in `sim/navigation.ts` uses bounded A* around known barriers and machine obstacles, plus proximity handling in `engine.ts`; imported visual meshes do not participate. Users should inspect reach, routes and cell layout, particularly after manual edits. Collision behavior and material transport are simplified.

`theme.ts`, `GraphicsEffects.tsx` and `Viewport.tsx` control live exposure, tone mapping, ambient/sun/fill/bounce, directional and contact shadows, fog, pixel ratio and GTAO. Standard/Enhanced/GI presets differ. GI is an approximation, not path tracing. A low-resolution GPU/phone may struggle; no performance promise has been made for all devices. The touch workspace exposes catalog, properties, program, tools, factory generation, project and view/settings actions. EN/RU UI uses `i18n.ts`; user-authored code/names are not translated.

## 4. Architecture and data flow

- `src/App.tsx`: app state, item operations, undo/redo, storage/restore, import/export, project/worker import, desktop/mobile wiring. `SceneItem[]` is the source of truth; `sim.sync(items)` updates runtime state. `window.__larpProject`, `__larp`, `__larpRenderer`, `__larpTheme` are **DEV-only** diagnostics, not production APIs.
- `src/types.ts`, `data/library.ts`, `data/layouts.ts`: component schema, definitions, defaults and presets. `sim/generator.ts` interprets text/generates scene layouts; `sim/programCode.ts` produces the canonical illustrative JavaScript for visual workflows; `sim/engine.ts`, `navigation.ts`, `spline.ts` handle simulation and movement.
- `src/utils/modelImport.ts`: local file/ZIP collection, path and budget validation, Three.js loaders, OCCT tessellation, material inspection, source asset/cache management. `ModelImportDialog.tsx` handles user selection and errors. `ImportedModel.tsx` skeleton-clones objects and per-instance materials, applies maps/units/grounding, and disposes instance materials/textures. `ModelMaterialEditor.tsx` edits immutable material settings.
- `src/utils/workerAnimation.ts`: default CC0 asset loading, bone names, role clip selection, rest alignment and clip caches. `RiggedHuman.tsx` renders/mixes/grounds; `HumanModel.tsx` contains classic fallback; `WorkerEditor.tsx` selects rigs/clips and exposes settings. Each worker owns a mixer but instances share cached source geometries/clips.
- `src/utils/project.ts`: validation and `serializeProject` / `parseProject`. Model source files and animation assets are deduplicated **by asset ID** in the exported top-level `assets` array; repeated separate imports of identical content have separate IDs. Texture overrides live in per-instance material settings. `estimateProjectBytes` counts base64 without copying it to prevent creating an unreopenable oversized project. IDs, relative paths, colors, values and data URLs are validated on parse.
- `src/utils/projectStore.ts`: serialized IndexedDB autosave queue; smaller projects also have a localStorage fallback. `handles.ts`: optional browser File System Access handle/permissions. New/import project detaches the previously exported handle to prevent overwriting that file. Startup blocks edits while restoring. If restore is unusually slow, the explicit bypass disables autosave for that session and warns the user to export a copy; it deliberately does not overwrite a possibly newer saved project.
- `Viewport.tsx`, `FactoryModels.tsx`, `ModelKit.tsx`, `ProductModels.tsx`: scene/rendering, selection and camera. `WorkspaceChrome.tsx`, `LibraryPanel.tsx`, `PropertiesPanel.tsx`, `MobileChrome.tsx`, `MobileTools.tsx`: UI. Floor shadows require a working directional shadow map and renderer updates; test visually, not just by checking UI state.
- `src/assets/occt-import-js.wasm.gz` and `default-worker.glb.gz` are appended as base64 non-executable data tags by `scripts/embed-assets.mjs` **after** Rollup to avoid excessive build memory. `embeddedAsset.ts` uses those tags in production and fetches them in dev; dev servers may automatically decode gzip, so callers check the gzip magic before decompressing. Draco/Basis decoder JS/WASM is embedded by Vite. Do not put huge binary/base64 strings back into the Rollup module graph without considering memory.

## 5. Verification and reproducibility

Use a running dev server on port 4173. Install test browser once with `npx playwright install chromium`; Linux containers may need browser OS dependencies. Headless software WebGL is much slower than a real GPU. Browser scripts default to `http://127.0.0.1:4173/`; some accept `TEST_URL` as indicated in code. Screenshots go to `tests/artifacts/`.

```sh
npx tsc --noEmit
npm run build
# The TypeScript simulations use top-level await; bundle as ESM:
npx esbuild tests/simulation.ts --bundle --platform=node --format=esm --outfile=/tmp/larp-sim.mjs && node /tmp/larp-sim.mjs
npx esbuild tests/v1-regression.ts --bundle --platform=node --format=esm --outfile=/tmp/larp-prompt.mjs && node /tmp/larp-prompt.mjs
npx esbuild tests/v1-navigation.ts --bundle --platform=node --format=esm --outfile=/tmp/larp-nav.mjs && node /tmp/larp-nav.mjs
npx esbuild tests/v2-project-size.ts --bundle --platform=node --format=esm --outfile=/tmp/larp-size.mjs && node /tmp/larp-size.mjs
node tests/browser.mjs
node tests/features.mjs
node tests/code-and-tablet.mjs
node tests/v1-graphics.mjs
node tests/v2-import-sweep.mjs
node tests/v2-material-roundtrip.mjs
node tests/v2-worker-smoke.mjs
node tests/v2-worker-motion.mjs
node tests/v2-worker-position.mjs
node tests/v2-worker-operations.mjs
node tests/v2-animation-only.mjs
node tests/v2-3mf-units.mjs
node tests/v2-format-extra.mjs
node tests/v2-cad-extra.mjs
node tests/v2-compressed-formats.mjs
node tests/v2-negative.mjs
node tests/v2-autosave-safety.mjs
node tests/v2-handle-safety.mjs
node tests/v2-script-confirmation.mjs
node tests/v2-example.mjs
LARP_BUNDLE=/path/to/extracted/release node tests/v2-packaged-launch.mjs # needs a release folder containing Larp_Factory_V2.html
node tests/v2-mobile.mjs
node tests/v2-standalone.mjs
```

`v2-standalone` first needs the complete production build; it checks `file://`, no network requests, STL and STEP import, plus a sandboxed iframe. CAD test files are read from the installed `occt-import-js` package. A locally licensed Mixamo-compatible FBX may optionally be tested via `MIXAMO_FIXTURE=/path/to/file.fbx node tests/v2-worker-mixamo.mjs` and `tests/v2-retarget-motion.mjs`; Adobe files are intentionally not included. Fixtures and their provenance are documented in `tests/fixtures/README.md`. The compressed-format test includes a CC BY Cesium Box and a modified CC0 Flight Helmet with notices.

The V2 tests cover FBX, STL, OBJ/MTL, PLY, glTF/GLB, 3MF, DAE, 3DS, VRML, VTK, AMF, USDA, USDZ, STEP, IGES, BREP, Draco, KTX2, ZIP/resource failures, normal/roughness/base-map strengths, duplicate isolation, deduplicated export, large-worker IndexedDB reload, animation-only GLB, real Mixamo-compatible retarget motion (local fixture), clip crossfades, pause/speed, selection/focus, phone UI, save-handle detachment and slow-restore safety. They are samples, not proof every file in every format works. Original screenshots and counts are reproducible via tests, but results vary with performance/device/browser.

To regenerate the bundled CC0 worker GLB, start Vite then run `node scripts/bake-default-worker.mjs`. It reads the CC0 source FBX and local palette, edits foot UVs, keeps the idle/walk/work clips, exports GLB and gzips it. To replace the OCCT build, place a compatible compiled WASM at `src/assets/occt-import-js.wasm.gz` (e.g. `gzip -n -9 -c node_modules/occt-import-js/dist/occt-import-js.wasm > src/assets/occt-import-js.wasm.gz` on Unix), update the matching JS dependency and lockfile, then run the full build and CAD tests. Check licenses and ABI compatibility before distribution.

## 6. Safety, licensing and caveats

Robot JavaScript uses `AsyncFunction` and a loop guard, **not a security sandbox**. Project import asks for confirmation if code is not the generated visual program, including when a project also contains a visual-program object. V1-generated projects may prompt because their old illustrative scripts differ from the V2 canonical output. New V2-generated visual workflows use the canonical script. Open and run only trusted scripts. Model parsing and archives are bounded but browser decoders and WebAssembly are not a security boundary against all malicious content. Avoid transmitting or embedding credentials in source, documentation, logs, screenshots, projects or deliverables.

License materials are in `THIRD_PARTY_LICENSES/`, including npm package notices, Three.js and related packages, Basis Universal, Draco, Quaternius CC0 and OCCT/occt-import-js LGPL-2.1 texts. The compressed CAD kernel comes from `occt-import-js` **0.0.23** with corresponding importer source revision `c2148e54b456b571238d35cac037d304053d64b2`: https://github.com/kovacsv/occt-import-js/tree/c2148e54b456b571238d35cac037d304053d64b2 . Its Open CASCADE submodule revision is `d2abb6d844231cb8f29be6894440874a4700e4a5`: https://github.com/Open-Cascade-SAS/OCCT/tree/d2abb6d844231cb8f29be6894440874a4700e4a5 . The original npm source/package is https://registry.npmjs.org/occt-import-js/-/occt-import-js-0.0.23.tgz . The complete application source and rebuild process are included; distributors should independently review LGPL and other third-party obligations, including replacement/relinking and source availability. The Mixamo licensing references are https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400 and Adobe's current terms; do not redistribute downloaded raw Mixamo assets as a standalone library.

Known constraints: no functional semantics/colliders for arbitrary imported models; approximate CAD tessellation, no CAD editing or exact measurements; partial loader/material feature support; no promise of correct retarget on every rig; screen-space GI; browser quota and sandbox restrictions; limited performance testing on hardware GPUs and mobile devices; local prompt rules can misinterpret broad prose; custom JavaScript is trusted code; simplified collision/safety. Test on target browsers and real GPUs before production use.

## 7. Recommended next work

1. Test representative user-owned FBX characters and animation-only Mixamo exports in browsers/devices the user actually uses; improve twist preservation, foot locking and source axis handling based on reproducible fixtures. Keep CC0/default and Adobe assets/licenses distinct.
2. Move CAD tessellation and heavy import parsing to a cancellable Web Worker; add progress and better resource-memory accounting. Support more CAD/IFC/native formats only with appropriate parsers and license review.
3. Add optional physical footprints/semantics and editable interaction points for imported assets, without treating arbitrary geometry as a functional robot or blocking all navigation by default.
4. Add real-GPU, Safari/Firefox, lower-end phone and large-scene performance benchmarks; preserve V1 shadow and visual comparisons when modifying the renderer.
5. Improve persistent storage recovery and multi-tab conflict handling, reduce payload duplication for repeated replacement textures, and keep explicit, testable project migration/versioning.
