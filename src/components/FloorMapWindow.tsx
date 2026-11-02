import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import type { BuildingSettings } from '../theme';
import type { SceneItem } from '../types';
import { FloorPlanView } from './FloorPlanView';
import { useWindowDrag } from './PanelShell';
import { t } from '../i18n';
import { WindowResizeHandle } from './WindowResizeHandle';

/**
 * Detached floor map. It is a real window: drag the title bar to move it, drag the
 * bottom-right corner to resize it. Double-clicking an object selects it in the scene.
 */
export function FloorMapWindow({ open, onClose, items, selectedId, onSelect, building }: {
  open: boolean;
  onClose: () => void;
  items: SceneItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  building: BuildingSettings;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 660, height: 460 });

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const width = Math.min(size.width, Math.max(1, window.innerWidth - 32));
    const height = Math.min(size.height, Math.max(1, window.innerHeight - 32));
    setSize({ width, height });
    setPosition({ x: Math.max(16, Math.round((window.innerWidth - width) / 2)), y: Math.min(Math.max(16, Math.round(window.innerHeight / 5)), Math.max(16, window.innerHeight - height - 16)) });
    // Reopening keeps the chosen size while bringing the window back into view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fit = () => {
      const rect = frame.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(rect.width, Math.max(1, window.innerWidth - 32));
      const height = Math.min(rect.height, Math.max(1, window.innerHeight - 32));
      setSize({ width, height });
      setPosition((current) => ({ x: Math.max(0, Math.min(current.x, window.innerWidth - width)), y: Math.max(0, Math.min(current.y, window.innerHeight - height)) }));
    };
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open]);

  const startDrag = useWindowDrag(position, setPosition);
  if (!open) return null;

  const robots = items.filter((item) => ['robot', 'cobot', 'kuka', 'fanuc'].includes(item.kind)).length;
  const workers = items.filter((item) => item.kind === 'operator' || item.kind === 'mobile-robot').length;

  return (
    <div
      ref={frame}
      role="dialog"
      aria-label={t('Floor map')}
      data-floor-map-window
      className="fixed z-[86] flex flex-col overflow-hidden rounded-md border border-white/20 bg-[#23262a] shadow-[0_28px_70px_rgba(0,0,0,.6)]"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      <div onPointerDown={startDrag} className="flex h-8 shrink-0 cursor-move items-center gap-2 border-b border-white/10 bg-[#2c3036] px-3">
        <MapIcon size={13} className="text-[var(--app-accent-bright)]" />
        <span className="text-[11.5px] font-medium text-white/85">{t('Floor map')}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">{building.width.toFixed(0)} × {building.depth.toFixed(0)} m</span>
        <button type="button" onClick={onClose} aria-label={t('Close')} className="ml-auto rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"><X size={13} /></button>
      </div>
      <div className="min-h-0 flex-1">
        <FloorPlanView items={items} selectedId={selectedId} onSelect={onSelect} width={size.width} height={size.height - 62} showLegend />
      </div>
      <div className="flex h-[26px] shrink-0 items-center gap-3 border-t border-white/10 bg-[#1e2126] px-3 font-mono text-[9px] uppercase tracking-wider text-white/45">
        <span>{items.length} {t('components')}</span>
        <span>{robots} {t('robots')}</span>
        <span>{workers} {t('workers')}</span>
        <span className="ml-auto normal-case tracking-normal text-white/30">{t('Click an object to select it')}</span>
      </div>
      <WindowResizeHandle frame={frame} minWidth={320} minHeight={220} margin={0} onResize={setSize} />
    </div>
  );
}
