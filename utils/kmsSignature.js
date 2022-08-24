import { decode, encode } from "rlp";
import { fromBER } from "asn1js"
import { TRANSACTION_DOMAIN_TAG } from "./fclCLI";
import * as crypto from "crypto";

const getHex = (value) => {
    const buf = Buffer.from(value.valueBlock.valueHex)
    return buf.slice(Math.max(buf.length - 32, 0))
}

const parseSignature = (buf) => {
    const { result } = fromBER(toArrayBuffer(buf))
    const values = (result).valueBlock.value

    const r = getHex(values[0])
    const s = getHex(values[1])
    console.log('\nr', r.toString("hex"));
    console.log('s', s.toString("hex"));
    return { r, s }
}

const toArrayBuffer = (buffer) => {
    const ab = new ArrayBuffer(buffer.length)
    const view = new Uint8Array(ab)
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i]
    }
    return ab
}

export const getDigest = (message) => {
    const hash = crypto.createHash("sha256")
    hash.update(Buffer.from(message, "hex"))
    const digest = hash.digest();
    return {
        sha256: digest.toString("base64")
    }
}

export const getPayload = (message) => {
    const decodePayload = decode("0x" + message)[0]
    const payload = TRANSACTION_DOMAIN_TAG + encode([decodePayload, []]).toString("hex");
    console.log('payload', payload)
    const b64 = payload.toString("base64");
    console.log('message b64', b64);
    return b64
}

export const convert = (kmsSignature) => {
    const sig = Buffer.from(kmsSignature, "base64");

    // Convert the binary signature output to to format Flow network expects
    const { r, s } = parseSignature(sig)
    return Buffer.concat([r, s]).toString("hex")
}
export const prepareMessage = (message) => {
    const decodeMsg = decode("0x" + message)[0]
    const payload = TRANSACTION_DOMAIN_TAG + encode([decodeMsg, []]).toString("hex");
    return payload;
}
export const prepareSignedEnvelope = (rlp, keyId, signature) => {
    const decodePayload = decode("0x" + rlp)[0];
    const env = encode([decodePayload, [], [[0, parseInt(keyId), Buffer.from(signature, "hex")]]]).toString("hex");
    return env;
}