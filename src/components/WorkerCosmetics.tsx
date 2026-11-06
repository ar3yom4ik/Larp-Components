import { useMemo } from "react";
import * as THREE from "three";

/**
 * Worker cosmetics.
 *
 * Modelled from photographic references of real PPE so the gear reads at a distance:
 * - hard hat: domed shell with a raised centre ridge, a short brim all round plus a
 *   wider front peak, side vent slots, a ratchet knob at the back and a chin strap;
 * - baseball cap: panelled crown with a button and a curved bill;
 * - safety glasses: a wraparound single lens with dark rims, a nose bridge and
 *   temple arms that reach the ears;
 * - ear defenders: an overhead band with yokes and two cups with cushions;
 * - hair accessories: cat ears and gold hoop earrings.
 *
 * All parts are procedural, low-poly and use shared geometry/materials, so a scene
 * with many workers costs little. Geometry is authored in metres; the caller parents
 * it to the head bone with a compensating scale (see `RiggedHuman.tsx`).
 */

const hat = {
  shell: { roughness: 0.34, metalness: 0.02 },
  dark: { color: "#2a2f35", roughness: 0.55, metalness: 0.1 },
  print: { color: "#f4f6f8", roughness: 0.5 },
} as const;

/** One material cache for every worker, so 100 workers share 6 materials. */
const materials = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, roughness = 0.5, metalness = 0.05, extra: THREE.MeshStandardMaterialParameters = {}) {
  const key = `${color}|${roughness}|${metalness}|${extra.transparent ? extra.opacity ?? 1 : "solid"}`;
  let found = materials.get(key);
  if (!found) {
    found = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    materials.set(key, found);
  }
  return found;
}
/** Glove/steel-tinted dark plastic used for rims, straps and vents. */
const darkPlastic = () => mat(hat.dark.color, hat.dark.roughness, hat.dark.metalness);

