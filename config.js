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
};

export const setupConfig = (env) => {
  if (envSettings[env]) {
    config(envSettings[env]);
  }
};
