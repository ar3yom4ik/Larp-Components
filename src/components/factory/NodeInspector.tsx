import { RotateCcw, Trash2 } from 'lucide-react';
import { getNodeDef } from '../../gen/graph/registry';
import { ProductPicker } from '../ProductPicker';
import type { SceneItem } from '../../types';
import type { GraphNode, ParamDef } from '../../gen/graph/types';
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
  items = [],
  onChange,
  onReset,
  onDelete,
  onClose,
}: {
  node: GraphNode | null;
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
          {def.params.map((param) => (
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
                <input type="checkbox" checked={Boolean(value(param))} onChange={(event) => onChange(param.key, event.target.checked)} className="h-4 w-4 accent-[var(--app-accent)]" />
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
                    min={param.unbounded ? undefined : param.min}
                    max={param.unbounded ? undefined : param.max}
                    value={Number(value(param))}
                    onChange={(event) => onChange(param.key, param.unbounded ? Number(event.target.value) : Math.max(param.min ?? 0, Math.min(param.max ?? 9999, Number(event.target.value))))}
                    className="w-14 rounded border border-white/12 bg-[#1e1e20] px-1 py-1 text-right font-mono text-[10.5px] text-white/85"
                  />
                </span>
              )}

              {param.kind === 'select' && (
                <select
                  value={String(value(param))}
                  onChange={(event) => onChange(param.key, event.target.value)}
                  className="w-full rounded border border-white/12 bg-[#1e1e20] px-2 py-1.5 text-[11px] text-white/85"
                >
                  {(param.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.value === 'auto' ? t('Recipe default') : t(option.label)}</option>)}
                </select>
              )}

              {param.kind === 'product' && (
                <ProductPicker value={String(value(param))} onChange={(next) => onChange(param.key, next)} label={param.label} showLabel={false} allowAuto={param.default === 'auto'} allowAny={param.key === 'inputProduct'} items={items} />
              )}
            </div>
          ))}
        </div>

        <div className={cn('mt-4 rounded border px-2 py-1.5 text-[9px] leading-relaxed', 'border-white/10 bg-white/[0.03] text-white/35')}>
          {t('Values you change here override what the prompt asked for. Untouched values follow the prompt, then the defaults.')}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2">
        <button type="button" onClick={onDelete} className="flex w-full items-center justify-center gap-1.5 rounded border border-red-400/30 py-1.5 text-[10.5px] text-red-300 hover:bg-red-400/10">
          <Trash2 size={11} /> {t('Delete node')}
        </button>
      </div>
    </div>
  );
}