function useGeometry<T extends THREE.BufferGeometry>(factory: () => T, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

export interface GearOptions {
  /** Shell colour (hard hat or cap crown). */
  hatColor: string;
  /** Shirt colour, reused for cap panels so the outfit stays coherent. */
  shirtColor: string;
  glassesColor?: string;
}

export function HardHat({ hatColor }: { hatColor: string }) {
  const dome = useGeometry(() => new THREE.SphereGeometry(0.196, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const brim = useGeometry(() => new THREE.CylinderGeometry(0.206, 0.238, 0.014, 24, 1), []);
  const peak = useGeometry(() => new THREE.CylinderGeometry(0.2, 0.245, 0.013, 20, 1, false, Math.PI * 0.5 - 0.75, 1.5), []);
  const ridge = useGeometry(() => new THREE.TorusGeometry(0.108, 0.013, 6, 18, Math.PI), []);
  const vent = useGeometry(() => new THREE.BoxGeometry(0.052, 0.011, 0.024), []);
  const knob = useGeometry(() => new THREE.CylinderGeometry(0.036, 0.042, 0.026, 14), []);
  const strap = useGeometry(() => new THREE.TorusGeometry(0.135, 0.007, 5, 18), []);
  const shell = mat(hatColor, hat.shell.roughness, hat.shell.metalness);
  const trim = darkPlastic();
  return (
    <group userData={{ workerCosmetic: "hard-hat" }}>
      <mesh geometry={dome} material={shell} scale={[1, 0.94, 1.06]} castShadow />
      {/* Brim all round, with the characteristic wider front peak. */}
      <mesh geometry={brim} material={shell} position={[0, 0.004, 0]} scale={[1, 1, 1.06]} castShadow />
      <mesh geometry={peak} material={shell} position={[0, -0.001, 0.03]} rotation={[0.06, 0, 0]} scale={[1, 1, 1.14]} castShadow />
      {/* Raised centre ridge from front to back. */}
      <mesh geometry={ridge} material={shell} position={[0, 0.004, 0]} rotation={[0, Math.PI / 2, 0]} />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={vent} material={trim} position={[side * 0.155, 0.072, 0.01]} rotation={[0, side * 0.55, side * -0.3]} />
      ))}
      <mesh geometry={knob} material={trim} position={[0, -0.024, -0.185]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={strap} material={trim} position={[0, -0.1, 0.01]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

export function WorkerCap({ color, panel }: { color: string; panel: string }) {
  const crown = useGeometry(() => new THREE.SphereGeometry(0.192, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const band = useGeometry(() => new THREE.CylinderGeometry(0.193, 0.196, 0.032, 20, 1, true), []);
  const bill = useGeometry(() => new THREE.CylinderGeometry(0.2, 0.2, 0.016, 18, 1, false, 0, Math.PI), []);
  const button = useGeometry(() => new THREE.SphereGeometry(0.018, 10, 8), []);
  const shell = mat(color, 0.62, 0.02);
  return (
    <group userData={{ workerCosmetic: "cap" }}>
      <mesh geometry={crown} material={shell} scale={[1, 0.82, 1.04]} castShadow />
      <mesh geometry={band} material={mat(panel, 0.62, 0.02)} position={[0, 0.006, 0]} scale={[1.01, 1, 1.05]} />
      <mesh geometry={bill} material={shell} position={[0, 0.002, 0.055]} rotation={[-0.22, 0, 0]} scale={[1, 1, 1.25]} castShadow />
      <mesh geometry={button} material={mat(panel, 0.6, 0.02)} position={[0, 0.157, 0]} />
    </group>
  );
}

export function SafetyGlasses({ frame = "#20262c" }: { frame?: string }) {
  const lensBand = useGeometry(() => new THREE.CylinderGeometry(0.178, 0.178, 0.05, 20, 1, true, Math.PI * 0.5 - 0.78, 1.56), []);
  const rim = useGeometry(() => new THREE.BoxGeometry(0.115, 0.058, 0.012), []);
  const bridge = useGeometry(() => new THREE.BoxGeometry(0.036, 0.013, 0.012), []);
  const temple = useGeometry(() => new THREE.BoxGeometry(0.007, 0.013, 0.135), []);
  const tip = useGeometry(() => new THREE.BoxGeometry(0.008, 0.02, 0.028), []);
  const lens = mat("#cfe9f2", 0.06, 0.0, { transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false });
  const plastic = mat(frame, 0.45, 0.15);
  return (
    <group userData={{ workerCosmetic: "safety-glasses" }}>
      {/* Single wraparound lens. */}
      <mesh geometry={lensBand} material={lens} position={[0, 0, 0.028]} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.062, 0, 0.155]} rotation={[0, side * -0.22, 0]}>
          <mesh geometry={rim} material={plastic} castShadow />
        </group>
      ))}
      <mesh geometry={bridge} material={plastic} position={[0, 0.012, 0.172]} />
      {[-1, 1].map((side) => (
        <group key={`arm-${side}`} position={[side * 0.152, 0.004, 0.075]} rotation={[0, side * 0.14, 0]}>
          <mesh geometry={temple} material={plastic} />
          <mesh geometry={tip} material={plastic} position={[0, 0, -0.075]} />
        </group>
      ))}
    </group>
  );
}

export function EarDefenders({ color = "#2f3a44" }: { color?: string }) {
  const band = useGeometry(() => new THREE.TorusGeometry(0.198, 0.011, 6, 22, Math.PI), []);
  const cup = useGeometry(() => new THREE.CylinderGeometry(0.062, 0.058, 0.046, 16), []);
  const cushion = useGeometry(() => new THREE.TorusGeometry(0.05, 0.014, 7, 16), []);
  const yoke = useGeometry(() => new THREE.BoxGeometry(0.012, 0.075, 0.012), []);
  const shell = mat(color, 0.4, 0.2);
  const pad = mat("#14181c", 0.85, 0.02);
  return (
    <group userData={{ workerCosmetic: "ear-defenders" }}>
      <mesh geometry={band} material={shell} position={[0, 0.02, 0]} castShadow />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.185, -0.055, 0]}>
          <mesh geometry={yoke} material={shell} position={[0, 0.045, 0]} />
          <mesh geometry={cup} material={shell} rotation={[0, 0, Math.PI / 2]} castShadow />
          <mesh geometry={cushion} material={pad} rotation={[0, Math.PI / 2, 0]} position={[side * 0.022, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

export function CatEars({ color = "#4a3a2c" }: { color?: string }) {
  const outer = useGeometry(() => new THREE.ConeGeometry(0.058, 0.15, 12), []);
  const inner = useGeometry(() => new THREE.ConeGeometry(0.032, 0.095, 10), []);
  return (
    <group userData={{ workerCosmetic: "cat-ears" }}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.105, 0.135, 0]} rotation={[0, 0, side * -0.22]}>
          <mesh geometry={outer} material={mat(color, 0.85)} castShadow />
          <mesh geometry={inner} material={mat("#e7a9b4", 0.8)} position={[0, -0.012, 0.018]} />
        </group>
      ))}
    </group>
  );
}

