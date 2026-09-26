import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';

export function readDocxEntries(buffer: Buffer): Map<string, Buffer> {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  assert.notEqual(eocdOffset, -1, 'DOCX ZIP EOCD not found');

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(buffer.readUInt32LE(centralOffset), 0x02014b50, 'Invalid central directory entry');
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString('utf8');

    assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50, 'Invalid local ZIP entry');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    assert.ok(data, `Unsupported ZIP method ${method} for ${name}`);
    entries.set(name, data);

    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

export function readDocxDocumentXml(buffer: Buffer): string {
  const xml = readDocxEntries(buffer).get('word/document.xml');
  assert.ok(xml, 'word/document.xml not found');
  return xml.toString('utf8');
}
