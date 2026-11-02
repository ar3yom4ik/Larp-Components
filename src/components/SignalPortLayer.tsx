import { Html } from '@react-three/drei';
import type { SceneItem } from '../types';
import { canSignalInput, canSignalOutput } from '../utils/signalPorts';
import { MODEL_HEIGHTS } from './FactoryModels';
import { t } from '../i18n';

/** Signal ports edit control connections, not material flow. */
export function SignalPortLayer({ items, sourceId, targets, onSource, onTarget }: {
  items: SceneItem[]; sourceId: string | null; targets: string[];
  onSource: (id: string) => void; onTarget: (id: string) => void;
}) {
  return <>{items.map(item => {
    const output = canSignalOutput(item);
    const input = sourceId !== null && canSignalInput(item, sourceId);
    if (!output && !input) return null;
    const height = Math.max(1.2, (MODEL_HEIGHTS[item.kind] ?? 1) * item.scale + 0.4);
    return <Html key={item.id} position={[item.position[0], item.position[1] + height, item.position[2]]} center zIndexRange={[30, 20]}>
      <div className="flex items-center gap-1 whitespace-nowrap rounded bg-[#1d252c]/95 px-1 py-1 shadow-lg" onPointerDown={event => event.stopPropagation()}>
        {output && <button type="button" aria-label={`${t('Signal output')}: ${item.name}`} title={`${t('Signal output')}: ${item.name}`} onClick={event => {event.stopPropagation(); onSource(item.id);}} className={`rounded px-1.5 py-1 text-[10px] font-bold ${sourceId === item.id ? 'bg-[#f4c260] text-black' : 'bg-[#357b8f] text-white'}`}>OUT</button>}
        {input && <button type="button" aria-label={`${t('Signal input')}: ${item.name}`} aria-pressed={targets.includes(item.id)} title={`${t('Signal input')}: ${item.name}`} onClick={event => {event.stopPropagation(); onTarget(item.id);}} className={`rounded px-1.5 py-1 text-[10px] font-bold text-white ${targets.includes(item.id) ? 'bg-[#bd8735]' : 'bg-[#3a7655]'}`}>IN{targets.includes(item.id) ? ' ✓' : ''}</button>}
      </div>
    </Html>;
  })}</>;
}
