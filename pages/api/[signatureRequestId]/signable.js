import { supabase } from "../../../utils/supabaseClient";
import { decompressSignable } from "../../../utils/compression";

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "GET":
      // Each key has its own copy of the compressed signable
      const { data, error, status } = await supabase
        .from("payloadSigs")
        .select("sig, keyId, address, signable")
        .match(query)
        .limit(1);

      // Could not find row.
      if (status === 406 || !data || data.length === 0) {
        return res.status(404).json({
          error: error || "Signable not found",
        });
      }

      // Decompress signable if it was compressed
      const decompressedData = data.map(row => ({
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
