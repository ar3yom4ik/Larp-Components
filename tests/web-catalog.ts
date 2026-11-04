import assert from 'node:assert/strict';
import { filterWebAssets, gobkitModels, kenneyModels, parseGobkit, parseKenney } from '../src/utils/webCatalog';

const free = {packs:[{id:'pack', name:'Nature', kind:'props', models:[
  {id:'tree', name:'Oak Tree', url:'https://gobkit.com/freebies/tree.glb', license:'CC0 1.0 (public domain) — free for any use, commercial or personal, no attribution required.'},
  {id:'restricted', url:'https://gobkit.com/freebies/restricted.glb', license:'CC0 1.0 (public domain) — no commercial use'},
  {id:'duplicate', url:'https://gobkit.com/freebies/tree.glb'},
  {id:'evil', url:'https://example.com/model.glb'},
  {id:'local', url:'https://gobkit.com:8443/private.glb'},
  {id:'wrong-license', url:'https://gobkit.com/freebies/other.glb', license:'CC-BY'},
]}]};
const community = {items:[
  {slug:'creature',title:'Forest Dragon',status:'published',license:'cc0',download_available:true,creator:'Alice',model_url:'https://gobkit.com/api/community/file/creature/model',thumb_url:'https://gobkit.com/api/community/file/creature/thumb',page_url:'https://gobkit.com/s/creature'},
  {slug:'pending',status:'visible',model_url:'https://gobkit.com/api/community/file/pending/model'},
  {slug:'no-download',download_available:false,model_url:'https://gobkit.com/api/community/file/no-download/model'},
]};
const gobkit = parseGobkit(free, community);
assert.deepEqual(gobkit.map(item=>item.name), ['Oak Tree','Forest Dragon']);
assert.deepEqual(filterWebAssets(gobkit, 'forest alice').map(item=>item.name), ['Forest Dragon']);
assert.deepEqual(filterWebAssets(gobkit, 'nature oak').map(item=>item.name), ['Oak Tree']);
assert.equal(gobkit[1].thumbnail, community.items[0].thumb_url);

const data = {packs:[
  {id:'furniture',name:'Furniture Kit',author:'Kenney',license:'CC0-1.0',url:'https://kenney.nl/assets/furniture-kit',models:[
    {id:'furniture/table',name:'Work Table',file:'packs/furniture/table.glb',thumb:'packs/furniture/thumbs/table.webp',size:123},
    {id:'duplicate',name:'Duplicate',file:'packs/furniture/table.glb'},
    {id:'evil',file:'https://evil.example/model.glb'},
    {id:'traversal',file:'packs/furniture/../../secret.glb'},
    {id:'bad-thumb',name:'Safe model',file:'packs/furniture/safe.glb',thumb:'https://evil.example/steal.webp'},
  ]},
  {id:'restricted',author:'Kenney',license:'CC-BY',models:[{id:'restricted',file:'packs/furniture/restricted.glb'}]},
  {id:'other',author:'Other',license:'CC0-1.0',models:[{id:'other',file:'packs/furniture/other.glb'}]},
]};
const parsed = parseKenney(data);
assert.deepEqual(parsed.map(item=>item.name),['Work Table','Safe model']);
assert.equal(parsed[0].bytes,123);
assert.equal(parsed[0].downloadUrl,'https://hidencod.github.io/tge-assets/packs/furniture/table.glb');
assert.equal(parsed[0].thumbnail,'https://hidencod.github.io/tge-assets/packs/furniture/thumbs/table.webp');
assert.equal(parsed[0].url,'https://kenney.nl/assets/furniture-kit');
assert.equal(parsed[1].thumbnail,'');
assert.deepEqual(filterWebAssets(parsed, 'furniture table').map(item=>item.name),['Work Table']);

// Simulate network errors and cancellation; production calls the same module
// from the browser, with no external relay or credentials.
const originalFetch = globalThis.fetch;
try {
  const calls: string[] = [];
  globalThis.fetch = async input => {
    const url = String(input); calls.push(url);
    if (url.includes('/api/free')) return new Response(JSON.stringify(free), {status:200});
    if (url.includes('/api/community')) return new Response('down', {status:503});
    if (url.includes('/tge-assets/catalog.json')) return new Response(JSON.stringify(data), {status:200});
    throw new Error('unexpected');
  };
  let partialWarning='';
  const partial = await gobkitModels(undefined,message=>{partialWarning=message;});
  assert.match(partialWarning,/Part of the Gobkit/,'partial failures are visible and retryable');
  assert.deepEqual(partial.map(item=>item.name), ['Oak Tree'], 'a working source remains usable when the other is down');
  assert.deepEqual((await kenneyModels()).map(item=>item.name),['Work Table','Safe model']);
  assert.ok(calls.includes('https://hidencod.github.io/tge-assets/catalog.json'));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(gobkitModels(controller.signal), error => (error as Error).name === 'AbortError');
} finally { globalThis.fetch = originalFetch; }
console.log('web catalog: matching, source/license filtering, bounded hosts, partial failure and abort OK');
