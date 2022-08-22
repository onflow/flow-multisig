// Imports the Cloud KMS library
import * as kms from '@google-cloud/kms';
import * as fcl from "@onflow/fcl";
import { SHA3 } from 'sha3';
import { fromBER } from "asn1js"
import { decode, encode } from "rlp";

const projectId = "my-kms-project-35857";
const locationId = "global";
const keyRingId = "test";
const keyId = "tester002";
const versionId = "1";

// Instantiates a client
const client = new kms.KeyManagementServiceClient();

const rightPaddedHexBuffer = (value, pad) =>
  Buffer.from(value.padEnd(pad * 2, 0), "hex");

const leftPaddedHexBuffer = (value, pad) =>
  Buffer.from(value.padStart(pad * 2, 0), "hex");

const TRANSACTION_DOMAIN_TAG = rightPaddedHexBuffer(
  Buffer.from("FLOW-V0.0-transaction").toString("hex"),
  32
).toString("hex");

const hash = (message) => {
    const sha = new SHA3(256)
    sha.update(message)
    return sha.digest()
}

async function mySignFunction(message) {
    // Create a digest of the message. The digest needs to match the digest
    // configured for the Cloud KMS key.
    const versionName = client.cryptoKeyVersionPath(
        projectId,
        locationId,
        keyRingId,
        keyId,
        versionId
    );

    console.log('message', message.toString("hex"));
    // Sign the message with Cloud KMS
    const [signResponse] = await client.asymmetricSign({
        name: versionName,
        data: message,
    });


    // Because the signature is in a binary format, you need to encode the output before printing it to a
    // console or displaying it on a screen.
    const sig = signResponse.signature
    const encoded = Buffer.concat([sig]).toString("base64")
    console.log(`Signature: ${encoded}` + "\n")

    // Convert the binary signature output to to format Flow network expects
    const { r, s } = parseSignature(sig)
    return Buffer.concat([r, s]).toString("hex")
}


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

const fetchMessage = async (url) => {
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/text'
        }
    });
    return res.text();
}
const arg = process.argv.slice(2) || [];

const arg1 = arg[0];
const arg2 = arg[1];

console.log('args1', arg1, 'args2', arg2)
const message = await fetchMessage(arg1);
const decodeMsg = decode("0x" + message)[0]
const payload = TRANSACTION_DOMAIN_TAG + encode([decodeMsg, []]).toString("hex");
const sig = await mySignFunction(payload);
console.log("\nsignature: ", sig);

const envelope = encode([payload[0], [], [[0, 8, sig]]]).toString("hex");

console.log('envelope', envelope)