import { supabase } from "../../../../../utils/supabaseClient";
import { SHA3 } from "sha3";

const sha3_256 = (msg) => {
  const sha = new SHA3(256);
  sha.update(Buffer.from(msg, "hex"));
  return sha.digest().toString("hex");
};

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "GET":
      const { data, error, status } = await supabase
        .from("payloadSigs")
        .select("sig, keyId, address")
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
      // Update Signature here.
      const signatureRequestId = sha3_256(body.message);

      await supabase.from("payloadSigs").upsert({
        signatureRequestId,
        keyId: query.keyId,
        address: query.address,
        signable: body,
      });

      return res.status(200).json({
        id: signatureRequestId,
      });

    default:
      return res.status(405);
  }
}
