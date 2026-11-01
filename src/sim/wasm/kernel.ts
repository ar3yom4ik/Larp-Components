import { KERNEL_BASE64 } from './kernelBytes';
import { navigate as navigateJs, type Barrier, type WalkObstacle, type Point } from '../navigation';
import { TABLE_TOP } from '../engine';

/** Small synchronous Wasm kernel, embedded so the standalone HTML stays offline.
 * Keep the JS implementation as a compatibility fallback for browsers that cannot
 * instantiate WebAssembly (for example due to a restrictive CSP). */
type DistanceKernel = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => number;

export const distanceSqJs: DistanceKernel = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let u = ((x - ax) * dx + (z - az) * dz) / len2;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const ex = x - (ax + u * dx), ez = z - (az + u * dz);
  return ex * ex + ez * ez;
};

function loadKernel(): WebAssembly.Exports | null {
  try {
    if (typeof WebAssembly === 'undefined' || typeof atob !== 'function') return null;
    const binary = atob(KERNEL_BASE64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes));
    return instance.exports;
  } catch {
    return null;
  }
}

const exports = loadKernel();
const wasmDistance = typeof exports?.distance_sq_to_segment === 'function' ? exports.distance_sq_to_segment as DistanceKernel : null;
export const rustKernelAvailable = wasmDistance !== null;
export const distanceSqKernel: DistanceKernel = wasmDistance ?? distanceSqJs;

/** A reusable scene owns Rust-side buffers; dispose it after use. No production
 * behavior is switched until full-engine parity and browser performance are proven. */
export function createRustNavigationScene(barriers: Barrier[], obstacles: WalkObstacle[]) {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.point_is_free !== 'function') throw new Error('Rust navigation kernel unavailable');
  const memory = exports.memory;
  const alloc = exports.alloc_f64 as (count: number) => number;
  const free = exports.free_f64 as (ptr: number, count: number) => void;
  const query = exports.point_is_free as (x: number, z: number, tolerance: number, barriers: number, barrierCount: number, obstacles: number, obstacleCount: number) => number;
  const n = barriers.length * 5, m = obstacles.length * 3;
  const bp = alloc(n);
  let op = 0;
  try {
    op = alloc(m);
    // Allocation can grow memory; create each view only after both allocations.
    const b = new Float64Array(memory.buffer, bp, n);
    for (let i=0;i<barriers.length;i++) {
      const v=barriers[i]; b.set([v.a[0],v.a[1],v.b[0],v.b[1],v.clearance ?? 0.34],i*5);
    }
    const o = new Float64Array(memory.buffer, op, m);
    for (let i=0;i<obstacles.length;i++) { const v=obstacles[i]; o.set([v.x,v.z,v.radius],i*3); }
  } catch (error) { if (op) free(op,m); free(bp,n); throw error; }
  let disposed = false;
  return {
    pointIsFree(x: number, z: number, tolerance = 0) {
      if (disposed) throw new Error('Rust navigation scene has been disposed');
      return query(x,z,tolerance,bp,barriers.length,op,obstacles.length) !== 0;
    },
    dispose() { if (!disposed) { disposed = true; free(bp,n); free(op,m); } },
  };
}

/** Experimental feeder-only bridge; all other subsystems still run in TypeScript.
 * Scratch buffers are reused across frames, and views are reacquired after allocation. */
