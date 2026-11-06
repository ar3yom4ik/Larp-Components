import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({args:['--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1700,height:1000}}), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('larp-appearance',JSON.stringify({graphicsRevision:4,graphics:'low',gfx:{shadows:false,contactShadows:false,ao:false,pixelRatio:.5}})));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:120000});
  await page.evaluate(()=>window.__larp.setRunning(false));
  await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();
  let dialog = page.getByRole('dialog',{name:'AI Factory'});
  await dialog.getByText('Valid graph',{exact:true}).waitFor();
  assert.equal(await dialog.locator('[data-node-type="part.laser"]').count(),2,'pickup lasers are visible nodes');
  await dialog.getByRole('button',{name:'Fit all nodes'}).click();
  const getGraph = () => page.evaluate(()=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')));
  const laser = dialog.locator('[data-node-type="part.laser"]').first();
  const laserId = await laser.getAttribute('data-node');
  const feeder = dialog.locator('[data-node-type="part.feeder"]').first();
  const feederId = await feeder.getAttribute('data-node');
  assert.equal(await laser.locator('[data-signal-row="1"]').count(),1);
  assert.equal(await laser.locator('[data-signal-row="2"]').count(),1,'wired sensor exposes the next numbered pair');
  assert.equal(await feeder.locator('[data-signal-row="1"]').count(),1);
  assert.equal(await feeder.locator('[data-signal-row="2"]').count(),0,'unwired component begins with one pair');

  // Node inspector settings control the exact wire seen in the graph.
  await laser.locator('div').first().click();
  const inspector = dialog.locator('.factory-studio-inspector');
  await inspector.getByLabel('Wire colour',{exact:true}).fill('#1256ab');
  await inspector.getByLabel('Beam range (m)',{exact:true}).fill('1.75');
  await inspector.getByLabel('Normally closed',{exact:true}).check();
  await laser.locator('[data-signal-row="2"] select').selectOption('clear');
  await inspector.getByLabel('Output colour 2',{exact:true}).fill('#00aa44');
  let graph = await getGraph();
  const sourceNode = graph.nodes.find(node=>node.id===laserId);
  assert.equal(sourceNode.params.wireColor,'#1256ab');
  assert.equal(sourceNode.params.autoRange,false);
  assert.equal(sourceNode.params.normallyClosed,true);
  assert.equal(sourceNode.io['2'].mode,'clear');
  assert.equal(sourceNode.io['2'].color,'#00aa44');
  const firstLink = graph.links.find(link=>link.from.node===laserId && link.from.port==='signal-out-1');
  assert.equal(await dialog.locator(`[data-link-visible="${firstLink.id}"]`).getAttribute('stroke'),'#1256ab');

  async function drag(from,to) {
    const a=await from.boundingBox(), b=await to.boundingBox(); assert.ok(a && b, 'ports must be visible');
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:18}); await page.mouse.up();
  }
  await drag(laser.locator('[data-output-port="signal-out-2"]'),feeder.locator('[data-input-port="signal-in-1"]'));
  await page.waitForFunction(({laserId,feederId})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links.some(link=>link.from.node===laserId && link.from.port==='signal-out-2' && link.to.node===feederId),{laserId,feederId});
  assert.equal(await laser.locator('[data-signal-row="3"]').count(),1,'using output 2 exposes pair 3');
  assert.equal(await feeder.locator('[data-signal-row="2"]').count(),1,'using input 1 exposes pair 2');
  graph = await getGraph();
  const secondLink = graph.links.find(link=>link.from.node===laserId && link.from.port==='signal-out-2' && link.to.node===feederId);
  assert.equal(await dialog.locator(`[data-link-visible="${secondLink.id}"]`).getAttribute('stroke'),'#00aa44');
  // The SVG endpoints remain attached to the centers of both dynamic port buttons.
  const coordinates = await dialog.locator(`[data-link-visible="${secondLink.id}"]`).evaluate(path=>{
    const matrix=path.getScreenCTM(), a=path.getPointAtLength(0).matrixTransform(matrix), b=path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
    return {a:{x:a.x,y:a.y},b:{x:b.x,y:b.y}};
  });
  const a=await laser.locator('[data-output-port="signal-out-2"]').boundingBox(), b=await feeder.locator('[data-input-port="signal-in-1"]').boundingBox();
  assert.ok(Math.hypot(coordinates.a.x-a.x-a.width/2,coordinates.a.y-a.y-a.height/2)<3,JSON.stringify({coordinates,a,b}));
  assert.ok(Math.hypot(coordinates.b.x-b.x-b.width/2,coordinates.b.y-b.y-b.height/2)<3,JSON.stringify({coordinates,a,b}));
  // Other triggers are real palette nodes, with their settings and independent
  // ports, rather than hidden scene objects.
  await dialog.getByRole('button',{name:'Add node',exact:true}).click();
  await dialog.getByLabel('Search parts').fill('push button');
  await dialog.locator('.factory-studio-palette').getByRole('button',{name:'Push button',exact:true}).click();
  const buttonNode=dialog.locator('[data-node-type="part.button"]');
  const buttonId=await buttonNode.getAttribute('data-node');
  await inspector.getByLabel('Initial signal',{exact:true}).check();
  await inspector.getByLabel('Active duration (s)',{exact:true}).fill('0.5');
  await inspector.getByLabel('Address',{exact:true}).fill('PB-42');
  await dialog.getByRole('button',{name:'Fit all nodes'}).click();
  await drag(buttonNode.locator('[data-output-port="signal-out-1"]'),feeder.locator('[data-input-port="signal-in-2"]'));
  assert.equal(await feeder.locator('[data-signal-row="3"]').count(),1);
  await dialog.getByRole('button',{name:'Add node',exact:true}).click();
  await dialog.getByLabel('Search parts').fill('plc');
  await dialog.locator('.factory-studio-palette').getByRole('button',{name:'PLC control',exact:true}).click();
  const plcNode=dialog.locator('[data-node-type="part.plc"]');
  const plcId=await plcNode.getAttribute('data-node');
  await plcNode.locator('[data-signal-row="1"] select').selectOption('invert');
  await dialog.getByRole('button',{name:'Fit all nodes'}).click();
  await drag(buttonNode.locator('[data-output-port="signal-out-2"]'),plcNode.locator('[data-input-port="signal-in-1"]'));
  await drag(plcNode.locator('[data-output-port="signal-out-1"]'),feeder.locator('[data-input-port="signal-in-3"]'));
  graph=await getGraph();
  assert.equal(graph.nodes.find(node=>node.id===buttonId).params.address,'PB-42');
  assert.equal(graph.nodes.find(node=>node.id===plcId).io['1'].mode,'invert');
  assert.ok(graph.links.some(link=>link.from.node===buttonId && link.to.node===plcId));
  await dialog.getByText('Valid graph',{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
  await page.waitForFunction(()=>window.__larpProject.getItems().some(item=>item.kind==='laser' && item.props.wireColor==='#1256ab'));
  const scene = await page.evaluate(()=>window.__larpProject.getItems());
  const sceneLaser = scene.find(item=>item.kind==='laser' && item.props.wireColor==='#1256ab');
  const sceneFeeder = scene.find(item=>item.kind==='feeder');
  const sceneButton=scene.find(item=>item.kind==='button'), scenePlc=scene.find(item=>item.kind==='plc');
  assert.ok(sceneButton && scenePlc);
  assert.equal(sceneButton.props.address,'PB-42');
  assert.equal(sceneButton.props.activeDuration,.5);
  assert.equal(sceneButton.props.signal,true);
  assert.equal(scenePlc.signalChannels.find(channel=>channel.port===1).mode,'invert');
  assert.ok(sceneButton.signalRoutes.some(route=>route.targetId===scenePlc.id));
  assert.equal(sceneLaser.props.range,1.75);
  assert.equal(sceneLaser.props.autoRange,false);
  assert.equal(sceneLaser.props.normallyClosed,true);
  assert.ok(sceneLaser.props.mountedTo);
  assert.deepEqual(sceneLaser.signalChannels.find(channel=>channel.port===2),{port:2,mode:'clear',color:'#00aa44'});
  assert.ok(sceneLaser.signalRoutes.some(route=>route.output===2 && route.targetId===sceneFeeder.id && route.input===1));
  await page.waitForFunction(({source,target})=>{let found=false;window.__larpRenderer.scene.traverse(object=>{if(object.userData?.signalWire && object.userData.sourceId===source && object.userData.targetId===target && object.userData.outputPort===2)found=true});return found;},{source:sceneLaser.id,target:sceneFeeder.id},{timeout:30000});
  const wireColour = await page.evaluate(({source,target})=>{let colour='';window.__larpRenderer.scene.traverse(object=>{if(object.userData?.signalWire && object.userData.sourceId===source && object.userData.targetId===target && object.userData.outputPort===2)colour=object.getObjectByName('signal-cable').material.color.getHexString()});return colour;},{source:sceneLaser.id,target:sceneFeeder.id});
  assert.equal(wireColour,'00aa44','3D wire uses the same per-output colour');
  await page.evaluate(id=>window.__larpProject.select(id),sceneLaser.id);
  await page.locator('[data-scene-signal-settings]').getByLabel('Output colour 2',{exact:true}).fill('#aa0088');
  await page.waitForFunction(({source,target})=>{let changed=false;window.__larpRenderer.scene.traverse(object=>{if(object.userData?.signalWire && object.userData.sourceId===source && object.userData.targetId===target && object.userData.outputPort===2)changed=object.getObjectByName('signal-cable').material.color.getHexString()==='aa0088'});return changed;},{source:sceneLaser.id,target:sceneFeeder.id});
  assert.equal(await page.evaluate(id=>window.__larpProject.getItems().find(item=>item.id===id).signalChannels.find(channel=>channel.port===2).color,sceneLaser.id),'#aa0088','scene per-output colour edit persists');
  const sceneRobot=scene.find(item=>item.program?.mode==='tend');
  await page.evaluate(id=>window.__larpProject.select(id),sceneRobot.id);
  await page.locator('[data-scene-signal-settings]').getByLabel('Signal function 1',{exact:true}).selectOption('moving');
  assert.equal(await page.getByLabel('Robot output',{exact:true}).inputValue(),'moving');
  assert.equal(await page.evaluate(id=>window.__larpProject.getItems().find(item=>item.id===id).props.outputMode,sceneRobot.id),'moving','channel 1 synchronizes the legacy robot OUT');
  await page.getByLabel('Robot output',{exact:true}).selectOption('operation-end');
  assert.equal(await page.locator('[data-scene-signal-settings]').getByLabel('Signal function 1',{exact:true}).inputValue(),'operation-end','legacy robot output synchronizes channel 1');
  // A detected opaque part energizes the selected clear/inverted output and
  // lights its corresponding cable, not merely the component's base output.
  await page.evaluate(({sensorId,beltId})=>{
    const sensor=window.__larp.items.find(item=>item.id===sensorId);
    window.__larp.conveyors.get(beltId).speed=0;
    window.__larp.spawn('billet',sensor.position[0],sensor.position[1]+.13,sensor.position[2]);
    window.__larp.setRunning(true);
  },{sensorId:sceneLaser.id,beltId:sceneLaser.props.mountedTo});
  await page.waitForFunction(({source,target})=>{let lit=false;window.__larpRenderer.scene.traverse(object=>{if(object.userData?.signalWire && object.userData.sourceId===source && object.userData.targetId===target && object.userData.outputPort===2)lit=object.getObjectByName('signal-cable').material.emissiveIntensity>1});return lit;},{source:sceneLaser.id,target:sceneFeeder.id},{timeout:30000});
  await page.evaluate(()=>window.__larp.setRunning(false));
  const projectText = await page.evaluate(()=>window.__larpProject.getText());
  assert.ok(projectText.includes('"signalChannels"') && projectText.includes('"signalRoutes"'));

  // A genuine new conveyor→robot gesture creates a proximity node, attaches it
  // to the correct source and wires both its IN and OUT automatically.
  const ids = await page.evaluate(async()=>{
    const {makeNode,connect}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');
    const f=makeNode('part.feeder',30,50), b=makeNode('part.conveyor',300,50), r=makeNode('part.robot',830,50,{detection:'proximity'}), p=makeNode('part.pallet',1100,50);
    let graph={version:1,signalSchema:1,nodes:[f,b,r,p],links:[]};
    for(const [from,to] of [[f,b],[r,p]]) {const result=connect(graph,{node:from.id,port:'out'},{node:to.id,port:'in'});if(!result.ok)throw Error(result.error);graph=result.graph;}
    replaceGraph(graph);return {f:f.id,b:b.id,r:r.id,p:p.id};
  });
  await page.reload({waitUntil:'networkidle'});
  await page.evaluate(()=>window.__larp.setRunning(false));
  await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();
  dialog = page.getByRole('dialog',{name:'AI Factory'});
  await dialog.getByRole('button',{name:'Fit all nodes'}).click();
  await drag(dialog.locator(`[data-node="${ids.b}"] [data-output-port="out"]`),dialog.locator(`[data-node="${ids.r}"] [data-input-port="in"]`));
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).nodes.some(node=>node.type==='part.sensor'));
  graph = await getGraph();
  const proximity = graph.nodes.find(node=>node.type==='part.sensor');
  assert.ok(proximity.params.automaticPickup);
  assert.ok(graph.links.some(link=>link.from.node===ids.b && link.to.node===proximity.id && link.to.port==='mount'));
  assert.ok(graph.links.some(link=>link.from.node===proximity.id && link.to.node===ids.r && link.from.port==='signal-out-1'));
  await dialog.getByText('Valid graph',{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Build factory',exact:true}).click();
  await page.waitForFunction(()=>window.__larpProject.getItems().some(item=>item.kind==='sensor'));
  const built = await page.evaluate(()=>window.__larpProject.getItems());
  const sensor = built.find(item=>item.kind==='sensor'), robot = built.find(item=>item.program);
  assert.equal(sensor.props.mountedTo,robot.program.sourceId);
  assert.ok(Number(sensor.props.mountPosition)>.8);
  assert.ok(sensor.signalRoutes.some(route=>route.targetId===robot.id));
  // A real pointer drag of a loose detector onto a material wire attaches
  // signal routes without breaking the material link or another robot input.
  const drop=await page.evaluate(async()=>{
    const {makeNode,connect}=await import('/src/gen/graph/graph.ts'),{replaceGraph}=await import('/src/gen/graphStore.ts');
    const belt=makeNode('part.conveyor',80,80),robot=makeNode('part.robot',650,80),detector=makeNode('part.sensor',200,390),button=makeNode('part.button',20,560);
    robot.params.detection='none';let graph={version:1,nodes:[belt,robot,detector,button],links:[]};
    let result=connect(graph,{node:belt.id,port:'out'},{node:robot.id,port:'in'});if(!result.ok)throw Error(result.error);graph=result.graph;
    const material=graph.links[0].id;result=connect(graph,{node:button.id,port:'signal-out-1'},{node:robot.id,port:'signal-in-1'});if(!result.ok)throw Error(result.error);graph=result.graph;
    replaceGraph(graph);return {belt:belt.id,robot:robot.id,detector:detector.id,button:button.id,material};
  });
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>window.__larp.setRunning(false));
  await page.getByRole('button',{name:'AI Factory',exact:true}).first().click();dialog=page.getByRole('dialog',{name:'AI Factory'});
  const materialPoint=await dialog.locator(`[data-link-id="${drop.material}"]`).evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()/2),m=path.getScreenCTM(),q=new DOMPoint(p.x,p.y).matrixTransform(m);return{x:q.x,y:q.y}});
  const detectorBox=await dialog.locator(`[data-node="${drop.detector}"]`).boundingBox();assert.ok(detectorBox);
  await page.mouse.move(detectorBox.x+35,detectorBox.y+12);await page.mouse.down();await page.mouse.move(materialPoint.x-25,materialPoint.y-12,{steps:18});await page.waitForTimeout(150);await page.mouse.up();
  await page.waitForFunction(({detector,robot})=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')).links.some(link=>link.from.node===detector&&link.to.node===robot&&link.to.port.startsWith('signal-in-')),drop);
  const dropped=await page.evaluate(()=>JSON.parse(localStorage.getItem('larp-factory-component-graph-v1')));
  assert.ok(dropped.links.some(link=>link.id===drop.material),'material wire remains intact');
  assert.ok(dropped.links.some(link=>link.from.node===drop.button&&link.to.node===drop.robot&&link.to.port==='signal-in-1'),'existing robot signal input remains intact');
  assert.ok(dropped.links.some(link=>link.from.node===drop.detector&&link.to.node===drop.robot&&link.to.port==='signal-in-2'),'detector uses the next available robot input');
  assert.deepEqual(errors,[]);
  console.log('factory signal nodes: editable sensors, numbered ports, colors, SVG/3D wires, feedback, pickup placement and detector drop PASS');
} finally {await browser.close();}
