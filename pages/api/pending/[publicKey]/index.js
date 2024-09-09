import { supabase } from "../../../../utils/supabaseClient";

export default async function handler({ body, method, query }, res) {
    switch (method) {
        case "GET":
            // TODO: change query to get signature request ids that don't have signatures and not too old
            const { data, error, status } = await supabase
                .from("payloadSigs")
                .select("signatureRequestId, sig, created_at, address, keyId")
                .match({
                    publicKey: query.publicKey,
                })
                .order('created_at', { ascending: false })

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
