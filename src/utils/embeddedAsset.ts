/** Packed binary assets are appended after bundling to keep build memory low. */
export async function readPackedAsset(id: string, devPath: string): Promise<Uint8Array> {
  const embedded = document.getElementById(id)?.textContent?.trim();
  if (embedded) {
    const binary=atob(embedded), bytes=new Uint8Array(binary.length);
    for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return bytes;
  }
  if (import.meta.env.DEV) {
    const response=await fetch(devPath);
    if (!response.ok) throw new Error(`Cannot load local asset: ${devPath}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error(`Standalone asset ${id} is missing. Run the complete build script.`);
}
