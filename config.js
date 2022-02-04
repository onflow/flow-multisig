import { config } from "@onflow/fcl";
import { send } from "@onflow/transport-http";

config({
  "accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://access-mainnet-beta.onflow.org"
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn", // Mainnet: "https://fcl-discovery.onflow.org/authn"
  "sdk.transport": send,
});
