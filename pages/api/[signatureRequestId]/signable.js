import * as fcl from "@onflow/fcl";
import { supabase } from "../../../utils/supabaseClient";

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "GET":
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
