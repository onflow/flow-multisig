import { encodeTransactionPayload } from "@onflow/sdk";
import { encodeVoucherToEnvelope } from "./fclCLI.js";
import { encode, decode } from "rlp";

// package.json //    "type": "module",
// to use fclCLI methods

const decodeRlp = (rlp, label) => {
  console.log(label, rlp)
  console.log(label, decode(rlp))
  console.log(label, "0", decode(rlp)[0].toString("hex"))
  console.log(label, "1",decode(rlp)[1].toString("hex"))
  console.log(label, "2",decode(rlp)[2].toString("hex"))
  console.log(label, "3",decode(rlp)[3].toString("hex"))  
  console.log(label, "4", decode(rlp)[4].toString("hex"));
}
const data = {
    "addr": "4cd9606ad17814a4",
    "args": [],
    "data": {},
    "f_vsn": "1.0.1",
    "keyId": 0,
    "roles": {
      "param": false,
      "payer": false,
      "proposer": true,
      "authorizer": false
    },
    "f_type": "Signable",
    "cadence": "transaction {\n  prepare(signer: AuthAccount) {\n    log(\"Hello, World!\")\n  }\n}\n",
    "message": "464c4f572d56302e302d7472616e73616374696f6e0000000000000000000000f893b84e7472616e73616374696f6e207b0a202070726570617265287369676e65723a20417574684163636f756e7429207b0a202020206c6f67282248656c6c6f2c20576f726c642122290a20207d0a7d0ac0a0838891ca49f3079fdb50245bc219629849574194d9733035ec3f616252759a3382270f884cd9606ad17814a4808088584789ff3b58da69c988584789ff3b58da69",
    "voucher": {
      "payer": "0x584789ff3b58da69",
      "cadence": "transaction {\n  prepare(signer: AuthAccount) {\n    log(\"Hello, World!\")\n  }\n}\n",
      "refBlock": "602243b92369b9b90d0cbeb8160a6f21bbc8e91670c3748ecd678ab0699a908e",
      "arguments":
      [],
      "authorizers":
      [
          "0x584789ff3b58da69"
      ],
      "payloadSigs":
      [
          {
              "sig": null,
              "keyId": 0,
              "address": "0x4cd9606ad17814a4"
          }
      ],
      "proposalKey":
      {
          "keyId": 0,
          "address": "0x4cd9606ad17814a4",
          "sequenceNum": 0
      },
      "computeLimit": 9999,
      "envelopeSigs":
      [
          {
              "sig": null,
              "keyId": 0,
              "address": "0x584789ff3b58da69"
          }
      ]
  },
    "interaction": {
      "tag": "TRANSACTION",
      "block": {
        "id": null,
        "height": null,
        "isSealed": null
      },
      "payer": [
        "584789ff3b58da69-0"
      ],
      "events": {
        "end": null,
        "start": null,
        "blockIds": [],
        "eventType": null
      },
      "params": {},
      "reason": null,
      "status": "OK",
      "account": {
        "addr": null
      },
      "assigns": {},
      "message": {
        "payer": null,
        "params": [],
        "cadence": "transaction {\n  prepare(signer: AuthAccount) {\n    log(\"Hello, World!\")\n  }\n}\n",
        "proposer": null,
        "refBlock": "838891ca49f3079fdb50245bc219629849574194d9733035ec3f616252759a33",
        "arguments": [],
        "computeLimit": 9999,
        "authorizations": []
      },
      "accounts": {
        "4cd9606ad17814a4-0": {
          "addr": "4cd9606ad17814a4",
          "kind": "ACCOUNT",
          "role": {
            "param": false,
            "payer": false,
            "proposer": true,
            "authorizer": false
          },
          "keyId": 0,
          "tempId": "4cd9606ad17814a4-0",
          "resolve": null,
          "signature": null,
          "sequenceNum": 0
        },
        "584789ff3b58da69-0": {
          "addr": "584789ff3b58da69",
          "kind": "ACCOUNT",
          "role": {
            "param": false,
            "payer": true,
            "proposer": false,
            "authorizer": true
          },
          "keyId": 0,
          "tempId": "584789ff3b58da69-0",
          "address": "584789ff3b58da69",
          "resolve": null,
          "signature": null,
          "sequenceNum": null
        }
      },
      "proposer": "4cd9606ad17814a4-0",
      "arguments": {},
      "collection": {
        "id": null
      },
      "transaction": {
        "id": null
      },
      "authorizations": [
        "584789ff3b58da69-0"
      ]
    }
  }

const { voucher } = data;

console.log(JSON.stringify(voucher))
const cliRLP = "f897f893b84e7472616e73616374696f6e207b0a202070726570617265287369676e65723a20417574684163636f756e7429207b0a202020206c6f67282248656c6c6f2c20576f726c642122290a20207d0a7d0ac0a019a644a124f3ed95e7b5adc86c86ba300885fc79ce03dae7697cf511f4bfa89382270f884cd9606ad17814a4808088be311185fc0b4a5cc988be311185fc0b4a5cc0c0"

// encode voucher
const rlp = "0x" + encodeTransactionPayload(voucher).slice("464c4f572d56302e302d7472616e73616374696f6e0000000000000000000000".length);
decodeRlp(rlp, "payload")
decodeRlp("0x" + cliRLP, "envelope")