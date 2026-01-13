import { supabase } from "../../../utils/supabaseClient";
import { decode } from "rlp";
import { decompressSignable } from "../../../utils/compression";

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
  return [...decoded[1], ...decoded[2]].map((r) => {
    const signerIndex = r[0][0] || 0;
    const address = signerIndexedAddresses[signerIndex].toString("hex");

    return {
      address,
      // In RLP zero is an empty (null) buffer.
      keyId: r[1][0] || 0,
      sig: r[2].toString("hex"),
    };
  });
};


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

      // Decompress signable if compressed
      const decompressedData = data?.map(row => ({
        ...row,
        signable: decompressSignable(row.signable),
      }));

      return res.status(200).json({
        data: decompressedData,
      });

    default:
      return res.status(405);
  }
}
