import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'larp-ts-bench-'));
try {
  const outfile=path.join(dir,'bench.mjs');
  // Load the previous TypeScript engine and its spatial index without changing
  // the working tree. Other simulation dependencies are shared and unchanged.
  const engine=execFileSync('git',['show','a806f3b:src/sim/engine.ts'],{encoding:'utf8'});
  const spatial=execFileSync('git',['show','a806f3b:src/sim/spatial.ts'],{encoding:'utf8'});
  const plugin={name:'baseline-typescript',setup(build){
    build.onResolve({filter:/^virtual:baseline-ts-engine$/},()=>({path:'engine',namespace:'baseline-ts'}));
    build.onResolve({filter:/^\.\/spatial$/,namespace:'baseline-ts'},()=>({path:'spatial',namespace:'baseline-ts'}));
    build.onLoad({filter:/^engine$/,namespace:'baseline-ts'},()=>({contents:engine,loader:'ts',resolveDir:path.resolve('src/sim')}));
    build.onLoad({filter:/^spatial$/,namespace:'baseline-ts'},()=>({contents:spatial,loader:'ts',resolveDir:path.resolve('src/sim')}));
  }};
  await build({plugins:[plugin],entryPoints:['benchmarks/typescript-perf.ts'],bundle:true,platform:'node',format:'esm',outfile,define:{'import.meta.env':'{}',__APP_VERSION__:JSON.stringify('benchmark'),__BUILD_TIME__:JSON.stringify('benchmark')}});
  const result=spawnSync(process.execPath,[outfile,...process.argv.slice(2)],{stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
} finally {await rm(dir,{recursive:true,force:true});}
