export type ZipArchive = {
  names: string[];
  has(name: string): boolean;
  size(name: string): number;
  read(name: string): Promise<Uint8Array | null>;
  readText(name: string): Promise<string | null>;
};

type Entry = { method: number; compressed: number; size: number; offset: number };

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function openZip(bytes: Uint8Array): ZipArchive {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const floor = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= floor; i--) {
    if (view.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip archive");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder("utf-8");
  const entries = new Map<string, Entry>();
  for (let i = 0; i < count; i++) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== CENTRAL)
      throw new Error("Corrupt zip directory");
    const method = view.getUint16(p + 10, true);
    const compressed = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const offset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (!name.endsWith("/")) entries.set(name, { method, compressed, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }

  const lower = new Map<string, string>();
  for (const name of entries.keys()) lower.set(name.toLowerCase(), name);
  const resolve = (name: string) =>
    entries.has(name) ? name : (lower.get(name.toLowerCase()) ?? null);

  async function read(name: string): Promise<Uint8Array | null> {
    const key = resolve(name);
    const entry = key ? entries.get(key) : undefined;
    if (!entry) return null;
    const o = entry.offset;
    if (view.getUint32(o, true) !== LOCAL) throw new Error("Corrupt zip entry");
    const start = o + 30 + view.getUint16(o + 26, true) + view.getUint16(o + 28, true);
    const raw = bytes.subarray(start, start + entry.compressed);
    if (entry.method === 0) return raw;
    if (entry.method === 8) return inflateRaw(raw);
    throw new Error(`Unsupported zip method ${entry.method}`);
  }

  return {
    names: [...entries.keys()],
    has: (name) => resolve(name) !== null,
    size: (name) => {
      const key = resolve(name);
      return key ? (entries.get(key)?.size ?? 0) : 0;
    },
    read,
    readText: async (name) => {
      const data = await read(name);
      return data ? decoder.decode(data) : null;
    },
  };
}
