# Goals and hand-off

Branch: `arena/bb17885b-larp-components`. Release **V2.1** (see `CHANGELOG.md`).

This issue is the hand-off list. Each item says what was done, how it was checked, and what remains.

## Done in V2.1

- [x] **Dockable panels.** `src/layout.ts` stores one state per panel (open, floating, docked
  size, floating geometry) in `localStorage`. `src/components/PanelShell.tsx` draws the resize
  edge and the detach/close commands for the catalogue, properties and output panels. Detached
  panels are real windows: drag the title strip to move, drag the bottom-right corner to resize,
  press the same button to dock again. Ribbon → **Home → Windows** has per-panel toggles and
  **Reset layout**; the same controls are in Settings → Interface → Panels. Unit-tested
  (`tests/ui-layout.ts`) and server-rendered (`tests/ui-render.ts`).
- [x] **Custom skin with a fully customizable colour scheme.** Fourth skin `custom`
  (`theme.ts`). Eleven colour fields (accent, window, title bar, tab bar, ribbon, panels, dock,
  3D viewport, status bar, chrome text) plus reset. Values are validated as `#rrggbb`, written as
  CSS custom properties on the document root and removed again when switching to a built-in
  skin. The 3D viewport colour and its light/dark helper palette follow the scheme. Included in
  settings export/import. Unit-tested (sanitisation, injection rejection, settings round-trip).
- [x] **Antialiasing next to 3D resolution**: Off / FXAA (fast) / MSAA (smooth). MSAA is the
  renderer context attribute (canvas is recreated when it changes); FXAA is a post pass in the
  same composer as the occlusion pass (`GraphicsEffects.tsx`, `PostEffects`). Post effects are
  skipped on the WebGPU/VXGI path, which has its own TRAA pipeline.
- [x] **3D resolution below 100 %**: 50/65/75/90/100/125/150/200 %. Values survive save/load and
  are clamped to 0.35–3.
- [x] **Floor map rebuilt.** `src/utils/floorPlan.ts` produces one plan geometry (footprints,
  rotated rectangles, circles for robots/workers, conveyor polylines, dashed fences) used by the
  AI Factory preview, the corner mini-map and the new movable/resizable floor-map window
  (`FloorMapWindow.tsx`) with a legend and click-to-select. Unit-tested.
- [x] **Worker cosmetics** rebuilt from photographic PPE references
  (`WorkerCosmetics.tsx`): hard hat (brim, peak, ridge, vents, ratchet, chin strap), panelled
  cap, wraparound safety glasses, ear defenders with cups and cushions, cat ears, hoop earrings.
  Hat colour is selectable; the cap panels follow the shirt colour.
- [x] **Worker colour changes the T-shirt.** `src/utils/workerShirt.ts` injects a mask into the
  character material that replaces only the warm, saturated clothing band of the palette
  texture, so face, hands and boots are untouched. The classic mannequin uses the same colour.
  Unit-tested (uniform binding and shader injection).
- [x] **Worker no longer disappears after a graphics change.** Defensive fixes: animated skinned
  meshes are never frustum-culled; saved worker settings are normalised (NaN height, unknown
  forward axis, zero item scale, degenerate bounding boxes); a non-finite ground correction is
  discarded instead of being stored in the model transform; an error boundary swaps a broken rig
  for the mannequin; post-processing state is rebuilt (not patched) when the effect set changes.

## Open items inherited from V2.0

- [ ] **WebGPU / VXGI re-verification on a real GPU.** The sandbox has no browser with a GPU, so
  the VXGI path was only reviewed in code this session. It must be re-run before relying on it.
- [ ] **Frame-rate limit** (30 to Unlimited) is still not implemented; a render-loop cap is needed.
- [ ] **Visual re-checks in a real browser.** The sandbox for V2.1 had no Playwright browser
  available (download blocked, no NSS libraries), so the visual verification this time is limited
  to server-rendered markup and WebGL-free unit tests.
- [ ] **Translations**: new V2.1 strings are in English and Russian; a full audit of older strings
  is still worthwhile (`RU` in `src/i18n.ts`).
- [ ] **GI optimisation** beyond the refresh rate (lower voxel resolution, idle skip). Needs GPU
  measurements.

## How to continue

1. `npm ci`, then `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`.
2. `npm run typecheck`, `npm run test:unit` (8 suites), `npm run build`.
3. Dev hooks used by scripted checks: `window.__larpProject`, `window.__larpTheme`
   (`setGfx`, `setSkin`, `setAccent`, `setScheme`), `window.__larpLayout` (`setPanel`,
   `resetLayout`, `floatPanel`), `window.__larpRenderer`, `window.__larpCornell`.
