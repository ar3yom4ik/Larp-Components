/** Product IDs are stored as JSON text because scene properties are primitive. */
export function palletFillProducts(value: unknown, fallback: unknown = 'carton'): string[] {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { parsed = []; }
  }
  const ids = Array.isArray(parsed)
    ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 1024))]
    : [];
  return ids.length ? ids : [typeof fallback === 'string' && fallback ? fallback : 'carton'];
}

/** A repeatable shuffle makes reset/replay deterministic while still mixing types. */
export function shuffledPalletProducts(ids: readonly string[], count: number, seed: string): string[] {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619) >>> 0;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  const source = ids.length ? ids : ['carton'];
  // Shuffle a balanced sequence so all chosen products are represented when possible.
  const result = Array.from({length: Math.max(0, count)}, (_, i) => source[i % source.length]);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
