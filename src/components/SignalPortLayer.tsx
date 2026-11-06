import { nearestPort } from '../utils/portSnap';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sim } from '../sim/engine';
import type { SceneItem } from '../types';
import { canSignalInput, canSignalOutput, legacySignalTargets, signalOutputConnections, signalWireColor } from '../utils/signalPorts';
import { MODEL_HEIGHTS } from './FactoryModels';
import { t } from '../i18n';

export interface OutputPort { id:string; port:number | null }
interface InputPort { id:string; port:number }
function PortAnchor({item, height, children}: {item: SceneItem; height: number; children: ReactNode}) {
  const group = useRef<THREE.Group>(null);
  const wasPhysical = useRef(false);
  useFrame(() => {
    const pose = sim.getPhysicsPose(item.id) ?? (item.props.mountedTo ? sim.getLiveItem(item.id) : undefined);
    if (!group.current) return;
    if (pose) wasPhysical.current = true;
    else if (!wasPhysical.current) return;
    else wasPhysical.current = false;
    const position = (pose ?? item).position;
    group.current.position.set(position[0], position[1] + height, position[2]);
  });
  return <group ref={group} userData={{signalPortFor:item.id}} position={[item.position[0], item.position[1] + height, item.position[2]]}><Html center zIndexRange={[30, 20]}>{children}</Html></group>;
}
interface Gesture { pointerId:number; source:OutputPort; oldTarget?:InputPort; startX:number; startY:number; anchorX:number; anchorY:number; moved:boolean }
const sameOutput = (a:OutputPort | null,b:OutputPort) => a?.id === b.id && a.port === b.port;
const inputKey = (id:string,port:number) => `${id}\u0000${port}`;

