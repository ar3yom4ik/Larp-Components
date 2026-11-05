import { readFile, writeFile, readdir } from 'node:fs/promises';
import { zipSync } from 'fflate';
import { build } from 'esbuild';
await build({ entryPoints: ['scripts/multiplayer/server.mjs'], outfile: 'dist/Larp_Multiplayer.cjs', bundle:true, platform:'node', target:'node20', format:'cjs', minify:true, legalComments:'inline' });
const files = {
  'Larp_Factory_V3.html': await readFile('dist/index.html'),
  'Larp_Multiplayer.cjs': await readFile('dist/Larp_Multiplayer.cjs'),
  // Keep the Windows launcher CRLF even from an LF-only checkout.
  'Larp_Multiplayer.bat': new TextEncoder().encode((await readFile('release/multiplayer/Larp_Multiplayer.bat', 'utf8')).replace(/\r?\n/g, '\r\n')),
  'Larp_Multiplayer.sh': await readFile('release/multiplayer/Larp_Multiplayer.sh'),
  'README.txt': await readFile('release/multiplayer/README.txt'),
};
async function addNotices(folder) {
  for (const entry of await readdir(folder, {withFileTypes:true})) {
    const name = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await addNotices(name); else files[name] = await readFile(name);
  }
}
await addNotices('THIRD_PARTY_LICENSES');
await writeFile('dist/Larp_Multiplayer.zip', zipSync(files, { level: 6 }));
console.log('Built dist/Larp_Multiplayer.zip (standalone editor, LAN helper, launchers and instructions)');
