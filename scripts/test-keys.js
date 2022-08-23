// Imports the Cloud KMS library
import * as kms from '@google-cloud/kms';
import * as fcl from "@onflow/fcl";
import { fromBER } from "asn1js"
import { decode, encode } from "rlp";
import * as crypto from "crypto"

const projectId = "my-kms-project-35857";
const locationId = "global";
const keyRingId = "test";
const keyId = "tester002";
const versionId = "1";
const walletAddress = "eba0ffa73653b2f1";
const walletKeyId = 8;

const resourceId = "projects/my-kms-project-35857/locations/global/keyRings/test/cryptoKeys/tester002/cryptoKeyVersions/1"
// Instantiates a client
const client = new kms.KeyManagementServiceClient();

const signatureBuffer = (signature) => Buffer.from(signature, "hex");

const rightPaddedHexBuffer = (value, pad) =>
    Buffer.from(value.padEnd(pad * 2, 0), "hex");

const leftPaddedHexBuffer = (value, pad) =>
    Buffer.from(value.padStart(pad * 2, 0), "hex");

const TRANSACTION_DOMAIN_TAG = rightPaddedHexBuffer(
    Buffer.from("FLOW-V0.0-transaction").toString("hex"),
    32
).toString("hex");

const buildTx = (payloadDecoded) => {
    let transaction = `transaction {
        prepare(signer: AuthAccount) {
          log("Hello, World!")
        }
      }
      `
    transaction = payloadDecoded[0];
    const transactionByteArray = Buffer.from(transaction.toString())
    const args = [];
    const proposalKeyAddressByteArray = Buffer.from(walletAddress, 'hex');
    const refBlockId = payloadDecoded[2].toString("hex");
    const limit = payloadDecoded[3].toString("hex");
    const sequence_number = payloadDecoded[5].toString("hex")
    console.log('\ncdc', transaction.toString())
    console.log('ref block', refBlockId);
    console.log('limit', limit);
    console.log('seq', sequence_number)

    const payloadCanonicalForm = [
        transactionByteArray,
        args,
        refBlockId,
        parseInt(limit),
        proposalKeyAddressByteArray,
        parseInt(walletKeyId),
        parseInt(sequence_number),
        proposalKeyAddressByteArray,
        []
    ];
    return payloadCanonicalForm;
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
    const payload = Buffer.from(message)
    const hash = crypto.createHash("sha256")
    hash.update(Buffer.from(payload, "hex"))
    const digest = hash.digest()

    console.log('key', versionName)
    console.log('message sent', message)
    // Sign the message with Cloud KMS
    const [signResponse] = await client.asymmetricSign({
        name: versionName,
        digest: {
            sha256: digest,
        },
    });

    // Because the signature is in a binary format, you need to encode the output before printing it to a
    // console or displaying it on a screen.
    const sig = signResponse.signature
    const encoded = signResponse.signature.toString('base64');
    console.log('sig', encoded)
    // Convert the binary signature output to to format Flow network expects
    const { r, s } = parseSignature(sig);
    return Buffer.concat([r, s]).toString("hex");
}

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
    console.log('\ns', s.toString("hex"));
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

const savePayload = async (url, payload) => {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            'Content-Type': 'application/text'
        },
        body: payload
    });
    console.log('status', res.status)
}

const arg = process.argv.slice(2) || [];

const url = arg[0];

const message = await fetchMessage(url);
console.log('start:', message)
const decodePayload = decode("0x" + message)[0]
const payload = TRANSACTION_DOMAIN_TAG + encode([decodePayload, []]).toString("hex");
let sig = await mySignFunction(payload);

console.log("\nsignature: ", sig);

const envelope = encode([decodePayload, [], [[0, walletKeyId, Buffer.from(sig, "hex")]]]).toString("hex");

console.log('envelope', envelope)
savePayload(url, envelope);