import { build } from 'esbuild';
await build({ entryPoints: ['scripts/multiplayer/server.mjs'], outfile: 'dist/Larp_Multiplayer.cjs', bundle: true, platform: 'node', target: 'node20', format: 'cjs', minify: true, legalComments: 'inline' });
console.log('Built dist/Larp_Multiplayer.cjs');
