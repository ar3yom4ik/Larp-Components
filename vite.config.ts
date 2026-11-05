import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const multiplayerPort = Number(process.env.LARP_MULTIPLAYER_PORT || 4174);
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  // The Arena preview is served through an e2b.app hostname, not localhost.
  server: { host: '0.0.0.0', allowedHosts: true, proxy: { '/multiplayer': { target: `http://127.0.0.1:${multiplayerPort}`, ws: true } } },
  // The preview is also accessed through Arena's proxied hostname.
  preview: { host: '0.0.0.0', allowedHosts: true, proxy: { '/multiplayer': { target: `http://127.0.0.1:${multiplayerPort}`, ws: true } } },
  // Large packed CAD/worker assets are appended after Rollup to keep build memory low.
  build: { reportCompressedSize: false },
  plugins: [react(), tailwindcss(), viteSingleFile()],
  // Build identity shown in the settings footer and printed by Ctrl+Alt+J.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
