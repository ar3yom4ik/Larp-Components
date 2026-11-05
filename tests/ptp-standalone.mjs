import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const graph={version:1,signalSchema:2,nodes:[{id:'robot',type:'part.robot',x:100,y:100,params:{ptpEnabled:true,ptpX:2,ptpPoints:JSON.stringify([{id:'offline-point',name:'Offline waypoint',position:[.8,1.2,.6],speed:80,dwell:.1}])}}],links:[]};
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const context=await browser.newContext({viewport:{width:1600,height:1000}});await context.setOffline(true);
 await context.addInitScript(graph=>{localStorage.setItem('larp-factory-component-graph-v1',JSON.stringify(graph));localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}}));},graph);
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(process.cwd()+'/dist/index.html').href,{waitUntil:'load',timeout:120000});
 await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'AI Factory'});
 await dialog.getByText('Valid graph',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
 await page.waitForFunction(()=>[...window.__larp.robots.values()].some(r=>r.ptp?.enabled&&r.cycles>=1),null,{timeout:30000});
 await page.getByTitle('PTP teaching').click();const panel=page.getByRole('dialog',{name:'PTP teaching'});
 await panel.getByRole('button',{name:/Select PTP point 1: Offline waypoint/}).click();await panel.getByRole('button',{name:'Edit point',exact:true}).click();
 await panel.getByLabel('PTP X',{exact:true}).fill('1.1');
 await page.waitForFunction(()=>window.__larp.items.some(i=>i.ptp?.points[0]?.position[0]===1.1));
 assert.deepEqual(errors,[]);await context.close();console.log('offline standalone: AI Factory PTP build, joint motion and teaching controls PASS');
} finally {await browser.close();}
