import { supabase } from "../../../utils/supabaseClient";
import { decode } from "rlp";

const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

export const decodedEnvelopeSignature = (envelopeRLP) => {
  const decoded = decode("0x" + envelopeRLP);

  // Addresses in signature index order.
  // e.g. [ proposer, payer, all the authorizers]
  const signerIndexedAddresses = [
    decoded[0][4].toString("hex"),
    decoded[0][7].toString("hex"),
    ...decoded[0][8].map((r) => r.toString("hex")),
  ].filter(unique);
  return decoded[1].map((r) => {
    const signerIndex = r[0][0];
    const address = signerIndexedAddresses[signerIndex].toString("hex");

    return {
      address,
      // In RLP zero is an empty (null) buffer.
      keyId: r[1][0] || 0,
      sig: r[2].toString("hex"),
    };
  });
};

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "POST":
      for (const { address, keyId, sig } of decodedEnvelopeSignature(
        body.envelope
      )) {
        await supabase
          .from("payloadSigs")
          .update({
            sig,
          })
          .match({
            address,
            keyId,
          });
      }

      const { data, error, status } = await supabase
        .from("payloadSigs")
        .select("sig, keyId, address, signable")
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

    default:
      return res.status(405);
  }
}
