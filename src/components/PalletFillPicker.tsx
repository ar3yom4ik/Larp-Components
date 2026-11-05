import { useState } from 'react';
import { X } from 'lucide-react';
import { getProduct } from '../data/products';
import { palletFillProducts } from '../utils/palletFill';
import type { SceneItem } from '../types';
import { t } from '../i18n';
import { ProductPicker } from './ProductPicker';

/** Shared mixed-stock editor for scene pallets and factory nodes. */
export function PalletFillPicker({ value, fallback, items, onChange, disabled = false }: {
  value: unknown; fallback: string; items: readonly SceneItem[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const ids = palletFillProducts(value, fallback);
  const [choice, setChoice] = useState(fallback);
  return <div className="space-y-2" data-pallet-fill-picker>
    <div className="flex flex-wrap gap-1.5">{ids.map(id => <span key={id} className="flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/75">
      {getProduct(id, items).name}
      <button type="button" disabled={disabled || ids.length === 1} aria-label={`${t('Remove product')}: ${getProduct(id, items).name}`} onClick={() => onChange(JSON.stringify(ids.filter(entry => entry !== id)))} className="text-white/50 hover:text-white disabled:opacity-30"><X size={11} /></button>
    </span>)}</div>
    <ProductPicker disabled={disabled} label={t('Add fill product')} value={choice} items={items} onChange={id => { setChoice(id); if (!disabled && !ids.includes(id)) onChange(JSON.stringify([...ids, id])); }} />
    <p className="text-[10px] leading-relaxed text-white/40">{t('Selected products are shuffled across the filled pallet. Reset recreates the same mix.')}</p>
  </div>;
}
