/**
 * Safe ZIP Central Directory Parser
 * Reads central directory metadata (filenames, uncompressed sizes, compression method)
 * WITHOUT fully decompressing into memory/disk.
 * Protects against ZIP-bombs by enforcing total uncompressed size limits and compression ratios.
 */

export interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  isDirectory: boolean;
}

export interface ZipManifest {
  valid: boolean;
  totalEntries: number;
  totalUncompressedBytes: number;
  totalCompressedBytes: number;
  entries: ZipEntry[];
  error?: string;
}

const MAX_SAFE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // 500MB safety ceiling
const MAX_COMPRESSION_RATIO = 100; // Flag ratio > 100:1 as dangerous ZIP bomb

export function parseZipCentralDirectory(buffer: Buffer): ZipManifest {
  try {
    if (buffer.length < 22) {
      return {
        valid: false,
        totalEntries: 0,
        totalUncompressedBytes: 0,
        totalCompressedBytes: buffer.length,
        entries: [],
        error: "Buffer too small to be a valid ZIP",
      };
    }

    // 1. Locate End of Central Directory (EOCD) record
    // EOCD signature is 0x06054b50 (PK\x05\x06)
    // It's located in the last 65KB of the file
    let eocdOffset = -1;
    const searchStart = Math.max(0, buffer.length - 65557);

    for (let i = buffer.length - 22; i >= searchStart; i--) {
      if (
        buffer[i] === 0x50 &&
        buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x05 &&
        buffer[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      return {
        valid: false,
        totalEntries: 0,
        totalUncompressedBytes: 0,
        totalCompressedBytes: buffer.length,
        entries: [],
        error: "End of Central Directory (EOCD) record not found",
      };
    }

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdSize = buffer.readUInt32LE(eocdOffset + 12);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    if (cdOffset + cdSize > buffer.length) {
      return {
        valid: false,
        totalEntries: 0,
        totalUncompressedBytes: 0,
        totalCompressedBytes: buffer.length,
        entries: [],
        error: "Corrupted ZIP Central Directory offset",
      };
    }

    const entries: ZipEntry[] = [];
    let currentOffset = cdOffset;
    let totalUncompressed = 0;

    for (let i = 0; i < totalEntries && currentOffset < cdOffset + cdSize; i++) {
      // Central directory file header signature: 0x02014b50 (PK\x01\x02)
      if (
        buffer[currentOffset] !== 0x50 ||
        buffer[currentOffset + 1] !== 0x4b ||
        buffer[currentOffset + 2] !== 0x01 ||
        buffer[currentOffset + 3] !== 0x02
      ) {
        break;
      }

      const compressedSize = buffer.readUInt32LE(currentOffset + 20);
      const uncompressedSize = buffer.readUInt32LE(currentOffset + 24);
      const filenameLength = buffer.readUInt16LE(currentOffset + 28);
      const extraFieldLength = buffer.readUInt16LE(currentOffset + 30);
      const fileCommentLength = buffer.readUInt16LE(currentOffset + 32);

      const filenameBuffer = buffer.subarray(
        currentOffset + 46,
        currentOffset + 46 + filenameLength
      );
      const rawFilename = filenameBuffer.toString("utf-8");
      // Normalize separators without altering relative segments
      const sanitizedName = rawFilename.replace(/\\/g, "/");

      const isDirectory = rawFilename.endsWith("/") || rawFilename.endsWith("\\");

      entries.push({
        filename: sanitizedName,
        compressedSize,
        uncompressedSize,
        isDirectory,
      });

      totalUncompressed += uncompressedSize;

      // Move to next central directory record (header is 46 bytes + variable fields)
      currentOffset += 46 + filenameLength + extraFieldLength + fileCommentLength;
    }

    // Safety checks against ZIP-bomb attacks
    if (totalUncompressed > MAX_SAFE_UNCOMPRESSED_BYTES) {
      return {
        valid: false,
        totalEntries: entries.length,
        totalUncompressedBytes: totalUncompressed,
        totalCompressedBytes: buffer.length,
        entries,
        error: "ZIP uncompressed payload exceeds safe maximum limit (500MB)",
      };
    }

    if (buffer.length > 0 && totalUncompressed / buffer.length > MAX_COMPRESSION_RATIO) {
      return {
        valid: false,
        totalEntries: entries.length,
        totalUncompressedBytes: totalUncompressed,
        totalCompressedBytes: buffer.length,
        entries,
        error: "Unreasonable compression ratio detected (potential ZIP bomb)",
      };
    }

    return {
      valid: true,
      totalEntries: entries.length,
      totalUncompressedBytes: totalUncompressed,
      totalCompressedBytes: buffer.length,
      entries,
    };
  } catch (err: any) {
    return {
      valid: false,
      totalEntries: 0,
      totalUncompressedBytes: 0,
      totalCompressedBytes: buffer.length,
      entries: [],
      error: `Failed to parse ZIP directory: ${err.message || "Unknown error"}`,
    };
  }
}
