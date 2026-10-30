import type { ComponentKind } from "../types";

const ACCENT: Partial<Record<ComponentKind, string>> = {
  robot: "#6DBE45",
  cobot: "#8BE8D4",
  conveyor: "#4DA3E8",
  feeder: "#E0A030",
  roller: "#78A9FF",
  cnc: "#FFB35C",
  press: "#FF9D7A",
  weld: "#FFD166",
  packaging: "#F3A7FA",
  amr: "#C99BFF",
  forklift: "#FFB84D",
  rack: "#FFD95C",
  crates: "#D9B97F",
  fence: "#FF7C7C",
  cabinet: "#9DB4FF",
  wall: "#9FB3C8",
  operator: "#F2B8A0",
  kuka: "#F07B30", fanuc: "#F2C230", "mobile-robot": "#4BC1B8", collector: "#D0A263",
  button: "#DE5C52", laser: "#F05C5C", sensor: "#63C5F0", plc: "#8FA9C2", light: "#FFE5A6",
  paint: "#EBCB76", cutter: "#F5A555", assembly: "#96B7D1", kiln: "#DC8154",
};

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      <path d="M18 1.8 33.1 10.4v15.2L18 34.2 2.9 25.6V10.4L18 1.8Z" fill="var(--file-bg)" stroke="var(--app-accent-bright)" strokeWidth="1.2" />
      <path d="M12.5 9.5h4.3v13.6h7.6v3.9H12.5V9.5Z" fill="#ffffff" />
      <path d="M20.5 9.5h3.9v3.9h-3.9V9.5Z" fill="#f2c230" />
    </svg>
  );
}

