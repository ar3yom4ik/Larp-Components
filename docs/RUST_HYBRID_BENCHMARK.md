# Rust hybrid: parity and performance against the pre-Rust engine

This is **not a completed Rust engine**. The benchmark compares three engines:

1. The `Engine` source from the last commit before Rust work, `2cc3bd61631b4dda8697cb61f982bdb5d939b30d` (V2.4).
2. The current TypeScript engine with experimental paths disabled.
3. The current TypeScript host with Rust feeder decisions, automatic machine workflow, automation signals, human A* route planning, robot kinematics and product integration enabled together.

The historical engine is loaded from Git in memory and linked to the current
shared simulation dependencies and identical generated scene objects. It is **not**
a build or benchmark of the complete historical application. Run from a checkout
that contains the historical commit:

```sh
npm ci
npm run bench:hybrid
```

## Results in this sandbox

Node 22.22.3, Linux, Intel Xeon @ 2.60 GHz. Each scene ran three times. Each
trial had 20 simulated seconds of warm-up followed by 60 simulated seconds
(3,600 fixed-step calls) of measurement. Calls were interleaved in rotating
order. The table shows the **median of three totals** for `Engine.step`, in ms;
it excludes initialization, yields, comparison, rendering, browser, GPU and UI.

| Scene | Items | Pre-Rust V2.4 engine | Current TypeScript | Rust hybrid | Hybrid vs pre-Rust |
| --- | ---: | ---: | ---: | ---: | ---: |
| Robot cell | 9 | 66.63 | 53.75 | 77.06 | 15.7% slower |
| Human cell | 12 | 112.82 | 100.22 | 131.09 | 16.2% slower |
| Two-line, three-stage plant | 38 | 192.54 | 183.72 | 238.25 | 23.7% slower |

These are short, noisy, single-process CPU measurements; JIT warm-up, GC,
co-scheduling, and engine ordering can affect them. They do not establish FPS,
memory use, browser performance, or behavior on other hardware. The hybrid was
slower in these measurements; no performance improvement is claimed. Experimental
paths remain opt-in.

For each run, selected state (time, counters, signals, feeders, boxes, machines,
robots and humans) was compared once per simulated second using `1e-8` relative
numerical tolerance. No mismatch was found in these nine trials against either
TypeScript engine. `tests/rust-combined-parity.ts` additionally compares the
current TypeScript engine and the full experimental hybrid **every frame** for
three 60-second scenarios using the same selected fields and tolerance. These
are limited scenarios and fields, not proof of full project or engine parity.
The A* route test found 5 different equal-cost routes in 500 random scenes, so
exact movement parity is already known not to hold universally.

Browser validation, representative large user projects, sustained high-speed
simulation, GPU/render behavior, memory profiling, and broader script and state
coverage remain necessary before any default switch or parity claim. The Rust
port also still lacks major parts of physics, human and robot behavior, and the
simulation orchestration itself.
