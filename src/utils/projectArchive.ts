import { strToU8, unzipSync, zipSync } from 'fflate';
import { MAX_PROJECT_CHARS } from './project';

// Version 1 deliberately contains one project file. Its existing asset table
// embeds original models, textures and worker motions with instance deduplication.
const ENTRY = 'project.txt';
const LIMIT = MAX_PROJECT_CHARS;
export const MAX_ARCHIVE_BYTES = LIMIT + 1_000_000;
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let n = 0; n < 8; n++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  return c >>> 0;
});
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function createProjectArchive(text: string): Uint8Array {
  const data = strToU8(text);
  if (data.length > LIMIT) throw new Error('Project exceeds the 180 MB archive limit');
  return zipSync({ [ENTRY]: data }, { level: 6 });
}

/** Validate the one-entry ZIP before decompression, including its declared size. */
export function readProjectArchive(bytes: Uint8Array): string {
  if (bytes.length < 22 || bytes.length > MAX_ARCHIVE_BYTES) throw new Error('Invalid or oversized project archive');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  if (view.getUint32(end, true) !== 0x06054b50 || view.getUint16(end + 20, true) !== 0 ||
      view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0 ||
      view.getUint16(end + 8, true) !== 1 || view.getUint16(end + 10, true) !== 1) throw new Error('Invalid project archive directory');
  const dirSize = view.getUint32(end + 12, true), dir = view.getUint32(end + 16, true);
  if (dir + dirSize !== end || dir + 46 > end || view.getUint32(dir, true) !== 0x02014b50) throw new Error('Invalid project archive directory');
  const flags = view.getUint16(dir + 8, true), method = view.getUint16(dir + 10, true);
  const compressed = view.getUint32(dir + 20, true), size = view.getUint32(dir + 24, true);
  const nameLength = view.getUint16(dir + 28, true), extra = view.getUint16(dir + 30, true), comment = view.getUint16(dir + 32, true);
  const local = view.getUint32(dir + 42, true);
  if ((flags & ~0x800) !== 0 || (method !== 0 && method !== 8) || size > LIMIT || compressed > LIMIT ||
      dir + 46 + nameLength + extra + comment !== end || local !== 0 || local + 30 > dir ||
      view.getUint32(local, true) !== 0x04034b50) throw new Error('Unsupported project archive');
  const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(dir + 46, dir + 46 + nameLength));
  const localNameLength = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true);
  const dataStart = local + 30 + localNameLength + localExtra;
  if (name !== ENTRY || localNameLength !== nameLength || dataStart + compressed !== dir ||
      view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method ||
      view.getUint32(local + 14, true) !== view.getUint32(dir + 16, true) ||
      view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== size ||
      new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(local + 30, local + 30 + localNameLength)) !== ENTRY) throw new Error('Invalid project archive entry');
  const data = unzipSync(bytes)[ENTRY];
  if (!data || data.length !== size || crc32(data) !== view.getUint32(dir + 16, true)) throw new Error('Invalid project archive size or checksum');
  return new TextDecoder('utf-8', { fatal: true }).decode(data);
}
