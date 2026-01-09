import { supabase } from "../../../../../utils/supabaseClient";
import {
  encodeVoucherToEnvelope,
  getSignatureRequestIdFromRLP,
} from "../../../../../utils/fclCLI";


// Configure the API route to accept larger payloads (e.g., 10MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Set the size limit to 10MB or higher if needed
    },
  },
};

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "GET": {
      const { data, error, status } = await supabase
        .from("payloadSigs")
        .select("signatureRequestId, keyId, address")
        .match(query);

      // Could not find row.
      if (status === 406) {
        return res.status(404).json({
          error,
        });
      }

      return res.status(200).json({
        data,
      });
    }

    case "POST": {
      const cliRLP = encodeVoucherToEnvelope({
        ...body.voucher,
        envelopeSigs: [],
        payloadSigs: [],
      });

      const publicKey = body?.publicKey;
      const signatureRequestId = getSignatureRequestIdFromRLP(cliRLP);

      console.log(`[API POST] Registering key ${query.keyId} for address ${query.address}, signatureRequestId: ${signatureRequestId?.slice(0, 8)}...`);

      const { error: upsertError } = await supabase.from("payloadSigs").upsert({
        signatureRequestId,
        keyId: query.keyId,
        address: query.address,
        signable: body,
        rlp: cliRLP,
        publicKey,
      });

      if (upsertError) {
        console.error(`[API POST] Upsert failed for key ${query.keyId}:`, upsertError.message, upsertError);
        return res.status(500).json({
          error: `Failed to save signature request: ${upsertError.message}`,
          id: signatureRequestId,
        });
      }

      console.log(`[API POST] Key ${query.keyId} saved successfully`);
      return res.status(200).json({
        id: signatureRequestId,
      });
    }

    default:
      return res.status(405);
  }
}
