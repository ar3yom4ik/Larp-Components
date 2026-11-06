// Browser-free checks for the dockable workspace layout.
import assert from "node:assert/strict";
import { clampPanelSize, dockPanel, floatPanel, getLayout, isCustomLayout, PANEL_MAX, PANEL_MIN, resetLayout, setPanel, togglePanel } from "../src/layout";

resetLayout();
const initial = getLayout();
assert.equal(initial.catalog.open, true);
assert.equal(initial.inspector.floating, false);
assert.ok(initial.catalog.size >= PANEL_MIN.catalog && initial.catalog.size <= PANEL_MAX.catalog);
assert.equal(isCustomLayout(), false, "the default arrangement is not custom");

// Resizing clamps to the panel range, so a drag can never collapse a panel.
assert.equal(clampPanelSize("catalog", 10), PANEL_MIN.catalog);
assert.equal(clampPanelSize("catalog", 5000), PANEL_MAX.catalog);
assert.equal(clampPanelSize("dock", 300), 300);
setPanel("catalog", { size: 9999 });
assert.equal(getLayout().catalog.size, PANEL_MAX.catalog);
assert.equal(isCustomLayout(), true, "a resized panel counts as a custom layout");

// Detaching and docking again.
floatPanel("inspector");
assert.equal(getLayout().inspector.floating, true);
assert.equal(getLayout().inspector.open, true, "a detached panel is visible");
dockPanel("inspector");
assert.equal(getLayout().inspector.floating, false);

// Closing and re-opening.
togglePanel("dock");
assert.equal(getLayout().dock.open, false);
togglePanel("dock");
assert.equal(getLayout().dock.open, true);

// Reset restores every panel, including size, position and open state.
setPanel("inspector", { open: false, size: 500, x: 12, y: 34 });
resetLayout();
const reset = getLayout();
assert.equal(reset.inspector.open, true);
assert.equal(reset.inspector.size, initial.inspector.size);
assert.equal(reset.catalog.size, initial.catalog.size);
assert.equal(isCustomLayout(reset), false);
console.log("layout: resize, detach, dock, close and reset OK");
