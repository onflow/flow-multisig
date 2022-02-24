ACCT=authorizer
echo "Creating account with cli and blocto keys"
echo "Creating tx using authorizer account in flow.json"
flow transactions build ./flow-multisig/scripts/testnet-acct-creation.cdc \
  --network testnet \
  --args-json "$(cat "./flow-multisig/scripts/args-cli-blocto.json")" \
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
./flow-multisig/scripts/testnet-send.sh
echo "look in tx-output.json for created account"
echo "if you have jq use `cat tx-output.json | jq '.events[5].values'`"
cat tx-output.json | jq '.events[5].values'