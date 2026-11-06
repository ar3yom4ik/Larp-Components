import { useEffect, useMemo, useRef, useState } from 'react';
import { Line, TransformControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ArrowDown, ArrowUp, Crosshair, Plus, Trash2, X } from 'lucide-react';
import type { PtpPoint, PtpProgram, SceneItem, Vec3 } from '../types';
import { sim } from '../sim/engine';
import { emptyPtp, newPtpPoint } from '../utils/ptp';
import { t } from '../i18n';
import { cn } from '../utils/cn';
import { WindowResizeHandle, type WindowSize } from './WindowResizeHandle';
import { PtpNumberInput } from './PtpNumberInput';

export type PtpMode = 'jog' | 'edit';
export const isRobot = (item:SceneItem | null | undefined) => !!item && ['robot','cobot','kuka','fanuc'].includes(item.kind);
type Update = (id:string,changes:Partial<SceneItem>,record?:boolean)=>void;

/** Robot-local waypoint markers. The dashed segments show order, not the curved TCP path. */
export function PtpLayer({item,mode,pointId,onPoint,snap,onUpdateItem,onBeginEdit,onActive,onFeedback}: {
  item:SceneItem; mode:PtpMode; pointId:string|null; onPoint:(id:string)=>void; snap:boolean;
  onUpdateItem:Update; onBeginEdit:()=>void; onActive:(active:boolean)=>void; onFeedback:(message:string)=>void;
}) {
  const group = useRef<THREE.Group>(null);
  const itemRef = useRef(item); itemRef.current=item;
  const points=item.ptp?.points ?? [];
  const point=points.find(p=>p.id===pointId);
  const anchor=useMemo(()=>{const object=new THREE.Object3D();object.name=`ptp-anchor-${item.id}`;return object;},[item.id]);
  const control=useRef<TransformControlsImpl>(null);
  const active=useRef(false);
  useEffect(()=>()=>{if(active.current) onActive(false);},[onActive]);
  useFrame(()=>{
    const rt=sim.robots.get(item.id);
    const pose=sim.getPhysicsPose(item.id) ?? itemRef.current;
    if(group.current) {
      group.current.position.set(...pose.position);
      group.current.rotation.set((pose.rotationX ?? 0)*Math.PI/180,pose.rotation*Math.PI/180,(pose.rotationZ ?? 0)*Math.PI/180,'XYZ');
      group.current.scale.setScalar(itemRef.current.scale);
    }
    if(!rt || active.current)return;
    const selected=itemRef.current.ptp?.points.find(p=>p.id===pointId);
    const target=mode==='jog' ? rt.tip : selected ? rt.toWorld(selected.position) : rt.tip;
    anchor.position.set(...target);
    anchor.updateMatrixWorld(true);
  });
  const canManipulate=!item.locked && (mode==='jog' || !!point);
  return <>
    <group ref={group} position={item.position} rotation={[(item.rotationX ?? 0)*Math.PI/180,item.rotation*Math.PI/180,(item.rotationZ ?? 0)*Math.PI/180]} scale={item.scale}>
      {points.length>1 && <Line points={points.map(p=>p.position)} color="#6bd6e5" lineWidth={1.5} dashed dashSize={.1} gapSize={.08} transparent opacity={.7} raycast={()=>null} />}
      {points.map((p,index)=><group key={p.id} position={p.position} onPointerDown={event=>{event.stopPropagation();onPoint(p.id);}}>
        <mesh name={`ptp-point-${index+1}`}>
          <sphereGeometry args={[p.id===pointId ? .105 : .075,20,12]} />
          <meshBasicMaterial color={p.id===pointId ? '#ffd66b' : '#5ee5f1'} depthTest={false} />
        </mesh>
        <mesh><sphereGeometry args={[.18,12,8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
      </group>)}
    </group>
    {canManipulate && <><primitive object={anchor}/><TransformControls ref={control} object={anchor} mode="translate" space="world" size={.85} translationSnap={snap ? .25 : null}
      onChange={()=>{if(!active.current) onActive(!!(control.current as unknown as {axis:string|null} | null)?.axis);}}
      onMouseDown={()=>{active.current=true;onActive(true);if(mode==='edit')onBeginEdit();onFeedback('');}}
      onMouseUp={()=>{active.current=false;onActive(false);}}
      onObjectChange={()=>{
        if(!active.current)return;
        const rt=sim.robots.get(item.id);if(!rt)return;
        const world=anchor.position.toArray() as Vec3;
        if(mode==='jog') {
          if(!sim.jogRobot(item.id,world)) {
            onFeedback(sim.running ? 'Pause simulation to jog.' : rt.held ? 'Release the held part before jogging.' : 'Target is outside robot reach.');
            anchor.position.set(...rt.tip);
          } else onFeedback('');
        } else {
          const current=itemRef.current, program=current.ptp;
          if(!program || !pointId)return;
          const local=rt.toLocal(world).map(n=>Math.max(-200,Math.min(200,Math.round(n*1000)/1000))) as Vec3;
          onUpdateItem(item.id,{ptp:{...program,points:program.points.map(p=>p.id===pointId?{...p,position:local}:p)}},false);
          onFeedback(rt.reach(world) ? '' : 'Target is outside robot reach.');
        }
      }}/></>}
  </>;
}

const inputClass='w-full min-w-0 rounded border border-white/15 bg-[#171c20] px-1.5 py-1 font-mono text-[11px] text-white/90';
const buttonClass='rounded border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35';

/** Floating, resizable teach pendant: jogging changes only the live robot pose. */
export function PtpTeachingPanel({item,running,onPause,onExit,mode,onMode,pointId,onPoint,onUpdateItem,feedback,onFeedback}: {
  item:SceneItem | null; running:boolean; onPause:()=>void; onExit:()=>void;
  mode:PtpMode; onMode:(mode:PtpMode)=>void; pointId:string|null; onPoint:(id:string|null)=>void; onUpdateItem:Update; feedback:string; onFeedback:(message:string)=>void;
}) {
  const frame=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState<WindowSize>({width:350,height:510});
  const [,refresh]=useState(0);
  useEffect(()=>{const timer=window.setInterval(()=>refresh(n=>n+1),200);return()=>window.clearInterval(timer);},[]);
  const robot=isRobot(item)?item:null;
  const rt=robot && sim.robots.get(robot.id);
  const program=robot?.ptp ?? emptyPtp();
  const selected=program.points.find(p=>p.id===pointId);
  const local=rt?.toLocal(rt.tip);
  const unreachable=!!selected && !!rt && !rt.reach(rt.toWorld(selected.position));
  const setProgram=(next:PtpProgram,record=true)=>{if(robot)onUpdateItem(robot.id,{ptp:next},record);onFeedback('');};
  const updatePoint=(changes:Partial<PtpPoint>)=>{if(selected)setProgram({...program,points:program.points.map(p=>p.id===selected.id?{...p,...changes}:p)});};
  const add=()=>{if(!local)return;const point=newPtpPoint(local,program.points.length);setProgram({...program,points:[...program.points,point]});onPoint(point.id);};
  const move=(direction:number)=>{
    const index=program.points.findIndex(p=>p.id===pointId), next=index+direction;
    if(index<0||next<0||next>=program.points.length)return;
    const points=[...program.points];[points[index],points[next]]=[points[next],points[index]];setProgram({...program,points});
  };
  return <div ref={frame} role="dialog" aria-label={t('PTP teaching')} className="absolute left-3 top-[64px] z-40 flex min-h-0 flex-col overflow-hidden rounded-md border border-[#5b8993]/60 bg-[#222a2e]/95 text-white shadow-2xl backdrop-blur" style={{width:size.width,height:size.height,maxWidth:'calc(100% - 24px)',maxHeight:'calc(100% - 76px)'}} onPointerDown={event=>event.stopPropagation()}>
    <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#263a40] px-3 py-2">
      <Crosshair size={15} className="text-[#67e0e8]"/><div className="min-w-0 flex-1"><div className="text-[12px] font-semibold">{t('PTP teaching')}</div><div className="truncate text-[9px] text-white/50">{robot?.name ?? t('Select a robot in the scene')}</div></div>
      <button type="button" aria-label={t('Close PTP teaching')} onClick={onExit} className="rounded p-1 text-white/55 hover:bg-white/10 hover:text-white"><X size={15}/></button>
    </header>
    {!robot ? <p className="p-3 text-[11px] leading-relaxed text-white/65">{t('Select a robot in the scene to teach PTP positions.')}</p> : <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2.5 pb-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        <label className="flex items-center gap-1.5"><input aria-label={t('Enable PTP program')} type="checkbox" checked={program.enabled} disabled={robot.locked} onChange={e=>setProgram({...program,enabled:e.target.checked})}/>{t('Enable PTP program')}</label>
        <label className="flex items-center gap-1.5"><input aria-label={t('Repeat PTP sequence')} type="checkbox" checked={program.repeat} disabled={robot.locked} onChange={e=>setProgram({...program,repeat:e.target.checked})}/>{t('Repeat')}</label>
      </div>
      <p className="text-[10px] leading-relaxed text-white/50">{t('PTP runs instead of the task or script while enabled; disabling it restores them.')}</p>
      <div className="flex gap-1 rounded border border-white/10 bg-black/20 p-1">
        {(['jog','edit'] as const).map(m=><button key={m} type="button" aria-pressed={mode===m} onClick={()=>onMode(m)} className={cn('flex-1 rounded px-1 py-1.5 text-[10px]',mode===m?'bg-[#367887] text-white':'text-white/55 hover:bg-white/5')}>{t(m==='jog'?'Jog TCP':'Edit point')}</button>)}
      </div>
      <p className="text-[10px] leading-relaxed text-white/50">{t(mode==='jog'?'Drag the XYZ gizmo to move the robot. Teach or touch up to save its pose.':'Drag the selected marker gizmo to edit the point without moving the robot.')}</p>
      {running && <div className="rounded border border-amber-400/30 bg-amber-400/10 p-2 text-[10px] text-amber-200">{t('Pause simulation to jog.')} <button type="button" className="ml-1 underline" onClick={onPause}>{t('Pause')}</button></div>}
      {rt?.held && <p className="text-[10px] text-amber-200">{t('Release the held part before jogging.')}</p>}
      {robot.locked && <p className="text-[10px] text-amber-200">{t('Unlock the robot to edit its PTP program.')}</p>}
      <div className="rounded border border-white/10 bg-black/15 p-2">
        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase text-white/60">{t('Points in order')}</span><button type="button" onClick={add} disabled={!local||robot.locked} className={buttonClass}><Plus size={11} className="mr-1 inline"/>{t('Teach current TCP')}</button></div>
        <p className="mt-1 font-mono text-[9px] text-white/45">{t('TCP local (m)')}: {local ? local.map(n=>n.toFixed(3)).join(' / ') : '—'}</p>
        <div className="mt-2 max-h-[115px] space-y-1 overflow-y-auto">
          {!program.points.length && <p className="text-[10px] text-white/35">{t('No points yet. Teach the current TCP pose.')}</p>}
          {program.points.map((point,index)=><button key={point.id} type="button" aria-label={`${t('Select PTP point')} ${index+1}: ${point.name}`} onClick={()=>onPoint(point.id)} className={cn('flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[10px]',point.id===pointId?'bg-[#377a88]/70 text-white':'bg-white/5 text-white/65 hover:bg-white/10')}><span className="font-mono text-white/50">{index+1}</span><span className="min-w-0 flex-1 truncate">{point.name}</span>{rt&&!rt.reach(rt.toWorld(point.position))&&<span className="text-amber-300">{t('Unreachable')}</span>}</button>)}
        </div>
      </div>
      {selected && <div className="space-y-2 rounded border border-white/10 bg-black/15 p-2">
        <div className="flex items-center gap-1"><input aria-label={t('PTP point name')} className={inputClass} value={selected.name} disabled={robot.locked} maxLength={120} onChange={e=>updatePoint({name:e.target.value})}/>
          <button type="button" aria-label={t('Move point up')} disabled={robot.locked||program.points[0].id===selected.id} onClick={()=>move(-1)} className={buttonClass}><ArrowUp size={12}/></button>
          <button type="button" aria-label={t('Move point down')} disabled={robot.locked||program.points.at(-1)?.id===selected.id} onClick={()=>move(1)} className={buttonClass}><ArrowDown size={12}/></button>
          <button type="button" aria-label={t('Delete PTP point')} disabled={robot.locked} onClick={()=>{const points=program.points.filter(p=>p.id!==selected.id);setProgram({...program,points});onPoint(points[0]?.id ?? null);}} className={buttonClass}><Trash2 size={12}/></button>
        </div>
        <div className="grid grid-cols-3 gap-1">{(['X','Y','Z'] as const).map((axis,index)=><label key={axis} className="text-[9px] text-white/50">{axis} (m)<PtpNumberInput aria-label={`PTP ${axis}`} className={inputClass} step="0.01" value={selected.position[index]} disabled={robot.locked} onValueChange={n=>{const position=[...selected.position] as Vec3;position[index]=Math.max(-200,Math.min(200,n));updatePoint({position});}}/></label>)}</div>
        <div className="grid grid-cols-2 gap-2"><label className="text-[9px] text-white/50">{t('Speed (%)')}<PtpNumberInput aria-label={t('PTP speed (%)')} className={inputClass} min="1" max="100" value={selected.speed} disabled={robot.locked} onValueChange={n=>updatePoint({speed:Math.max(1,Math.min(100,n))})}/></label><label className="text-[9px] text-white/50">{t('Dwell (s)')}<PtpNumberInput aria-label={t('PTP dwell (s)')} className={inputClass} min="0" max="300" step="0.1" value={selected.dwell} disabled={robot.locked} onValueChange={n=>updatePoint({dwell:Math.max(0,Math.min(300,n))})}/></label></div>
        <button type="button" onClick={()=>local&&updatePoint({position:[...local]})} disabled={!local||robot.locked} className={`${buttonClass} w-full`}>{t('Touch up from TCP')}</button>
        {unreachable && <p role="alert" className="text-[10px] text-amber-300">{t('Target is outside robot reach.')}</p>}
      </div>}
      {feedback && <p role="status" className="text-[10px] text-amber-300">{t(feedback)}</p>}
      <p className="text-[9px] leading-relaxed text-white/40">{t('Dashed lines show point order, not the actual PTP trajectory. The simplified arm keeps its tool aligned with its local vertical.')}</p>
    </div>}
    <WindowResizeHandle frame={frame} onResize={setSize} minWidth={290} minHeight={260} withinParent />
  </div>;
}
