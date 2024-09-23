import { config } from "@onflow/fcl";
import { send as httpSent } from "@onflow/transport-http";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
export const PROXY_URL = `${BASE_URL}/api/proxy?url=`;

/** Only need a proxy if access node is not https */
const defaultURL_mainnet ="https://rest-mainnet.onflow.org" 
const defaultURL_testnet ="https://rest-testnet.onflow.org" 


const envSettings = {
  mainnet: {
    "accessNode.api": `${defaultURL_mainnet}`, 
    "discovery.wallet": "https://fcl-ledger-multisig.vercel.app/mainnet/authn",
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
    "0xFLOWTOKENADDRESS": "0x1654653399040a61",
    "0xFUNGIBLETOKENMETADATAVIEWS": "0xf233dcee88fe0abe",
    "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
    "app.detail.title": "Multisig Webapp",
  },
  testnet: {
    "accessNode.api": `${defaultURL_testnet}`,
    "discovery.wallet": "https://fcl-ledger-multisig.vercel.app/testnet/authn",
    "sdk.transport": httpSent,
    "0xFUNGIBLETOKENADDRESS": "0x9a0766d93b6608b7",
    "0xFLOWTOKENADDRESS": "0x7e60df042a9c0868",
    "0xFUNGIBLETOKENMETADATAVIEWS": "0x9a0766d93b6608b7",
    "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
    "app.detail.title": "Multisig Webapp",    
  },
};

export const setupConfig = (env) => {
  console.log('Setup Config for env', env)
  if (!env) return;
  if (envSettings[env]) {
    config({ ...envSettings[env] })
  }
};
