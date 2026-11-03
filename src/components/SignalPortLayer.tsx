import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sim } from '../sim/engine';
import type { SceneItem } from '../types';
import { canSignalInput, canSignalOutput, signalTargets, signalWireColor } from '../utils/signalPorts';
import { MODEL_HEIGHTS } from './FactoryModels';
import { t } from '../i18n';

function PortAnchor({item, height, children}: {item: SceneItem; height: number; children: ReactNode}) {
  const group = useRef<THREE.Group>(null);
  const wasPhysical = useRef(false);
  useFrame(() => {
    const pose = sim.getPhysicsPose(item.id) ?? (item.props.mountedTo ? sim.getLiveItem(item.id) : undefined);
    if (!group.current) return;
    if (pose) wasPhysical.current = true;
    else if (!wasPhysical.current) return;
    else wasPhysical.current = false;
    const position = (pose ?? item).position;
    group.current.position.set(position[0], position[1] + height, position[2]);
  });
  return <group ref={group} userData={{signalPortFor:item.id}} position={[item.position[0], item.position[1] + height, item.position[2]]}><Html center zIndexRange={[30, 20]}>{children}</Html></group>;
}

interface Gesture {
  pointerId: number;
  sourceId: string;
  oldTargetId?: string;
  startX: number;
  startY: number;
  anchorX: number;
  anchorY: number;
  moved: boolean;
}

/** Signal ports edit control connections, not material flow. A gesture previews
 * a branch without changing the project until it is released. */
export function SignalPortLayer({ items, sourceId, targets, onSource, onTarget, onConnect, onReroute }: {
  items: SceneItem[]; sourceId: string | null; targets: string[];
  onSource: (id: string) => void; onTarget: (id: string) => void;
  onConnect: (source: string, target: string) => void;
  onReroute: (source: string, oldTarget: string, newTarget: string | null) => void;
}) {
  const latest = useRef({ items, sourceId, onSource, onConnect, onReroute });
  latest.current = { items, sourceId, onSource, onConnect, onReroute };
  const portal = useRef<HTMLElement>(document.body);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string } | null>(null);
  const incomingByTarget = useMemo(() => {
    const map = new Map<string, SceneItem[]>();
    for (const source of items) if (canSignalOutput(source)) for (const target of signalTargets(source)) {
      const list = map.get(target);
      if (list) list.push(source); else map.set(target, [source]);
    }
    return map;
  }, [items]);

  const begin = (event: React.PointerEvent<HTMLButtonElement>, source: string, oldTargetId?: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const output = oldTargetId ? document.querySelector<HTMLElement>(`[data-signal-output="${CSS.escape(source)}"]`) : event.currentTarget;
    const origin = output?.getBoundingClientRect() ?? rect;
    gesture.current = { pointerId: event.pointerId, sourceId: source, oldTargetId, startX: event.clientX, startY: event.clientY, anchorX: origin.left + origin.width / 2, anchorY: origin.top + origin.height / 2, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onSource(source);
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const state = gesture.current;
      if (!state || state.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 5 && !state.moved) return;
      state.moved = true;
      const source = latest.current.items.find((item) => item.id === state.sourceId);
      setPreview({ x1: state.anchorX, y1: state.anchorY, x2: event.clientX, y2: event.clientY, color: signalWireColor(source?.signalChannels?.[0]?.color ?? source?.props.wireColor) });
    };
    const finish = (event: PointerEvent) => {
      const state = gesture.current;
      if (!state || state.pointerId !== event.pointerId) return;
      gesture.current = null;
      setPreview(null);
      if (!state.moved || event.type === 'pointercancel') return;
      // Captured pointers still allow elementFromPoint to find the actual IN
      // under a mouse, pen, or touch release.
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-signal-input]');
      const target = element?.dataset.signalInput ?? null;
      if (state.oldTargetId) {
        if (target !== state.oldTargetId) latest.current.onReroute(state.sourceId, state.oldTargetId, target);
      } else if (target) latest.current.onConnect(state.sourceId, target);
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, []);

  return <>
    {items.map(item => {
      const output = canSignalOutput(item);
      // IN ports are visible before an OUT is selected, so the drag destination
      // is discoverable, including on touch screens.
      const input = canSignalInput(item, sourceId ?? '');
      if (!output && !input) return null;
      const incoming = incomingByTarget.get(item.id) ?? [];
      const connected = sourceId ? targets.includes(item.id) : incoming.length > 0;
      const dragSource = sourceId ? (targets.includes(item.id) ? sourceId : null) : incoming.length === 1 ? incoming[0].id : null;
      const height = item.props.mountedTo ? .55 * item.scale : Math.max(1.2, (MODEL_HEIGHTS[item.kind] ?? 1) * item.scale + 0.4);
      return <PortAnchor key={item.id} item={item} height={height}>
        <div className="flex items-center gap-1 whitespace-nowrap rounded bg-[#1d252c]/95 px-1 py-1 shadow-lg" onPointerDown={event => event.stopPropagation()}>
          {output && <button type="button" data-signal-output={item.id} aria-label={`${t('Signal output')}: ${item.name}`} title={`${t('Signal output')}: ${item.name} — ${t('drag to an IN port')}`} onPointerDown={event => begin(event, item.id)} onClick={event => {event.stopPropagation(); if (!suppressClick.current) onSource(item.id);}} style={{touchAction:'none'}} className={`rounded px-1.5 py-1 text-[10px] font-bold ${sourceId === item.id ? 'bg-[#f4c260] text-black' : 'bg-[#357b8f] text-white'}`}>OUT</button>}
          {input && <button type="button" data-signal-input={item.id} aria-label={`${t('Signal input')}: ${item.name}`} aria-pressed={connected} title={incoming.length > 1 && !sourceId ? t('Select an OUT to choose which connection to disconnect.') : `${t('Signal input')}: ${item.name}`} onPointerDown={event => { if (dragSource) begin(event, dragSource, item.id); }} onClick={event => {event.stopPropagation(); if (!suppressClick.current && sourceId) onTarget(item.id);}} style={{touchAction:'none'}} className={`rounded px-1.5 py-1 text-[10px] font-bold text-white ${connected ? 'bg-[#bd8735]' : 'bg-[#3a7655]'}`}>IN{connected ? ' ✓' : ''}{incoming.length > 1 ? ` ${incoming.length}` : ''}</button>}
        </div>
      </PortAnchor>;
    })}
    {preview && <Html portal={portal} calculatePosition={() => [0, 0]} zIndexRange={[999999, 999999]} style={{pointerEvents:'none'}}>
      <svg aria-label={t('Signal wire preview')} style={{position:'fixed', inset:0, width:'100vw', height:'100vh', pointerEvents:'none'}}>
        <path d={`M ${preview.x1} ${preview.y1} C ${preview.x1} ${preview.y1 - 60}, ${preview.x2} ${preview.y2 - 60}, ${preview.x2} ${preview.y2}`} fill="none" stroke={preview.color} strokeWidth="3" strokeDasharray="7 5" />
        <circle cx={preview.x2} cy={preview.y2} r="5" fill={preview.color} />
      </svg>
    </Html>}
  </>;
}
