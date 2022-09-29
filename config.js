import { config } from "@onflow/fcl";
import { send as httpSent } from "@onflow/transport-http";
//import { send as grpcSend } from "@onflow/transport-grpc";

const envSettings = {
  mainnet: {
    "accessNode.api": "https://rest-mainnet.onflow.org",
    //"discovery.wallet": "https://fcl-ledger-web-git-authn-authz-locked-acct-onflow.vercel.app/mainnet/authn",
    //"discovery.wallet": "https://fcl-ledger-multi-address.vercel.app/mainnet/authn",
    "discovery.wallet": "https://fcl-ledger-628yt0rpd-onflow.vercel.app/mainnet/authn", // (fcl-ledger-web branch) ledger-multi-account-authz
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
  },
  testnet: {
    "accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://access-mainnet-beta.onflow.org"
    //"discovery.wallet": "https://fcl-ledger-web-git-authn-authz-locked-acct-onflow.vercel.app/testnet/authn",
    "discovery.wallet": "https://fcl-ledger-628yt0rpd-onflow.vercel.app/testnet/authn", // (fcl-ledger-web branch) ledger-multi-account-authz
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0x9a0766d93b6608b7"
  },
};

export const setupConfig = (env = "mainnet") => {
  if (envSettings[env]) {
    config({ ...envSettings[env] })
  }
};
