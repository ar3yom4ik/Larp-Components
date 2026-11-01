// Runs the browser-free simulation and navigation regression tests.
// Each test file is bundled with esbuild (they use top-level await) and executed with Node.
// Browser/E2E tests live in tests/*.mjs and need Playwright + a running dev server; see README.md.
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const tests = ["simulation", "v1-regression", "v1-navigation", "v2-project-size", "settings", "ui-layout", "floor-plan-and-shirt", "ui-render", "performance", "speed-multiplier", "rust-kernel", "rust-feeder-parity", "rust-machine-clock", "rust-machine-workflow", "rust-logic", "rust-navigation-route", "rust-robot-kinematics", "rust-product-integration", "rust-combined-parity", "component-graph", "v3-graphics", "v4-nodegraph"];
const outDir = await mkdtemp(path.join(tmpdir(), "larp-unit-"));
let failed = 0;

try {
  for (const name of tests) {
    const outfile = path.join(outDir, `${name}.mjs`);
    await build({
      entryPoints: [path.join(root, "tests", `${name}.ts`)],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile,
      logLevel: "warning",
      define: {
        "import.meta.env": "{}",
        __APP_VERSION__: JSON.stringify(pkg.version),
        __BUILD_TIME__: JSON.stringify("2026-10-31T00:00:00.000Z"),
      },
    });
    const run = spawnSync(process.execPath, [outfile], { stdio: "inherit", cwd: root });
    const ok = run.status === 0;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
    if (!ok) failed += 1;
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failed > 0) {
  console.error(`${failed} unit test file(s) failed`);
  process.exit(1);
}
console.log(`All ${tests.length} unit test files passed`);
