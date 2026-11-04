/** Bounded, cancellable web requests. A provider that stalls during its body
 * or model parse must not leave the editor's loading state running forever. */
export function abortError() { return new DOMException('Aborted','AbortError'); }
export function throwIfAborted(signal?:AbortSignal) { if(signal?.aborted)throw abortError(); }

export async function abortable<T>(promise:Promise<T>, signal?:AbortSignal):Promise<T> {
  if(!signal)return promise;
  throwIfAborted(signal);
  let cancel: (()=>void) | undefined;
  try {
    return await Promise.race([promise,new Promise<never>((_,reject)=>{
      cancel=()=>reject(abortError());signal.addEventListener('abort',cancel,{once:true});
      if(signal.aborted)cancel();
    })]);
  } finally { if(cancel)signal.removeEventListener('abort',cancel); }
}

export async function withWebDeadline<T>(operation:(signal:AbortSignal)=>Promise<T>, parent?:AbortSignal, timeoutMs=45000):Promise<T> {
  throwIfAborted(parent);
  const controller=new AbortController();let timedOut=false;
  const abort=()=>controller.abort(); parent?.addEventListener('abort',abort,{once:true});
  if(parent?.aborted)controller.abort();
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  try { return await abortable(operation(controller.signal),controller.signal); }
  catch(error) { if(timedOut)throw new Error('The web request timed out. Check the connection and retry.'); throw error; }
  finally {clearTimeout(timer);parent?.removeEventListener('abort',abort);}
}

/** Enforce the actual streamed byte count even when Content-Length is absent
 * or inaccurate; the caller may impose a smaller remaining-project budget. */
export async function downloadWebBytes(url:string, options:{signal?:AbortSignal;limit:number;timeoutMs?:number}):Promise<ArrayBuffer> {
  return withWebDeadline(async signal=>{
    const response=await fetch(url,{signal,credentials:'omit'});
    if(!response.ok)throw new Error(`Download failed (${response.status}).`);
    const length=Number(response.headers.get('content-length'));
    if(Number.isFinite(length) && length>options.limit)throw new Error('This model exceeds the 80 MB import limit.');
    if(!response.body) {
      const data=await response.arrayBuffer();
      if(data.byteLength>options.limit)throw new Error('This model exceeds the 80 MB import limit.');
      return data;
    }
    const reader=response.body.getReader(), chunks:Uint8Array[]=[];let total=0;
    const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
    try {
      while(true){
        const {done,value}=await abortable(reader.read(),signal);if(done)break;
        total+=value.byteLength;
        if(total>options.limit){cancel();throw new Error('This model exceeds the 80 MB import limit.');}
        chunks.push(value);
      }
    } finally {signal.removeEventListener('abort',cancel);try{reader.releaseLock();}catch{/* pending read is being cancelled */}}
    const out=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}
    return out.buffer;
  },options.signal,options.timeoutMs ?? 90000);
}