export function Earrings() {
  const ring = useGeometry(() => new THREE.TorusGeometry(0.024, 0.005, 5, 12), []);
  const stud = useGeometry(() => new THREE.SphereGeometry(0.008, 8, 6), []);
  const gold = mat("#e9c34d", 0.28, 0.85);
  return (
    <group userData={{ workerCosmetic: "earrings" }}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.155, -0.045, 0.005]}>
          <mesh geometry={stud} material={gold} />
          <mesh geometry={ring} material={gold} position={[0, -0.028, 0]} />
        </group>
      ))}
    </group>
  );
}

/**
 * Full gear set for the rigged worker.
 *
 * Offsets are relative to the head-bone anchor: eye level is 0.155 above it and
 * `HAT_ANCHOR` (0.23) is the height of the brim, just above the ears. The mannequin reuses
 * the same offsets with its anchor at 1.53. Sizes are metres and match a head radius of
 * about 0.19, so the shell, brim, temples and cups hug the head instead of floating.
 */
export const HAT_ANCHOR = 0.23;

export function WorkerGear({ item, shirtColor, glasses }: { item: { props: Record<string, string | number | boolean> }; shirtColor: string; glasses: boolean }) {
  const hatKind = String(item.props.hat ?? "hardhat");
  // Hat colours are user-selectable in Appearance; the default is high-visibility yellow.
  const hatColor = String(item.props.hatColor ?? (hatKind === "cap" ? shirtColor : "#f7b51e"));
  const accessory = item.props.ears === true ? "ears" : item.props.headphones === true ? "defenders" : "none";
  return (
    <group userData={{ isWorkerAccessory: true }}>
      {hatKind === "hardhat" && <group position={[0, HAT_ANCHOR, 0]}><HardHat hatColor={hatColor} /></group>}
      {hatKind === "cap" && <group position={[0, HAT_ANCHOR - 0.005, 0]}><WorkerCap color={hatColor} panel={shirtColor} /></group>}
      {glasses && <group position={[0, 0.155, 0.005]}><SafetyGlasses /></group>}
      {accessory === "defenders" && <group position={[0, HAT_ANCHOR + 0.005, 0]}><EarDefenders color={hatColor === "#f7b51e" ? "#2f3a44" : hatColor} /></group>}
      {accessory === "ears" && <group position={[0, HAT_ANCHOR, 0]}><CatEars /></group>}
      {item.props.earrings === true && <group position={[0, 0.2, 0]}><Earrings /></group>}
    </group>
  );
}

/** Shared fabric material for the worker's shirt (mannequin fallback included). */
export function workerShirtMaterial(color: string) {
  return mat(color, 0.72, 0.02);
}
