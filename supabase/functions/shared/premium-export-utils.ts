export interface PremiumZipFile {
  path: string;
  bytes: Uint8Array;
}

const textEncoder = new TextEncoder();
const UTF8_BOM = "\uFEFF";
const FORMULA_PREFIX_REGEX = /^[=+\-@]/;

export function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const safe = FORMULA_PREFIX_REGEX.test(raw) ? `'${raw}` : raw;

  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

export function buildCsv(rows: unknown[][]): string {
  return `${UTF8_BOM}${
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
  }`;
}

export function utf8Bytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

export async function buildPremiumZip(
  files: PremiumZipFile[],
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const normalizedPath = normalizeZipPath(file.path);
    const nameBytes = textEncoder.encode(normalizedPath);
    const crc = crc32(file.bytes);
    const localHeader = buildLocalFileHeader(nameBytes, file.bytes.length, crc);

    chunks.push(localHeader, file.bytes);
    centralDirectory.push(
      buildCentralDirectoryHeader(nameBytes, file.bytes.length, crc, offset),
    );
    offset += localHeader.length + file.bytes.length;
  }

  const centralDirectoryStart = offset;
  for (const header of centralDirectory) {
    chunks.push(header);
    offset += header.length;
  }

  chunks.push(
    buildEndOfCentralDirectory(
      files.length,
      offset - centralDirectoryStart,
      centralDirectoryStart,
    ),
  );

  return concatBytes(chunks);
}

function normalizeZipPath(path: string): string {
  const normalized = path
    .split("/")
    .map((part) => part.replace(/[^A-Za-z0-9._ -]+/g, "_").trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");

  return normalized || "file";
}

function buildLocalFileHeader(
  nameBytes: Uint8Array,
  size: number,
  crc: number,
): Uint8Array {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function buildCentralDirectoryHeader(
  nameBytes: Uint8Array,
  size: number,
  crc: number,
  localHeaderOffset: number,
): Uint8Array {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  header.set(nameBytes, 46);
  return header;
}

function buildEndOfCentralDirectory(
  fileCount: number,
  centralDirectorySize: number,
  centralDirectoryStart: number,
): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryStart, true);
  view.setUint16(20, 0, true);
  return header;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
