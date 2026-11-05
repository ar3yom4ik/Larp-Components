import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { cleanPtpPoints, newPtpPoint } from '../../utils/ptp';
import { getNodeDef } from '../../gen/graph/registry';
import { channelColor, channelMode, signalRows } from '../../gen/graph/signal';
import { signalAcceptsInput, signalFunction, signalFunctions } from '../../utils/signalChannels';
import { MaterialChoice, SurfaceMaterialChoice } from '../MaterialChoice';
import { ProductPicker } from '../ProductPicker';
import { PalletFillPicker } from '../PalletFillPicker';
import { PtpNumberInput } from '../PtpNumberInput';
import type { PtpPoint, SceneItem, Vec3 } from '../../types';
import type { GraphNode, NodeGraph, ParamDef } from '../../gen/graph/types';
import { t } from '../../i18n';
import { cn } from '../../utils/cn';

/**
 * Parameter editor for the selected node.
 *
 * Values shown are `params[key] ?? def.default`, but only the ones the user changes are
 * written to the node — that is what lets an untouched node yield to the prompt.
 */
export function NodeInspector({
  node,
  graph,
  items = [],
  onChannelChange,
  onChange,
  onReset,
  onDelete,
  onClose,
}: {
  node: GraphNode | null;
  graph: NodeGraph;
  onChannelChange: (port: number, patch: {mode?: string; color?: string; material?: string; materialRef?:string; programSource?:string; programTarget?:string; programMode?:string}) => void;
  items?: readonly SceneItem[];
  onChange: (key: string, value: unknown) => void;
  onReset: (key: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-[11px] text-white/35">{t('Select a node to edit its settings.')}</p>
        <p className="text-[10px] leading-relaxed text-white/25">
          {t('Drag from an output port to an input port to wire sections together. Every node is one part of the factory.')}
        </p>
      </div>
    );
  }
  const def = getNodeDef(node.type);
  if (!def) return <p className="p-3 text-[11px] text-red-300">{t('Unknown node type')}</p>;

  const value = (param: ParamDef) => node.params[param.key] ?? param.default;
  const isSet = (param: ParamDef) => node.params[param.key] !== undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start gap-2 border-b border-white/10 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-white/90">{t(node.title ?? def.title)}</div>
          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-[var(--app-accent-bright)]/70">{t(def.category)} · {def.type}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded px-1.5 text-[10px] text-white/35 hover:bg-white/10 hover:text-white">×</button>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <p className="mb-3 text-[10px] leading-relaxed text-white/40">{t(def.description)}</p>

        {def.params.length === 0 && <p className="text-[10.5px] text-white/30">{t('This node has no settings; it uses whatever is wired into it.')}</p>}

        <div className="space-y-2.5">
          {def.params.filter(param => !param.hidden).map((param) => (
            <div key={param.key} className="block" title={param.help ? t(param.help) : undefined}>
              <span className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-white/45">{t(param.label)}</span>
                {isSet(param) && (
                  <span className="flex items-center gap-1">
                    <span className="rounded bg-[var(--app-accent)]/20 px-1 font-mono text-[7px] uppercase text-[var(--app-accent-bright)]">{t('set')}</span>
                    <button type="button" onClick={(event) => { event.preventDefault(); onReset(param.key); }} aria-label={`${t('Reset')} ${t(param.label)}`} className="text-white/30 hover:text-white"><RotateCcw size={9} /></button>
                  </span>
                )}
              </span>

              {param.kind === 'boolean' && (
                <input type="checkbox" aria-label={t(param.label)} checked={Boolean(value(param))} onChange={(event) => onChange(param.key, event.target.checked)} className="h-4 w-4 accent-[var(--app-accent)]" />
              )}

              {param.kind === 'string' && (
                <input type="text" aria-label={t(param.label)} value={String(value(param) ?? '')} onChange={event => onChange(param.key,event.target.value)} className="w-full rounded border border-white/12 bg-[#1e1e20] px-2 py-1.5 text-[11px] text-white/85" />
              )}

              {param.kind === 'color' && (
                <input type="color" aria-label={t(param.label)} value={String(value(param) ?? '#4da9d8')} onChange={event => onChange(param.key,event.target.value)} className="h-8 w-12 cursor-pointer rounded border border-white/15 bg-transparent" />
              )}

              {param.kind === 'nodeRef' && (
                <select aria-label={t(param.label)} value={String(value(param))} onChange={event => onChange(param.key,event.target.value)} className="w-full rounded border border-white/12 bg-[#1e1e20] px-2 py-1.5 text-[11px] text-white/85">
                  {param.key !== 'inspectSensor' && <option value="auto">{t('Automatic')}</option>}<option value="none">{t(param.key === 'inspectSensor' ? 'No inspection' : 'Free standing')}</option>
                  {graph.nodes.filter(entry => entry.type === (param.key === 'inspectSensor' ? 'part.color-sensor' : 'part.conveyor')).map(entry => <option key={entry.id} value={entry.id}>{entry.title || `${t(param.key === 'inspectSensor' ? 'Color sensor' : 'Conveyor')} · ${entry.id}`}</option>)}
                </select>
              )}

              {param.kind === 'text' && (
                <textarea
                  value={String(value(param) ?? '')}
                  onChange={(event) => onChange(param.key, event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded border border-white/12 bg-[#1e1e20] px-2 py-1.5 text-[11px] leading-snug text-white/85 outline-none focus:border-[var(--app-accent)]/60"
                />
              )}

              {(param.kind === 'number' || param.kind === 'seed') && (
                <span className="flex items-center gap-2">
                  <input
                    type="range"
                    min={param.min ?? 0}
                    max={param.max ?? 100}
                    step={param.step ?? 1}
                    value={Number(value(param))}
                    onChange={(event) => onChange(param.key, Number(event.target.value))}
                    className="accent-range min-w-0 flex-1"
                  />
                  <input
                    type="number"
                    aria-label={t(param.label)}
                    step={param.step ?? 1}
                    min={param.unbounded ? undefined : param.min}
                    max={param.unbounded ? undefined : param.max}
                    value={Number(value(param))}
                    onChange={(event) => onChange(param.key, param.unbounded ? Number(event.target.value) : Math.max(param.min ?? 0, Math.min(param.max ?? 9999, Number(event.target.value))))}
                    className="w-14 rounded border border-white/12 bg-[#1e1e20] px-1 py-1 text-right font-mono text-[10.5px] text-white/85"
                  />
                </span>
              )}

              {param.kind === 'select' && param.key !== 'surfaceMaterial' && (
                <select
                  aria-label={t(param.label)}
                  value={String(value(param))}
                  onChange={(event) => onChange(param.key, event.target.value)}
                  className="w-full rounded border border-white/12 bg-[#1e1e20] px-2 py-1.5 text-[11px] text-white/85"
                >
                  {(param.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.value === 'auto' ? t('Recipe default') : t(option.label)}</option>)}
                </select>
              )}

              {param.key === 'surfaceMaterial' && <SurfaceMaterialChoice label={t(param.label)} value={String(value(param))} items={items} onChange={next=>onChange(param.key,next)} />}

              {param.kind === 'ptp-points' && <NodePtpPoints value={value(param)} onChange={next=>onChange(param.key,next)} />}
              {param.kind === 'product-list' && <PalletFillPicker value={value(param)} fallback={String(node.params.product ?? 'carton')} items={items} onChange={next => onChange(param.key,next)} />}
              {param.kind === 'product' && (
                <ProductPicker value={String(value(param))} onChange={(next) => onChange(param.key, next)} label={param.label} showLabel={false} allowAuto={param.default === 'auto'} allowAny={param.key === 'inputProduct'} items={items} />
              )}
            </div>
          ))}
        </div>

        {signalRows(graph,node).length > 0 && <div className="mt-4 space-y-2 border-t border-white/10 pt-3" data-node-signal-settings>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{t('Signal I/O')}</div>
          <p className="text-[9px] leading-relaxed text-white/40">{t(signalAcceptsInput(node.type) ? 'Each numbered pair has its own function and output colour. A new pair appears when a port is connected.' : 'Each output has its own function and wire colour. Sensors and buttons have no signal inputs.')}</p>
          {signalRows(graph,node).map(port => <div key={port} className="rounded border border-white/10 bg-black/10 p-2">
            <div className="mb-1 text-[10px] text-white/65">{signalAcceptsInput(node.type) ? `IN ${port} → OUT ${port}` : `OUT ${port}`}</div>
            <select aria-label={`${t('Signal function')} ${port}`} value={channelMode(node,port)} onChange={event => onChannelChange(port,{mode:event.target.value})} className="w-full rounded border border-white/12 bg-[#1e1e20] px-1.5 py-1 text-[10px] text-white/85">
              {signalFunctions(node.type).filter(option => signalAcceptsInput(node.type) || option.value === channelMode(node,port) || !['relay','invert'].includes(option.value)).map(option => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
            </select>
            <p className="mt-1 text-[9px] leading-relaxed text-white/40">{t(signalFunction(node.type,channelMode(node,port))?.help ?? '')}</p>
            {node.type === 'part.color-sensor' && <div className="mt-2"><MaterialChoice label={`${t('Material')} ${port}`} value={node.io?.[String(port)]?.material} choiceId={node.io?.[String(port)]?.materialRef} items={items} onChange={(material,materialRef) => onChannelChange(port,{material:material || undefined,materialRef})} /></div>}
            {node.type === 'part.robot' && <div className="mt-2 space-y-1.5 rounded border border-white/10 p-1.5">
              <div className="text-[9px] text-white/55">{t('Visual workflow for input')} {port}</div>
              <select aria-label={`${t('Input source')} ${port}`} value={node.io?.[String(port)]?.programSource ?? ''} onChange={event => onChannelChange(port,{programSource:event.target.value || undefined})} className="w-full rounded border border-white/12 bg-[#1e1e20] p-1 text-[10px] text-white/85"><option value="">{t('Default source')}</option>{graph.nodes.filter(candidate=>['part.conveyor','part.machine','part.pallet'].includes(candidate.type)).map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.title ?? getNodeDef(candidate.type)?.title} · {candidate.id.slice(-6)}</option>)}</select>
              <select aria-label={`${t('Input destination')} ${port}`} value={node.io?.[String(port)]?.programTarget ?? ''} onChange={event => onChannelChange(port,{programTarget:event.target.value || undefined})} className="w-full rounded border border-white/12 bg-[#1e1e20] p-1 text-[10px] text-white/85"><option value="">{t('Default destination')}</option>{graph.nodes.filter(candidate=>['part.conveyor','part.machine','part.pallet'].includes(candidate.type)).map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.title ?? getNodeDef(candidate.type)?.title} · {candidate.id.slice(-6)}</option>)}</select>
              <select aria-label={`${t('Input workflow')} ${port}`} value={node.io?.[String(port)]?.programMode ?? ''} onChange={event => onChannelChange(port,{programMode:event.target.value || undefined})} className="w-full rounded border border-white/12 bg-[#1e1e20] p-1 text-[10px] text-white/85"><option value="">{t('Default workflow')}</option>{['transfer','palletize','tend','paint','assemble'].map(mode=><option key={mode} value={mode}>{t(mode)}</option>)}</select>
            </div>}
            <label className="mt-2 flex items-center justify-between gap-2 text-[9px] text-white/55"><span>{t('Output colour')} {port}</span>
              <input type="color" aria-label={`${t('Output colour')} ${port}`} value={channelColor(node,port)} onChange={event => onChannelChange(port,{color:event.target.value})} className="h-7 w-10 cursor-pointer rounded border border-white/15 bg-transparent" />
            </label>
            {node.io?.[String(port)]?.color && <button type="button" onClick={() => onChannelChange(port,{color:undefined})} className="mt-1 text-[9px] text-white/45 underline hover:text-white">{t('Use component wire colour')}</button>}
          </div>)}
        </div>}

        {!node.type.startsWith('part.') && <div className={cn('mt-4 rounded border px-2 py-1.5 text-[9px] leading-relaxed', 'border-white/10 bg-white/[0.03] text-white/35')}>
          {t('Values you change here override what the prompt asked for. Untouched values follow the prompt, then the defaults.')}
        </div>}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2">
        <button type="button" onClick={onDelete} className="flex w-full items-center justify-center gap-1.5 rounded border border-red-400/30 py-1.5 text-[10.5px] text-red-300 hover:bg-red-400/10">
          <Trash2 size={11} /> {t('Delete node')}
        </button>
      </div>
    </div>
  );
}


