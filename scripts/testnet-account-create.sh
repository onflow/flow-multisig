flow keys generate --output json --save keys.json
sleep 1
KEY="$(cat keys.json | jq .public)"
PRIV="$(cat keys.json | jq .private)"
flow accounts create --key $KEY --signer provider --network testnet --output json --save account.json
ACCT="$(cat account.json | jq .address)"
## put in flow json file
if [ -f "./flow.json" ]
then 
    echo "flow.json already done"
else
    mv "flow.json" "flow.json.tmp"
fi

echo '{"emulators": {"default": {"port": 3569,"serviceAccount": "provider"}	},"networks": {"emulator": "127.0.0.1:3569","mainnet": "access.mainnet.nodes.onflow.org:9000",	"testnet": "access.devnet.nodes.onflow.org:9000"}, "accounts": {"provider": { "address": "fc237fee0a0e36d7","key": "31ee9968086dd85e3fb81de8e1961d305ae3d7218fbcc6d8132a9d7cdd57b821"}, "auth": {"address": ' $ACCT ', "key": ' $PRIV ' }}}' > flow.json
flow transactions build ./flow-multisig/scripts/testnet-acct-creation.cdc --network testnet --args-json "$(cat "./flow-multisig/scripts/args.json")" \
  --proposer provider \
  --proposer-key-index 0 \
  --authorizer provider \
  --payer provider \
  --gas-limit 1000 \
  --yes \
  --output json \
  -x payload \
  --save ./flow-multisig/scripts/create-account.rlp


  flow transactions sign ./flow-multisig/scripts/create-account.rlp \
  --signer provider \
  --filter payload \
  --yes \
  --output json \
  --save ./flow-multisig/scripts/create-account-signed.rlp

  flow transactions send-signed --network testnet ./flow-multisig/scripts/create-account-signed.rlp --yes --output json --save ./tx-output.json
  cat ./tx-output.json | jq '.events[5].values.value'