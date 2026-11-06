/** Stable references distinguish imported material slots even when colors match. */
export const modelMaterialRef = (id:string,index:number) => `model:${encodeURIComponent(id)}:${index}`;
export function parseModelMaterialRef(ref:string): {id:string;index:number} | null {
  const match=/^model:(.*):(\d+)$/.exec(ref);if(!match)return null;
  try {const index=Number(match[2]);return Number.isSafeInteger(index) ? {id:decodeURIComponent(match[1]),index} : null;} catch {return null;}
}
