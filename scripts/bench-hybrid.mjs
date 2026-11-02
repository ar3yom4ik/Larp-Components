import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'larp-bench-'));
try {
  const outfile=path.join(dir,'bench.mjs');
  // Resolve the archived engine in memory; never modify the checkout or switch branches.
  const baseline=execFileSync('git',['show','2cc3bd6:src/sim/engine.ts'],{encoding:'utf8'});
  const oldBridge=execFileSync('git',['show','07703f7:src/sim/wasm/kernel.ts'],{encoding:'utf8'});
  const plugin={name:'pre-rust-baseline',setup(build){
    build.onResolve({filter:/^virtual:pre-rust-engine$/},()=>({path:'baseline',namespace:'pre-rust'}));
    build.onLoad({filter:/.*/,namespace:'pre-rust'},()=>({contents:baseline,loader:'ts',resolveDir:path.resolve('src/sim')}));
    build.onResolve({filter:/^virtual:old-rust-bridge$/},()=>({path:'bridge',namespace:'old-bridge'}));
    build.onLoad({filter:/.*/,namespace:'old-bridge'},()=>({contents:oldBridge,loader:'ts',resolveDir:path.resolve('src/sim/wasm')}));
  }};
  await build({plugins:[plugin],entryPoints:['benchmarks/rust-hybrid.ts'],bundle:true,platform:'node',mainFields:['module','main'],format:'esm',outfile,define:{'import.meta.env':'{}',__APP_VERSION__:JSON.stringify('benchmark'),__BUILD_TIME__:JSON.stringify('benchmark')}});
  const result=spawnSync(process.execPath,[outfile],{stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
} finally {await rm(dir,{recursive:true,force:true});}
