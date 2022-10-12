import { config } from "@onflow/fcl";
import { send as httpSent } from "@onflow/transport-http";

const envSettings = {
  mainnet: {
    "accessNode.api": "https://rest-mainnet.onflow.org",
    "discovery.wallet": "https://fcl-ledger-multisig.vercel.app/mainnet/authn",
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
    "0xFLOWTOKENADDRESS": "0x1654653399040a61",
    "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
    "app.detail.title": "Multisig Webapp",
  },
  testnet: {
    "accessNode.api": "https://rest-testnet.onflow.org",
    "discovery.wallet": "https://fcl-ledger-multisig.vercel.app/testnet/authn",
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0x9a0766d93b6608b7",
    "0xFLOWTOKENADDRESS": "0x7e60df042a9c0868",
    "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
    "app.detail.title": "Multisig Webapp",    
  },
};

export const setupConfig = (env) => {
  console.log('env', env)
  if (!env) return;
  if (envSettings[env]) {
    config({ ...envSettings[env] })
  }
};
