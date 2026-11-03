import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1300,height:850}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error' && /shader|program|webgl/i.test(message.text()))errors.push(message.text());});
  await page.addInitScript(()=>localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,pixelRatio:1}})));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.__larp && window.__larpRenderer && window.__larpTheme);

  // Switch the actual settings cards, not an unrelated development module.
  await page.getByRole('button',{name:'Colours and layout'}).click();
  const yellow=page.locator('[data-skin-preview="vc"]'),red=page.locator('[data-skin-preview="rpro"]');
  assert.match(await yellow.innerText(),/Classic yellow/);assert.match(await red.innerText(),/Classic red/);
  await red.click();await page.waitForFunction(()=>document.documentElement.dataset.skin==='rpro');
  const colors=await page.evaluate(()=>({panel:getComputedStyle(document.querySelector('.app-panel')).backgroundColor,text:getComputedStyle(document.querySelector('.app-panel-head')).color,status:getComputedStyle(document.querySelector('.app-status')).backgroundColor}));
  assert.match(colors.panel,/rgb\(255, 255, 255\)/,'Classic red uses light panels');
  assert.match(colors.text,/rgb\((?:[0-9]|[1-9][0-9]),/,'Classic red has dark panel text');
  assert.match(colors.status,/rgb\(169, 30, 43\)/,'Classic red has a red status bar');
  await yellow.click();await page.waitForFunction(()=>document.documentElement.dataset.skin==='vc');
  assert.match(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--app-accent')),/#f5a623/i);
  await red.click();await page.waitForFunction(()=>document.documentElement.dataset.skin==='rpro');
  await page.keyboard.press('Escape');

  // A visible carton is rotated to the real slope normal, not merely moved up.
  const beltId=await page.evaluate(async()=>{
    const {makeItem}=await import('/src/data/library.ts');const belt=makeItem('conveyor',[0,0,0],0,{points:[[-4,0],[-2,0],[0,0],[2,0],[4,0]],pointHeights:[0,0,1,2,2],props:{speed:.8,active:true}});window.__larpProject.setItems([belt]);return belt.id;
  });
  await page.waitForFunction(id=>window.__larp.conveyors.has(id),beltId);
  const normal=await page.evaluate(()=>{const e=window.__larp;e.reset();const belt=[...e.conveyors.values()][0],q=belt.query(-2.5,0);const part=e.spawn('carton',-2.5,q.y+.4,0);e.setRunning(true);for(let i=0;i<300;i++){e.step(1/60);if(part.beltNormal?.[1]<.97)break;}e.setRunning(false);return part.beltNormal;});
  assert.ok(normal && normal[1]<.97,'carton reached the sloped surface');
  await page.waitForFunction(()=>{let found=false;window.__larpRenderer.scene.traverse(o=>{if(o.isInstancedMesh&&o.count===1)found=true});return found},{timeout:30000});
  await page.waitForTimeout(700);
  const orientation=await page.evaluate(async()=>{const T=await import('/node_modules/three/build/three.module.js');let inst;window.__larpRenderer.scene.traverse(o=>{if(o.isInstancedMesh&&o.count===1)inst=o;});const matrix=new T.Matrix4(),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3();inst.getMatrixAt(0,matrix);matrix.decompose(position,quaternion,scale);return new T.Vector3(0,1,0).applyQuaternion(quaternion).toArray();});
  assert.ok(orientation.every((v,i)=>Math.abs(v-normal[i])<.02),`rendered up vector ${orientation} follows ${normal}`);

  // Compare actual canvas pixels with bloom disabled and enabled around a
  // high-intensity red emitter. This also catches shader or composer failures.
  await page.evaluate(async()=>{
    window.__larpProject.setItems([]);window.__larp.reset();window.__larpTheme.setBuilding({floorColor:'#000000'});
    window.__larpTheme.setGfx({ambient:0,sun:0,fill:0,env:0,shadows:false,fog:false,grid:false,bloom:false,useSkinBackground:false,background:'#000000',toneMapping:'none',pixelRatio:1});
    const T=await import('/node_modules/three/build/three.module.js');const mesh=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color:0x000000,emissive:0xff0000,emissiveIntensity:5}));mesh.position.y=1;mesh.name='bloom-probe';window.__larpRenderer.scene.add(mesh);
  });
  await page.waitForTimeout(2000);const without=await page.locator('canvas').first().screenshot();
  await page.evaluate(()=>window.__larpTheme.setGfx({bloom:true,bloomStrength:2}));await page.waitForTimeout(3000);
  const withBloom=await page.locator('canvas').first().screenshot();
  const diff=await page.evaluate(async([a,b])=>{
    const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='data:image/png;base64,'+src;});
    const [first,second]=await Promise.all([load(a),load(b)]),c=document.createElement('canvas');c.width=first.width;c.height=first.height;
    const context=c.getContext('2d');context.drawImage(first,0,0);const x=context.getImageData(0,0,c.width,c.height).data;context.clearRect(0,0,c.width,c.height);context.drawImage(second,0,0);const y=context.getImageData(0,0,c.width,c.height).data;
    let brightened=0;for(let i=0;i<x.length;i+=4)if(y[i]>x[i]+5)brightened++;return brightened;
  },[without.toString('base64'),withBloom.toString('base64')]);
  assert.ok(diff>1000,`bloom brightens pixels around the emissive object (${diff})`);
  assert.deepEqual(errors,[]);
  console.log('render/theme: Classic red/yellow switching, sloped-product orientation and emissive bloom pixels PASS');
} finally {await browser.close();}
