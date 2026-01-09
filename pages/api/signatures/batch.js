import { supabase } from "../../../utils/supabaseClient";
import {
  encodeVoucherToEnvelope,
  getSignatureRequestIdFromRLP,
} from "../../../utils/fclCLI";

// Configure the API route to accept larger payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

/**
 * Batch registration endpoint for all keys in a multisig transaction.
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

    // Build rows for all keys
    const rows = keys.map(({ keyId, publicKey }) => ({
      signatureRequestId,
      keyId,
      address,
      signable,
      rlp: cliRLP,
      publicKey,
    }));

    // Insert all keys in one operation
    const { error } = await supabase
      .from("payloadSigs")
      .upsert(rows);

    if (error) {
      console.error(`[Batch API] Upsert failed:`, error.message, error);
      return res.status(500).json({
        error: `Failed to save keys: ${error.message}`,
        signatureRequestId,
      });
    }

    console.log(`[Batch API] Successfully registered ${keys.length} keys`);
    
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
