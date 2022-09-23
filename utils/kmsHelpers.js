import { decode, encode } from "rlp";
import { fromBER } from "asn1js"
import { TRANSACTION_DOMAIN_TAG } from "./fclCLI";
import * as crypto from "crypto";
import * as fcl from "@onflow/fcl";
import Keypairs from "@root/keypairs"

const leftPaddedHexBuffer = (value, pad) => {
    let result = Buffer.from(value, "base64");
    if (value.length < 32) {
        console.log('lenght too short, left padding value')
        result = Buffer.from(value.padStart(pad * 2, 0), "hex");
    }
    return result;
}

function padArrayWithZero(byteArray, size) {
    if (byteArray.length < size) {
        const lacking = new Array(size - byteArray.length).fill(0);
        return lacking.concat(byteArray);
    }
    return byteArray
}

const getHex = (value) => {
    const arrBuffer = padArrayWithZero(value.valueBlock.valueHex, 32);
    const buf = Buffer.from(arrBuffer, "hex");
    return buf.slice(Math.max(buf.length - 32, 0))
}

const parseSignature = (buf) => {
    const { result } = fromBER(toArrayBuffer(buf))
    const values = (result).valueBlock.value
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
export const convertPublicKey = async (kmsPublicKey) => {
    const jwk = await Keypairs.import({ pem: kmsPublicKey });
    const xValue = leftPaddedHexBuffer(jwk.x, 32);
    const yValue = leftPaddedHexBuffer(jwk.y, 32);
    const key = Buffer.concat([xValue, yValue]).toString("hex");
    return key;
}
export const getMatchingAccountKeys = async (address, publicKey) => {
    // get keyIds for all public keys
    const account = await fcl.send([fcl.getAccount(address)]).then(fcl.decode);
    console.log(account.keys)
    let keys = [];
    for (let i = 0; i < account.keys.length; i++) {
        const key = account.keys[i];
        if (key.publicKey === publicKey && !key.revoked) {
            keys.push({ address: address, keyId: key.index, weight: key.weight, publicKey: key.publicKey });
        }
    }
    return keys.sort((a, b) => a.weight > b.weight ? -1 : 1)
}