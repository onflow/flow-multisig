import { supabase } from "../../../../../utils/supabaseClient";
import { error } from "next/dist/build/output/log";

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "GET":
      const { data, error, status } = await supabase
        .from("payloadSigs")
        .select("sig, keyId, address")
        .match(query)
        .single();

      // Could not find row.
      if (status === 406) {
        return res.status(404).json({
          error,
        });
      }

      return res.status(200).json({
        isSigned: false,
        ...data,
      });

    // Update the signature
    case "POST":
      return res.status(200).json({
        address,
        keyId,
        signatureRequestId,
      });
  }
}
