import { useMemo } from 'react';
import type { SceneItem } from '../types';
import { buildFloorPlan, PLAN_LEGEND } from '../utils/floorPlan';
import { t } from '../i18n';

/**
 * Plan view of the factory. Shared by the AI Factory preview and the floor maps so the
 * map always matches the generated layout.
 */
export function FloorPlanView({ items, selectedId, onSelect, width = 400, height = 270, grid = true, showLegend = false }: {
  items: SceneItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  width?: number;
  height?: number;
  grid?: boolean;
  showLegend?: boolean;
}) {
  const plan = useMemo(() => buildFloorPlan(items), [items]);
  const spanX = Math.max(0.001, plan.bounds.maxX - plan.bounds.minX);
  const spanZ = Math.max(0.001, plan.bounds.maxZ - plan.bounds.minZ);
  const legendHeight = showLegend ? 22 : 0;
  const scale = Math.min((width - 16) / spanX, (height - 16 - legendHeight) / spanZ);
  const offsetX = (width - spanX * scale) / 2;
  const offsetZ = (height - legendHeight - spanZ * scale) / 2;
  const sx = (x: number) => offsetX + (x - plan.bounds.minX) * scale;
  const sz = (z: number) => offsetZ + (z - plan.bounds.minZ) * scale;
  const pick = (id: string) => () => onSelect?.(id);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={t('Floor map')} data-floor-plan>
      <defs>
        <pattern id="floorPlanGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#ffffff" strokeOpacity=".06" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="#1b1e21" />
      {grid && <rect width={width} height={height} fill="url(#floorPlanGrid)" />}
      {/* Origin cross, so the plan reads like the 3D grid. */}
      <line x1={sx(plan.bounds.minX)} y1={sz(0)} x2={sx(plan.bounds.maxX)} y2={sz(0)} stroke="#ffffff" strokeOpacity=".1" />
      <line x1={sx(0)} y1={sz(plan.bounds.minZ)} x2={sx(0)} y2={sz(plan.bounds.maxZ)} stroke="#ffffff" strokeOpacity=".1" />
      {plan.paths.map((path) => (
        <polyline
          key={path.id}
          points={path.points.map(([x, z]) => `${sx(x)},${sz(z)}`).join(' ')}
          fill="none"
          stroke={path.id === selectedId ? '#ffffff' : path.color}
          strokeWidth={Math.max(2, path.width * scale)}
          strokeDasharray={path.dashed ? '4 3' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={path.dashed ? 0.85 : 0.95}
          className={onSelect ? 'cursor-pointer' : undefined}
          onClick={onSelect ? pick(path.id) : undefined}
        />
      ))}
      {plan.shapes.map((shape) => {
        const selected = shape.id === selectedId;
        const stroke = selected ? '#ffffff' : shape.stroke ?? '#00000055';
        if (shape.kind === 'circle') {
          return (
            <g key={shape.id} onClick={onSelect ? pick(shape.id) : undefined} className={onSelect ? 'cursor-pointer' : undefined}>
              <circle cx={sx(shape.x)} cy={sz(shape.z)} r={Math.max(3, (shape.w * scale) / 2)} fill={shape.fill} stroke={stroke} strokeWidth={selected ? 2 : 1} />
              {selected && <circle cx={sx(shape.x)} cy={sz(shape.z)} r={Math.max(6, (shape.w * scale) / 2 + 4)} fill="none" stroke="#ffffff" strokeOpacity=".6" />}
            </g>
          );
        }
        const w = Math.max(4, shape.w * scale);
        const h = Math.max(4, shape.h * scale);
        return (
          <rect
            key={shape.id}
            x={sx(shape.x) - w / 2}
            y={sz(shape.z) - h / 2}
            width={w}
            height={h}
            rx={1}
            fill={shape.fill}
            fillOpacity={shape.opacity ?? 0.92}
            stroke={stroke}
            strokeWidth={selected ? 2 : 1}
            transform={`rotate(${-shape.rotation} ${sx(shape.x)} ${sz(shape.z)})`}
            onClick={onSelect ? pick(shape.id) : undefined}
            className={onSelect ? 'cursor-pointer' : undefined}
          />
        );
      })}
      {showLegend && (
        <g transform={`translate(8 ${height - 14})`}>
          {PLAN_LEGEND.map((entry, index) => (
            <g key={entry.label} transform={`translate(${index * 52} 0)`}>
              {entry.round
                ? <circle cx={4} cy={-3} r={3.5} fill={entry.color} />
                : <rect x={0.5} y={-6.5} width={7} height={7} rx={1} fill={entry.color} />}
              <text x={9} y={-1} fontSize="7" fill="#c9d1d9">{t(entry.label)}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
