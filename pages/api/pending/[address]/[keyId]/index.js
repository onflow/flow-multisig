import * as fcl from "@onflow/fcl";
import { supabase } from "../../../../../utils/supabaseClient";

export default async function handler({ body, method, query }, res) {
    switch (method) {
        case "GET":
            // TODO: change query to get signature request ids that don't have signatures and not too old
            const { data, error, status } = await supabase
                .from("payloadSigs")
                .select("signatureRequestId, sig")
                .match({
                    address: fcl.sansPrefix(query.address),
                    keyId: query.keyId,
                });

            if (status === 406) {
                // try with removing leading "0x"
                return res.status(404).json({
                    error,
                });
            }
            return res.status(200).json({
                data,
            });
    }
}
