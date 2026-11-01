# Rust engine migration: initial kernel

This migration is **not complete**. The shipping simulation remains the TypeScript
engine in `src/sim/engine.ts`; Three.js / React Three Fiber remain the renderer.
There are no Python files in this repository to port. User-authored robot scripts
execute as JavaScript and must continue working across any eventual engine boundary.

## Initial Rust/Wasm work

`rust/larp-kernel` contains point-to-segment and packed-scene collision kernels, using f64 to match
JavaScript Number semantics. `scripts/build-rust-kernel.mjs` compiles it for
`wasm32-unknown-unknown` and generates `src/sim/wasm/kernelBytes.ts`; the embedded
bytes can be bundled without a separate fetch. The prototype is not yet loaded by
the production app, so current offline behavior is unchanged. Regenerate with
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
