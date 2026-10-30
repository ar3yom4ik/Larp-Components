import { useEffect, useState } from "react";

export type InterfaceMode = "auto" | "desktop" | "touch";
export function useDevice() {
  const [mode, setMode] = useState<InterfaceMode>(() => {
    try { const value = localStorage.getItem("larp-interface"); return value === "desktop" || value === "touch" ? value : "auto"; } catch { return "auto"; }
  });
  const detect = () => window.innerWidth < 820 || (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 1300) || (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.innerWidth < 1400);
  const [detected, setDetected] = useState(detect);
  useEffect(() => {
    const update = () => setDetected(detect());
    window.addEventListener("resize", update);
    const media = window.matchMedia("(pointer: coarse)");
    media.addEventListener("change", update);
    return () => { window.removeEventListener("resize", update); media.removeEventListener("change", update); };
  }, []);
  return { mobile: mode === "touch" || (mode === "auto" && detected), mode, setMode: (value: InterfaceMode) => { setMode(value); try { localStorage.setItem("larp-interface", value); } catch { /* Storage is optional. */ } } };
}