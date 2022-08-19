//
// TODO(developer): Uncomment these variables before running the sample.
//
// const projectId = 'my-project';
// const locationId = 'us-east1';
const projectId = "my-kms-project-35857";
const locationId = "global";
const keyRingId = "test";
const keyId = "tester002";
const versionId = "1";

// Imports the Cloud KMS library
import * as kms from '@google-cloud/kms';
import { SHA3 } from 'sha3';
import { fromBER } from "asn1js"

// Instantiates a client
const client = new kms.KeyManagementServiceClient();

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

    const txMessage = hash(message)

    // Sign the message with Cloud KMS
    const [signResponse] = await client.asymmetricSign({
        name: versionName,
        data: txMessage,
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

const message = "f897f893b84e7472616e73616374696f6e207b0a202070726570617265287369676e65723a20417574684163636f756e7429207b0a202020206c6f67282248656c6c6f2c20576f726c642122290a20207d0a7d0ac0a0a57f82c3eceebbee8c371b6551e6c380e2e952a9607848f38e111c16e755eaa782270f88eba0ffa73653b2f1080288eba0ffa73653b2f1c988eba0ffa73653b2f1c0c0";
const sig = await mySignFunction(message);
console.log("\nsignature: ", sig);

