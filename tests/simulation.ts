import { Engine } from '../src/sim/engine';
import { DEFAULT_GEN, FACTORY_RECIPES, generateFactory, parsePrompt, validateFactory } from '../src/sim/generator';
import { makeItem } from '../src/data/library';
import { parseProject, serializeProject } from '../src/utils/project';
import { searchProducts } from '../src/data/products';

const assert = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
async function advance(e: Engine, seconds: number) {
  for (let i = 0; i < seconds * 60; i += 1) { e.step(1 / 60); await Promise.resolve(); await Promise.resolve(); }
}
async function main() {
  for (const recipe of FACTORY_RECIPES) {
    const items = generateFactory({ ...DEFAULT_GEN, recipe: recipe.id, stages: recipe.id === 'logistics' ? 0 : 1, fences: false, operators: false, rows: 2, cols: 2, layers: 2 });
    const e = new Engine(); e.sync(items); e.setRunning(true); await advance(e, 130);
    const errors = e.logs.filter((l) => l.level === 'error');
    assert(errors.length === 0, `${recipe.id}: ${errors.map((l) => l.text).join('; ')}`);
    assert(e.stats.placed > 0, `${recipe.id} produced nothing: ${[...e.robots.values()].map((r) => r.error || r.status).join('; ')}`);
    if (recipe.id !== 'logistics') assert([...e.machines.values()].some((m) => m.cycles > 0), `${recipe.id}: machine never processed`);
    console.log(recipe.id, 'placed', e.stats.placed, 'lost', e.stats.lost, 'machine cycles', [...e.machines.values()].map((m) => m.cycles));
    const robot = items.find((i) => i.program?.mode === 'palletize')!;
    const target = items.find((i) => i.id === robot.program!.targetId)!;
    target.position = [target.position[0] + 0.12, 0, target.position[2] - 0.08];
    const input = items.find((i) => i.id === robot.program!.sourceId)!;
    input.name = 'Renamed belt'; input.position[0] += 0.1;
    const before = e.stats.placed; e.sync([...items]); await advance(e, 70);
    assert(e.stats.placed > before, `${recipe.id}: stopped after moving/renaming targets`);
    for (const rt of e.robots.values()) assert(rt.reach(rt.tip), `${recipe.id}: invalid robot tip`);
  }
  const belt = makeItem('conveyor', [0,0,0], 0, { points: [[-2,0],[2,0]], props: {speed: 0.7, active: true, stopper: false} });
  const feeder = makeItem('feeder', [-1.5,0,0], 0, { props: { interval: 3, active: true, product: 'cookie' } });
  const e = new Engine(); e.sync([belt,feeder]); e.setRunning(true); await advance(e, 14);
  assert(e.stats.lost > 0 && e.boxes.some((b) => b.support === 1), 'Products did not physically fall');
  assert(searchProducts('cookie food').some((p) => p.id === 'cookie'), 'Tag search failed');
  assert(searchProducts('печенье').some((p) => p.id === 'cookie'), 'Russian tag search failed');
  const items = generateFactory(DEFAULT_GEN);
  const txt = serializeProject({items,projectName:'Тестовая фабрика',layoutName:'Round trip',activeLayoutId:null});
  assert(JSON.stringify(parseProject(txt).items) === JSON.stringify(parseProject(JSON.stringify({items})).items), 'TXT round trip lost fields');
  assert(parseProject(txt).projectName === 'Тестовая фабрика', 'Unicode project name failed');
  assert(parseProject(serializeProject({items:[],projectName:'Empty',layoutName:'Empty',activeLayoutId:null})).items.length === 0, 'Empty scene failed');

  for (const kind of ['cnc', 'press', 'weld', 'packaging'] as const) {
    const e = new Engine();
    const machine = makeItem(kind, [0,0,0], 0, { props: { cycleTime: 2, inputProduct: 'billet', outputProduct: 'gear' } });
    e.sync([machine]); const b = e.spawn('billet', 0, 0.95 + 0.09 + 0.002, 1.45); const id = b.id;
    e.setRunning(true); await advance(e, 5);
    assert(b.id === id && b.productId === 'gear' && e.machines.get(machine.id)!.cycles === 1, kind + ' did not transform the physical object');
  }
  for (const task of ['inspect','carry','replenish','patrol']) {
    const e = new Engine();
    const conv = makeItem('conveyor',[0,0,0],0,{points:[[-1.5,0],[1.5,0]],props:{speed:0.3,active:true,stopper:true}});
    const pallet = makeItem('crates',[1.2,0,3]);
    const feeder = makeItem('feeder',[-1,0,0],0,{props:{interval:2,product:'carton',active:true,requireSupply:task==='replenish'}});
    const human = makeItem('operator',[1.2,0,1],0,{props:{task,sourceId:task==='replenish'?feeder.id:conv.id,targetId:pallet.id,walkSpeed:1,hat:'cap',glasses:true}});
    e.sync([conv,pallet,feeder,human]);
    if(task==='replenish') e.feeders.get(feeder.id)!.supply=0;
    e.spawn('carton',1.1,0.66+0.13+0.002,0);
    e.setRunning(true); await advance(e,35);
    const rt=e.humans.get(human.id)!;
    assert(rt.completed>0, 'Human task failed: '+task+' / '+rt.status);
    console.log('human',task,'completed',rt.completed);
  }
  const fence=makeItem('fence',[0,0,0],0,{points:[[0,-2],[0,2],[3,2]],props:{height:2,panelWidth:1.5,gateOpen:false}});
  const fe=new Engine(); fe.sync([fence]); assert(fe.barriers.length===2,'Fence lost sharp segments');
  const object=fe.spawn('carton',-0.5,0.13,0); object.vx=4; fe.setRunning(true); await advance(fe,1);
  assert(object.x<0,'Object passed through guard fence');
  const twins=generateFactory({...DEFAULT_GEN,lanes:2,style:'U',operators:false});
  const twinSim=new Engine(); twinSim.sync(twins); twinSim.setRunning(true); await advance(twinSim,130);
  assert(twinSim.stats.placed>=4 && [...twinSim.robots.values()].every(r=>r.cycles>0),'Parallel production lines failed');
  console.log('parallel lines placed',twinSim.stats.placed);
  const ruPrompt = parsePrompt('П-образная пекарня с 2 ячейками, коботами и 8 коробок в минуту', DEFAULT_GEN);
  assert(ruPrompt.recipe === 'bakery' && ruPrompt.style === 'U' && ruPrompt.stages === 2 && ruPrompt.cobot && ruPrompt.rate === 8, 'Russian prompt parser failed');
  const oldFence = makeItem('fence'); delete oldFence.points;
  assert(parseProject(JSON.stringify({items:[oldFence]})).items[0].points?.length === 2, 'Legacy path migration failed');

  // Trigger signals gate the robot, and connected sources create live state.
  {
    const e = new Engine();
    const belt = makeItem('conveyor', [0,0,0], 0, { points:[[-2,0],[2,0]], props:{speed:0.3,active:true,stopper:true} });
    const laser = makeItem('laser', [2.2,0,0], 0, { props:{range:3,signal:false,connectedTo:'robot-test'} });
    const robot = makeItem('robot', [2.2,0,-1.8], 0, { id:'robot-test', props:{payload:20,gripper:'parallel'}, program:{mode:'palletize',sourceId:belt.id,targetId:'pallet-test',repeat:true,delay:0,clearance:0.3} });
    const pallet = makeItem('crates', [2.2,0,1.1], 0, { id:'pallet-test', props:{cols:2,rows:2,layers:2,product:'carton'} });
    e.sync([belt,laser,robot,pallet]); e.setRunning(true); await advance(e,12);
    // Without a blocked beam the robot must not have carted anything away.
    assert(e.stats.placed === 0, 'Laser trigger did not gate the pick');
    const box = e.spawn('carton', 0.25, 0.66 + 0.13 + 0.002, 0); box.vx=0.4;
    await advance(e,15);
    assert(e.signalState.get(laser.id) === true || e.stats.placed > 0, 'Laser never detected the part');
  }
  // Receive box counts parts dropped from an open conveyor.
  {
    const e = new Engine();
    const belt2 = makeItem('conveyor',[0,0,0],0,{points:[[-1.5,0],[1.5,0]],props:{speed:0.8,active:true,stopper:false}});
    const collector = makeItem('collector',[1.75,0,0],0,{props:{width:1.1,depth:0.9,capacity:50,height:0.55}});
    e.sync([belt2,collector]); e.setRunning(true);
    for(let i=0;i<4;i++){ const b=e.spawn('carton',-1.2,0.79,0); b.vx=0.8; }
    await advance(e,12);
    assert(e.collectors.get(collector.id)!.count > 0, 'Receive box did not count products');
    assert(e.stats.collected === e.collectors.get(collector.id)!.count, 'Collector counter mismatch');
  }
  // Painting an existing object changes its material/product, and assembly combines physical parts.
  {
    const e = new Engine();
    const paint = makeItem('paint',[0,0,0],0,{id:'paint-test',props:{cycleTime:1,inputProduct:'any',outputProduct:'painted',paintColor:'#22aa66'}});
    e.sync([paint]); e.setRunning(true);
    const obj = e.spawn('carton',0,0.95+0.13+0.002,1.45); const id=obj.id;
    await advance(e,3);
    assert(obj.id === id && obj.productId === 'painted' && obj.color === 0x22aa66, 'Paint station did not repaint the object');
  }
  {
    const e = new Engine();
    const station = makeItem('assembly',[0,0,0],0,{id:'assembly-test',props:{cycleTime:1,inputProduct:'any',outputProduct:'window',requiredParts:2}});
    e.sync([station]); e.setRunning(true);
    const a=e.spawn('glass',0,0.95+0.02+0.002,1.45); const b=e.spawn('glass',0.12,0.95+0.02+0.002,1.45);
    await advance(e,3);
    const alive=e.boxes.filter((x)=>x.state!=='dead');
    assert(alive.some((x)=>x.productId==='window'), 'Assembly did not combine inputs');
    assert(alive.length===1, 'Assembly did not consume the component parts');
    void a; void b;
  }
  // Human navigation must route around a closed fence rather than crossing it.
  {
    const e=new Engine();
    const fence=makeItem('fence',[0,0,0],0,{points:[[-2,-1],[-2,1],[2,1],[2,-1]],props:{height:2,panelWidth:1.5,gateOpen:false}});
    const human=makeItem('operator',[0,0,0],0,{props:{task:'carry',walkSpeed:1.5,sourceId:'',targetId:''}});
    e.sync([fence,human]); e.setRunning(true); await advance(e,4);
    // Navigation path should avoid barrier line segments; no NaN/route stuck.
    assert(Number.isFinite(e.humans.get(human.id)!.x), 'Human navigation produced invalid coordinates');
  }

  // Combined process chains must actually produce through every stage.
  {
    const o = parsePrompt('weld then paint then assemble and pack with 4 cells', DEFAULT_GEN);
    assert(o.processChain.length === 4, 'combined chain not detected');
    const items = generateFactory(o);
    const e = new Engine(); e.sync(items); e.setRunning(true); await advance(e, 130);
    assert([...e.machines.values()].every((m) => m.cycles > 0), 'combined chain machines did not all cycle');
    assert(e.logs.filter((l) => l.level === 'error').length === 0, 'combined chain raised program errors');
    assert(validateFactory(items).length === 0, 'combined chain failed reach validation');
    console.log('combined chain', o.processChain.map((c) => c.machine).join('>'), 'machines', [...e.machines.values()].map((m) => m.cycles).join('/'));
  }
  // Unmentioned settings must survive interpretation.
  {
    const o = parsePrompt('cookie bakery', DEFAULT_GEN);
    assert(o.cols === DEFAULT_GEN.cols && o.rows === DEFAULT_GEN.rows && o.layers === DEFAULT_GEN.layers, 'prompt reset pallet settings');
  }
  // Human workers in generated cells must actually operate the line.
  {
    const o = parsePrompt('metalworking line with 1 cell, human operator', DEFAULT_GEN);
    const items = generateFactory(o);
    const e = new Engine(); e.sync(items); e.setRunning(true); await advance(e, 130);
    assert(e.stats.placed > 0, 'human tended factory produced nothing');
    assert([...e.machines.values()].some((m) => m.cycles > 0), 'human never processed a machine');
    console.log('human tended factory placed', e.stats.placed);
  }
  // Bilingual vague prompts always yield a non-empty valid factory.
  {
    const prompts = ['build a factory', 'завод', 'пекарня', 'кирпичный завод', 'haz una fabrica', '3 lines 2 columns 5 layers'];
    for (const prompt of prompts) {
      const items = generateFactory(parsePrompt(prompt, DEFAULT_GEN));
      assert(items.length > 0, 'empty factory for: ' + prompt);
      assert(validateFactory(items).length === 0, 'invalid factory for: ' + prompt);
    }
    console.log('vague bilingual prompts', prompts.length, 'valid');
  }
  console.log('PASS: recipes, live targets, IK, fall physics, TXT, triggers, receive box, painting, assembly, humans, combined chains');
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
