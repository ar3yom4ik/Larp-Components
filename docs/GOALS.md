# Goals and hand-off

Branch: `arena/9a08dd02-larp-components` (PR #1). Last commit: `9a77fe6`.

This issue is the hand-off list. Each item says what was done, how it was checked, and what remains.

## Done (code in branch, unit tests pass, `npm run build` passes)

- [x] **Settings window** (`src/components/SettingsWindow.tsx`, replaces the old project settings modal). Sections: Video, Graphics quality, Lighting, Interface & colours, Keybinds, Help, Settings backup, Project. Verified visually in WebGL.
- [x] **Presets plus individual parameters.** Low / Standard / Enhanced / Max set the parameters. Changing one parameter shows "Custom". "Reset to preset" restores it. Verified visually.
- [x] **Global illumination as a parameter**: Off / Occlusion / Approximate / VXGI. VXGI falls back to Approximate when WebGPU is unavailable. Verified visually for the UI only; the WebGPU path was not re-run this session (see open items).
- [x] **Seven tone mappers**: none, linear, reinhard, cineon, ACES filmic, AgX, neutral (`TONE_MAPPING_BY_NAME` in `GraphicsEffects.tsx`). Not yet checked visually.
- [x] **Show frame rate** option (live FPS overlay in the 3D view). Not yet checked visually.
- [x] **Keybinds**: every shortcut is listed in `src/keybinds.ts`, can be rebound (conflicts are resolved by clearing the other action), and can be reset individually or all at once. App.tsx dispatches on these ids. Unit-tested.
- [x] **Settings export / import** as `larp-settings.json` (graphics, colours, layout style, keybinds, language). Invalid files are rejected without changes. Unit-tested (`src/utils/settingsIO.ts`).
- [x] **UI colours**: accent colour with swatches and a custom picker. The three layouts (Larp, Visual Components, R-pro) stay as layout styles, so the Visual Components look does not regress.
- [x] **Help** (HELP ribbon) opens the Help section or Keybinds in the settings window, instead of a toast.
- [x] **Cosmetics dropdown** cleaned up: one select per slot (Head, Head accessory, Face, Ears) instead of toggle switches.
- [x] **Cosmetics attach to the head bone** (`RiggedHuman.tsx`, holder group under the head bone). Verified at rest: the hard hat and safety glasses sit on the head. Not yet verified during animation.
- [x] **Simulation settings menu** opens upward (`Viewport.tsx`, `SimPlayer`). Code change only; not yet verified with a screenshot.
- [x] **GI voxel refresh** every 3 s instead of 1.5 s while the simulation runs (`GpuGlobalIllumination.tsx`). Not measured on a GPU.

## Not done

- [ ] **Skinned worker disappears in Standard and Enhanced (reported).** Not reproduced. The built-in worker renders in Standard and Max (WebGL) in headless Chromium. The report probably involves an imported rigged character, which we do not have. Needed: the model file and the steps to reproduce.
- [ ] **WebGPU / VXGI not re-verified this session.** The earlier session verified it on Chromium 153 with SwiftShader. The sandbox now runs Chromium 138, which has no WebGPU context. Re-run the WebGPU screenshots on a machine with a GPU.
- [ ] **Frame rate limit** (30 to Unlimited) is not implemented. It needs a render-loop cap. Vsync is controlled by the browser and cannot be set from the page.
- [ ] **Panels**: drag an edge to resize, collapse, detach into a floating window, close, and a "Reset layout" button. Not started. The Help page says so.
- [ ] **Floor map** should look like the factory preview in the AI Factory generator. Not started.
- [ ] **Translations**: new strings were added in English, and Russian translations for the main labels. A full audit is still needed (`RU` in `src/i18n.ts`).
- [ ] **Settings window on touch**: the mobile inline layout is written but not screenshot-checked.
- [ ] **Visual checks** of tone mappers, FPS overlay, the simulation menu, and the cosmetics during animation.
- [ ] **GI optimisation** beyond the refresh rate: lower voxel resolution option, and skipping voxelisation while idle. Needs GPU measurements first.

## How to continue

1. `npm ci`, then `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`.
2. `npm run test:unit` (5 suites). Then `npm run build`.
3. Screenshot harnesses used in this session live in the sandbox only. The DEV hooks `window.__larpTheme`, `window.__larpProject` (`getItems`, `setItems`, `select`) and `window.__larpCornell` make scripted checks easy.
