import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const graph={version:1,nodes:[
  {id:'f1',type:'part.feeder',x:40,y:40,params:{}},
  {id:'f2',type:'part.feeder',x:40,y:260,params:{}},
  {id:'belt',type:'part.conveyor',x:310,y:120,params:{}},
  {id:'robot',type:'part.robot',x:570,y:120,params:{}},
  {id:'pallet',type:'part.pallet',x:840,y:120,params:{}},
],links:[
  {id:'l1',from:{node:'f1',port:'out'},to:{node:'belt',port:'in'}},
  {id:'l2',from:{node:'f2',port:'out'},to:{node:'belt',port:'in'}},
  {id:'l3',from:{node:'belt',port:'out'},to:{node:'robot',port:'in'}},
  {id:'l4',from:{node:'robot',port:'out'},to:{node:'pallet',port:'in'}},
]};
try {
  for (const [name,url,offline] of [
    ['preview',process.env.TEST_URL||'http://127.0.0.1:4173',false],
    ['offline',pathToFileURL(process.cwd()+'/dist/index.html').href,true],
  ]) {
    const context=await browser.newContext({viewport:{width:1600,height:1000}});
    if (offline) await context.setOffline(true);
    await context.addInitScript(graph=>{
      localStorage.setItem('larp-factory-component-graph-v1',JSON.stringify(graph));
      localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}}));
    },graph);
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url,{waitUntil:'load',timeout:120000});
    await page.getByRole('button',{name:'AI Factory',exact:true}).first().click({timeout:60000});
    const dialog=page.getByRole('dialog',{name:'AI Factory'});
    await dialog.getByText('Valid graph',{exact:true}).waitFor();
    const detector=dialog.locator('[data-node-type="part.laser"]');
    assert.equal(await detector.count(),1,`${name}: legacy graph migrates a visible pickup sensor`);
    assert.equal(await detector.locator('[data-signal-row="1"]').count(),1,`${name}: sensor has numbered I/O`);
    const first=dialog.locator('[data-node="f1"]'),second=dialog.locator('[data-node="f2"]');
    await first.locator('div').first().click(); await second.locator('div').first().click({modifiers:['Shift']});
    await first.locator('div').first().click({button:'right'});
    await dialog.getByRole('menuitem',{name:'Group selected nodes'}).click();
    await dialog.getByLabel('Group name').fill('Offline intake');
    await dialog.getByLabel('Group color').fill('#728cba');
    await dialog.locator('[data-group-header]').click();
    await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')));
    assert.equal(saved.groups.length,2,`${name}: group paste`);
    assert.ok(saved.groups.every(group=>group.name==='Offline intake'&&group.color==='#728cba'));
    const fit=dialog.getByRole('button',{name:'Fit all nodes'}); await fit.hover();
    await page.locator('[data-button-tooltip]').waitFor({state:'visible',timeout:4000});
    assert.equal(await page.locator('[data-button-tooltip]').innerText(),'Fit all nodes');
    assert.deepEqual(errors,[],`${name}: no page errors`);
    await context.close();
    console.log(`${name}: groups, graph copy and button tooltip PASS`);
  }
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const url=process.env.TEST_URL||'http://127.0.0.1:4173';
  await page.setContent(`<iframe src="${url}" style="width:1200px;height:800px;border:0"></iframe>`);
  await page.frameLocator('iframe').locator('.larp-app').waitFor({timeout:120000});
  assert.deepEqual(errors,[]); await page.close();
  console.log('production preview iframe loads PASS');
} finally {await browser.close();}
