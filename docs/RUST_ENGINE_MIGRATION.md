# Rust engine migration: experimental hybrid

This migration is **not complete**. The shipping simulation remains the TypeScript
engine in `src/sim/engine.ts`; Three.js / React Three Fiber remain the renderer.
There are no Python files in this repository to port. User-authored robot scripts
execute as JavaScript and must continue working across any eventual engine boundary.

## Initial Rust/Wasm work

`rust/larp-kernel` contains point-to-segment and packed-scene collision kernels, using f64 to match
JavaScript Number semantics. `scripts/build-rust-kernel.mjs` compiles it for
`wasm32-unknown-unknown` and generates `src/sim/wasm/kernelBytes.ts`; the embedded
bytes can be bundled without a separate fetch. The navigation prototype is not used by the production navigation path. Regenerate with
`npm run build:rust` (Cargo and that Rust target required), and run native tests with
`npm run test:rust`. Ordinary app builds do not require a Rust toolchain.
`tests/rust-kernel.ts` instantiates the real generated Wasm in Node and compares
10,000 deterministic distance inputs and 20,000 scene queries with the JavaScript reference.

The production navigation path is deliberately still JavaScript. An exploratory
Node 22 microbenchmark here, two million scalar calls, measured approximately
10 ms for warmed JS versus 37 ms for warmed Wasm. This is not a browser benchmark,
but demonstrates why crossing the JS/Wasm boundary for each tiny calculation is a
poor integration strategy. Port a larger loop and pass data in batches, then benchmark
real plants and verify behavior before enabling it. A separate packed-scene test
(`tests/bench-rust-navigation.ts`, 100 barriers, 20 obstacles, 200,000 queries)
measured warmed JavaScript 86.6 ms and Wasm 337.9 ms on Node 22 in this sandbox,
not including packing. This is a microbenchmark, not an end-to-end browser result.
No overall speedup is claimed.

## Experimental feeder hybrid (alpha.2)

The default engine is still TypeScript. Open the app with `?rustFeeders=1` to opt
into batched Rust/Wasm feeder decisions. This is a hybrid, not a complete Rust
engine: the TypeScript host owns boxes, other simulation systems and rendering.
If initial Wasm loading fails the app retains the TypeScript feeder path. The
bridge copies state into reusable buffers on each step; no speedup is established.
The opt-in has not been validated in a browser in this environment.

`tests/rust-feeder-parity.ts` compares selected state on every frame of nine
60-second generated factory scenarios and further overlap, script/staff and
multi-cell cases, plus 2,000 randomized feeder cases. Both sides share the same
TypeScript systems except feeder decisions. These checks do not establish full
engine or universal project parity, or validate the browser and renderer.

## Experimental machine clock (alpha.3)

`?rustMachines=1` opts in to Rust/Wasm arithmetic for active machine cycle
clocks. This is only the clock calculation, **not a machine subsystem port**:
part selection, assembly, completion, product changes and all other simulation
logic are still implemented by TypeScript. It can be combined with
`?rustFeeders=1&rustMachines=1`. The host calls Wasm for each active machine,
so there is no performance claim. Browser behavior has not been validated.

`tests/rust-machine-clock.ts` compares numerical edge cases and actual CNC,
paint, inspection and assembly cycles. The generated-factory hybrid comparison
also enables the clock. The systems and observables not represented in these
tests remain unverified.

## Experimental automatic machine workflow (alpha.4)

`?rustMachineWorkflow=1` switches automatic machine input selection, assembly
selection and active-cycle transitions to Rust/Wasm. It can be combined with
`?rustFeeders=1`. Spatial-index candidate ordering, object references, product
catalogue lookup and completion field updates still live in the TypeScript host;
explicit robot/human `process` calls also remain TypeScript. When this workflow
is enabled it replaces the alpha.3 machine-clock path, even if both flags are set.
The default remains TypeScript. This is not a complete Rust engine, and the
per-machine buffer copies have not been performance-tested in a browser.

The hybrid tests compare selected fields for generated factories. Separate tests
exercise four machine kinds, rejected/claimed inputs, assembly, empty/missing
parts, and 500 randomized candidate scenes against the TypeScript reference.
They do not cover every project, browser, or subsystem.

## Constraints for remaining migration

- Preserve fixed-step simulation, pacing under load, saved projects, and all existing
  generated robot programs. Do not silently replace user JavaScript scripts; define a
  host-command/event bridge and test asynchronous program behavior.
- Transfer batches using explicit stable identifiers and typed buffers, not per-object
  per-frame calls. When Wasm memory grows, refresh JavaScript typed-array views.
- Browser `wasm32-unknown-unknown` is not a native operating-system process: filesystem
  and threading need browser APIs/appropriate workers, not native assumptions.
- Keep an offline-compatible build, runtime failure handling, and test old projects.
- Compare generated factories, simulation counters, navigation, worker behavior,
  rendered motion, memory and frame timing on real browsers and representative hardware.
  Numerical comparisons need explicit tolerances; use identical seeds and inputs.
- Research: Rust's [wasm32 target documentation](https://doc.rust-lang.org/beta/rustc/platform-support/wasm32-unknown-unknown.html)
  describes its platform and OS limitations; the [WebAssembly memory model guide](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Using_the_JavaScript_API)
  describes instantiation and linear memory access.

## Toolchain in this sandbox

The npm registry was reachable but the ordinary Rust distribution and crates.io were
not. A third-party Rust 1.86 distribution was used temporarily for the prototype;
it is not checked into the repository and its provenance has not been independently
verified. A trusted official Rust installation is preferable for release builds.
