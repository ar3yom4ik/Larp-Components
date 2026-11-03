import assert from 'node:assert/strict';
import { filterWebAssets, gobkitModels, parseGobkit, parseThreeDAssets, threeDAssetsModels } from '../src/utils/webCatalog';

const free = {packs:[{id:'pack', name:'Nature', kind:'props', models:[
  {id:'tree', name:'Oak Tree', url:'https://gobkit.com/freebies/tree.glb', license:'CC0 1.0'},
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

const data = {page:2,total:7,totalPages:3,data:[
  {slug:'table',title:'Work Table',status:'published',license:{slug:'cc0-1.0'},url:'https://3dassets.dev/assets/table',cdnUrl:'https://cdn.3dassets.dev/assets/1/v1/model.glb',thumbnailUrl:'https://cdn.3dassets.dev/assets/1/v1/thumb.webp',category:{title:'Furniture'},tags:[{title:'factory'}],stats:{fileSize:123}},
  {slug:'evil',cdnUrl:'https://cdn.3dassets.dev.example.com/model.glb'},
  {slug:'restricted',cdnUrl:'https://cdn.3dassets.dev/a.glb',license:{slug:'cc-by'}},
  {slug:'unpublished',cdnUrl:'https://cdn.3dassets.dev/b.glb',status:'draft'},
]};
const parsed = parseThreeDAssets(data);
assert.equal(parsed.page,2); assert.equal(parsed.total,7); assert.equal(parsed.totalPages,3);
assert.deepEqual(parsed.assets.map(item=>item.name),['Work Table']);
assert.equal(parsed.assets[0].bytes,123);
assert.equal(filterWebAssets(parsed.assets, 'factory').length,1);

// Simulate network errors and cancellation; production calls the same module
// from the browser, with no external relay or credentials.
const originalFetch = globalThis.fetch;
try {
  const calls: string[] = [];
  globalThis.fetch = async input => {
    const url = String(input); calls.push(url);
    if (url.includes('/api/free')) return new Response(JSON.stringify(free), {status:200});
    if (url.includes('/api/community')) return new Response('down', {status:503});
    if (url.includes('/api/v1/assets')) return new Response(JSON.stringify(data), {status:200});
    throw new Error('unexpected');
  };
  const partial = await gobkitModels();
  assert.deepEqual(partial.map(item=>item.name), ['Oak Tree'], 'a working source remains usable when the other is down');
  await threeDAssetsModels('factory table',2);
  const requested = new URL(calls.find(url=>url.includes('/api/v1/assets'))!);
  assert.equal(requested.searchParams.get('q'),'factory table'); assert.equal(requested.searchParams.get('page'),'2');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(gobkitModels(controller.signal), error => (error as Error).name === 'AbortError');
} finally { globalThis.fetch = originalFetch; }
console.log('web catalog: matching, pagination, source/license filtering, bounded hosts, partial failure and abort OK');
