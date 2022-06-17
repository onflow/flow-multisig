echo "Build Burning 1 FLOW Tx"
flow transactions build ./flow-multisig/scripts/burn.cdc \
  --network testnet \
  --proposer testnet-cli-0 \
  --proposer-key-index 0 \
  --authorizer testnet-cli-0 \
  --payer testnet-cli-0 \
  --gas-limit 1000 \
  --yes \
  --output json \
  -x payload \
  --save ./flow-multisig/scripts/burn-one-flow-tx.rlp
sleep 1
echo "Account 1 signing tx"
flow transactions sign ./flow-multisig/scripts/burn-one-flow-tx.rlp \
  --signer testnet-cli-1 \
  --filter payload \
  --yes \
  --save ./flow-multisig/scripts/burn-one-flow-1-signed.rlp
sleep 1
echo "Account 0 signing tx"
flow transactions sign ./flow-multisig/scripts/burn-one-flow-1-signed.rlp \
  --signer testnet-cli-0 \
  --filter payload \
  --yes \
  --save ./flow-multisig/scripts/burn-one-flow-0-signed.rlp
sleep 1
echo "Done Signing"
echo "Sending"
flow transactions send-signed --network testnet ./flow-multisig/scripts/burn-one-flow-0-signed.rlp --yes --output json --save ./tx-output.json
cat ./tx-output.json