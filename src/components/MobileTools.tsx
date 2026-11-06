import { ArrowLeftRight, BookOpen, Boxes, ClipboardPaste, Copy, Focus, Grid2X2, LayoutGrid, Minus, Plus, RotateCcw, Share2, Trash2, Wand2 } from 'lucide-react';
import type { ComponentType } from 'react';
import type { SceneItem } from '../types';
import { t } from '../i18n';

interface Props {
  selected: SceneItem | null; selectedPoint: number | null; snap: boolean;
  onSnap: () => void; onCopy: () => void; onPaste: () => void; onDuplicate: () => void; onDelete: () => void;
  onAddPoint: () => void; onRemovePoint: () => void; onReversePath: () => void;
  onImportModel: () => void;
  onAutoArrange: () => void; onReset: () => void; onLayouts: () => void; onApi: () => void; onShare: () => void; onProperties: () => void;
}

/** Touch access to actions that otherwise live in the desktop ribbon. */
export function MobileTools(props: Props) {
  const isPath = !!props.selected && ['conveyor', 'roller', 'fence', 'wall'].includes(props.selected.kind);
  const action = (label: string, Icon: ComponentType<{size?: number}>, fn: () => void, disabled = false, detail?: string) =>
    <button type="button" onClick={fn} disabled={disabled} className="flex min-h-[53px] items-center gap-3 rounded border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/10 disabled:opacity-30">
      <span className="text-[var(--app-accent-bright)]"><Icon size={17} /></span><span className="min-w-0 flex-1">{t(label)}{detail && <span className="mt-0.5 block text-[10px] text-white/40">{detail}</span>}</span>
    </button>;
  return <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">
    <div className="mb-4 rounded border border-white/10 bg-black/20 px-3 py-2.5"><div className="text-[10px] uppercase tracking-wider text-white/40">{t('Selected component')}</div><div className="mt-1 text-[13px] text-white/90">{props.selected?.name || t('Nothing selected')}</div></div>
    <h3 className="mb-2 text-[10px] uppercase tracking-wider text-white/40">{t('Edit & arrange')}</h3>
    <div className="grid grid-cols-2 gap-2">
      {action('Snap 0.25 m', Grid2X2, props.onSnap, false, props.snap ? t('On') : t('off'))}
      {action('Auto-arrange', Wand2, props.onAutoArrange)}
      {action('Copy', Copy, props.onCopy, !props.selected)}
      {action('Paste', ClipboardPaste, props.onPaste)}
      {action('Duplicate', Copy, props.onDuplicate, !props.selected)}
      {action('Delete', Trash2, props.onDelete, !props.selected)}
    </div>
    <h3 className="mb-2 mt-5 text-[10px] uppercase tracking-wider text-white/40">{t('Path editing')}</h3>
    <div className="grid grid-cols-2 gap-2">
      {action('Add point', Plus, props.onAddPoint, !isPath)}
      {action('Remove point', Minus, props.onRemovePoint, !isPath || props.selectedPoint === null)}
      {action('Reverse flow', ArrowLeftRight, props.onReversePath, !isPath)}
      {action('Properties', Focus, props.onProperties, !props.selected)}
    </div>
    <h3 className="mb-2 mt-5 text-[10px] uppercase tracking-wider text-white/40">{t('Project & simulation')}</h3>
    <div className="grid grid-cols-2 gap-2">
      {action('Import 3D model', Boxes, props.onImportModel)}
      {action('Reset simulation', RotateCcw, props.onReset)}
      {action('Browse layouts', LayoutGrid, props.onLayouts)}
      {action('API reference', BookOpen, props.onApi)}
      {action('Copy share link', Share2, props.onShare)}
    </div>
  </div>;
}
