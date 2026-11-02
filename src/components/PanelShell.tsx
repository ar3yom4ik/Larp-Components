import { useRef, type ReactNode } from 'react';
import { Maximize2, Minimize2, PanelLeft, X } from 'lucide-react';
import { clampPanelSize, dockPanel, floatPanel, setPanel, useLayout, type PanelId } from '../layout';
import { t } from '../i18n';
import { cn } from '../utils/cn';
import { WindowResizeHandle } from './WindowResizeHandle';

/**
 * Frame around one dockable panel. Docked panels get a resize edge and a slim title
 * strip; floating panels become a movable, resizable window above the workspace.
 * The panel's own content keeps its internal header — this strip only carries the
 * window commands.
 */
export function PanelShell({ id, title, children, className, hiddenBelow }: {
  id: PanelId;
  title: string;
  children: ReactNode;
  /** Extra classes for the docked wrapper (responsive visibility). */
  className?: string;
  hiddenBelow?: 'lg' | 'xl';
}) {
  const layout = useLayout();
  const floatingFrame = useRef<HTMLDivElement>(null);
  const panel = layout[id];
  if (!panel.open) return null;
  const isDock = id === 'dock';

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX, startY = event.clientY;
    const base = panel.size;
    const move = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
      const delta = id === 'inspector' ? -dx : isDock ? -dy : dx;
      setPanel(id, { size: clampPanelSize(id, base + delta) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const startMove = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    const startX = event.clientX, startY = event.clientY;
    const base = { x: panel.x, y: panel.y };
    const move = (moveEvent: PointerEvent) => {
      setPanel(id, {
        x: Math.max(0, Math.min(Math.max(0, window.innerWidth - Math.min(panel.width, window.innerWidth)), base.x + moveEvent.clientX - startX)),
        y: Math.max(0, Math.min(Math.max(0, window.innerHeight - Math.min(panel.height, window.innerHeight)), base.y + moveEvent.clientY - startY)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const commands = (
    <div className="ml-auto flex items-center gap-0.5">
      <button
        type="button"
        aria-label={t(panel.floating ? 'Dock panel' : 'Detach panel')}
        title={t(panel.floating ? 'Dock panel' : 'Detach panel')}
        onClick={() => (panel.floating ? dockPanel(id) : floatPanel(id))}
        className="rounded p-0.5 text-white/40 transition hover:bg-white/10 hover:text-white"
      >
        {panel.floating ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
      </button>
      <button
        type="button"
        aria-label={`${t('Close')} ${t(title)}`}
        title={t('Close panel')}
        onClick={() => setPanel(id, { open: false })}
        className="rounded p-0.5 text-white/40 transition hover:bg-white/10 hover:text-white"
      >
        <X size={10} />
      </button>
    </div>
  );

  if (panel.floating) {
    return (
      <div
        ref={floatingFrame}
        role="dialog"
        aria-label={t(title)}
        data-floating-panel={id}
        className="fixed z-[80] flex flex-col overflow-hidden rounded-md border border-white/20 bg-[var(--panel-bg,#2d2d30)] shadow-[0_24px_60px_rgba(0,0,0,.55)]"
        style={{ left: panel.x, top: panel.y, width: panel.width, height: panel.height, maxWidth: '100vw', maxHeight: '100dvh' }}
      >
        <div
          onPointerDown={startMove}
          className="app-panel-head flex h-[22px] shrink-0 cursor-move items-center gap-1.5 border-b border-white/10 px-2 text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/55"
        >
          <PanelLeft size={10} className="text-[var(--app-accent-bright)]" />
          <span className="truncate">{t(title)}</span>
          {commands}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        <WindowResizeHandle frame={floatingFrame} minWidth={id === 'inspector' ? 230 : 220} minHeight={140} margin={0} onResize={(size) => setPanel(id, size)} />
      </div>
    );
  }

  return (
    <div
      data-docked-panel={id}
      className={cn('relative flex min-h-0 min-w-0 shrink-0 flex-col', hiddenBelow === 'lg' ? 'hidden lg:flex' : hiddenBelow === 'xl' ? 'hidden xl:flex' : 'flex', className)}
      style={isDock ? { height: panel.size } : { width: panel.size }}
    >
      <div className="app-panel-head flex h-[20px] shrink-0 items-center gap-1.5 border-b border-white/10 px-2 text-[9px] font-medium uppercase tracking-[0.14em] text-white/45">
        <span className="truncate">{t(title)}</span>
        {commands}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      <div
        role="separator"
        aria-label={t('Resize panel')}
        title={t('Drag to resize')}
        onPointerDown={startResize}
        className={cn(
          'absolute z-20 touch-none bg-transparent transition hover:bg-[var(--app-accent)]/40',
          isDock ? 'inset-x-0 top-0 h-1 cursor-row-resize' : id === 'inspector' ? 'inset-y-0 left-0 w-1 cursor-col-resize' : 'inset-y-0 right-0 w-1 cursor-col-resize',
        )}
      />
    </div>
  );
}

/** Toolbar buttons that re-open closed panels; shown in the ribbon and settings. */
export function PanelToggles() {
  const layout = useLayout();
  const names: { id: PanelId; label: string }[] = [
    { id: 'catalog', label: 'Catalog' },
    { id: 'inspector', label: 'Properties' },
    { id: 'dock', label: 'Output' },
  ];
  return (
    <div className="flex items-center gap-1">
      {names.map((entry) => (
        <button
          key={entry.id}
          type="button"
          aria-pressed={layout[entry.id].open}
          onClick={() => setPanel(entry.id, { open: !layout[entry.id].open })}
          className={cn(
            'rounded border px-1.5 py-0.5 text-[9.5px] transition',
            layout[entry.id].open ? 'border-[var(--app-accent)]/60 bg-[var(--app-accent)]/15 text-white' : 'border-white/15 text-white/45 hover:bg-white/10',
          )}
        >
          {t(entry.label)}
        </button>
      ))}
    </div>
  );
}

/** Small reusable drag hook for floating windows that are not dock panels. */
export function useWindowDrag(initial: { x: number; y: number }, onMove: (position: { x: number; y: number }) => void) {
  const start = useRef(initial);
  return (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    start.current = { ...initial };
    const startX = event.clientX, startY = event.clientY;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    const move = (moveEvent: PointerEvent) => {
      onMove({
        x: Math.max(0, Math.min(Math.max(0, window.innerWidth - Math.min(rect?.width ?? 120, window.innerWidth)), start.current.x + moveEvent.clientX - startX)),
        y: Math.max(0, Math.min(Math.max(0, window.innerHeight - Math.min(rect?.height ?? 60, window.innerHeight)), start.current.y + moveEvent.clientY - startY)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
}
