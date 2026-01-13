import zlib from "zlib";

/**
 * Compress a JSON object using gzip and return as base64 string.
 * This can reduce payload size by 70-90% for JSON data.
 */
export function compressSignable(signable) {
  try {
    const jsonStr = JSON.stringify(signable);
    const originalSize = Buffer.byteLength(jsonStr, 'utf8');
    
    const compressed = zlib.gzipSync(jsonStr, { level: 9 }); // Max compression
    const base64 = compressed.toString('base64');
    const compressedSize = Buffer.byteLength(base64, 'utf8');
    
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`[Compression] Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction)`);
    
    return {
      _compressed: true,
      _encoding: 'gzip+base64',
      data: base64,
    };
  } catch (error) {
    console.error('[Compression] Failed, storing uncompressed:', error.message);
    return signable; // Fall back to uncompressed
  }
}

/**
 * Decompress a signable that was compressed with gzip+base64.
 * Returns the original object, or the input if not compressed.
 * Handles both compressed and uncompressed signables transparently.
 */
export function decompressSignable(signable) {
  if (!signable) return signable;
  
  // Check if this is a compressed signable
  if (signable._compressed && signable._encoding === 'gzip+base64' && signable.data) {
    try {
      const buffer = Buffer.from(signable.data, 'base64');
      const decompressed = zlib.gunzipSync(buffer);
      return JSON.parse(decompressed.toString('utf8'));
    } catch (error) {
      console.error('[Decompression] Failed:', error.message);
      return signable; // Return as-is if decompression fails
    }
  }
  
  // Not compressed, return as-is (backwards compatible with old data)
  return signable;
}
