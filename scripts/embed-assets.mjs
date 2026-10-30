import fs from 'node:fs/promises';
// The app remains one offline HTML file. Embed large packed binary data after
// Rollup has finished, avoiding a gigantic JS AST and very high peak memory.
const file='dist/index.html';
let html=await fs.readFile(file,'utf8');
const blobs=[['larp-packed-occt','src/assets/occt-import-js.wasm.gz'],['larp-packed-worker','src/assets/default-worker.glb.gz']];
for (const [id,path] of blobs) {
  const data=(await fs.readFile(path)).toString('base64');
  if (html.includes(`id="${id}"`)) throw new Error(`Duplicate embedded asset ${id}`);
  html=html.replace('</body>',`<script type="application/octet-stream" id="${id}">${data}</script>\n</body>`);
}
await fs.writeFile(file,html);
console.log(`Embedded offline CAD kernel and worker assets: ${(html.length/1e6).toFixed(1)} MB standalone HTML`);
