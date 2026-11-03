// Optional live smoke test: providers are external services, so this diagnostic
// is not a deterministic CI gate. Run with the dev server already on 4173.
// It uses real browser CORS, real provider JSON and GLB bytes; no route mocks.
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1280,height:800}});
const report = [];
try {
  await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__larpRenderer,{timeout:60000});
  for (const provider of ['gobkit','3dassets']) {
    const result = await page.evaluate(async provider => {
      try {
        const api = await import('/src/utils/webCatalog.ts');
        const loader = await import('/src/utils/webCatalogImport.ts');
        const signal = AbortSignal.timeout(60000);
        const result = provider === 'gobkit' ? {assets:await api.gobkitModels(signal)} : await api.threeDAssetsModels('chair',1,signal);
        const asset = result.assets.find(item=>item.thumbnail) || result.assets[0];
        if (!asset) throw new Error('Provider returned no usable assets');
        let thumbnail = 'not supplied';
        if (asset.thumbnail) {
          const response = await fetch(asset.thumbnail,{signal,credentials:'omit'});
          if (!response.ok || !(await response.blob()).size) throw new Error(`Thumbnail HTTP ${response.status} or empty`);
          thumbnail = 'ok';
        }
        const imported = await loader.importWebModel(asset,{signal});
        if (!imported.model.meshCount || !imported.bytes) throw new Error('GLB imported without geometry');
        return {provider,ok:true,entries:result.assets.length,title:asset.name,thumbnail,meshes:imported.model.meshCount,bytes:imported.bytes,apiUrl:provider==='gobkit'?'https://gobkit.com/api/free':'https://3dassets.dev/api/v1/assets?q=chair&limit=1',modelUrl:asset.downloadUrl};
      } catch (error) { return {provider,ok:false,error:String(error?.message || error)}; }
    },provider);
    report.push(result); console.log('HTTP origin:',JSON.stringify(result));
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Live catalog HTTP ${provider}::${JSON.stringify(result)}`);
  }
  // Standalone HTML uses the opaque `file://` origin. Test actual CORS from
  // that origin as well as the normal hosted/dev origin.
  const file = join(tmpdir(),'larp-provider-cors.html'); await writeFile(file,'<!doctype html><title>Provider CORS test</title>');
  await page.goto(pathToFileURL(file).href);
  for (const previous of report.filter(result=>result.ok)) {
    const result = await page.evaluate(async ({provider,apiUrl,modelUrl}) => {
      try {
        const signal = AbortSignal.timeout(60000);
        for (const url of [apiUrl,modelUrl]) {
          const response = await fetch(url,{signal,credentials:'omit'});
          if (!response.ok || !(await response.arrayBuffer()).byteLength) throw new Error(`HTTP ${response.status} or empty: ${url}`);
        }
        return {provider,ok:true};
      } catch (error) { return {provider,ok:false,error:String(error?.message || error)}; }
    },previous);
    console.log('File origin:',JSON.stringify(result));
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Live catalog file ${result.provider}::${JSON.stringify(result)}`);
    report.push({...result,provider:`${result.provider}-file`});
  }
  if (report.some(result=>!result.ok) || report.length < 4) process.exitCode = 1;
} finally { await browser.close(); }
