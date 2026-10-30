/**
 * Optional reproducibility utility, not needed to run/build the app.
 * Start `npm run dev` first; requires Playwright Chromium. Converts the bundled
 * CC0 source FBX and high-visibility palette to the compact animated GLB.
 */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {gunzipSync, gzipSync} from 'node:zlib';
const raw=gunzipSync(await fs.readFile('src/assets/cc0-source-worker.fbx.gz'));
const palette=await fs.readFile('src/assets/default-worker-texture.png');
const files={fbx:'data:application/octet-stream;base64,'+raw.toString('base64'),palette:'data:image/png;base64,'+palette.toString('base64')};
const b=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page=await b.newPage();
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
  const base64=await page.evaluate(async (source)=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {GLTFExporter}=await import('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
    const {loadModelAsset}=await import('/src/utils/modelImport.ts');
    const {root,clips}=await loadModelAsset({id:'bake-cc0',entry:'worker.fbx',files:[{path:'worker.fbx',dataUrl:source.fbx}]},{allowAnimationOnly:true});
    const texture=await new THREE.TextureLoader().loadAsync(source.palette);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;
    root.traverse(o=>{if(o.isMesh){
      // The CC0 source character is barefoot. Repoint skin-weighted foot UVs to
      // the dark palette band to make simple safety boots, preserving the rig.
      if(o.isSkinnedMesh){
        const g=o.geometry.clone(), indices=g.getAttribute('skinIndex'), weights=g.getAttribute('skinWeight'), uv=g.getAttribute('uv');
        if(indices&&weights&&uv){for(let i=0;i<uv.count;i++){let footWeight=0;for(let k=0;k<4;k++){const joint=o.skeleton.bones[indices.getComponent(i,k)]?.name || '';if(/(LeftFoot|RightFoot|LeftToe|RightToe)/i.test(joint))footWeight+=weights.getComponent(i,k);}if(footWeight>.5&&uv.getY(i)>.8)uv.setXY(i,.5,.75);}uv.needsUpdate=true;o.geometry=g;}
      }
      const old=o.material;const material=new THREE.MeshStandardMaterial({color:'#ffffff',map:texture,roughness:.75});material.name='Worker clothing';o.material=Array.isArray(old)?old.map(()=>material):material;
    }});
    const selected=clips.filter(c=>/\|(Idle|Walk|Working)$/i.test(c.name));
    if(selected.length!==3)throw new Error('Expected idle, walk and working CC0 clips');
    const glb=await new GLTFExporter().parseAsync(root,{binary:true,animations:selected,onlyVisible:false,trs:true});
    const arr=new Uint8Array(glb);let binary='';for(let i=0;i<arr.length;i+=32768)binary+=String.fromCharCode(...arr.subarray(i,i+32768));return btoa(binary);
  },files);
  const glb=Buffer.from(base64,'base64');await fs.writeFile('src/assets/default-worker.glb.gz',gzipSync(glb,{level:9,mtime:0}));
  console.log(`Rebuilt CC0 worker: ${glb.length} bytes GLB`);
} finally {await b.close();}