/** Numeric authoring in AI Factory; points are later editable with the 3D teach pendant. */
function NodePtpPoints({value,onChange}:{value:unknown;onChange:(value:string)=>void}) {
  let points:PtpPoint[]=[];let invalid=false;
  try {points=cleanPtpPoints(value);} catch {invalid=true;}
  const save=(next:PtpPoint[])=>onChange(JSON.stringify(next));
  const edit=(index:number,patch:Partial<PtpPoint>)=>save(points.map((point,i)=>i===index?{...point,...patch}:point));
  const reorder=(index:number,direction:number)=>{const other=index+direction;if(other<0||other>=points.length)return;const next=[...points];[next[index],next[other]]=[next[other],next[index]];save(next);};
  const input='w-full min-w-0 rounded border border-white/12 bg-[#1e1e20] px-1 py-1 font-mono text-[10px] text-white/85';
  const button='rounded border border-white/12 bg-white/5 px-1.5 py-1 text-white/65 hover:bg-white/10 disabled:opacity-30';
  return <div className="space-y-2 rounded border border-white/10 bg-black/10 p-2" data-node-ptp-points>
    <p className="text-[9px] leading-relaxed text-white/45">{t('Robot-local metres. Points execute in order using joint-space PTP.')}</p>
    {invalid&&<p role="alert" className="text-[10px] text-amber-300">{t('Invalid PTP points.')}</p>}
    {points.map((point,index)=><div key={point.id} className="space-y-1 rounded border border-white/10 p-1.5">
      <div className="flex items-center gap-1"><span className="font-mono text-[9px] text-white/45">{index+1}</span><input aria-label={`${t('PTP point name')} ${index+1}`} className={input} value={point.name} maxLength={120} onChange={e=>edit(index,{name:e.target.value})}/>
        <button type="button" aria-label={`${t('Move point up')} ${index+1}`} disabled={index===0} className={button} onClick={()=>reorder(index,-1)}><ArrowUp size={10}/></button>
        <button type="button" aria-label={`${t('Move point down')} ${index+1}`} disabled={index===points.length-1} className={button} onClick={()=>reorder(index,1)}><ArrowDown size={10}/></button>
        <button type="button" aria-label={`${t('Delete PTP point')} ${index+1}`} className={button} onClick={()=>save(points.filter((_,i)=>i!==index))}><Trash2 size={10}/></button>
      </div>
      <div className="grid grid-cols-3 gap-1">{(['X','Y','Z'] as const).map((axis,i)=><label key={axis} className="text-[9px] text-white/45">{axis}<PtpNumberInput aria-label={`Node PTP ${index+1} ${axis}`} step="0.01" value={point.position[i]} className={input} onValueChange={n=>{const position=[...point.position] as Vec3;position[i]=Math.max(-200,Math.min(200,n));edit(index,{position});}}/></label>)}</div>
      <div className="grid grid-cols-2 gap-1"><label className="text-[9px] text-white/45">{t('Speed (%)')}<PtpNumberInput aria-label={`${t('PTP speed (%)')} ${index+1}`} className={input} min="1" max="100" value={point.speed} onValueChange={n=>edit(index,{speed:Math.max(1,Math.min(100,n))})}/></label><label className="text-[9px] text-white/45">{t('Dwell (s)')}<PtpNumberInput aria-label={`${t('PTP dwell (s)')} ${index+1}`} className={input} min="0" max="300" step=".1" value={point.dwell} onValueChange={n=>edit(index,{dwell:Math.max(0,Math.min(300,n))})}/></label></div>
    </div>)}
    <button type="button" onClick={()=>save([...points,newPtpPoint([1.2,1.4,0],points.length)])} className={`${button} flex w-full items-center justify-center gap-1 text-[10px]`}><Plus size={11}/>{t('Add PTP point')}</button>
  </div>;
}
