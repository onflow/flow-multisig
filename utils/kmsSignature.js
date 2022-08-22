import { decode, encode } from "rlp";
import { fromBER } from "asn1js"


const parseSignature = (buf) => {
    const { result } = fromBER(toArrayBuffer(buf))
    const values = (result).valueBlock.value

    const getHex = (value) => {
        const buf = Buffer.from(value.valueBlock.valueHex)
        return buf.slice(Math.max(buf.length - 32, 0))
    }

    const r = getHex(values[0])
    const s = getHex(values[1])
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

export const convert = (kmsSignature) => {
    const sig = kmsSignature;

    // Convert the binary signature output to to format Flow network expects
    const { r, s } = parseSignature(sig)
    return Buffer.concat([r, s]).toString("hex")
}

export const prepareSignedEnvelope = (rlp, address, keyId, signature) => {
    const payload = decode("0x" + rlp);
    const env = encode([payload[0], [], [[address, keyId, signature]]]).toString("hex");
    return env;
}