export function createRustFeederStepper() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.step_feeders !== 'function') throw new Error('Rust feeder kernel unavailable');
  const memory = exports.memory;
  const alloc = exports.alloc_f64 as (count: number) => number;
  const free = exports.free_f64 as (ptr: number, count: number) => void;
  const run = exports.step_feeders as (feeders: number, count: number, boxes: number, boxCount: number, dt: number, maxBoxes: number) => void;
  let fp = 0, fc = 0, bp = 0, bc = 0, disposed = false;
  let fs: Float64Array | null = null, bs: Float64Array | null = null;
  function views() {
    if (!fs || fs.buffer !== memory.buffer || fs.byteOffset !== fp || fs.length !== fc) fs = new Float64Array(memory.buffer, fp, fc);
    if (!bs || bs.buffer !== memory.buffer || bs.byteOffset !== bp || bs.length !== bc) bs = new Float64Array(memory.buffer, bp, bc);
    return [fs, bs] as const;
  }
  return {
    step(feeders: Iterable<import('../engine').FeederRT>, boxes: readonly import('../engine').Box[], dt: number, spawn: (feeder: import('../engine').FeederRT) => void, maxBoxes: number) {
      if (disposed) throw new Error('Rust feeder stepper has been disposed');
      const list = Array.from(feeders), nf = list.length * 8, nb = boxes.length * 4;
      if (nf > fc || !fp) { if (fp) free(fp,fc); fc = Math.max(8,nf); fp = alloc(fc); }
      if (nb > bc || !bp) { if (bp) free(bp,bc); bc = Math.max(4,nb); bp = alloc(bc); }
      let [fdata, bdata] = views();
      for (let i=0;i<list.length;i++) {
        const f=list[i], n=i*8;
        fdata[n]=f.x; fdata[n+1]=f.z; fdata[n+2]=f.interval; fdata[n+3]=f.timer;
        fdata[n+4]=f.active?1:0; fdata[n+5]=f.supply; fdata[n+6]=f.requireSupply?1:0; fdata[n+7]=0;
      }
      for (let i=0;i<boxes.length;i++) {
        const b=boxes[i], n=i*4;
        bdata[n]=b.x; bdata[n+1]=b.y; bdata[n+2]=b.z; bdata[n+3]=b.state === 'dead'?0:1;
      }
      run(fp,list.length,bp,boxes.length,dt,maxBoxes);
      // Rust allocations may grow Wasm memory and detach all existing views.
      [fdata, bdata] = views();
      for (let i=0;i<list.length;i++) {
        const f=list[i]; f.timer=fdata[i*8+3]; f.supply=fdata[i*8+5];
        if (fdata[i*8+7] !== 0) {
          spawn(f);
          // A host callback may itself allocate in the shared Wasm memory.
          if (fdata.buffer !== memory.buffer) [fdata, bdata] = views();
        }
      }
    },
    dispose() { if (!disposed) { disposed=true; if(fp) free(fp,fc); if(bp) free(bp,bc); } },
  };
}

/** Experimental machine cycle clock. The host still handles machine selection and products. */
export function createRustMachineClock() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.advance_machine_clock !== 'function') throw new Error('Rust machine clock unavailable');
  const memory = exports.memory;
  const alloc = exports.alloc_f64 as (count: number) => number;
  const free = exports.free_f64 as (ptr: number, count: number) => void;
  const run = exports.advance_machine_clock as (state: number, dt: number) => void;
  const ptr = alloc(4);
  let disposed = false;
  return {
    advance(machine: import('../engine').MachineRT, dt: number) {
      if (disposed) throw new Error('Rust machine clock has been disposed');
      const state = new Float64Array(memory.buffer, ptr, 4);
      state.set([machine.busyTime, machine.remaining, machine.progress, machine.cycle]);
      run(ptr, dt);
      machine.busyTime = state[0]; machine.remaining = state[1]; machine.progress = state[2];
    },
    dispose() { if (!disposed) { disposed = true; free(ptr, 4); } },
  };
}

/** Experimental automatic machine workflow. Product metadata, object ownership,
 * spatial candidate ordering and externally requested `process` remain host-owned. */
