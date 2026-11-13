// Offline entrypoint: validates and copies the current local render unchanged.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(fileURLToPath(import.meta.url));
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const sourcePath = join(repositoryRoot, 'entry.png');
const image = readFileSync(sourcePath);

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePng(bytes) {
  if (bytes.length > 1024 * 1024) throw new Error('entry.png exceeds 1 MiB');
  if (bytes.length < pngSignature.length + 12 || !bytes.subarray(0, 8).equals(pngSignature)) {
    throw new Error('entry.png is not a PNG');
  }

  let offset = pngSignature.length;
  let chunks = 0;
  let sawHeader = false;
  let sawEnd = false;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('entry.png has an incomplete PNG chunk');
    const length = bytes.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = typeStart + 4;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataStart || chunkEnd > bytes.length) throw new Error('entry.png has a truncated PNG chunk');

    const type = bytes.toString('ascii', typeStart, dataStart);
    const expectedCrc = bytes.readUInt32BE(dataEnd);
    if (crc32(bytes.subarray(typeStart, dataEnd)) !== expectedCrc) throw new Error(`entry.png has an invalid ${type} CRC`);

    if (chunks === 0) {
      if (type !== 'IHDR' || length !== 13) throw new Error('entry.png is missing a valid IHDR chunk');
      const width = bytes.readUInt32BE(dataStart);
      const height = bytes.readUInt32BE(dataStart + 4);
      if (width === 0 || height === 0 || width > 1024 || height > 1024) {
        throw new Error('entry.png dimensions exceed 1024×1024');
      }
      sawHeader = true;
    }

    if (type === 'IEND') {
      if (length !== 0 || chunkEnd !== bytes.length) throw new Error('entry.png has an invalid IEND chunk');
      sawEnd = true;
      break;
    }
    offset = chunkEnd;
    chunks += 1;
  }

  if (!sawHeader || !sawEnd) throw new Error('entry.png is incomplete');
}

validatePng(image);
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(join(outputDirectory, 'entry.png'), image);
