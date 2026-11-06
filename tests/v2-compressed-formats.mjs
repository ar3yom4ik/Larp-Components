import {chromium} from 'playwright';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
for (const url of ['http://127.0.0.1:4173/',pathToFileURL(process.cwd()+'/dist/index.html').href]){
 const p=await b.newPage({viewport:{width:1200,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await p.goto(url,{waitUntil:'load',timeout:120000});
 await p.getByRole('button',{name:'FILE',exact:true}).click();await p.getByRole('button',{name:/New factory/}).click();
 for(const [name,files] of [['Draco',['tests/fixtures/draco/Box.gltf','tests/fixtures/draco/Box.bin']],['KTX2',['tests/fixtures/ktx/FlightHelmet.gltf','tests/fixtures/ktx/FlightHelmet.bin','tests/fixtures/ktx/FlightHelmet_Materials_LensesMat_BaseColor.ktx2']]]){
  console.log('START',url,name); await p.getByRole('button',{name:'Import model',exact:true}).first().click();const modal=p.getByRole('dialog',{name:'Import 3D model'});await modal.getByLabel('Choose model files').setInputFiles(files);await modal.getByRole('button',{name:'Import model',exact:true}).click({timeout:60000,noWaitAfter:true});
  await modal.waitFor({state:'detached',timeout:90000}).catch(async()=>{console.log('ALERT',await modal.getByRole('alert').allTextContents());throw new Error(`${name} import failed`)});
  console.log('PASS',name,url);
 }
 console.log('ERRORS',JSON.stringify(errors));assert.equal(errors.length,0);await p.close();
}await b.close();
