import { supabase } from "../../../../../utils/supabaseClient";
import { decode } from "rlp";
import { signTx } from "../../../../../utils/signer";
import { encodeTransactionPayload } from "@onflow/sdk";

const unique = (value, index, self) => {
    return self.indexOf(value) === index;
};

const decodedEnvelopeSignature = (envelopeRLP) => {
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

export default async function handler({ body, method, query }, res) {
    switch (method) {
        case "GET":
            const privKey = "23e0d456a46265bed677f3ff39b804c5464216674e1f4fad798dcf9cfc191e97";
            const { data, error, status } = await supabase
                .from("payloadSigs")
                .select("rlp, signable")
                .match(query);

            // Could not find row.
            if (status === 406) {
                return res.status(404).send(error);
            }
            const { voucher } = data[0].signable;
            const { rlp } = data[0];
            console.log('rlp  ', rlp)
            console.log(JSON.stringify(voucher))
            const txPayloadRLP = encodeTransactionPayload(voucher).slice("464c4f572d56302e302d7472616e73616374696f6e0000000000000000000000".length);
            console.log('payload', txPayloadRLP);
            const address = decode("0x" + txPayloadRLP)[4]
            console.log('decoded', address.toString("hex"));
            console.log(txPayloadRLP)
            // sign RLP with default signer
            const sig = signTx(txPayloadRLP, privKey);
            console.log('signed', sig)
            const txSig = signTx(rlp, privKey);
            console.log('\nrlp signed', txSig);
            // Could not find row.
            if (status === 406) {
                return res.status(404).json({
                    error,
                });
            }

            return res.status(200).send({ sig });
    }
}