import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});
 const result=await page.evaluate(async()=>{
   const {nearestPort}=await import('/src/utils/portSnap.ts');
   const parent=document.createElement('div');parent.style='position:fixed;left:300px;top:250px;z-index:9999999';document.body.append(parent);
   const add=(id,left,style='')=>{const e=document.createElement('button');e.dataset.id=id;e.style=`position:absolute;left:${left}px;top:0;width:10px;height:10px;${style}`;parent.append(e);return e;};
   const a=add('a',0),b=add('b',12),disabled=add('disabled',7,'pointer-events:none'),invisible=add('invisible',7,'visibility:hidden');
   const transparentParent=document.createElement('div');transparentParent.style='position:absolute;opacity:0';parent.append(transparentParent);
   const transparent=add('transparent',7);transparentParent.append(transparent);
   const elements=[a,b,disabled,invisible,transparent];
   const hit=(x,y)=>nearestPort(elements,x,y,26,e=>e.dataset.id);
   const overlap=hit(312,255)?.value,hidden=hit(310,255)?.value;
   // Actual rendered screen rectangles, not graph-space dimensions, determine
   // the snapping threshold under a CSS zoom transform.
   parent.style.transform='scale(.5)';parent.style.transformOrigin='0 0';
   const rect=a.getBoundingClientRect(),zoom=hit(rect.left-20,rect.top+rect.height/2);
   parent.remove();return {overlap,hidden,zoom:zoom?.value,zoomX:zoom?.x,center:rect.left+rect.width/2};
 });
 assert.equal(result.overlap,'b','nearest visible center wins over overlapping hidden/disabled ports');
 assert.equal(result.hidden,'a','invisible parents and pointer-disabled targets cannot win');
 assert.equal(result.zoom,'a','snap radius stays in screen pixels when zoomed out');
 assert.ok(Math.abs(result.zoomX-result.center)<.01,'zoomed preview targets the true screen center');
 console.log('port snap: zoom, overlapping candidates, hidden and disabled ports PASS');
} finally {await browser.close();}