export function createRustMachineStepper() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.step_machine !== 'function') throw new Error('Rust machine stepper unavailable');
  const memory=exports.memory;
  const alloc=exports.alloc_f64 as (count:number)=>number;
  const free=exports.free_f64 as (ptr:number,count:number)=>void;
  const run=exports.step_machine as (state:number,boxes:number,count:number,dt:number,top:number)=>void;
  const statePtr=alloc(12);
  let boxesPtr=0, capacity=0, disposed=false;
  let state:Float64Array|null=null, boxData:Float64Array|null=null;
  function views() {
    if(!state || state.buffer!==memory.buffer) state=new Float64Array(memory.buffer,statePtr,12);
    if(!boxData || boxData.buffer!==memory.buffer || boxData.byteOffset!==boxesPtr || boxData.length!==capacity) boxData=new Float64Array(memory.buffer,boxesPtr,capacity);
    return [state,boxData] as const;
  }
  return {
    step(machine:import('../engine').MachineRT, candidates:readonly import('../engine').Box[], dt:number) {
      if(disposed) throw new Error('Rust machine stepper has been disposed');
      const count=candidates.length, length=count*9;
      if(!boxesPtr || length>capacity) {
        if(boxesPtr) free(boxesPtr,capacity);
        capacity=Math.max(9,length); boxesPtr=alloc(capacity);
      }
      let [s,b]=views();
      const t=machine.table();
      s[0]=machine.busy?1:0; s[1]=machine.cycle; s[2]=machine.remaining; s[3]=machine.busyTime;
      s[4]=machine.progress; s[5]=machine.requiredParts; s[6]=machine.kind==='assembly'?1:0;
      s[7]=t.x; s[8]=t.z; s[9]=machine.part?1:0; s[10]=0; s[11]=machine.cycles;
      for(let i=0;i<count;i++) {
        const v=candidates[i], n=i*9;
        b[n]=v.x; b[n+1]=v.y; b[n+2]=v.z; b[n+3]=v.hy; b[n+4]=v.state==='free'?1:0;
        b[n+5]=v.claim===0?1:0; b[n+6]=v.lastMachine===machine.id?1:0;
        b[n+7]=machine.inputProduct==='any'||v.productId===machine.inputProduct?1:0; b[n+8]=0;
      }
      run(statePtr,boxesPtr,count,dt,TABLE_TOP);
      [s,b]=views();
      machine.busy=s[0]!==0; machine.remaining=s[2]; machine.busyTime=s[3]; machine.progress=s[4]; machine.cycles=s[11];
      let first:import('../engine').Box|null=null;
      const consumed:import('../engine').Box[]=[];
      for(let i=0;i<count;i++) { if(b[i*9+8]===1) first=candidates[i]; else if(b[i*9+8]===2) consumed.push(candidates[i]); }
      return {action:s[10],first,consumed};
    },
    dispose() { if(!disposed) { disposed=true; free(statePtr,12); if(boxesPtr) free(boxesPtr,capacity); } },
  };
}

/** Experimental batched automation signals. The host owns scene properties,
 * buttons and robot signals; ordered PLC/sensor evaluation runs in Rust. */
