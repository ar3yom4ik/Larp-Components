// Optional diagnostic: exercises real providers and CORS (not mocked) from
// an HTTP origin and a file:// origin. A provider outage must not break offline
// editor CI, so the workflow runs this separately and reports each result.
import { chromium } from 'playwright';
import { writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const base=(process.env.TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const report=[];
const temporary=process.cwd()+'/tests/artifacts/web-catalog-origin.html';
const announce=(origin,result)=>{
  console.log(`${origin} origin:`,JSON.stringify(result));
  if(process.env.GITHUB_ACTIONS)console.log(`::notice title=Live catalog ${origin} ${result.provider}::${JSON.stringify(result)}`);
  report.push({...result,origin});
};
try {
  await writeFile(temporary,'<!doctype html><title>Catalog origin diagnostic</title>');
  for(const [origin,url] of [['HTTP',base],['file',pathToFileURL(temporary).href]]){
    const page=await browser.newPage();
    await page.goto(url,{waitUntil:'load',timeout:120000});
    for(const provider of ['poly','gobkit','kenney']) {
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
          return {provider,ok:true,entries:assets.length,title:asset.name,thumbnail,meshes:imported.model.meshCount,bytes:imported.bytes,resources:imported.model.asset.files.length,modelUrl:asset.downloadUrl||null};
        }catch(error){return {provider,ok:false,error:String(error?.message||error)};}
      },{base,provider});
      announce(origin,result);
    }
    await page.close();
  }
} finally {await browser.close();await unlink(temporary).catch(()=>{});}
if(report.some(result=>!result.ok)) process.exitCode=1;
