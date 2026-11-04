import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import path from 'node:path';
const baseline=process.env.TS_BENCH_BASELINE||'24caa86137267e58a79c49f1e1531618ab346990';
const dir=await mkdtemp(path.join(tmpdir(),'larp-beam-bench-'));
try {
 const previous=execFileSync('git',['show',`${baseline}:src/sim/rigidBodies.ts`],{encoding:'utf8'});
 const plugin={name:'baseline-beam',setup(build){
  build.onResolve({filter:/^virtual:baseline-beam$/},()=>({path:'rigidBodies',namespace:'baseline-beam'}));
  build.onLoad({filter:/^rigidBodies$/,namespace:'baseline-beam'},()=>({contents:previous,loader:'ts',resolveDir:path.resolve('src/sim')}));
 }};
 const outfile=path.join(dir,'bench.mjs');
 await build({plugins:[plugin],entryPoints:['benchmarks/beam-perf.ts'],bundle:true,platform:'node',mainFields:['module','main'],format:'esm',outfile,define:{'import.meta.env':'{}',__APP_VERSION__:JSON.stringify('benchmark'),__BUILD_TIME__:JSON.stringify('benchmark')}});
 const result=spawnSync(process.execPath,[outfile],{stdio:'inherit',env:{...process.env,TS_BENCH_BASELINE:baseline}});
 if(result.error)throw result.error;process.exitCode=result.status??1;
} finally {await rm(dir,{recursive:true,force:true});}
