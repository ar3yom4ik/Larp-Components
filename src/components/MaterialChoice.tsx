import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { materialOptions, type MaterialOption } from '../data/materials';
import type { SceneItem } from '../types';
import { t } from '../i18n';

/** The same searchable, named preview picker is used by every material editor. */
export function MaterialPicker({value,options,onChange,label,disabled,placeholder='Choose a material',compact=false}: {
  value?:string; options:readonly MaterialOption[]; onChange:(option:MaterialOption | null)=>void;
  label:string; disabled?:boolean; placeholder?:string; compact?:boolean;
}) {
  const [open,setOpen]=useState(false), [query,setQuery]=useState('');
  const selected=options.find(option=>option.id===value);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q ? options.filter(option=>`${option.name} ${option.category} ${option.color}`.toLowerCase().includes(q)) : options;},[options,query]);
  const swatch=(option?:MaterialOption) => <span data-material-preview={option?.color ?? ''} aria-hidden="true" className="relative h-7 w-7 shrink-0 overflow-hidden rounded border border-white/20" style={{backgroundColor:option?.color ?? '#303238',backgroundImage:option?.preview ? `linear-gradient(135deg,rgba(255,255,255,.25),transparent 48%,rgba(0,0,0,.25)),url(${JSON.stringify(option.preview)})` : 'linear-gradient(135deg,rgba(255,255,255,.38),transparent 48%,rgba(0,0,0,.3))',backgroundSize:'cover',backgroundPosition:'center'}} />;
  return <div className="material-picker relative min-w-0" data-material-picker onPointerDown={event=>event.stopPropagation()} onDoubleClick={event=>event.stopPropagation()}>
    <button type="button" aria-label={label} aria-expanded={open} disabled={disabled} onClick={()=>{setOpen(!open);setQuery('');}} className={`flex w-full min-w-0 items-center gap-2 rounded border border-white/15 bg-[#222225] text-left text-white/85 hover:border-[var(--app-accent)]/60 disabled:opacity-40 ${compact?'px-1 py-0.5':'px-2 py-1.5'}`}>
      {swatch(selected)}<span className="min-w-0 flex-1"><span className="block truncate text-[11px]">{selected ? t(selected.name) : value || t(placeholder)}</span>{!compact && selected && <span className="block truncate font-mono text-[9px] text-white/40">{t(selected.category)} · {selected.color}</span>}</span><ChevronDown size={12} className="shrink-0 text-white/45" />
    </button>
    {open && <div className="relative z-30 mt-1 overflow-hidden rounded border border-[var(--app-accent)]/45 bg-[#202023] shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-1.5"><Search size={12} className="shrink-0 text-white/40"/><input autoFocus aria-label={t('Search materials')} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}} placeholder={t('Search materials...')} className="w-full min-w-0 bg-transparent text-[10px] outline-none"/><button type="button" aria-label={t('Close')} onClick={()=>setOpen(false)}><X size={12}/></button></div>
      <div role="listbox" aria-label={label} className="thin-scroll max-h-48 overflow-y-auto p-1">
        {filtered.map(option=><button type="button" role="option" aria-selected={option.id===value} data-material-option={option.id} key={option.id} onClick={()=>{onChange(option);setOpen(false);}} className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-[var(--app-accent)]/20">
          {swatch(option)}<span className="min-w-0 flex-1"><span className="block truncate text-[10.5px] text-white/85">{t(option.name)}</span><span className="block truncate text-[9px] text-white/35">{t(option.category)} · {option.color}</span></span>{option.id===value && <Check size={12} className="shrink-0 text-[var(--green)]" />}
        </button>)}
        {!filtered.length && <p className="p-3 text-center text-[10px] text-white/40">{t('No matching materials')}</p>}
      </div>
    </div>}
  </div>;
}

/** Color sensors compare base colors, not texture pixels or illumination. */
export function MaterialChoice({value,choiceId,onChange,items,label,disabled}: {
  value?:string; choiceId?:string; onChange:(color:string,choiceId?:string)=>void;
  items:readonly SceneItem[]; label:string; disabled?:boolean;
}) {
  const options=useMemo(()=>materialOptions(items),[items]);
  const selected=options.find(option=>option.id===choiceId) ?? options.find(option=>option.color.toLowerCase()===value?.toLowerCase());
  const all=selected || !value ? options : [{id:`custom:${value}`,name:value,color:value,category:'Custom color'},...options];
  return <MaterialPicker label={label} disabled={disabled} value={selected?.id ?? (value ? `custom:${value}` : undefined)} options={all} onChange={option=>onChange(option?.color ?? '',option?.id)} />;
}

export function SurfaceMaterialChoice({value,onChange,items,label,disabled,compact}: {
  value:string; onChange:(value:string)=>void; items:readonly SceneItem[]; label:string; disabled?:boolean; compact?:boolean;
}) {
  const options=useMemo(()=>materialOptions(items),[items]);
  return <MaterialPicker label={label} disabled={disabled} compact={compact} value={value} options={options} onChange={option=>option && onChange(option.id)} />;
}