export function createRustLogicStepper() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.step_logic !== 'function') throw new Error('Rust logic stepper unavailable');
  const memory=exports.memory;
  const alloc=exports.alloc_f64 as (n:number)=>number;
  const free=exports.free_f64 as (p:number,n:number)=>void;
  const run=exports.step_logic as (n:number,nc:number,b:number,bc:number,s:number,sc:number,r:number,rc:number)=>void;
  const ptr=[0,0,0,0], cap=[0,0,0,0];
  let disposed=false;
  function number(value:unknown, fallback:number) { const parsed=typeof value==='number'?value:Number(value); return Number.isFinite(parsed)?parsed:fallback; }
  return {
    step(items:readonly import('../../types').SceneItem[], boxes:readonly import('../engine').Box[], triggers:ReadonlyMap<string, import('../../types').SceneItem[]>, signals:Map<string,boolean>) {
      if(disposed) throw new Error('Rust logic stepper has been disposed');
      if(items.length === 0) return;
      const ids=[...new Set(items.map(item=>item.id))], slots=new Map(ids.map((id,i)=>[id,i]));
      const sourceLists=items.map(item=>(triggers.get(item.id)??[]).map(v=>slots.get(v.id)).filter((v):v is number=>v!==undefined));
      const totalSources=sourceLists.reduce((n,v)=>n+v.length,0);
      const lengths=[items.length*13,boxes.length*6,ids.length,totalSources];
      for(let i=0;i<4;i++) if(!ptr[i] || lengths[i]>cap[i]) { if(ptr[i]) free(ptr[i],cap[i]); cap[i]=Math.max(1,lengths[i]); ptr[i]=alloc(cap[i]); }
      const nodes=new Float64Array(memory.buffer,ptr[0],lengths[0]), bs=new Float64Array(memory.buffer,ptr[1],lengths[1]), ss=new Float64Array(memory.buffer,ptr[2],lengths[2]), refs=new Float64Array(memory.buffer,ptr[3],lengths[3]);
      for(let i=0;i<ids.length;i++) ss[i]=signals.get(ids[i])===true?1:0;
      let offset=0;
      for(let i=0;i<items.length;i++) {
        const v=items[i], list=sourceLists[i], yaw=v.rotation*Math.PI/180;
        const range=Math.max(0.5,number(v.props.range,3))/2, c=Math.cos(yaw), sn=Math.sin(yaw);
        const kind=v.kind==='button'?1:v.kind==='laser'?2:v.kind==='sensor'?3:v.kind==='plc'?4:0;
        nodes.set([kind,v.position[0],v.position[2],Math.max(0.2,number(v.props.radius,0.8)),v.position[0]-range*c,v.position[2]+range*sn,v.position[0]+range*c,v.position[2]-range*sn,v.props.normallyClosed===true?1:0,v.props.signal===true?1:0,slots.get(v.id)!,offset,list.length],i*13);
        refs.set(list,offset); offset+=list.length;
      }
      for(let i=0;i<boxes.length;i++) { const b=boxes[i]; bs.set([b.x,b.y,b.z,b.hy,b.r,b.state==='dead'?0:b.state==='dying'?1:2],i*6); }
      run(ptr[0],items.length,ptr[1],boxes.length,ptr[2],ids.length,ptr[3],totalSources);
      for(let i=0;i<ids.length;i++) signals.set(ids[i],ss[i]!==0);
    },
    dispose() { if(!disposed) { disposed=true; for(let i=0;i<4;i++) if(ptr[i]) free(ptr[i],cap[i]); } },
  };
}

/** Experimental bounded A*; the host still owns human decisions and movement. */
export function createRustNavigator() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.navigate_path !== 'function') throw new Error('Rust navigator unavailable');
  const memory=exports.memory, alloc=exports.alloc_f64 as (n:number)=>number, free=exports.free_f64 as (p:number,n:number)=>void;
  const run=exports.navigate_path as (sx:number,sz:number,ex:number,ez:number,b:number,bc:number,o:number,oc:number,out:number,capacity:number)=>number;
  const outputCapacity=57601, out=alloc(outputCapacity*2);
  let bp=0,bc=0,op=0,oc=0,disposed=false;
  return {
    navigate(start:Point,end:Point,barriers:Barrier[],obstacles:WalkObstacle[]):Point[] {
      if(disposed) throw new Error('Rust navigator has been disposed');
      const bn=barriers.length*5,on=obstacles.length*3;
      if(!bp||bn>bc){if(bp)free(bp,bc);bc=Math.max(1,bn);bp=alloc(bc);}
      if(!op||on>oc){if(op)free(op,oc);oc=Math.max(1,on);op=alloc(oc);}
      const b=new Float64Array(memory.buffer,bp,bn),o=new Float64Array(memory.buffer,op,on);
      for(let i=0;i<barriers.length;i++) {const v=barriers[i];b.set([v.a[0],v.a[1],v.b[0],v.b[1],v.clearance??0.34],i*5);}
      for(let i=0;i<obstacles.length;i++) {const v=obstacles[i];o.set([v.x,v.z,v.radius],i*3);}
      const count=run(start[0],start[1],end[0],end[1],bp,barriers.length,op,obstacles.length,out,outputCapacity);
      if(count<0) return navigateJs(start,end,barriers,obstacles);
      // A* allocations may grow memory; reacquire the output view after the call.
      const data=new Float64Array(memory.buffer,out,count*2), route:Point[]=[];
      for(let i=0;i<count;i++) route.push([data[i*2],data[i*2+1]]);
      return route;
    },
    dispose(){if(!disposed){disposed=true;free(out,outputCapacity*2);if(bp)free(bp,bc);if(op)free(op,oc);}},
  };
}

