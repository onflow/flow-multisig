// Imports the Cloud KMS library
import * as kms from '@google-cloud/kms';
import * as fcl from "@onflow/fcl";
import { fromBER } from "asn1js"
import { decode, encode } from "rlp";
import * as crypto from "crypto";
import CRC32C from "crc-32/crc32c.js";
import sha2 from "sha2";
import Keypairs from "@root/keypairs"
import rsa from 'js-x509-utils';
import keyutils from 'js-crypto-key-utils';

const projectId = "my-kms-project-35857";
const locationId = "global";
const keyRingId = "viva"; //"test";
const keyId = "secp"; //"tester002";
const versionId = "1";
const walletAddress = "4cfab7e565eb93e1";
const walletKeyId = 0;
const resourceId = "projects/my-kms-project-35857/locations/global/keyRings/test/cryptoKeys/tester002/cryptoKeyVersions/1";
const secpResourceId = "projects/my-kms-project-35857/locations/global/keyRings/viva/cryptoKeys/secp/cryptoKeyVersions/1";

// Instantiates a client
const client = new kms.KeyManagementServiceClient();

const leftPaddedHexBuffer = (value, pad) => {
    let result = Buffer.from(value, "base64");
    if (value.length < 32) {
        console.log('lenght too short, left padding value')
        result = Buffer.from(value.padStart(pad * 2, 0), "hex");
    }
    return result;
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
    console.log(`Public key pem:\n`, publicKey);


    const keyObjFromPem = new keyutils.Key('pem', publicKey.pem);
    console.log('key', keyObjFromPem)
    const jwk = await keyObjFromPem.export('jwk');
    console.log('jwk', jwk)

    const xValue = leftPaddedHexBuffer(jwk.x, 32);
    const yValue = leftPaddedHexBuffer(jwk.y, 32);
    const key = Buffer.concat([xValue, yValue]).toString("hex");
    const key2 = Buffer.concat([Buffer.from(jwk.x, 'base64'), Buffer.from(jwk.y, 'base64')]).toString("hex");
    console.log(jwk);
    console.log('key', key);
    console.log('key2', key2);

    /*
    const jwk = await Keypairs.import({ pem: publicKey.pem });
    const xValue = leftPaddedHexBuffer(jwk.x, 32);
    const yValue = leftPaddedHexBuffer(jwk.y, 32);
    const key = Buffer.concat([xValue, yValue]).toString("hex");
    const key2 = Buffer.concat([Buffer.from(jwk.x, 'base64'), Buffer.from(jwk.y, 'base64')]).toString("hex");
    console.log(jwk);
    console.log('key', key);
    console.log('key2', key2);
*/
}

getPublicKey()