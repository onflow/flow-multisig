import { supabase } from "../../../utils/supabaseClient";
import {
  encodeVoucherToEnvelope,
  getSignatureRequestIdFromRLP,
} from "../../../utils/fclCLI";
import { compressSignable } from "../../../utils/compression";

// Configure the API route to accept larger payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    // Increase timeout for large payloads
    responseLimit: false,
  },
};

// Helper to wait before retry
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Upsert a single row with retry logic
async function upsertWithRetry(row, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase.from("payloadSigs").upsert(row);
      
      if (!error) {
        return { success: true, keyId: row.keyId };
      }
      
      // Check if it's a timeout error that might succeed on retry
      const isRetryable = error.message?.includes("statement timeout") || 
                          error.message?.includes("canceling statement") ||
                          error.message?.includes("timeout") ||
                          error.code === "57014";
      
      if (isRetryable && attempt < maxRetries) {
        console.log(`[Batch API] Retry ${attempt}/${maxRetries} for key ${row.keyId} after timeout`);
        await wait(1000 * attempt); // Exponential backoff: 1s, 2s, 3s
        continue;
      }
      
      return { success: false, keyId: row.keyId, error: error.message };
    } catch (err) {
      if (attempt < maxRetries) {
        console.log(`[Batch API] Retry ${attempt}/${maxRetries} for key ${row.keyId} after error: ${err.message}`);
        await wait(1000 * attempt);
        continue;
      }
      return { success: false, keyId: row.keyId, error: err.message };
    }
  }
  return { success: false, keyId: row.keyId, error: "Max retries exceeded" };
}

// Process a chunk of keys in parallel
async function processChunk(rows) {
  const results = await Promise.all(rows.map(row => upsertWithRetry(row)));
  return results;
}

/**
 * Batch registration endpoint for all keys in a multisig transaction.
 * Uses chunked parallel inserts for speed while avoiding timeouts.
 * 
 * POST body:
 * {
 *   signable: { voucher: {...}, ... },  // The signable object from FCL
 *   keys: [{ keyId, publicKey }, ...]   // All keys to register
 *   address: "0x..."                     // The account address
 * }
 */
export default async function handler({ body, method }, res) {
  if (method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { signable, keys, address } = body;

  if (!signable?.voucher || !keys || !address) {
    return res.status(400).json({ 
      error: "Missing required fields: signable, keys, or address" 
    });
  }

  console.log(`[Batch API] Registering ${keys.length} keys for address ${address}`);

  try {
    // Generate the RLP and signatureRequestId from the voucher
    const cliRLP = encodeVoucherToEnvelope({
      ...signable.voucher,
      envelopeSigs: [],
      payloadSigs: [],
    });
    const signatureRequestId = getSignatureRequestIdFromRLP(cliRLP);

    console.log(`[Batch API] signatureRequestId: ${signatureRequestId?.slice(0, 8)}...`);

    // Keep only essential fields from signable
    const essentialSignable = {
      addr: signable.addr,
      keyId: signable.keyId,
      voucher: signable.voucher,
    };
    
    // Compress the signable to reduce storage size (can reduce by 70-90%)
    const compressedSignable = compressSignable(essentialSignable);

    const errors = [];
    
    // Build rows for all keys with compressed signable
    // Each key gets its own copy of the compressed payload (simpler for dashboard lookups)
    const rows = keys.map(({ keyId, publicKey }) => ({
      signatureRequestId,
      keyId,
      address,
      signable: compressedSignable,
      rlp: cliRLP,
      publicKey,
    }));

    console.log(`[Batch API] Inserting ${rows.length} keys with compressed payload in parallel chunks...`);
    
    // Process in chunks of 3 keys in parallel (smaller chunks since each has payload)
    const CHUNK_SIZE = 3;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
      
      console.log(`[Batch API] Processing chunk ${chunkNum}/${totalChunks} (${chunk.length} keys)...`);
      
      const results = await processChunk(chunk);
      
      // Collect any errors
      results.forEach(result => {
        if (!result.success) {
          errors.push({ keyId: result.keyId, error: result.error });
        }
      });
    }

    if (errors.length > 0) {
      console.error(`[Batch API] ${errors.length} keys failed to insert:`, errors);
      // Return partial success - first key with signable succeeded
      return res.status(207).json({
        warning: `${errors.length} of ${keys.length} keys failed to save`,
        signatureRequestId,
        keysRegistered: keys.length - errors.length,
        failedKeys: errors,
      });
    }

    console.log(`[Batch API] Successfully registered all ${keys.length} keys`);
    
    return res.status(200).json({
      signatureRequestId,
      keysRegistered: keys.length,
    });

  } catch (error) {
    console.error(`[Batch API] Unexpected error:`, error);
    return res.status(500).json({
      error: `Unexpected error: ${error.message}`,
    });
  }
}
