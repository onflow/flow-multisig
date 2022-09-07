// Imports the Cloud KMS library
import * as kms from '@google-cloud/kms';
import * as fcl from "@onflow/fcl";
import { fromBER } from "asn1js"
import { decode, encode } from "rlp";
import * as crypto from "crypto";
import CRC32C from "crc-32/crc32c.js";
import sha2 from "sha2";
import Keypairs from "@root/keypairs"

const projectId = "my-kms-project-35857";
const locationId = "global";
const keyRingId = "test";
const keyId = "tester002";
const versionId = "1";
const walletAddress = "4cfab7e565eb93e1";
const walletKeyId = 0;
const resourceId = "projects/my-kms-project-35857/locations/global/keyRings/test/cryptoKeys/tester002/cryptoKeyVersions/1";
// Instantiates a client
const client = new kms.KeyManagementServiceClient();

const leftPaddedHexBuffer = (value, pad) => {
  const val = Buffer.from(value, 'base64');
  const res = Buffer.from(value.padStart(pad * 2, 0), "hex");
  return res;
}

const getPublicKey = async () => {
    const versionName = client.cryptoKeyVersionPath(
        projectId,
        locationId,
        keyRingId,
        keyId,
        versionId
    );

    const [publicKey] = await client.getPublicKey({
        name: versionName,
    });
    console.log(`Public key pem:\n`, publicKey.pem);


    const jwk = await Keypairs.import({ pem: publicKey.pem });
    const xValue = leftPaddedHexBuffer(jwk.x, 32);
    const yValue = leftPaddedHexBuffer(jwk.y, 32);
    const key = Buffer.concat([xValue, yValue]).toString("hex");
    const key2 = Buffer.concat([Buffer.from(jwk.x, 'base64'), Buffer.from(jwk.y, 'base64')]).toString("hex");
    console.log(jwk);
    console.log('key', key);
    console.log('key2', key2);

}

getPublicKey()