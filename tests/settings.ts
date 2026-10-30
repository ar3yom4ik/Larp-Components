// Browser-free checks for keybinds, graphics migration and settings import/export.
import assert from "node:assert/strict";
import { bindingFor, bindingFromEvent, eventMatches, importBindings, isValidBinding, resetAllBindings, setBinding } from "../src/keybinds";
import { ANTIALIAS_MODES, DEFAULT_SCHEME, RESOLUTION_STEPS, sanitizeGfx, sanitizeScheme, TONE_MAPPINGS, GI_MODES } from "../src/theme";
import { applySettingsFile, buildSettingsFile } from "../src/utils/settingsIO";

const ev = (key: string, mods: { ctrl?: boolean; shift?: boolean } = {}) =>
  ({ key, ctrlKey: !!mods.ctrl, metaKey: false, shiftKey: !!mods.shift, altKey: false }) as unknown as KeyboardEvent;

// Keybind strings are produced from events the way App.tsx matches them.
assert.equal(bindingFromEvent(ev("z", { ctrl: true })), "Ctrl+Z");
assert.equal(bindingFromEvent(ev("Z", { ctrl: true, shift: true })), "Ctrl+Shift+Z");
assert.equal(bindingFromEvent(ev(" ")), "Space");
assert.equal(bindingFromEvent(ev("Delete")), "Delete");
assert.equal(bindingFromEvent(ev(",", { ctrl: true })), "Ctrl+,");
assert.equal(bindingFromEvent(ev("Shift")), null, "modifier-only presses are not bindings");
assert.ok(eventMatches(ev("v"), "toolSelect"));
assert.ok(eventMatches(ev("z", { ctrl: true }), "undo"));
assert.ok(!eventMatches(ev("z", { ctrl: true }), "redo"));
assert.ok(eventMatches(ev("Z", { ctrl: true, shift: true }), "redo"));

// Re-binding a key clears the action that used it, so every key stays unique.
resetAllBindings();
setBinding("toolMove", "V");
assert.equal(bindingFor("toolMove"), "V");
assert.equal(bindingFor("toolSelect"), "", "the displaced action is cleared");
resetAllBindings();
assert.equal(bindingFor("toolSelect"), "V", "reset restores defaults");

// Imports keep valid entries only.
assert.ok(isValidBinding("Ctrl+Shift+Z"));
assert.ok(!isValidBinding("Shift+Ctrl+"));
assert.ok(!isValidBinding("Hyper+Z"));
assert.equal(importBindings({ undo: "Q", nope: "X", toolMove: "" }), 1);
assert.equal(bindingFor("undo"), "Q");
assert.equal(bindingFor("toolMove"), "M", "invalid values fall back to the default");
resetAllBindings();

// Graphics migration: old saves had `ao` + `bounce`, and `max` means VXGI.
assert.equal(sanitizeGfx("standard", { ao: true, bounce: 0.3 }).gi, "approx");
assert.equal(sanitizeGfx("standard", { ao: false }).gi, "off");
assert.equal(sanitizeGfx("max", undefined).gi, "vxgi");
assert.equal(sanitizeGfx("standard", { gi: "vxgi" }).gi, "vxgi");
assert.equal(sanitizeGfx("standard", { gi: "bogus" }).gi, "off", "unknown GI modes fall back to the preset");
assert.equal(sanitizeGfx("standard", { toneMapping: "bogus" }).toneMapping, "neutral");
assert.equal(TONE_MAPPINGS.length, 7);
assert.equal(GI_MODES.length, 4);
assert.ok(!("ao" in sanitizeGfx("enhanced", { ao: true })), "the legacy ao flag is removed");

// Settings files round-trip, and bad files are rejected without changing anything.
const exported = JSON.parse(JSON.stringify(buildSettingsFile("en")));
assert.equal(exported.format, "larp-settings");
assert.equal(applySettingsFile(exported).ok, true);
assert.equal(applySettingsFile({ format: "other" }).ok, false);
assert.equal(applySettingsFile({ format: "larp-settings", version: 99, appearance: {} }).ok, false);
assert.equal(applySettingsFile({ format: "larp-settings", version: 1 }).ok, false);
assert.equal(applySettingsFile(null).ok, false);

console.log("settings: keybinds, graphics migration and settings files OK");

// Custom skin colour scheme and the new render options.
assert.equal(sanitizeScheme({ appBg: "#123456", accent: "not-a-colour", panelBg: "#abc" }).appBg, "#123456");
assert.equal(sanitizeScheme({ accent: "not-a-colour" }).accent, DEFAULT_SCHEME.accent, "invalid colours fall back to the default");
assert.equal(sanitizeScheme({ statusBg: "red; background:url(x)" }).statusBg, DEFAULT_SCHEME.statusBg, "CSS injection is rejected");
assert.equal(sanitizeScheme(null).ribbonBg, DEFAULT_SCHEME.ribbonBg);
assert.ok(RESOLUTION_STEPS.some((step) => step < 1), "the 3D resolution offers values below 100%");
assert.ok(RESOLUTION_STEPS.every((step) => step > 0));
assert.deepEqual([...ANTIALIAS_MODES], ["off", "fxaa", "msaa"]);
assert.equal(sanitizeGfx("standard", { antialias: "bogus" }).antialias, "msaa", "unknown antialiasing falls back to the preset");
assert.equal(sanitizeGfx("low", {}).antialias, "fxaa");
assert.equal(sanitizeGfx("standard", { antialias: "off" }).antialias, "off");
assert.equal(sanitizeGfx("standard", { pixelRatio: 0.5 }).pixelRatio, 0.5, "sub-1 render scales survive a save");
assert.equal(sanitizeGfx("standard", { pixelRatio: 0 }).pixelRatio, 1.25, "zero is rejected");
assert.equal(sanitizeGfx("standard", { pixelRatio: 99 }).pixelRatio, 3);

// Settings files carry the colour scheme.
const schemeFile = buildSettingsFile("en");
assert.equal(schemeFile.appearance.scheme.appBg, DEFAULT_SCHEME.appBg);
