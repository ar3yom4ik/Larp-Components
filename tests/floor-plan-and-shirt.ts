// Browser-free checks for the shared floor plan and the worker shirt recolouring.
import assert from "node:assert/strict";
import { buildFloorPlan, worldPath } from "../src/utils/floorPlan";
import { generateFactory, DEFAULT_GEN } from "../src/sim/generator";
import { applyShirtTint } from "../src/utils/workerShirt";
import * as THREE from "three";

// --- floor plan ---------------------------------------------------------
const items = generateFactory({ ...DEFAULT_GEN, stages: 2, lanes: 1 });
const plan = buildFloorPlan(items);
assert.ok(plan.shapes.length > 0, "the plan draws objects");
assert.ok(plan.paths.length > 0, "the plan draws the conveyor line");
assert.ok(plan.bounds.minX < plan.bounds.maxX && plan.bounds.minZ < plan.bounds.maxZ, "bounds are sane");
for (const shape of plan.shapes) {
  assert.ok(Number.isFinite(shape.x) && Number.isFinite(shape.z), `shape ${shape.id} has finite coordinates`);
  assert.ok(shape.w > 0 && shape.h > 0, `shape ${shape.id} has a footprint`);
  assert.ok(shape.x >= plan.bounds.minX && shape.x <= plan.bounds.maxX, `shape ${shape.id} is inside the bounds`);
  assert.ok(shape.z >= plan.bounds.minZ && shape.z <= plan.bounds.maxZ, `shape ${shape.id} is inside the bounds`);
}
// Every generated conveyor contributes a polyline with at least two points.
assert.ok(plan.paths.every((path) => path.points.length >= 2));

// Rotating and moving a spline item moves its world polyline with it.
const conveyor = items.find((item) => item.kind === "conveyor")!;
const straight = worldPath({ ...conveyor, position: [0, 0, 0], rotation: 0, points: [[0, 0], [2, 0]] });
assert.equal(straight[0][0], 0);
assert.equal(straight[straight.length - 1][0], 2);
const moved = worldPath({ ...conveyor, position: [5, 0, 3], rotation: 90, points: [[0, 0], [2, 0]] });
assert.ok(Math.abs(moved[moved.length - 1][0] - 5) < 0.05, "a 90° rotation turns the line along Z");
assert.ok(Math.abs(moved[moved.length - 1][1] - 1) < 0.05);
// An empty scene still produces usable bounds instead of infinities.
const empty = buildFloorPlan([]);
assert.ok(Number.isFinite(empty.bounds.minX) && empty.bounds.maxX > empty.bounds.minX);
assert.equal(empty.shapes.length, 0);

// --- worker shirt -------------------------------------------------------
const material = new THREE.MeshStandardMaterial({ color: "#ffffff" });
applyShirtTint(material, "#36c26b");
const patched = material as THREE.MeshStandardMaterial & { __larpShirtUniforms?: { color: { value: THREE.Color }; mix: { value: number } } };
assert.equal(patched.__larpShirtUniforms?.mix.value, 1);
assert.equal(patched.__larpShirtUniforms?.color.value.getHexString(), "36c26b");
assert.equal(typeof material.onBeforeCompile, "function");

// The shader edit is injected into a copy of the standard fragment shader.
const shader = {
  uniforms: {} as Record<string, { value: unknown }>,
  vertexShader: "void main(){}",
  fragmentShader: "#include <color_fragment>\n#include <map_fragment>",
};
material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, null as unknown as THREE.WebGLRenderer);
assert.ok("larpShirtColor" in shader.uniforms, "the shirt colour uniform is bound");
assert.ok("larpShirtMix" in shader.uniforms);
assert.ok(shader.fragmentShader.includes("uniform vec3 larpShirtColor;"));
assert.ok(shader.fragmentShader.includes("shirtMask"), "the clothing mask is compiled in");
assert.ok(shader.fragmentShader.indexOf("shirtMask") > shader.fragmentShader.indexOf("#include <color_fragment>"), "the mask runs after the base colour");

// Turning the tint off keeps the original palette but leaves the shader intact.
applyShirtTint(material, null);
assert.equal(patched.__larpShirtUniforms?.mix.value, 0);
applyShirtTint([material], "#f7b51e");
assert.equal(patched.__larpShirtUniforms?.mix.value, 1);
assert.equal(patched.__larpShirtUniforms?.color.value.getHexString(), "f7b51e");

console.log("floor plan:", plan.shapes.length, "objects,", plan.paths.length, "paths; worker shirt tint OK");
