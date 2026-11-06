import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'larp-physics-bench-'));
try {
  const outfile=path.join(dir,'bench.mjs');
  await build({entryPoints:['benchmarks/physics-perf.ts'],bundle:true,platform:'node',mainFields:['module','main'],format:'esm',outfile,define:{'import.meta.env':'{}',__APP_VERSION__:JSON.stringify('benchmark'),__BUILD_TIME__:JSON.stringify('benchmark')}});
  const result=spawnSync(process.execPath,[outfile],{stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
} finally {await rm(dir,{recursive:true,force:true});}
