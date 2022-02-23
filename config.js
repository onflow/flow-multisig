import { config } from "@onflow/fcl";
import { send as httpSent } from "@onflow/transport-http";
import { send as grpcSend } from "@onflow/transport-grpc";

const envSettings = {
  mainnet: {
    "accessNode.api": "https://access-mainnet-beta.onflow.org",
    "discovery.wallet": "https://fcl-discovery.onflow.org/authn",
    "sdk.transport": grpcSend,
    "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
  },
  testnet: {
    "accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://access-mainnet-beta.onflow.org"
    "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn", // Mainnet: "https://fcl-discovery.onflow.org/authn"
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0x9a0766d93b6608b7"
  },
  testnetLedger: {
    "discovery.wallet": "https://fcl-ledger-web-git-authn-authz-locked-acct-onflow.vercel.app/testnet/authn"
  },
  mainnetLedger: {
    "discovery.wallet": "https://fcl-ledger-web-git-authn-authz-locked-acct-onflow.vercel.app/mainnet/authn"
  }
};

export const setupConfig = (env, isLedger) => {
  if (envSettings[env]) {
    let withLedger = {};
    if (isLedger) withLedger = envSettings[`${env}Ledger`]
    const settings = { ...envSettings[env], ...withLedger }
    config(settings);
  }
};
