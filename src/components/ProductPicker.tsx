import { useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { getProduct, PRODUCTS, importedProducts, searchProducts, type Product } from "../data/products";
import type { SceneItem } from "../types";
import { getLanguage, t, useLanguage } from "../i18n";

export function ProductThumb({ product, size = 32 }: { product: Product; size?: number }) {
  const color = `#${product.color.toString(16).padStart(6, "0")}`;
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <ellipse cx="20" cy="34" rx="13" ry="3" fill="#000" opacity=".18" />
    {product.shape === "bottle" ? <><path d="M16 6h8v6l5 5v15H11V17l5-5V6Z" fill={color} /><rect x="15" y="4" width="10" height="5" rx="1" fill="#566779" /><rect x="11" y="21" width="18" height="7" fill="white" opacity=".55" /></> : product.shape === "cookie" ? <><ellipse cx="20" cy="22" rx="15" ry="11" fill={color} /><ellipse cx="20" cy="18" rx="15" ry="11" fill={color} stroke="white" strokeOpacity=".12" />{[10, 19, 28, 15, 25].map((x, i) => <circle key={x} cx={x} cy={14 + i % 3 * 4} r="2" fill="#63412a" />)}</> : product.shape === "sphere" ? <><circle cx="20" cy="22" r="12" fill={color} /><path d="M20 11V6" stroke="#54703f" strokeWidth="3" /><ellipse cx="15" cy="18" rx="2" ry="4" fill="white" opacity=".2" /></> : product.shape === "cylinder" || product.shape === "gear" ? <><path d="M7 14h26v15c0 7-26 7-26 0V14Z" fill={color} /><ellipse cx="20" cy="14" rx="13" ry="6" fill={color} stroke="white" strokeOpacity=".4" />{product.shape === "gear" && <ellipse cx="20" cy="14" rx="4" ry="2" fill="#28323b" />}</> : <><path d="m5 15 14-8 16 8-15 9-15-9Z" fill={color} /><path d="m5 15 15 9v11L5 26V15Z" fill={color} /><path d="m20 24 15-9v11l-15 9V24Z" fill={color} /><path d="m5 15 15 9 15-9M20 24v11" stroke="white" strokeOpacity=".3" />{product.id === "carton" && <path d="m13 11 15 9v10" stroke="#e3cda4" strokeWidth="3" />}</>}
  </svg>;
}

export function ProductPicker({ value, onChange, label, allowAny = false, items = [], removableWorkpieces, onRemoveWorkpiece }: { value: string; onChange: (id: string) => void; label: string; allowAny?: boolean; items?: readonly SceneItem[]; removableWorkpieces?: ReadonlySet<string>; onRemoveWorkpiece?: (id: string) => void }) {
  useLanguage();
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [category, setCategory] = useState("All");
  const product = getProduct(value, items);
  const name = (p: Product) => getLanguage() === "ru" ? p.ru : p.name;
  const results = searchProducts(query, category, items);
  return <div className="product-picker relative">
    <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/45">{t(label)}</span>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t(label)} className="flex min-h-11 w-full items-center gap-2 rounded border border-white/15 bg-[#222225] px-2 py-1.5 text-left transition hover:border-[var(--app-accent)]/60">
      {value === "any" ? <span className="flex h-8 w-8 items-center justify-center font-mono text-lg text-[var(--app-accent-bright)]">*</span> : <ProductThumb product={product} />}
      <span className="min-w-0 flex-1"><span className="block truncate text-[12px] text-white/85">{value === "any" ? t("Any product") : name(product)}</span><span className="text-[9px] text-white/35">{value === "any" ? t("Products") : `${t(product.category)} / ${product.id}`}</span></span><ChevronDown size={13} className="text-white/40" />
    </button>
    {!open && removableWorkpieces?.has(value) && onRemoveWorkpiece && <button type="button" onClick={() => onRemoveWorkpiece(value)} className="mt-1 text-[10px] text-white/45 underline hover:text-red-300">{t("Remove saved workpiece")}</button>}
    {open && <div className="mt-1 overflow-hidden rounded border border-[var(--app-accent)]/45 bg-[#202023] shadow-xl animate-[toast-in_.15s_ease-out]">
      <div className="flex items-center gap-2 border-b border-white/10 p-2"><Search size={13} className="shrink-0 text-[var(--app-accent-bright)]" /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} placeholder={t("Search name or tag...")} className="w-full min-w-0 bg-transparent text-[12px] outline-none" /><button type="button" aria-label={t("Close")} onClick={() => setOpen(false)} className="p-1 text-white/45"><X size={12} /></button></div>
      <select aria-label={t("Category")} value={category} onChange={(e) => setCategory(e.target.value)} className="m-2 w-[calc(100%-16px)] rounded border border-white/10 bg-[#2d2d30] p-1.5 text-[11px] text-white/65"><option value="All">{t("All")}</option>{[...new Set([...PRODUCTS, ...importedProducts(items)].map((p) => p.category))].map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>
      <div role="listbox" aria-label={t("Products")} className="thin-scroll max-h-[205px] overflow-y-auto px-1 pb-1">
        {allowAny && !query && <button type="button" role="option" aria-selected={value === "any"} onClick={() => { onChange("any"); setOpen(false); }} className="flex min-h-10 w-full items-center gap-2 rounded px-2 py-2 text-left text-[12px] text-white/70 hover:bg-white/10">* {t("Any product")}</button>}
        {results.map((p) => <button key={p.id} type="button" role="option" aria-selected={p.id === value} onClick={() => { onChange(p.id); setOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-[var(--app-accent)]/20"><ProductThumb product={p} size={30} /><span className="min-w-0 flex-1"><span className="block text-[11.5px] text-white/85">{name(p)}</span><span className="text-[9px] text-white/35">{t(p.category)} / {p.tags.slice(0, 3).map(t).join(", ")}</span></span>{p.id === value && <Check size={12} className="text-[var(--green)]" />}</button>)}
        {results.length === 0 && <div className="px-2 py-6 text-center text-[11px] text-white/40">{t("No matching products")}</div>}
      </div>
    </div>}
  </div>;
}