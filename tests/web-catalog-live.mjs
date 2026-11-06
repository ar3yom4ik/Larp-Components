// Optional diagnostic: exercise real providers and CORS from HTTP and from
// the actual standalone file:// app. A provider outage must not break offline
// editor CI, so the workflow reports these results separately. Set MOCK_WEB_CATALOG
// to exercise the standalone test itself without the network.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const base=(process.env.TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const mocked=!!process.env.MOCK_WEB_CATALOG;
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const report=[];
const announce=(origin,result)=>{
  console.log(`${origin} origin:`,JSON.stringify(result));
  if(process.env.GITHUB_ACTIONS)console.log(`::notice title=Live catalog ${origin} ${result.provider}::${JSON.stringify(result)}`);
  report.push({...result,origin});
};
async function mockProviders(page){
  const glb=await readFile(new URL('./fixtures/plane.glb',import.meta.url));
  const png=await readFile(new URL('./fixtures/red.png',import.meta.url));
  const headers={'access-control-allow-origin':'*'};
  await page.route(url=>['api.polyhaven.com','cdn.polyhaven.com','gobkit.com','hidencod.github.io'].includes(url.hostname),async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='api.polyhaven.com' && url.pathname==='/assets')return route.fulfill({json:{wooden_crate_01:{name:'Wooden Crate 01',thumbnail_url:'https://cdn.polyhaven.com/wood.png',categories:['crate']}},headers});
    if(url.hostname==='api.polyhaven.com' && url.pathname==='/files/wooden_crate_01')return route.fulfill({json:{glb:{'1k':{glb:{url:'https://cdn.polyhaven.com/wood.glb',size:glb.length}}}},headers});
    if(url.hostname==='gobkit.com' && url.pathname==='/api/free')return route.fulfill({json:{packs:[]},headers});
    if(url.hostname==='gobkit.com' && url.pathname==='/api/community')return route.fulfill({json:{items:[{slug:'dragon',title:'Fixture Dragon',creator:'Alice',status:'published',download_available:true,license:'cc0',model_url:'https://gobkit.com/api/community/file/dragon/model',thumb_url:'https://gobkit.com/api/community/file/dragon/thumb',page_url:'https://gobkit.com/s/dragon'}]},headers});
    if(url.hostname==='hidencod.github.io' && url.pathname==='/tge-assets/catalog.json')return route.fulfill({json:{packs:[{id:'prototype',name:'Prototype Kit',author:'Kenney',license:'CC0-1.0',url:'https://kenney.nl/assets/prototype-kit',models:[{id:'prototype/bison',name:'Animal bison',file:'packs/prototype/bison.glb',thumb:'packs/prototype/thumbs/bison.webp',size:glb.length}]}]},headers});
    if(url.pathname.endsWith('.glb')||url.pathname.endsWith('/model'))return route.fulfill({body:glb,contentType:'model/gltf-binary',headers});
    return route.fulfill({body:png,contentType:'image/png',headers});
  });
}
try {
  if(!mocked){
    const page=await browser.newPage();
    await page.goto(base,{waitUntil:'load',timeout:120000});
    for(const provider of ['poly','gobkit','kenney']){
      const result=await page.evaluate(async ({base,provider})=>{
        try {
          const signal=AbortSignal.timeout(90000);
          const catalog=await import(`${base}/src/utils/webCatalog.ts`);
          const loader=await import(`${base}/src/utils/webCatalogImport.ts`);
          const poly=await import(`${base}/src/utils/polyhaven.ts`);
          const polyLoader=await import(`${base}/src/utils/polyhavenImport.ts`);
          const assets=provider==='poly' ? await poly.polyHavenModels(signal) : provider==='gobkit' ? await catalog.gobkitModels(signal) : await catalog.kenneyModels(signal);
          const asset=provider==='poly' ? assets.find(item=>item.id==='wooden_crate_01')||assets[0] : assets.find(item=>item.thumbnail)||assets[0];
          if(!asset) throw new Error('No usable models in the live catalogue');
          let thumbnail='none';
          if(asset.thumbnail){const thumb=await fetch(asset.thumbnail,{signal});if(!thumb.ok)throw new Error(`Thumbnail returned ${thumb.status}`);const bytes=await thumb.arrayBuffer();if(!bytes.byteLength)throw new Error('Empty thumbnail');thumbnail=`ok (${bytes.byteLength} bytes)`;}
          const imported=provider==='poly' ? await polyLoader.importPolyHavenModel(asset,'1k',{signal}) : await loader.importWebModel(asset,{signal});
          if(!imported.model.asset.files.length || !imported.model.asset.files[0].dataUrl.startsWith('data:')) throw new Error('Model was not embedded');
          if(imported.model.meshCount<1) throw new Error('Downloaded model has no meshes');
          return {provider,ok:true,entries:assets.length,title:asset.name,thumbnail,meshes:imported.model.meshCount,bytes:imported.bytes,resources:imported.model.asset.files.length};
        }catch(error){return {provider,ok:false,error:String(error?.message||error)};}
      },{base,provider});
      announce('HTTP',result);
    }
    await page.close();
  }
  // No remote module import and no special browser flags: this is the same
  // self-contained HTML users download. Exercise the real catalog UI and
  // export the project to verify the imported bytes and provenance.
  const page=await browser.newPage({viewport:{width:1500,height:900},acceptDownloads:true});
  if(mocked)await mockProviders(page);
  await page.addInitScript(()=>{try{localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}}));}catch{}});
  await page.goto(pathToFileURL(process.cwd()+'/dist/index.html').href,{waitUntil:'load',timeout:120000});
  await page.getByRole('button',{name:'FILE',exact:true}).click();
  await page.getByRole('button',{name:/New factory/}).click();
  for(const config of [
    {provider:'poly',button:'Poly Haven',heading:'Poly Haven',query:'wooden crate 01',source:'Poly Haven'},
    {provider:'gobkit',button:'Gobkit',heading:'Gobkit',query:'community',source:'Gobkit'},
    {provider:'kenney',button:'Kenney (mirror)',heading:'Kenney (mirror)',query:'animal bison',source:'Kenney'},
  ]){
    try{
      await page.getByRole('button',{name:'Web',exact:true}).click();
      await page.getByRole('button',{name:config.button,exact:true}).click();
      await page.getByPlaceholder('Search web models...').fill(config.query);
      const section=page.locator('section').filter({has:page.locator('b').filter({hasText:config.heading})}).first();
      const card=section.locator('button[title]').first();
      await card.waitFor({state:'visible',timeout:90000});
      await card.scrollIntoViewIfNeeded();
      const name=(await card.innerText()).split('\n')[0].trim();
      const image=card.locator('img');
      await image.waitFor({state:'visible',timeout:30000});
      await page.waitForFunction(img=>img.complete&&img.naturalWidth>0,await image.elementHandle(),{timeout:30000});
      await card.click();
      await page.getByText(`${name} imported`,{exact:false}).first().waitFor({timeout:90000});
      await page.getByRole('button',{name:'Components',exact:true}).click();
      await page.getByRole('button',{name:`Edit catalog model: ${name}`,exact:true}).click();
      const editor=page.getByRole('dialog',{name:'Edit catalog model'});
      await editor.getByRole('link',{name:`${config.source} · ${name}`,exact:true}).waitFor({timeout:30000});
      await editor.getByRole('button',{name:'Close',exact:true}).click();
      announce('file',{provider:config.provider,ok:true,title:name,thumbnail:'decoded',import:'catalog and provenance visible'});
    }catch(error){
      const alerts=await page.getByRole('alert').allTextContents().catch(()=>[]);
      announce('file',{provider:config.provider,ok:false,error:String(error?.message||error).split('\n')[0],alerts});
      const editor=page.getByRole('dialog',{name:'Edit catalog model'});
      if(await editor.count())await editor.getByRole('button',{name:'Close',exact:true}).click();
    }
  }
  try{
    await page.getByRole('button',{name:'FILE',exact:true}).click();
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export copy (.txt)',exact:true}).click();
    const text=await readFile(await (await pending).path(),'utf8');
    const project=JSON.parse(text.slice(text.indexOf('\n')+1));
    const assets=(project.assets||[]).filter(asset=>asset.source);
    const expected=report.filter(result=>result.origin==='file'&&result.ok).map(result=>({poly:'Poly Haven',gobkit:'Gobkit',kenney:'Kenney'})[result.provider]);
    for(const provider of expected)if(!assets.some(asset=>asset.source.provider===provider&&asset.files.length&&asset.files.every(file=>file.dataUrl.startsWith('data:'))))throw new Error(`Missing embedded ${provider} asset`);
    if(!expected.length)throw new Error('No provider imports to validate');
    announce('file',{provider:'project',ok:true,providers:expected,embeddedAssets:assets.length});
  }catch(error){announce('file',{provider:'project',ok:false,error:String(error?.message||error).split('\n')[0]});}
  await page.close();
} finally {await browser.close();}
if(report.some(result=>!result.ok)) process.exitCode=1;
