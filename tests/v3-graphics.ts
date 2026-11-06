// Browser-free checks for the V3 graphics repair: presets, sanitising, live status,
// build identity, the Visual Components shortcut set and the Poly Haven catalogue filter.
import assert from "node:assert/strict";
import { defaultGfx, QUALITY_PRESETS, sanitizeGfx, VXGI_RESOLUTIONS, type GraphicsQuality } from "../src/theme";
import { describeGi, getGraphicsStatus, resetGraphicsStatus, setGraphicsStatus } from "../src/graphicsStatus";
import { APP_NAME, APP_VERSION, buildLine, buildStamp } from "../src/buildInfo";
import { bindingFor, eventMatches, KEY_ACTIONS, resetAllBindings } from "../src/keybinds";
import { filterPolyAssets, formatPolyResolution, selectPolyFile, POLY_RESOLUTIONS, type PolyAsset } from "../src/utils/polyhaven";
import { onViewportCommand, sendViewportCommand, type ViewportCommand } from "../src/viewportCommands";

/* ----- presets: every quality level produces a complete, in-range setting set ----- */
for (const quality of QUALITY_PRESETS) {
  const gfx = defaultGfx(quality);
  assert.equal(gfx.preset, quality);
  assert.ok(gfx.shadowRadius >= 1 && gfx.shadowRadius <= 16, `${quality}: shadow radius in range`);
  assert.ok(gfx.shadowExtent >= 8 && gfx.shadowExtent <= 200, `${quality}: shadow extent in range`);
  assert.ok(VXGI_RESOLUTIONS.includes(gfx.vxgiResolution), `${quality}: voxel resolution is offered`);
  assert.ok(gfx.vxgiRefresh >= 0.25 && gfx.vxgiRefresh <= 30);
  assert.equal(typeof gfx.sunFollowView, "boolean");
  // A cleaner shadow frustum than the old fixed 40 m camera is the point of the repair.
  assert.ok(gfx.shadowExtent < 40, `${quality}: shadow frustum is smaller than the old fixed one`);
}
// The presets must be ordered: quality and cost never go down as the preset goes up.
const low = defaultGfx("low"), standard = defaultGfx("standard"), enhanced = defaultGfx("enhanced"), max = defaultGfx("max");
assert.ok(low.shadowSize <= standard.shadowSize && standard.shadowSize <= enhanced.shadowSize && enhanced.shadowSize <= max.shadowSize);
assert.ok(low.shadowRadius <= max.shadowRadius);
assert.equal(max.gi, "vxgi");
assert.ok(low.gi !== "vxgi", "Low must not ask for WebGPU GI");
assert.equal(low.contactShadows, false);
assert.equal(low.fog, false);

/* ----- sanitising: imported or old files cannot inject out-of-range graphics ----- */
const clamped = sanitizeGfx("standard", {
  shadowRadius: 900, shadowExtent: -5, vxgiRefresh: 0, vxgiResolution: 512,
  exposure: 99, ambient: -3, sun: 1e9, fill: "abc", env: null, bounce: 40,
  aoIntensity: -1, aoRadius: 0, contactOpacity: 5, shadowStrength: 2,
  productBoost: 9, fogFar: 5, sunAzimuth: 725, sunElevation: 120,
  sunFollowView: "yes", background: "not-a-colour", shadowSize: 8192,
});
assert.equal(clamped.shadowRadius, 16);
assert.equal(clamped.shadowExtent, 8);
assert.equal(clamped.vxgiRefresh, 0.25);
assert.equal(clamped.vxgiResolution, 96, "an unsupported voxel size falls back to the preset");
assert.equal(clamped.exposure, 4);
assert.equal(clamped.ambient, 0);
assert.equal(clamped.sun, 12);
assert.equal(clamped.fill, defaultGfx("standard").fill, "a non-numeric value falls back");
assert.equal(clamped.bounce, 4);
assert.equal(clamped.aoIntensity, 0);
assert.equal(clamped.aoRadius, 0.05);
assert.equal(clamped.contactOpacity, 1);
assert.equal(clamped.shadowStrength, 1);
assert.equal(clamped.productBoost, 2);
assert.equal(clamped.fogFar, 20);
assert.equal(clamped.sunAzimuth, 5, "azimuth wraps around 360");
assert.equal(clamped.sunElevation, 89);
assert.equal(clamped.sunFollowView, true, "a non-boolean keeps the preset default");
assert.match(clamped.background, /^#[0-9a-f]{6}$/i);
assert.equal(clamped.shadowSize, defaultGfx("standard").shadowSize);
assert.equal(sanitizeGfx("standard", { sunAzimuth: -30 }).sunAzimuth, 330, "negative azimuth wraps too");

/* ----- live status store ----- */
resetGraphicsStatus();
assert.equal(getGraphicsStatus().renderer, "starting");
let notifications = 0;
setGraphicsStatus({ renderer: "webgl", shadowSize: 2048, shadowExtent: 26 });
setGraphicsStatus({ renderer: "webgl" }); // identical patch must not notify
assert.equal(getGraphicsStatus().shadowSize, 2048);
assert.equal(getGraphicsStatus().shadowExtent, 26);
setGraphicsStatus({ gi: "off" });
const status = getGraphicsStatus();
assert.equal(describeGi(status, "off"), "Direct lighting only.");
assert.match(describeGi(status, "vxgi"), /Fallen back/i, "a WebGPU request that is not running is reported as a fallback");
setGraphicsStatus({ gi: "vxgi" });
assert.match(describeGi(getGraphicsStatus(), "vxgi"), /Voxel cone-traced/);
setGraphicsStatus({ gi: "approx" });
assert.match(describeGi(getGraphicsStatus(), "approx"), /Bounce lights/);
setGraphicsStatus({ gi: "failed" });
assert.match(describeGi(getGraphicsStatus(), "vxgi"), /could not start/i);
resetGraphicsStatus();
assert.equal(getGraphicsStatus().gi, "starting");
void notifications;

/* ----- build identity ----- */
assert.match(APP_NAME, /Larp Components/);
assert.match(APP_VERSION, /^\d+\.\d+\.\d+/);
assert.equal(buildStamp("2026-10-31T14:05:00.000Z"), "2026-10-31 14:05 UTC");
assert.equal(buildStamp(""), "\u2014");
assert.match(buildLine({ renderer: "webgpu" }), /Larp Components .* build .* renderer webgpu/);

/* ----- Visual Components shortcut set ----- */
resetAllBindings();
for (const id of ["fitAll", "fitSelection", "setCoi", "zoomIn", "zoomOut", "togglePanels", "version", "newProject", "openProject", "playPause"]) {
  assert.ok(KEY_ACTIONS.some((action) => action.id === id), `${id} is a known action`);
  assert.ok(bindingFor(id), `${id} has a default binding`);
}
const ev = (key: string, mods: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}) =>
  ({ key, ctrlKey: !!mods.ctrl, metaKey: false, altKey: !!mods.alt, shiftKey: !!mods.shift }) as unknown as KeyboardEvent;