/** Every numbered OUT and IN is a separate draggable/clickable endpoint. */
export function SignalPortLayer({items, source, onSource, onTarget, onConnect, onReroute}: {
  items:SceneItem[]; source:OutputPort | null;
  onSource:(source:OutputPort) => void; onTarget:(target:InputPort) => void;
  onConnect:(source:OutputPort,target:InputPort) => void;
  onReroute:(source:OutputPort,oldTarget:InputPort,newTarget:InputPort | null) => void;
}) {
  const latest = useRef({items,onSource,onConnect,onReroute});
  latest.current = {items,onSource,onConnect,onReroute};
  const portal = useRef<HTMLElement>(document.body), gesture = useRef<Gesture | null>(null), suppressClick = useRef(false);
  const [preview,setPreview] = useState<{x1:number;y1:number;x2:number;y2:number;color:string} | null>(null);
  const [snapTarget,setSnapTarget] = useState<InputPort | null>(null);
  const incoming = useMemo(() => {
    const map = new Map<string,OutputPort[]>();
    const add = (target:string,input:number,port:OutputPort) => { const key=inputKey(target,input), row=map.get(key) ?? []; row.push(port); map.set(key,row); };
    for (const item of items) if (canSignalOutput(item)) {
      for (const id of legacySignalTargets(item)) add(id,1,{id:item.id,port:null});
      for (const route of item.signalRoutes ?? []) add(route.targetId,route.input,{id:item.id,port:route.output});
    }
    return map;
  },[items]);
  const begin = (event:React.PointerEvent<HTMLButtonElement>, output:OutputPort, oldTarget?:InputPort) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const outputElement = oldTarget ? [...document.querySelectorAll<HTMLElement>('[data-signal-output]')].find(el => el.dataset.signalOutput === output.id && (el.dataset.signalOutputPort || '') === (output.port?.toString() ?? '')) : event.currentTarget;
    const origin = outputElement?.getBoundingClientRect() ?? rect;
    gesture.current={pointerId:event.pointerId,source:output,oldTarget,startX:event.clientX,startY:event.clientY,anchorX:origin.left+origin.width/2,anchorY:origin.top+origin.height/2,moved:false};
    event.currentTarget.setPointerCapture?.(event.pointerId); onSource(output);
  };
  useEffect(() => {
    const findInput=(event:PointerEvent, output:OutputPort) => {
      const inputItems=new Map(latest.current.items.map(item=>[item.id,item]));
      return nearestPort(document.querySelectorAll<HTMLElement>('[data-signal-input]'),event.clientX,event.clientY,26,element=>{
      const id=element.dataset.signalInput, port=Number(element.dataset.signalInputPort || 1);
      const item=inputItems.get(id ?? '');
      return item && Number.isSafeInteger(port) && port>0 && canSignalInput(item,output.id) ? {id:item.id,port} : null;
    });
    };
    const move=(event:PointerEvent) => {
      const g=gesture.current;if(!g || g.pointerId !== event.pointerId)return;
      if(Math.hypot(event.clientX-g.startX,event.clientY-g.startY)<5&&!g.moved)return;
      g.moved=true; const item=latest.current.items.find(i=>i.id===g.source.id);
      const snap=findInput(event,g.source); setSnapTarget(snap?.value ?? null);
      setPreview({x1:g.anchorX,y1:g.anchorY,x2:snap?.x ?? event.clientX,y2:snap?.y ?? event.clientY,color:signalWireColor((g.source.port ? item?.signalChannels?.find(c=>c.port===g.source.port)?.color : undefined) ?? item?.props.wireColor)});
    };
    const finish=(event:PointerEvent) => {
      const g=gesture.current;if(!g||g.pointerId!==event.pointerId)return;gesture.current=null;setPreview(null);setSnapTarget(null);
      if(!g.moved||event.type==='pointercancel')return;
      const target=findInput(event,g.source)?.value ?? null;
      if(g.oldTarget) { if(!target||target.id!==g.oldTarget.id||target.port!==g.oldTarget.port)latest.current.onReroute(g.source,g.oldTarget,target); }
      else if(target)latest.current.onConnect(g.source,target);
      suppressClick.current=true;window.setTimeout(()=>{suppressClick.current=false;},0);
    };
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);};
  },[]);
  return <>
    {items.map(item=>{
      const hasOut=canSignalOutput(item), hasIn=canSignalInput(item,source?.id ?? '');
      if(!hasOut&&!hasIn)return null;
      const outputs:(number|null)[]=item.signalChannels?.length ? [...(legacySignalTargets(item).length ? [null] : []),...item.signalChannels.map(c=>c.port)] : [null];
      const inputs=hasIn && item.signalChannels?.length ? item.signalChannels.map(c=>c.port) : [1];
      const height=item.props.mountedTo ? .55*item.scale : Math.max(1.2,(MODEL_HEIGHTS[item.kind] ?? 1)*item.scale+.4);
      return <PortAnchor key={item.id} item={item} height={height}><div className="flex max-w-[240px] flex-wrap items-center gap-1 whitespace-nowrap rounded bg-[#1d252c]/95 px-1 py-1 shadow-lg" onPointerDown={event=>event.stopPropagation()}>
        {hasOut && outputs.map(port=>{const p={id:item.id,port}; const label=port===null ? `${t('Signal output')}: ${item.name}` : `${t('Signal output')} ${port}: ${item.name}`;
          return <button key={`o${port}`} type="button" data-signal-output={item.id} data-signal-output-port={port ?? ''} aria-label={label} title={`${label} — ${t('drag to an IN port')}`} onPointerDown={event=>begin(event,p)} onClick={event=>{event.stopPropagation();if(!suppressClick.current)onSource(p);}} style={{touchAction:'none'}} className={`rounded px-1.5 py-1 text-[10px] font-bold ${sameOutput(source,p)?'bg-[#f4c260] text-black':'bg-[#357b8f] text-white'}`}>OUT{port ?? ''}</button>;})}
        {hasIn && inputs.map(port=>{const target={id:item.id,port}, sources=incoming.get(inputKey(item.id,port)) ?? [];
          const connected=source ? !!signalOutputConnections(items.find(i=>i.id===source.id)!,source.port).some(c=>c.targetId===item.id&&c.input===port) : sources.length>0;
          const dragSource=source ? (connected ? source : null) : sources.length===1 ? sources[0] : null;
          const label=inputs.length===1 && port===1 ? `${t('Signal input')}: ${item.name}` : `${t('Signal input')} ${port}: ${item.name}`;
          return <button key={`i${port}`} type="button" data-signal-input={item.id} data-signal-input-port={port} data-signal-snap={snapTarget?.id===item.id && snapTarget.port===port ? 'true' : undefined} aria-label={label} aria-pressed={connected} title={sources.length>1&&!source?t('Select an OUT to choose which connection to disconnect.'):label} onPointerDown={event=>{if(dragSource)begin(event,dragSource,target);}} onClick={event=>{event.stopPropagation();if(!suppressClick.current&&source)onTarget(target);}} style={{touchAction:'none'}} className={`rounded px-1.5 py-1 text-[10px] font-bold text-white ${connected?'bg-[#bd8735]':'bg-[#3a7655]'} ${snapTarget?.id===item.id && snapTarget.port===port ? 'ring-2 ring-white shadow-[0_0_12px_#fff]' : ''}`}>IN{inputs.length>1?port:''}{connected?' ✓':''}{sources.length>1?` ${sources.length}`:''}</button>;})}
      </div></PortAnchor>;
    })}
    {preview && <Html portal={portal} calculatePosition={() => [0,0]} zIndexRange={[999999,999999]} style={{pointerEvents:'none'}}><svg aria-label={t('Signal wire preview')} style={{position:'fixed',inset:0,width:'100vw',height:'100vh',pointerEvents:'none'}}><path d={`M ${preview.x1} ${preview.y1} C ${preview.x1} ${(preview.y1+preview.y2)/2}, ${preview.x2} ${(preview.y1+preview.y2)/2}, ${preview.x2} ${preview.y2}`} fill="none" stroke={preview.color} strokeWidth="4" strokeLinecap="round" /></svg></Html>}
  </>;
}
