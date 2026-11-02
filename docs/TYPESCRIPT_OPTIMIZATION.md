# TypeScript simulation optimization

The app continues to use the TypeScript simulation by default. No rendering,
visual-quality, simulation timestep, or product limit settings were reduced.

## What changed

A Node CPU profile of a generated three-lane, three-stage factory with six staff
and up to roughly 100 products indicated substantial time in product physics,
including repeated scans for blocked conveyors, spatial queries, and contact
checks. This is an investigative profile of one workload, not a browser profile.

For scenes with at least 48 products, conveyor blocking now uses reusable groups
of products by conveyor rather than scanning every product for each belt product.
The groups are updated as products change conveyors within the same step, and
stale entries still undergo the original state, support and ID checks. Smaller
scenes retain the original scan. Contact testing avoids temporary axis arrays.
Spatial query generations are shared across indexes, fixing a case where the
same object in two indexes could be omitted when their local stamps coincided.

## Checks and measurements

`npm run test:typescript-parity` runs the previous TypeScript engine and spatial
index from commit `a806f3b` against the current engine, checking selected state
on every frame with a `1e-8` relative tolerance for 90 simulated seconds in four
scenarios: a robot cell, a human cell, a three-lane plant, and 60 crowded products
on connected conveyors. This passed. It is not universal parity for all projects
or unobserved fields.

`npm run bench:typescript` interleaves before/after engines on identical inputs,
with three trials per scene, 20 simulated seconds of warm-up and 160 measured
seconds. The baseline engine and spatial index are loaded from Git in memory and
linked to the same current shared dependencies. On Node 22.22.3, Linux, Intel Xeon
@ 2.60 GHz, one run produced these medians of three total `Engine.step` times:

| Scenario | Before | After | Change |
| --- | ---: | ---: | ---: |
| Robot cell | 187.43 ms | 180.86 ms | 3.5% lower |
| Human cell | 329.91 ms | 331.98 ms | 0.6% higher |
| Three-lane plant | 1140.84 ms | 1030.44 ms | 9.7% lower |
| Crowded conveyors | 1444.35 ms | 1289.53 ms | 10.7% lower |

These are short, noisy, single-process CPU timings, not browser FPS, GPU,
rendering, memory, or real-device results. The timing excludes scene setup,
comparison, and microtask yields. Another run showed different small-scene
results; do not interpret these figures as guaranteed speedups. Browser and
large-user-project profiling remain important next steps.

## Subsequent audit (alpha.13)

The benchmark baseline can be selected without checking out another branch, for
example `TS_BENCH_BASELINE=73bbab3 npm run test:typescript-parity` or
`TS_BENCH_BASELINE=73bbab3 npm run bench:typescript`. The referenced Git commit
must be available locally. Only its engine and spatial index are loaded; all
other simulation dependencies are shared from the working tree. The default
remains the original `a806f3b` baseline.

A point-query specialization and reduced trigonometric calls were each evaluated
against alpha.12 and not retained: neither showed a consistent improvement in
the measured dense scenarios. The only simulation change in alpha.13 fixes stale
fence collision candidates for products above the collision height; it is not a
performance claim. Four-scenario selected-state parity against alpha.12 passed,
while a dedicated regression test verifies the intentional behavioral fix.
