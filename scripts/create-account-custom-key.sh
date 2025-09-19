#!/bin/bash

# Script to create a Flow account with a custom public key on testnet
# Usage: ./create-account-custom-key.sh [sha2|sha3]
# Make sure you have flow CLI installed and configured for testnet

# Default to SHA2_256 if no argument provided
HASH_ALGO=${1:-sha2}

if [[ "$HASH_ALGO" == "sha2" ]]; then
    ARGS_FILE="scripts/args-custom-key-sha2.json"
    HASH_NAME="SHA2_256"
    HASH_DESC="SHA2_256 (recommended, most common)"
elif [[ "$HASH_ALGO" == "sha3" ]]; then
    ARGS_FILE="scripts/args-custom-key-sha3.json"
    HASH_NAME="SHA3_256"
    HASH_DESC="SHA3_256 (alternative, more secure)"
else
    echo "❌ Invalid hash algorithm. Use 'sha2' or 'sha3'"
    echo "Usage: $0 [sha2|sha3]"
    echo "Examples:"
    echo "  $0 sha2    # Use SHA2_256 (recommended)"
    echo "  $0 sha3    # Use SHA3_256 (alternative)"
    exit 1
fi

echo "🔑 Creating Flow account with custom public key..."
echo "Network: Testnet"
echo "Public Key: e2bc67fab550f092935b58e21dbc5ed7760220e3a6b86b18a62f9fd120d692ccf9d167c0049efba9773bc921d97ad7541451752fc73b2013d7f35bf7c42e243f"
echo "Signature Algorithm: ECDSA_P256"
echo "Hash Algorithm: $HASH_DESC"
echo "Initial Funding: 1.0 FLOW"
echo ""

# Execute the transaction
echo "🚀 Sending transaction..."
flow transactions send scripts/acct-creation-custom-key.cdc \
  --args-json "$ARGS_FILE" \
  --network testnet \
  --signer testnet-account

echo ""
echo "✅ Account creation transaction sent!"
echo "Check the transaction result to get the new account address."
echo ""
echo "📋 Your account details:"
echo "- Public Key: e2bc67fab550f092935b58e21dbc5ed7760220e3a6b86b18a62f9fd120d692ccf9d167c0049efba9773bc921d97ad7541451752fc73b2013d7f35bf7c42e243f"
echo "- Signature Algorithm: ECDSA_P256"
echo "- Hash Algorithm: $HASH_NAME"
echo "- Key Weight: 1000.0 (full control)"
