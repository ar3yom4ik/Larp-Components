import { useEffect, useRef, type RefObject } from 'react';
import { t } from '../i18n';

export interface WindowSize { width: number; height: number }
export interface WindowOffset { x: number; y: number }

type Edge = 'corner' | 'top-right' | 'top' | 'left';

/** A visible, touch- and keyboard-accessible resize grip for floating frames.
 * `delta` is relative to the size at the start of the gesture; centred windows
 * can translate by half this amount to keep their opposite corner fixed. */
export function WindowResizeHandle({ frame, onResize, minWidth = 280, minHeight = 200, margin = 12, edge = 'corner', withinParent = false, className = '' }: {
  frame: RefObject<HTMLElement | null>;
  onResize: (size: WindowSize, delta: WindowSize) => void;
  minWidth?: number;
  minHeight?: number;
  margin?: number;
  edge?: Edge;
  withinParent?: boolean;
  className?: string;
}) {
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const prepare = () => {
    const element = frame.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const parent = withinParent ? element.parentElement?.getBoundingClientRect() : null;
    const bounds = parent ?? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    const maxWidth = edge === 'left' ? rect.right - bounds.left - margin : bounds.right - rect.left - margin;
    const maxHeight = edge === 'top' || edge === 'top-right' ? rect.bottom - bounds.top - margin : bounds.bottom - rect.top - margin;
    // On a phone, a desktop minimum may exceed the whole viewport. Keep a
    // useful smaller minimum instead of making the resize grip immovable.
    const minW = maxWidth < minWidth ? Math.max(1, maxWidth * 0.7) : minWidth;
    const minH = maxHeight < minHeight ? Math.max(1, maxHeight * 0.7) : minHeight;
    return (dx: number, dy: number) => {
      const width = edge === 'top' ? rect.width : Math.max(minW, Math.min(maxWidth, rect.width + (edge === 'left' ? -dx : dx)));
      const height = edge === 'left' ? rect.height : Math.max(minH, Math.min(maxHeight, rect.height + (edge === 'top' || edge === 'top-right' ? -dy : dy)));
      const size = { width: Math.round(Math.max(1, width)), height: Math.round(Math.max(1, height)) };
      onResize(size, { width: size.width - rect.width, height: size.height - rect.height });
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const resize = prepare();
    if (!resize) return;
    event.preventDefault(); event.stopPropagation();
    cleanup.current?.();
    const x = event.clientX, y = event.clientY, pointerId = event.pointerId;
    const move = (next: PointerEvent) => { if (next.pointerId === pointerId) resize(next.clientX - x, next.clientY - y); };
    const end = (next: PointerEvent) => { if (next.pointerId === pointerId) cleanup.current?.(); };
    const oldSelect = document.body.style.userSelect;
    cleanup.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      document.body.style.userSelect = oldSelect;
      cleanup.current = null;
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 40 : 16;
    const dx = event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0;
    const dy = event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0;
    if ((!dx && !dy) || (edge === 'top' && !dy) || (edge === 'left' && !dx)) return;
    event.preventDefault(); event.stopPropagation();
    prepare()?.(dx, dy);
  };

  const position = edge === 'top'
    ? 'inset-x-12 top-0 h-4 cursor-row-resize'
    : edge === 'left' ? 'inset-y-12 left-0 w-4 cursor-col-resize'
      : edge === 'top-right' ? 'top-0 right-0 h-5 w-5 cursor-nesw-resize' : 'bottom-0 right-0 h-5 w-5 cursor-nwse-resize';
  return <div role="separator" aria-label={t('Resize window')} title={t('Drag or use arrow keys to resize')} tabIndex={0}
    onPointerDown={onPointerDown} onKeyDown={onKeyDown}
    className={`absolute z-50 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)] ${position} ${className}`}>
    {edge === 'corner' || edge === 'top-right' ? <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-full w-full text-white/50 ${edge === 'top-right' ? '-scale-y-100' : ''}`}><path d="M8 18 18 8M13 18l5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      : <span className={edge === 'top' ? 'mx-auto mt-1 block h-1 w-10 rounded bg-white/35' : 'absolute left-1 top-1/2 block h-10 w-1 -translate-y-1/2 rounded bg-white/35'} />}
  </div>;
}
