import { config } from "@onflow/fcl";
import { send as httpSent } from "@onflow/transport-http";
import { send as grpcSend } from "@onflow/transport-grpc";

const envSettings = {
  mainnet: {
    "accessNode.api": "https://access-mainnet-beta.onflow.org",
    "discovery.wallet": "https://fcl-discovery.onflow.org/authn",
    "sdk.transport": grpcSend,
  },
  testnet: {
    "accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://access-mainnet-beta.onflow.org"
    "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn", // Mainnet: "https://fcl-discovery.onflow.org/authn"
    "sdk.transport": httpSent,
  },
  testnetLedger: {
    "challenge.handshake": "https://fcl-ledger-web-git-authn-authz-locked-acct-onflow.vercel.app/testnet/authn"
  },
  mainnetLedger: {
    "challenge.handshake": "https://fcl-ledger-web-git-authn-authz-locked-acct-onflow.vercel.app/mainnet/authn"
  }
};

export const setupConfig = (env, isLedger) => {
  if (envSettings[env]) {
    let withLedger = {};
    if (isLedger) withLedger = envSettings[`{env}Ledger`]
    const settings = { ...envSettings[env], ...withLedger }
    config(settings);
  }
};
