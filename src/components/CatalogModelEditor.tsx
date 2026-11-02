import {useRef,useState} from 'react';
import {X} from 'lucide-react';
import type {SceneItem} from '../types';
import {t} from '../i18n';
import {ModelMaterialEditor} from './ModelMaterialEditor';
import {WindowResizeHandle,type WindowSize} from './WindowResizeHandle';

/** Edits the shared imported asset, rather than a single placement. */
export function CatalogModelEditor({item,onUpdate,onBeginEdit,onClose}:{item:SceneItem;onUpdate:(id:string,changes:Partial<SceneItem>,record?:boolean)=>boolean|void;onBeginEdit:()=>void;onClose:()=>void}) {
  const frame=useRef<HTMLDivElement>(null), [size,setSize]=useState<WindowSize|null>(null);
  return <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/55 p-3" onPointerDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div ref={frame} role="dialog" aria-label={t('Edit catalog model')} style={{width:size?.width??'min(560px,calc(100vw - 24px))',height:size?.height??'min(720px,calc(100dvh - 24px))'}} className="relative flex min-h-0 flex-col overflow-hidden rounded border border-white/15 bg-[#29292d] shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/10 p-3"><div><h2 className="text-sm text-white">{t('Edit catalog model')} · {item.name}</h2><p className="text-[10px] text-white/45">{t('Changes apply to every instance of this imported asset.')}</p></div><button type="button" aria-label={t('Close')} onClick={onClose} className="p-2 text-white/60"><X size={16}/></button></header>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto"><section className="grid grid-cols-2 gap-3 border-b border-white/10 px-3 py-3">
        <label className="text-[10px] text-white/55">{t('Physics mode')}<select aria-label={t('Shared physics mode')} value={String(item.props.physicsMode ?? 'legacy')} onChange={event=>onUpdate(item.id,{props:{...item.props,physicsMode:event.target.value}})} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white"><option value="legacy">{t('Standard')}</option><option value="kinematic">{t('Kinematic')}</option><option value="dynamic">{t('Dynamic')}</option></select></label>
        <label className="text-[10px] text-white/55">{t('Collision shape')}<select aria-label={t('Shared collision shape')} value={String(item.props.collisionShape ?? 'accurate')} onChange={event=>onUpdate(item.id,{props:{...item.props,collisionShape:event.target.value}})} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white"><option value="accurate">{t('Accurate')}</option><option value="box">{t('Box')}</option></select></label>
        <label className="text-[10px] text-white/55">{t('Mass (kg)')}<input aria-label={t('Shared mass (kg)')} type="number" min="0.01" max="1000000" step="0.1" value={Number(item.props.physicsMass ?? 1)} onFocus={onBeginEdit} onChange={event=>onUpdate(item.id,{props:{...item.props,physicsMass:Math.max(.01,Math.min(1000000,Number(event.target.value)||.01))}},false)} className="mt-1 w-full rounded border border-white/15 bg-[#202023] p-2 text-white"/></label>
      </section><ModelMaterialEditor item={item} onUpdate={onUpdate} onBeginEdit={onBeginEdit}/></div>
      <WindowResizeHandle frame={frame} minWidth={320} minHeight={260} onResize={setSize}/>
    </div>
  </div>;
}
