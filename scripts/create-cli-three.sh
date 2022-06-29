ACCT=authorizer
echo "Creating account with cli and blocto keys for non-custodial"
echo "Creating tx using authorizer account in flow.json"
flow transactions build ./flow-multisig/scripts/acct-creation-three.cdc \
  --network testnet \
  --args-json "$(cat "./flow-multisig/scripts/args-cli-three.json")" \
  --proposer $ACCT \
  --proposer-key-index 0 \
  --authorizer $ACCT \
  --payer $ACCT \
  --gas-limit 1000 \
  --yes \
  --output json \
  -x payload \
  --save ./flow-multisig/scripts/create-account.rlp
sleep 1
echo "signing tx"
flow transactions sign ./flow-multisig/scripts/create-account.rlp \
  --signer $ACCT \
  --filter payload \
  --yes \
  --save ./flow-multisig/scripts/create-account-signed.rlp
sleep 1
echo "sending tx ..."
flow transactions send-signed --network testnet ./flow-multisig/scripts/create-account-signed.rlp --yes --output json --save ./tx-output.json
echo "looking in tx-output.json for created account"
echo "using jq to process tx-output.json and get account created"
cat tx-output.json | jq '.events[5].values'