/** Experimental robot reachability and inverse kinematics. The JavaScript host
 * retains world transforms, motion commands, jobs, scripts and object ownership. */
export function createRustRobotKinematics() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.solve_robot !== 'function' || typeof exports.robot_reachable !== 'function') throw new Error('Rust robot kinematics unavailable');
  const memory=exports.memory, alloc=exports.alloc_f64 as (n:number)=>number, free=exports.free_f64 as (p:number,n:number)=>void;
  const solve=exports.solve_robot as (input:number,output:number)=>void;
  const reachable=exports.robot_reachable as (input:number)=>number;
  const ptr=alloc(11);
  let disposed=false, data:Float64Array|null=null;
  function view() {
    if(!data || data.buffer!==memory.buffer) data=new Float64Array(memory.buffer,ptr,11);
    return data;
  }
  function input(local:import('../engine').V3,spec:import('../engine').RobotSpec) {
    if(disposed) throw new Error('Rust robot kinematics has been disposed');
    const a=view();
    a[0]=local[0]; a[1]=local[1]; a[2]=local[2]; a[3]=spec.shoulder; a[4]=spec.L1; a[5]=spec.L2; a[6]=spec.Lw;
  }
  return {
    reach(local:import('../engine').V3,spec:import('../engine').RobotSpec) {input(local,spec);return reachable(ptr)!==0;},
    solve(local:import('../engine').V3,spec:import('../engine').RobotSpec) {
      input(local,spec);solve(ptr,ptr+7*8);
      const a=view();
      return {waist:a[7],shoulder:a[8],elbow:a[9],wrist:a[10]};
    },
    dispose(){if(!disposed){disposed=true;free(ptr,11);}},
  };
}

/** Experimental free-product integration. Support selection, identity, contacts,
 * statistics and cleanup remain in the TypeScript host. */
export function createRustProductIntegrator() {
  if (!exports || !(exports.memory instanceof WebAssembly.Memory) || typeof exports.alloc_f64 !== 'function' || typeof exports.free_f64 !== 'function' || typeof exports.integrate_product !== 'function') throw new Error('Rust product integration unavailable');
  const memory=exports.memory, alloc=exports.alloc_f64 as (n:number)=>number, free=exports.free_f64 as (p:number,n:number)=>void;
  const run=exports.integrate_product as (state:number,support:number,dt:number)=>number;
  const ptr=alloc(25);let disposed=false, data:Float64Array|null=null;
  function view() {
    if(!data || data.buffer!==memory.buffer) data=new Float64Array(memory.buffer,ptr,25);
    return data;
  }
  return {
    integrate(b:import('../engine').Box,s:import('../engine').ProductSupport,dt:number) {
      if(disposed) throw new Error('Rust product integrator has been disposed');
      let a=view();
      a[0]=b.x;a[1]=b.y;a[2]=b.z;a[3]=b.vx;a[4]=b.vy;a[5]=b.vz;a[6]=b.yaw;
      a[7]=b.tilt;a[8]=b.tiltV;a[9]=b.ax;a[10]=b.az;a[11]=b.hy;a[12]=b.r;a[13]=b.support;
      a[14]=s.top;a[15]=s.kind;a[16]=s.conveyor?1:0;a[17]=s.lat;a[18]=s.tx;a[19]=s.tz;
      a[20]=s.along;a[21]=s.speed;a[22]=s.blocked?1:0;a[23]=s.stopper?1:0;a[24]=s.length;
      const grounded=run(ptr,ptr+14*8,dt)!==0;
      a=view();
      b.x=a[0];b.y=a[1];b.z=a[2];b.vx=a[3];b.vy=a[4];b.vz=a[5];b.yaw=a[6];b.tilt=a[7];b.tiltV=a[8];b.ax=a[9];b.az=a[10];b.support=a[13] as import('../engine').Box['support'];
      return grounded;
    },
    dispose(){if(!disposed){disposed=true;free(ptr,25);}},
  };
}
