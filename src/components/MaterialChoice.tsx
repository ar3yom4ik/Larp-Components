import { PRODUCTS } from '../data/products';
import type { SceneItem } from '../types';
import { t } from '../i18n';

/** Select the same base colors shown in the imported-model material editor.
 * A color sensor compares base colors, not texture pixels or illumination. */
export function MaterialChoice({ value, onChange, items, label, disabled }: {
  value?: string; onChange: (color: string) => void; items: readonly SceneItem[]; label: string; disabled?: boolean;
}) {
  const materials = items.flatMap(item => item.imported?.materials.map((material, index) => ({
    key:`${item.id}:${index}`, label:`${item.name} · ${material.name}`, color:material.color.toLowerCase(),
  })) ?? []);
  const known = materials.some(entry => entry.color === value) || PRODUCTS.some(product => `#${product.color.toString(16).padStart(6,'0')}` === value);
  return <select aria-label={label} value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)} className="w-full rounded border border-white/12 bg-[#1e1e20] px-2 py-1.5 text-[10px] text-white/85">
    <option value="">{t('Choose a material')}</option>
    {value && !known && <option value={value}>{value}</option>}
    {materials.length > 0 && <optgroup label={t('Imported materials')}>{materials.map(entry => <option key={entry.key} value={entry.color}>{entry.label} · {entry.color}</option>)}</optgroup>}
    <optgroup label={t('Workpiece materials')}>{PRODUCTS.map(product => <option key={product.id} value={`#${product.color.toString(16).padStart(6,'0')}`}>{t(product.name)} · #{product.color.toString(16).padStart(6,'0')}</option>)}</optgroup>
  </select>;
}
