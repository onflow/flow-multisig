import * as fcl from "@onflow/fcl";
import { HashAlgorithm, InMemoryECPrivateKey, InMemoryECSigner, SignatureAlgorithm } from '@fresh-js/crypto';
import { Authorizer } from '@fresh-js/core';
import { config } from "@onflow/fcl";
import { send as httpSent } from "@onflow/transport-http";

const envSettings = {
    mainnet: {
      "accessNode.api": "https://rest-mainnet.onflow.org",
      "discovery.wallet": "https://fcl-discovery.onflow.org/mainnet/authn",
      "sdk.transport": httpSent,
      "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
    },
    testnet: {
      "accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://access-mainnet-beta.onflow.org"
      "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
      "sdk.transport": httpSent,
      "0xFUNGIBLETOKENADDRESS": "0x9a0766d93b6608b7"
    },
  };
  
  const setupConfig = (env = "mainnet") => {
    if (envSettings[env]) {
      config({ ...envSettings[env] })
    }
  };

  const cadencePayload = `transaction {
    prepare(signer: AuthAccount) {
      log("Hello, World!")
    }
  }
  `

const proposerPrivKey = process.env.PROPOSER_PRIV_KEY;
const proposerAddress = process.env.PROPOSER_ADDRESS;
const proposerSigingAlgo = process.env.PROPOSER_SIG_ALGO;
const proposerHashAlgo = process.env.PROPOSER_HASH_ALGO;

const privateKey = InMemoryECPrivateKey.fromHex(proposerPrivKey, proposerSigingAlgo);
const signer = new InMemoryECSigner(privateKey, proposerHashAlgo);

const proposer = new Authorizer({ address: proposerAddress, keyIndex: 0, signer });
    
setupConfig("testnet");

const { transactionId } = await fcl.send([
  fcl.transaction(cadencePayload),
  fcl.args([]),
  fcl.payer(proposer.toFCLAuthorizationFunction()),
  fcl.proposer(proposer.toFCLAuthorizationFunction()),
  fcl.authorizations([proposer.toFCLAuthorizationFunction()]),
  fcl.limit(9999),
  ix => {
    console.log(ix)
    return ix
  }
]);

console.log("transactionId", transactionId)