import { useState } from "react";
import { Layers3 } from "lucide-react";
import { getProduct, palletSize } from "../data/products";
import { t } from "../i18n";
import type { SceneItem } from "../types";

export function PalletPattern({ props, onChange, compact = false, items = [] }: { props: Record<string, string | number | boolean>; onChange: (patch: Record<string, string | number | boolean>) => void; compact?: boolean; items?: readonly SceneItem[] }) {
  const [layer, setLayer] = useState(0);
  const cols = Math.max(1, Number(props.cols ?? 3)), rows = Math.max(1, Number(props.rows ?? 2)), layers = Math.max(1, Number(props.layers ?? 4));
  const [width, depth] = palletSize(props, items), product = getProduct(props.product, items);
  return <div>
    <div className="mb-2 grid grid-cols-3 gap-2">{([["cols", "Columns", cols], ["rows", "Rows", rows], ["layers", "Layers", layers]] as const).map(([key, label, value]) => <label key={key} className="block"><span className="mb-1 block text-[10px] text-white/50">{t(label)}</span><input aria-label={t(label)} type="number" inputMode="numeric" min={1} max={key === "layers" ? 8 : 6} value={value} onChange={(e) => onChange({ [key]: Math.max(1, Math.min(key === "layers" ? 8 : 6, Math.round(Number(e.target.value) || 1))) })} className="w-full rounded border border-white/15 bg-[#1e1e21] px-2 py-1.5 font-mono text-[13px] outline-none focus:border-[var(--app-accent)]" /></label>)}</div>
    <div className="relative overflow-hidden rounded border border-white/10 bg-[#202024] px-2 py-2">
      <svg viewBox="0 0 220 110" className={compact ? "h-[82px] w-full" : "h-[100px] w-full"} aria-label={t("Pallet pattern")}>
        <rect x="17" y="5" width="186" height="98" rx="3" fill="#755c3f" stroke="#ab855a" />
        {Array.from({ length: cols * rows }, (_, i) => <g key={i}><rect x={24 + i % cols * 172 / cols} y={11 + Math.floor(i / cols) * 85 / rows} width={172 / cols - 4} height={85 / rows - 4} rx="2" fill={`#${product.color.toString(16).padStart(6, "0")}`} stroke="white" strokeOpacity=".16" /><text x={24 + (i % cols + 0.5) * 172 / cols - 2} y={11 + (Math.floor(i / cols) + 0.5) * 85 / rows + 2} textAnchor="middle" fontFamily="monospace" fontSize="9" fill="white" fillOpacity=".75">{(Math.min(layer, layers - 1) * rows * cols) + i + 1}</text></g>)}
      </svg>
      <div className="flex items-center justify-between gap-2 text-[10px] text-white/45"><span className="flex items-center gap-1"><Layers3 size={11} />{cols * rows * layers} {t("slots")}</span><span className="font-mono">{width.toFixed(2)} {t("x")} {depth.toFixed(2)} {t("m")}</span></div>
    </div>
    <div className="mt-2 flex items-center gap-2"><span className="text-[10px] text-white/45">{t("Layer")} {Math.min(layer + 1, layers)}/{layers}</span><input aria-label={t("Layer")} type="range" min={0} max={Math.max(1, layers - 1)} value={Math.min(layer, layers - 1)} onChange={(e) => setLayer(Number(e.target.value))} className="accent-range min-w-0 flex-1" /></div>
    {!compact && <p className="mt-1 text-[10px] leading-relaxed text-white/35">{t("Pallet size follows the pattern and product dimensions.")}</p>}
  </div>;
}