export function PartIcon({ kind, className = "" }: { kind: ComponentKind; className?: string }) {
  const a = ACCENT[kind] ?? "#8FA9C2";
  const dim = "#8B9AAB";
  const light = "#DCE5EE";

  const art: Partial<Record<ComponentKind, React.ReactNode>> = {
    robot: (
      <>
        <ellipse cx="28" cy="36.4" rx="12.3" ry="3.2" fill={a} opacity=".16" />
        <path d="M18 33.5h20v3H18z" fill="#6E7D8D" />
        <path d="M22.5 27h11l1.7 6.5H20.8L22.5 27Z" fill={light} />
        <path d="M23.2 17.5h9.6v10h-9.6z" fill={dim} />
        <path d="m28 10.5 8 4.6-4.8 2.7-7.6-4.4 4.4-2.9Z" fill={light} />
        <path d="m31.2 17.8 3 9-3.3 1.1-3.4-8.9 3.7-1.2Z" fill={a} opacity=".8" />
        <path d="m31.1 26.4 3.4.8" stroke={light} strokeWidth="2.6" strokeLinecap="round" />
        <path d="m34.5 25.3-.4 3.8M36 25.7l-.4 3.8" stroke={a} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="28" cy="16" r="1.7" fill="#14202A" />
        <circle cx="28" cy="16" r=".7" fill={a} />
      </>
    ),
    cobot: (
      <>
        <ellipse cx="28" cy="37" rx="9.5" ry="2.5" fill={a} opacity=".15" />
        <path d="M22.5 33h11v3.4h-11z" fill="#748495" />
        <path d="M24.6 22h6.8v11.4h-6.8z" fill={dim} />
        <path d="m28 9 6.6 3.8-2.3 8.8-4.3.4-4.8-8.2L28 9Z" fill={light} />
        <path d="m32 20.4 3.6 6.8-2.4 1.4-4.4-5.9 3.2-2.3Z" fill={a} opacity=".8" />
        <path d="m35.6 27.2 2.1-.2" stroke={light} strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="28" cy="14.2" r="1.5" fill={a} />
        <path d="M28 18v3.6" stroke={a} strokeWidth=".9" opacity=".6" />
      </>
    ),
    feeder: (
      <>
        <ellipse cx="28" cy="38" rx="13" ry="2.6" fill={a} opacity=".14" />
        <path d="M17 12h22v5H17z" fill={a} />
        <path d="m19 17 18 0-5 8h-8l-5-8Z" fill={a} opacity=".78" />
        <path d="M24 25h8v3h-8z" fill={light} />
        <path d="M18 17v21M38 17v21" stroke={dim} strokeWidth="1.6" />
        <path d="M8 36h40v3H8z" fill="#4E6072" />
        <path d="M25 30h6v5h-6z" fill="#B59467" />
      </>
    ),
    conveyor: (
      <>
        <path d="M8 25h33.5v5H8z" fill="#4E6072" />
        <path d="M11 24.5h31l4.5-5.5H15.5l-4.5 5.5Z" fill="#1A2733" stroke={dim} strokeWidth=".7" />
        <path d="M15.5 19h31v5.5l-4.5.5h-31L15.5 19Z" fill="#253644" />
        <path d="M11 24.5h31" stroke={a} strokeWidth="1.2" />
        <path d="M15.6 33v-4.5M38 33v-4.5M21 33v-3M33 33v-3" stroke={dim} strokeWidth="1.1" />
        <path d="M24 13.7h8v7.5h-8z" fill="#8A6E43" />
        <path d="M24 13.7h8v2.2h-8z" fill="#B99A63" />
        <path d="m32 13.7 3-2.2v7.5l-3 2.2v-7.5Z" fill="#6E5735" />
        <path d="m24 13.7 2-1.7h8l-2 1.7h-8Z" fill="#DCC08A" />
        <circle cx="17" cy="26.5" r="1.2" fill={a} />
        <circle cx="21" cy="26.5" r="1.2" fill={a} opacity=".2" />
      </>
    ),
    roller: (
      <>
        <path d="M9 25.5h31v4H9z" fill="#465868" />
        <path d="M12 25h28l4-5H16l-4 5Z" fill="#1A2733" stroke={dim} strokeWidth=".7" />
        {[18, 23, 28, 33, 38, 43].map((x, i) => (
          <g key={x}>
            <rect x={x} y={19.2} width="3.2" height="3.6" rx="1.6" fill={i % 2 ? "#8295A7" : "#B7C4D0"} />
            <path d={`M${x + 1.6} 20v1.7`} stroke="#384B5C" strokeWidth=".7" />
          </g>
        ))}
        <path d="M16 33v-4.5M40 33v-4.5" stroke={dim} strokeWidth="1.1" />
        <circle cx="13" cy="23" r="1.1" fill={a} />
      </>
    ),
    cnc: (
      <>
        <ellipse cx="28" cy="36" rx="15" ry="3.3" fill={a} opacity=".12" />
        <path d="M13 16.5 28 9l15 7.5v15L28 39l-15-7.5v-15Z" fill="#DCE5EE" />
        <path d="M13 16.5 28 9l15 7.5L28 24 13 16.5Z" fill="#F1F5F9" />
        <path d="m28 24 15-7.5v15L28 39V24Z" fill="#AEBCC9" />
        <path d="M28 24 13 16.5v15L28 39V24Z" fill="#C3CEDA" />
        <path d="M18 20.5v10l7 3.5 7-3.5v-9l-7-3.5-7 3.5Z" fill="#15232E" />
        <path d="M21 23.2v2.2l8 4v-2.2l-8-4Z" fill={a} opacity=".85" />
        <path d="M33 27.5h2.4M33 30h2.4" stroke="#5F7385" strokeWidth=".9" />
        <circle cx="35" cy="21" r="1.2" fill={a} />
      </>
    ),
    press: (
      <>
        <ellipse cx="28" cy="36" rx="14" ry="3" fill={a} opacity=".12" />
        <path d="M19 33h18v3.5H19z" fill="#5E7182" />
        <path d="M16 14h4v20h-4zM36 14h4v20h-4z" fill="#D4DEE7" />
        <path d="m16 14 3-3h4l-3 3h-4ZM36 14l3-3h4l-3 3h-4Z" fill="#EDF2F6" />
        <path d="M18 14h20l3-2H21l-3 2Z" fill="#A9B8C5" />
        <path d="M22 18h12v9H22z" fill="#2D3E4D" />
        <path d="M24 27h8v7h-8z" fill={a} opacity=".85" />
        <path d="M24 34h8v1.8h-8z" fill="#2D3E4D" />
        <path d="M22 20h12" stroke={a} strokeWidth=".9" opacity=".7" />
      </>
    ),
    weld: (
      <>
        <path d="M11 20 28 11l17 9v13L28 42 11 33V20Z" fill="#283B4A" />
        <path d="M11 20 28 11l17 9-17 9-17-9Z" fill="#344A5B" />
        <path d="M17 23h13v11H17z" fill="#14222B" stroke="#61788A" strokeWidth=".7" />
        <circle cx="23.5" cy="28.5" r="2.6" fill={a} opacity=".8" />
        <circle cx="23.5" cy="28.5" r="5" stroke={a} opacity=".3" />
        <path d="M31 25h8v7h-8z" fill="#203039" stroke="#6B8192" strokeWidth=".7" />
        <path d="M15 33.5 28 40l13-6.5" stroke={a} strokeWidth="1.2" opacity=".8" />
        <circle cx="37" cy="18" r="1.1" fill={a} />
      </>
    ),
    packaging: (
      <>
        <path d="M15 30h24v6H15z" fill="#576B7C" />
        <path d="M20 13 28 8l8 5v14l-8 5-8-5V13Z" fill="#C7A47A" />
        <path d="m20 13 8-5 8 5-8 4.8-8-4.8Z" fill="#E5C99F" />
        <path d="m36 13 7-4v11l-7 6V13Z" fill="#A8855E" />
        <path d="M20 13v9l8 5v-9l-8-5Z" fill="#B5936B" />
        <path d="M22 12h4M30 16h2" stroke="#5B4128" strokeWidth=".9" />
        <path d="M40 24h4v8h-4zM42 24v8" stroke={a} strokeWidth="1" />
        <path d="M20 33v4M34 33v4" stroke="#94A7B6" strokeWidth="1.2" />
      </>
    ),
    amr: (
      <>
        <ellipse cx="28" cy="36" rx="15" ry="3" fill={a} opacity=".14" />
        <path d="M11 25h31l3 4-3 4H11l-3-4 3-4Z" fill="#D8E2EA" />
        <path d="M11 25h31l3 4H8l3-4Z" fill="#F2F6F9" />
        <path d="M13 29h27l1 2H12l1-2Z" fill={a} opacity=".9" />
        <path d="M16 33v2M36 33v2" stroke="#5D7080" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 16h12v9H21z" fill="#8E7451" />
        <path d="M21 16h12v2H21zM26 16v9" stroke="#C9AB7D" strokeWidth=".8" />
        <path d="M38 26h.1M14 26h.1" stroke="#1E2D38" strokeWidth="2" />
        <circle cx="38" cy="26" r="1" fill={a} />
        <circle cx="14" cy="26" r="1" fill={a} opacity=".5" />
        <path d="M20 20h-2M34 20h2" stroke={a} strokeWidth=".7" opacity=".6" />
      </>
    ),
    forklift: (
      <>
        <ellipse cx="28" cy="36" rx="14" ry="3" fill={a} opacity=".12" />
        <path d="M14 30h18v4H14z" fill="#4A5D6D" />
        <path d="m18 19 8-4v14l-8 1v-11Z" fill="#E8B45D" />
        <path d="M26 15h5v15h-5z" fill="#2B3B47" />
        <path d="m26 18 7 2v6l-7-2v-6Z" fill="#3A4C5A" />
        <path d="M33 20h7v3h-7z" fill="#BBC7D1" />
        <path d="M16 34v2M30 34v2M37 23v13M40 23v13M36 33h5" stroke="#637787" strokeWidth="1.4" />
        <path d="M36 27h5v2h-5z" fill={a} />
        <circle cx="20" cy="34" r="2" fill="#1B2933" stroke="#6C8091" strokeWidth="1" />
        <circle cx="30" cy="34" r="2" fill="#1B2933" stroke="#6C8091" strokeWidth="1" />
        <circle cx="18" cy="22" r="1" fill={a} />
      </>
    ),
    rack: (
      <>
        <path d="M15 10h3v28h-3zM38 10h3v28h-3z" fill="#6F8494" />
        <path d="m18 10 3-2h23l-3 2H18ZM38 10l3-2h3l-3 2h-3Z" fill="#9CB0C0" />
        <path d="M16 16h24v3H16zM16 25h24v3H16zM16 34h24v3H16z" fill={a} opacity=".65" />
        <path d="M20 20h9v5h-9zM31 20h7v5h-7zM20 29h6v5h-6zM28 29h10v5H28z" fill="#9D8056" />
        <path d="M20 20h9v1.2h-9zM31 20h7v1.2h-7zM20 29h6v1.2h-6zM28 29h10v1.2H28z" fill="#C4A775" />
        <path d="M20 10h9v5h-9zM31 10h7v5h-7z" fill="#856A45" />
        <path d="M16 38h24" stroke="#526676" strokeWidth="1.2" />
      </>
    ),
    crates: (
      <>
        <ellipse cx="28" cy="36" rx="13" ry="2.7" fill={a} opacity=".14" />
        <path d="M17 30h21v5H17z" fill="#7B6240" />
        <path d="M19 22h14v8H19z" fill="#B08E60" />
        <path d="m19 22 3-2h14l-3 2H19Z" fill="#D9BE91" />
        <path d="m33 22 3-2v8l-3 2v-8Z" fill="#8A7048" />
        <path d="M19 26h14" stroke="#8A7048" strokeWidth=".8" />
        <path d="M22 15h9l2 7H20l2-7Z" fill="#C7A87A" />
        <path d="m22 15 2-2h9l-2 2h-9Z" fill="#E5CFAA" />
        <path d="m31 15 2-2 2 7-2 2-2-7Z" fill="#9A7D52" />
        <path d="M15 35h28" stroke="#5A6E7D" strokeWidth="1.2" />
      </>
    ),
    fence: (
      <>
        <path d="M14 36h28" stroke="#5C7080" strokeWidth="1.2" />
        <path d="M17 13h3v23h-3zM36 13h3v23h-3z" fill={a} opacity=".9" />
        <path d="M18 15h20M18 22h20M18 29h20" stroke="#8FA3B3" strokeWidth="1" />
        <path d="M18 15v14M25 15v14M32 15v14M38 15v14" stroke="#5E7385" strokeWidth=".8" />
        <path d="M16 35h7v-2h-7zM35 35h7v-2h-7z" fill="#F4CE62" />
        <path d="m25 13 8 6v8l-8-6v-8Z" fill={a} opacity=".12" />
        <path d="M20 17v18M33 17v18" stroke={a} strokeWidth=".7" opacity=".3" />
      </>
    ),
    cabinet: (
      <>
        <ellipse cx="28" cy="36" rx="10" ry="2.4" fill={a} opacity=".12" />
        <path d="M20 10h16v23H20z" fill="#BCC9D4" />
        <path d="M22 12h12v9H22z" fill="#324553" />
        <path d="M22 23h12v3H22zM22 28h6v2h-6z" fill="#879AA9" />
        <path d="M35 12h10v21H35z" fill="#98AAB9" />
        <path d="m35 12 10 2v-2h-10Z" fill="#C8D4DD" />
        <path d="M37 17h6v5h-6zM37 25h6v3h-6z" fill="#344754" />
        <circle cx="41" cy="19.5" r="1.1" fill={a} />
        <path d="M38 27h4M38 30h4" stroke="#445A69" strokeWidth=".7" />
        <path d="M26 33v2M31 33v2" stroke="#637787" strokeWidth="1.2" />
      </>
    ),
    wall: (
      <>
        <path d="M10 20 28 11l20 9v16L28 41 10 32V20Z" fill="#8399AB" />
        <path d="m10 20 18-9 20 9-18 9-20-9Z" fill="#B9C9D5" />
        <path d="M28 29v12" stroke="#5D7485" strokeWidth="1" />
        <path d="M18 23.5 28 28v8l-10-4.5v-8ZM38 26l6-3v8l-6 3v-8Z" fill="#DDE8EF" opacity=".4" />
        <path d="m22 24.5 12 5.5M22 32l12 5.5" stroke="#5D7485" strokeWidth=".6" opacity=".5" />
        <path d="m10 20 18-9 20 9" stroke={a} strokeWidth=".8" opacity=".6" />
      </>
    ),
    operator: (
      <>
        <ellipse cx="28" cy="37" rx="6.5" ry="2.2" fill={a} opacity=".16" />
        <circle cx="28" cy="11.5" r="4.2" fill="#E8C4A8" />
        <path d="M24.7 10.3a4.2 4.2 0 0 1 6.6-1.7l-6.5 3.6-.1-1.9Z" fill="#F4E6C8" />
        <path d="M24 16h8l2 11h-4l-1 10h-3.5l-.8-10H23l1-11Z" fill="#465D6F" />
        <path d="M24.6 16.5 28 21l3.5-4.5.8 4-3.4 4.4h-1.7L24 20.5l.6-4Z" fill={a} />
        <path d="m23 18-4 7M33 18l4 6" stroke="#D3A98B" strokeWidth="2" strokeLinecap="round" />
        <path d="M25 37h5l.7 2h-7l1.3-2ZM29 18v9" stroke="#334A5A" strokeWidth=".8" />
      </>
    ),
  };

  if (!(kind in art)) return <svg viewBox="0 0 56 48" fill="none" className={className} aria-hidden="true"><path d="M11 15 28 7l17 8v20l-17 8-17-8V15Z" fill="#758a9a" stroke={a} strokeWidth="1.5"/><path d="m11 15 17 8 17-8M28 23v20" stroke="#dce7ee" opacity=".55"/><circle cx="41" cy="14" r="3" fill={a}/></svg>;
  return (
    <svg viewBox="0 0 56 48" fill="none" className={className} aria-hidden="true">
      {art[kind]}
    </svg>
  );
}

export function partAccent(kind: ComponentKind) {
  return ACCENT[kind] ?? "#8FA9C2";
}