assert.ok(eventMatches(ev("f"), "fitAll"));
assert.ok(eventMatches(ev("f", { ctrl: true, alt: true }), "fitSelection"));
assert.ok(!eventMatches(ev("f", { ctrl: true }), "fitSelection"), "Ctrl+F stays the component search");
assert.ok(eventMatches(ev(" ", undefined), "playPause"));
assert.ok(eventMatches(ev("Tab"), "togglePanels"));
assert.ok(eventMatches(ev("j", { ctrl: true, alt: true }), "version"));
// Every default binding must be unique, otherwise the shortcut table silently double-binds.
const defaults = KEY_ACTIONS.map((action) => action.key).filter(Boolean);
assert.equal(new Set(defaults).size, defaults.length, "default shortcuts are unique");

/* ----- Poly Haven catalogue filter (no network) ----- */
assert.equal(formatPolyResolution([4096,4096]), "4k");
assert.equal(formatPolyResolution([500,256]), "500px");
assert.equal(formatPolyResolution("2k"), "2k");
assert.equal(formatPolyResolution(null), "1k");
const assets: PolyAsset[] = [
  { id: "wooden_crate_01", name: "Wooden Crate 01", thumbnail: "", categories: ["crate", "wood"], downloads: 900, maxResolution: "4k" },
  { id: "wooden_crate_02", name: "Wooden Crate 02", thumbnail: "", categories: ["crate"], downloads: 1500, maxResolution: "4k" },
  { id: "office_desk", name: "Office Desk", thumbnail: "", categories: ["furniture", "office"], downloads: 3000, maxResolution: "2k" },
  { id: "industrial_forklift", name: "Industrial Forklift", thumbnail: "", categories: ["vehicle", "industrial"], downloads: 400, maxResolution: "1k" },
];
assert.deepEqual(filterPolyAssets(assets, "").map((a) => a.id), assets.map((a) => a.id), "empty search keeps the catalogue order");
const crates = filterPolyAssets(assets, "wooden crate");
assert.equal(crates.length, 2);
assert.equal(crates[0].id, "wooden_crate_02", "more popular comes first for equally good matches");
assert.equal(filterPolyAssets(assets, "forklift")[0].id, "industrial_forklift", "category words are searchable");
assert.equal(filterPolyAssets(assets, "desk").length, 1);
assert.equal(filterPolyAssets(assets, "spaceship").length, 0);
assert.deepEqual(POLY_RESOLUTIONS, ["1k", "2k", "4k"]);

/* ----- viewport command bus ----- */
const seen: ViewportCommand[] = [];
const off = onViewportCommand((command) => seen.push(command));
sendViewportCommand({ type: "fit" });
sendViewportCommand({ type: "zoom", direction: -1 });
off();
sendViewportCommand({ type: "fit" }); // unsubscribed handler must not fire again
assert.equal(seen.length, 2);
assert.deepEqual(seen[1], { type: "zoom", direction: -1 });

console.log("graphics: presets, sanitising, status, build stamp, shortcuts, web catalogue and commands OK");

// The API nests each model format below the resolution.
assert.deepEqual(selectPolyFile({gltf: {'1k': {gltf: {url: 'https://example.com/model.gltf', include: {'mesh.bin': {url: 'https://example.com/mesh.bin'}}}}}}, '2k')?.entry.url, 'https://example.com/model.gltf');
assert.equal(selectPolyFile({gltf: {'1k': {url: 'https://example.com/flat.gltf'}}}, '1k')?.entry.url, 'https://example.com/flat.gltf');
assert.equal(selectPolyFile({}, '1k'), null);
assert.equal(filterPolyAssets([{id: 'industrial_table', name: 'Workbench', thumbnail: '', categories: [], tags: ['factory'], downloads: 0, maxResolution: '1k'}], 'factory').length, 1);
