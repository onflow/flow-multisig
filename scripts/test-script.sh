flow transactions build ./flow-multisig/scripts/test-script.cdc \
  --network testnet \
  --args-json "$(cat "./flow-multisig/scripts/test-script-args.json")" \
  --proposer regular-testnet-key \
  --proposer-key-index 0 \
  --authorizer regular-testnet-key \
  --payer regular-testnet-key \
  --gas-limit 1000 \
  --yes \
  --output json \
  -x payload \
  --save ./flow-multisig/scripts/test-script.rlp

sleep 1

flow transactions sign ./flow-multisig/scripts/test-script.rlp \
  --signer regular-testnet-key \
  --filter payload \
  --yes \
  --save ./flow-multisig/scripts/test-script-signed.rlp

sleep 1

flow transactions send-signed ./flow-multisig/scripts/test-script-signed.rlp \
  --network testnet \
  --yes \
  --output json \
  --save ./tx-output.json