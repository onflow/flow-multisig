import { config } from "@onflow/fcl";
import { send as httpSent } from "@onflow/transport-http";
//import { send as grpcSend } from "@onflow/transport-grpc";

const ledgerSettings = {
  mainnet: {
    "discovery.wallet": "https://fcl-ledger-web-git-multi-account-onflow.vercel.app/mainnet/authn",
  },
  testnet: {
    "discovery.wallet": "https://fcl-ledger-web-git-multi-account-onflow.vercel.app/testnet/authn",
  },
};


const envSettings = {
  mainnet: {
    "accessNode.api": "https://rest-mainnet.onflow.org",
    //"discovery.wallet": "https://fcl-discovery.onflow.org/mainnet/authn",
    "discovery.wallet": "https://fcl-ledger-web-git-multi-account-onflow.vercel.app/mainnet/authn",
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
    "0xFLOWTOKENADDRESS": "0x1654653399040a61",
    "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
    "app.detail.title": "Multisig Webapp",
  },
  testnet: {
    "accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://access-mainnet-beta.onflow.org"
    //"discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
    "discovery.wallet": "https://fcl-ledger-web-git-multi-account-onflow.vercel.app/testnet/authn",
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0x9a0766d93b6608b7",
    "0xFLOWTOKENADDRESS": "0x7e60df042a9c0868",
    "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
    "app.detail.title": "Multisig Webapp",    
  },
};

export const setupConfig = (env = "mainnet") => {
  if (envSettings[env]) {
    config({ ...envSettings[env] })
  }
};
