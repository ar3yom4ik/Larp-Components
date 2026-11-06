import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';

const BUTTONS = 'button, [role="button"], input[type="button"], input[type="submit"], label[title]';
const DELAY = 1600;

/** A single delegated tooltip covers buttons even in dynamically opened windows. */
export function ButtonTooltip() {
  const [tip, setTip] = useState<{text:string;x:number;y:number} | null>(null);
  useEffect(() => {
    let current: HTMLElement | null = null;
    let timer: number | undefined;
    let savedTitle: string | null = null;
    let point = {x:0,y:0};
    let visible = false;

    const hide = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      // Suppress the native title while our tooltip is active, but do not
      // overwrite a title changed by React while the pointer was over it.
      if (current && savedTitle !== null && !current.hasAttribute('title')) current.setAttribute('title',savedTitle);
      current = null; savedTitle = null; visible = false; setTip(null);
    };
    const name = (button: HTMLElement) => {
      const aria = button.getAttribute('aria-label')?.trim();
      if (aria) return aria;
      const labelled = button.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
      if (labelled) return labelled;
      const value = button instanceof HTMLInputElement ? button.value.trim() : '';
      const text = (button.innerText ?? button.textContent ?? '').replace(/\s+/g,' ').trim();
      if (value || text) return value || text;
      const title = button.getAttribute('title')?.trim();
      if (title) return title;
      // Lucide icon-only controls occasionally predate accessible names.
      const icon = button.querySelector('svg[class*="lucide-"]')?.getAttribute('class')?.match(/\blucide-([\w-]+)/)?.[1];
      return icon ? t(icon.replace(/-/g,' ').replace(/^\w/, letter => letter.toUpperCase())) : '';
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') { if (current) hide(); return; }
      point = {x:event.clientX,y:event.clientY};
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(BUTTONS) : null;
      if (target !== current) {
        hide();
        if (!target) return;
        const text = name(target);
        if (!text) return;
        current = target;
        savedTitle = target.getAttribute('title');
        if (savedTitle !== null) target.removeAttribute('title');
        timer = window.setTimeout(() => {
          if (current === target && target.isConnected) {
            visible = true;
            setTip({text,x:point.x,y:point.y});
          }
        },DELAY);
      } else if (visible) {
        setTip(previous => previous ? {...previous,x:point.x,y:point.y} : previous);
      }
    };
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) hide(); };
    window.addEventListener('pointermove',move,true);
    window.addEventListener('pointerout',leave,true);
    window.addEventListener('pointerdown',hide,true);
    window.addEventListener('scroll',hide,true);
    window.addEventListener('blur',hide);
    return () => {
      hide();
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerout',leave,true);
      window.removeEventListener('pointerdown',hide,true);
      window.removeEventListener('scroll',hide,true);
      window.removeEventListener('blur',hide);
    };
  },[]);
  if (!tip) return null;
  return createPortal(
    <div role="tooltip" data-button-tooltip className="pointer-events-none fixed z-[10000] max-w-[260px] rounded border border-white/20 bg-[#161719]/95 px-2 py-1 text-[11px] leading-snug text-white shadow-xl"
      style={{
        left:tip.x > window.innerWidth - 270 && tip.x > window.innerWidth / 2 ? tip.x - 14 : tip.x + 14,
        top:tip.y > window.innerHeight - 55 && tip.y > window.innerHeight / 2 ? tip.y - 14 : tip.y + 18,
        transform:`translate(${tip.x > window.innerWidth - 270 && tip.x > window.innerWidth / 2 ? '-100%' : '0'}, ${tip.y > window.innerHeight - 55 && tip.y > window.innerHeight / 2 ? '-100%' : '0'})`,
      }}>{tip.text}</div>,
    document.body,
  );
}
