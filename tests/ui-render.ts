// Server-rendered markup checks for the settings window, panel chrome and worker
// cosmetics. These catch crashes and missing controls without a browser/WebGL.
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { SettingsWindow } from "../src/components/SettingsWindow";
import { PanelShell } from "../src/components/PanelShell";
import { FloorPlanView } from "../src/components/FloorPlanView";
import { HardHat, SafetyGlasses, EarDefenders, WorkerCap, WorkerGear, workerShirtMaterial } from "../src/components/WorkerCosmetics";
import { setSettingsSection } from "../src/settingsWindow";
import { DEFAULT_GEN, generateFactory } from "../src/sim/generator";
import { resetLayout, setPanel } from "../src/layout";
import { setAppearance } from "../src/theme";

const noop = () => {};

const settingsProps = {
  project: "Test factory",
  rename: noop,
  save: noop,
  exportFile: noop,
  importFile: noop,
  newProject: noop,
  mode: "desktop" as const,
  setMode: noop,
  onClose: noop,
};

// Every settings section renders without throwing.
for (const section of ["video", "quality", "lighting", "interface", "keybinds", "help", "data", "project"] as const) {
  setSettingsSection(section);
  const html = renderToStaticMarkup(createElement(SettingsWindow, settingsProps));
  assert.ok(html.length > 200, `section ${section} renders`);
}

// Video: the 3D resolution now offers values below 1 and antialiasing sits next to it.
setSettingsSection("video");
let html = renderToStaticMarkup(createElement(SettingsWindow, settingsProps));
for (const percent of ["50%", "65%", "75%", "90%", "100%", "200%"]) assert.ok(html.includes(percent), `resolution step ${percent}`);
assert.ok(html.includes("Antialiasing"), "antialiasing row is present");
assert.ok(html.includes("FXAA (fast)") && html.includes("MSAA (smooth)"), "antialiasing options are present");

// Interface: the custom skin and its full colour palette.
setSettingsSection("interface");
html = renderToStaticMarkup(createElement(SettingsWindow, settingsProps));
assert.ok(html.includes("Custom"), "the custom skin card is offered");
assert.ok(html.includes("Reset layout"), "the layout reset button exists");
setAppearance({ skin: "custom" });
html = renderToStaticMarkup(createElement(SettingsWindow, settingsProps));
assert.ok(html.includes("data-custom-scheme"), "the custom colour scheme editors appear for the custom skin");
assert.ok(html.includes("Reset colours"));
for (const label of ["Ribbon", "Panels", "Status bar", "3D viewport", "Window background"]) {
  assert.ok(html.includes(label), `colour field ${label}`);
}
setAppearance({ skin: "larp" });

// Help no longer claims that panels are fixed.
setSettingsSection("help");
html = renderToStaticMarkup(createElement(SettingsWindow, settingsProps));
assert.ok(!html.includes("are planned and not available yet"), "the help text no longer says panels are fixed");

// Dock panels render a resize handle in both docked and floating form.
resetLayout();
html = renderToStaticMarkup(createElement(PanelShell, { id: "catalog", title: "Catalog" }, createElement("div", null, "content")));
assert.ok(html.includes('data-docked-panel="catalog"'), "docked panel wrapper");
assert.ok(html.includes('aria-label="Resize panel"'), "resize handle");
assert.ok(html.includes('aria-label="Detach panel"'), "detach command");
assert.ok(html.includes('aria-label="Close Catalog"'), "close command");
setPanel("catalog", { floating: true });
html = renderToStaticMarkup(createElement(PanelShell, { id: "catalog", title: "Catalog" }, createElement("div", null, "content")));
assert.ok(html.includes('data-floating-panel="catalog"'), "floating window");
assert.ok(html.includes('aria-label="Dock panel"'), "dock command while floating");
assert.ok(html.includes('aria-label="Resize window"'), "floating resize corner");
resetLayout();

// The floor plan draws every generated component.
const items = generateFactory({ ...DEFAULT_GEN, stages: 2, lanes: 1 });
html = renderToStaticMarkup(createElement(FloorPlanView, { items, showLegend: true }));
assert.ok(html.includes("data-floor-plan"), "plan root");
assert.ok((html.match(/<polyline/g) ?? []).length >= 1, "conveyor polylines");
assert.ok((html.match(/<rect /g) ?? []).length >= 4, "machines and pallets");
assert.ok((html.match(/<circle /g) ?? []).length >= 1, "robots and workers");

// React DOM complains about React-Three-Fiber props in this harness only.
const consoleError = console.error;
console.error = () => undefined;

// Worker cosmetics render their parts.
const hatMarkup = renderToStaticMarkup(createElement(HardHat, { hatColor: "#f7b51e" }));
assert.ok((hatMarkup.match(/<mesh/g) ?? []).length >= 7, "hard hat has shell, brim, peak, ridge, vents, knob and strap");
assert.ok(workerShirtMaterial("#36c26b").color.getHexString() === "36c26b", "shirt fabric uses the worker colour");
const glasses = renderToStaticMarkup(createElement(SafetyGlasses, {}));
assert.ok((glasses.match(/<mesh/g) ?? []).length >= 6, "glasses have a lens, rims, bridge and temple arms");
const defenders = renderToStaticMarkup(createElement(EarDefenders, {}));
assert.ok((defenders.match(/<mesh/g) ?? []).length >= 6, "ear defenders have a band, yokes, cups and cushions");
const cap = renderToStaticMarkup(createElement(WorkerCap, { color: "#f7b51e", panel: "#36c26b" }));
assert.ok((cap.match(/<mesh/g) ?? []).length >= 4, "cap has a crown, band, bill and button");
const gear = renderToStaticMarkup(createElement(WorkerGear, {
  item: { props: { hat: "hardhat", glasses: true, headphones: true, earrings: true } },
  shirtColor: "#36c26b",
  glasses: true,
}));
// Hard hat + safety glasses + ear defenders + earrings are all part of the gear.
assert.ok((gear.match(/<mesh/g) ?? []).length >= 20, `full gear set renders its parts (${(gear.match(/<mesh/g) ?? []).length})`);
assert.ok((gear.match(/<group/g) ?? []).length >= 8, "the gear is grouped per cosmetic");

console.error = consoleError;

console.log("settings sections, custom scheme, panel chrome, floor plan and worker cosmetics render OK");
// Three.js leaves a few timers/handles alive in Node; the checks above are complete.
process.exit(0);
