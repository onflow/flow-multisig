echo "creating tx using authorizer account in flow.json"
./flow-multisig/scripts/testnet-creation.sh
sleep 5
echo "signing tx"
./flow-multisig/scripts/testnet-sign.sh
sleep 5
echo "sending tx ..."
./flow-multisig/scripts/testnet-send.sh