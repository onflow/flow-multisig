#!/bin/bash

# Script to convert PEM public key to Flow blockchain format using Flow CLI
# Usage: ./convert-public-key.sh [path-to-pem-file]

set -e

# Default public key (your provided key)
DEFAULT_PEM="-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE4rxn+rVQ8JKTW1jiHbxe13YCIOOm
uGsYpi+f0SDWksz50WfABJ77qXc7ySHZetdUFFF1L8c7IBPX81v3xC4kPw==
-----END PUBLIC KEY-----"

echo "🔑 Flow Public Key Converter (using Flow CLI)"
echo "=============================================="
echo ""

# Check if file path is provided as argument
if [ $# -eq 1 ]; then
    PEM_FILE="$1"
    if [ ! -f "$PEM_FILE" ]; then
        echo "❌ Error: File '$PEM_FILE' not found."
        exit 1
    fi
    echo "📁 Using PEM file: $PEM_FILE"
else
    # Create temporary file with default key
    PEM_FILE="/tmp/flow-convert-key-$$.pem"
    echo "$DEFAULT_PEM" > "$PEM_FILE"
    echo "📁 Using provided public key (temporary file created)"
    cleanup_temp=true
fi

echo ""
echo "🔍 Original PEM Public Key:"
cat "$PEM_FILE"
echo ""

# Convert using Flow CLI
echo "🔄 Converting using Flow CLI..."
FLOW_OUTPUT=$(flow keys decode pem --from-file "$PEM_FILE" 2>/dev/null || true)

if [ -z "$FLOW_OUTPUT" ]; then
    echo "❌ Error: Failed to convert public key using Flow CLI"
    [ "$cleanup_temp" = true ] && rm -f "$PEM_FILE"
    exit 1
fi

# Extract the public key from Flow CLI output
PUBLIC_KEY=$(echo "$FLOW_OUTPUT" | grep "Public Key" | awk '{print $3}')

if [ -z "$PUBLIC_KEY" ]; then
    echo "❌ Error: Could not extract public key from Flow CLI output"
    [ "$cleanup_temp" = true ] && rm -f "$PEM_FILE"
    exit 1
fi

echo "✅ Conversion successful!"
echo ""
echo "🎯 Flow Blockchain Format (hex):"
echo "$PUBLIC_KEY"
echo ""
echo "📊 Key Information:"
echo "- Length: ${#PUBLIC_KEY} characters ($(( ${#PUBLIC_KEY} / 2 )) bytes)"
echo "- Expected length: 128 characters (64 bytes for P-256)"
echo "- Format: Uncompressed (x + y coordinates)"
echo "- Signature Algorithm: ECDSA_P256"
echo "- Hash Algorithm: SHA2_256"
echo ""
echo "🚀 Usage for Flow account creation:"
echo "1. Use this hex string as the public key when creating a Flow account"
echo "2. Run: ./scripts/create-account-custom-key.sh (if using our provided scripts)"
echo "3. Or use Flow CLI directly with your own Cadence transaction"
echo ""
echo "💻 FCL Account Creation Example:"
echo "const publicKey = \"$PUBLIC_KEY\";"
echo "const signatureAlgorithm = fcl.SignatureAlgorithm.ECDSA_P256;"
echo "const hashAlgorithm = fcl.HashAlgorithm.SHA2_256;"

# Clean up temporary file if created
[ "$cleanup_temp" = true ] && rm -f "$PEM_FILE"

echo ""
echo "✨ Done!"
