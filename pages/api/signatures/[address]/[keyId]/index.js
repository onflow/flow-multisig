import { supabase } from "../../../../../utils/supabaseClient";
import {
  encodeVoucherToEnvelope,
  getSignatureRequestIdFromRLP,
} from "../../../../../utils/fclCLI";

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "GET":
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

    case "POST":
      const cliRLP = encodeVoucherToEnvelope({
        ...body.voucher,
        envelopeSigs: [],
        payloadSigs: [],
      });

      const signatureRequestId = getSignatureRequestIdFromRLP(cliRLP);

      await supabase.from("payloadSigs").upsert({
        signatureRequestId,
        keyId: query.keyId,
        address: query.address,
        signable: body,
        rlp: cliRLP
      });

      console.log('upsert', {
        signatureRequestId,
        keyId: query.keyId,
        address: query.address,
        signable: body,
        rlp: cliRLP
      })

      return res.status(200).json({
        id: signatureRequestId,
      });

    default:
      return res.status(405);
  }
}
