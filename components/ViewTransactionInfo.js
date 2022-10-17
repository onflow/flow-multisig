import { useEffect, useState } from "react"
import { decode } from "rlp";
import { encodeVoucherToEnvelope } from "../utils/fclCLI";
import { fetchSignable } from "../utils/kmsHelpers";
import { CadenceViewer } from "./CadenceViewer"

export const ViewTransactionInfo = ({ signatureRequestId }) => {
    const [code, setCode] = useState(null);
    const [args, setArgs] = useState(null);

    // fetch tx info
    useEffect(() => {
        const fetchTransactionInfo = async (id) => {
            const { data } = await fetchSignable(id);
            if (data && data.length > 0 && data[0].signable?.voucher) {
                const signable = data[0].signable;
                // The voucher is the same for all these. Doesn't matter which we pick here.
                const cliRLP = encodeVoucherToEnvelope({
                    ...signable.voucher,
                    envelopeSigs: [],
                    payloadSigs: [],
                });

                const decodedMsg = cliRLP ? decode("0x" + cliRLP) : null;
                const cp = decodedMsg ? decodedMsg[0][0] : "";
                setCode(cp)
                setArgs(signable.voucher.arguments)
            }

        }
        if (signatureRequestId) {
            fetchTransactionInfo(signatureRequestId)
        }
    }, [signatureRequestId]);

    return (
        <>
            <CadenceViewer code={code} args={args} />
        </>
    )
}