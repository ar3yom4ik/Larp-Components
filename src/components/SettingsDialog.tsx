import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GripHorizontal, X } from "lucide-react";
import { closeSettings, setSettingsDim, setSettingsOffset, setSettingsSize, useSettingsWindow } from "../settingsWindow";
import { t } from "../i18n";
import { cn } from "../utils/cn";
import { WindowResizeHandle } from "./WindowResizeHandle";

/**
 * Floating frame for the settings window.
 *
 * Two things the old modal could not do: it is draggable by its header (double-click the
 * header to re-centre), and the backdrop can be switched off so the factory stays visible
 * while lighting and shadow settings are being tuned. The offset and the dim flag are
 * remembered between sessions in `settingsWindow.ts`.
 */
export function SettingsDialog({ children }: { children: ReactNode }) {
  const { offset, size, dim } = useSettingsWindow();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Keep the window reachable: clamp the drag so at least the header stays on screen.
  const clamp = useCallback((next: { x: number; y: number }) => {
    const rect = frame.current?.getBoundingClientRect();
    const width = rect?.width ?? 900;
    const height = rect?.height ?? 600;
    const maxX = Math.max(0, (window.innerWidth - width) / 2) + 40;
    const maxY = Math.max(0, (window.innerHeight - height) / 2) + 8;
    return {
      x: Math.round(Math.max(-maxX, Math.min(maxX, next.x))),
      y: Math.round(Math.max(-maxY, Math.min(maxY, next.y))),
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Ignore the close button and anything interactive inside the header.
    if ((event.target as HTMLElement).closest("button, input, label, select, textarea, a")) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset?.x ?? 0,
      originY: offset?.y ?? 0,
    };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    setSettingsOffset(clamp({ x: state.originX + event.clientX - state.startX, y: state.originY + event.clientY - state.startY }));
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  // A saved position from a larger screen must not strand the title bar after
  // opening the window, resizing it, or changing the browser viewport.
  useEffect(() => {
    const keepReachable = () => {
      if (!offset) return;
      const next = clamp(offset);
      if (next.x !== offset.x || next.y !== offset.y) setSettingsOffset(next);
    };
    keepReachable();
    window.addEventListener("resize", keepReachable);
    return () => window.removeEventListener("resize", keepReachable);
  }, [clamp, offset, size]);

  // The Escape key closes the window even with the backdrop disabled.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeSettings(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={cn("fixed inset-0 z-[95] flex items-center justify-center p-4", dim ? "bg-black/60" : "pointer-events-none")}
      onPointerDown={(event) => { if (dim && event.target === event.currentTarget) closeSettings(); }}
      data-settings-backdrop
    >
      <div
        ref={frame}
        role="dialog"
        aria-modal={dim}
        aria-label={t("Settings")}
        style={{
          width: size?.width ?? 'min(980px, calc(100vw - 32px))',
          height: size?.height ?? 'min(700px, 90dvh)',
          maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100dvh - 32px)',
          transform: `translate(${offset?.x ?? 0}px, ${offset?.y ?? 0}px)`,
        }}
        className={cn(
          "pointer-events-auto relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-[#2b2b2e] shadow-2xl",
          !dim && "ring-1 ring-white/10",
        )}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => setSettingsOffset(null)}
          title={t("Drag to move")}
          className={cn(
            "flex h-9 shrink-0 cursor-grab select-none items-center gap-2 border-b border-white/10 bg-black/25 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/50",
            dragging && "cursor-grabbing",
          )}
        >
          <GripHorizontal size={13} className="text-white/35" />
          <span>{t("Settings")}</span>
          <label
            className="ml-auto flex cursor-pointer items-center gap-1.5 normal-case tracking-normal text-[11px] text-white/55 hover:text-white"
            title={t("Dim the background so the model is easier to see. Turn it off to watch the scene while editing lighting.")}
          >
            <input type="checkbox" checked={dim} onChange={(event) => setSettingsDim(event.target.checked)} className="h-3.5 w-3.5 accent-[var(--app-accent)]" />
            {t("Dim background")}
          </label>
          <button type="button" onClick={() => closeSettings()} aria-label={t("Close")} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"><X size={15} /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <WindowResizeHandle frame={frame} minWidth={480} minHeight={300} margin={16} onResize={(next, delta) => {
          setSettingsSize(next);
          setSettingsOffset({ x: (offset?.x ?? 0) + delta.width / 2, y: (offset?.y ?? 0) + delta.height / 2 });
        }} />
      </div>
    </div>
  );
}
