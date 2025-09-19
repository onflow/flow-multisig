#!/bin/bash

# Script to identify the signing algorithm of a PEM public key
# Usage: ./identify-key-algorithm.sh [path-to-pem-file]

set -e

# Default public key (your provided key)
DEFAULT_PEM="-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE4rxn+rVQ8JKTW1jiHbxe13YCIOOm
uGsYpi+f0SDWksz50WfABJ77qXc7ySHZetdUFFF1L8c7IBPX81v3xC4kPw==
-----END PUBLIC KEY-----"

echo "🔍 Public Key Algorithm Identifier"
echo "=================================="
echo ""

# Check if file path is provided as argument
if [ $# -eq 1 ]; then
    PEM_FILE="$1"
    if [ ! -f "$PEM_FILE" ]; then
        echo "❌ Error: File '$PEM_FILE' not found."
        exit 1
    fi
    echo "📁 Analyzing PEM file: $PEM_FILE"
else
    # Create temporary file with default key
    PEM_FILE="/tmp/flow-identify-key-$$.pem"
    echo "$DEFAULT_PEM" > "$PEM_FILE"
    echo "📁 Analyzing provided public key (temporary file created)"
    cleanup_temp=true
fi

echo ""
echo "🔑 Public Key Content:"
cat "$PEM_FILE"
echo ""

# Method 1: Flow CLI (most reliable for Flow blockchain)
echo "🎯 Method 1: Flow CLI Analysis"
echo "=============================="
FLOW_OUTPUT=$(flow keys decode pem --from-file "$PEM_FILE" 2>/dev/null || echo "Flow CLI failed")

if [[ "$FLOW_OUTPUT" != "Flow CLI failed" ]]; then
    echo "$FLOW_OUTPUT"
    
    # Extract algorithm from Flow CLI output
    FLOW_ALGORITHM=$(echo "$FLOW_OUTPUT" | grep "Signature Algorithm" | awk '{print $3}')
    echo ""
    echo "✅ Flow CLI detected algorithm: $FLOW_ALGORITHM"
else
    echo "❌ Flow CLI analysis failed"
fi

echo ""

# Method 2: OpenSSL analysis
echo "🔧 Method 2: OpenSSL Analysis"
echo "============================="
if command -v openssl >/dev/null 2>&1; then
    OPENSSL_OUTPUT=$(openssl pkey -pubin -in "$PEM_FILE" -text -noout 2>/dev/null || echo "OpenSSL failed")
    
    if [[ "$OPENSSL_OUTPUT" != "OpenSSL failed" ]]; then
        echo "$OPENSSL_OUTPUT"
        echo ""
        
        # Determine algorithm from OpenSSL output
        if echo "$OPENSSL_OUTPUT" | grep -q "prime256v1"; then
            echo "✅ OpenSSL detected: ECDSA P-256 (secp256r1/prime256v1)"
        elif echo "$OPENSSL_OUTPUT" | grep -q "secp256k1"; then
            echo "✅ OpenSSL detected: ECDSA secp256k1"
        elif echo "$OPENSSL_OUTPUT" | grep -q "RSA"; then
            echo "✅ OpenSSL detected: RSA"
        else
            echo "⚠️  OpenSSL detected unknown algorithm type"
        fi
    else
        echo "❌ OpenSSL analysis failed"
    fi
else
    echo "⚠️  OpenSSL not available"
fi

echo ""

# Flow blockchain algorithm mapping
echo "📋 Flow Blockchain Algorithm Mapping"
echo "===================================="
echo "Based on the analysis above:"
echo ""

if [[ "$FLOW_ALGORITHM" == "ECDSA_P256" ]]; then
    echo "🎯 Flow Signature Algorithm: ECDSA_P256"
    echo "🔐 Flow Hash Algorithm: SHA2_256 (recommended) or SHA3_256"
    echo "📏 Key Length: 64 bytes (128 hex characters)"
    echo "🌐 Curve: P-256 (secp256r1/prime256v1)"
    echo ""
    echo "✅ This is the most common algorithm for Flow accounts"
elif [[ "$FLOW_ALGORITHM" == "ECDSA_secp256k1" ]]; then
    echo "🎯 Flow Signature Algorithm: ECDSA_secp256k1"
    echo "🔐 Flow Hash Algorithm: SHA2_256 (recommended) or SHA3_256"
    echo "📏 Key Length: 64 bytes (128 hex characters)"
    echo "🌐 Curve: secp256k1 (Bitcoin/Ethereum style)"
    echo ""
    echo "✅ Alternative ECDSA curve, less common on Flow"
else
    echo "⚠️  Algorithm not clearly identified or not supported by Flow"
    echo "📝 Flow supports:"
    echo "   - ECDSA_P256 (most common)"
    echo "   - ECDSA_secp256k1"
    echo "   - BLS_BLS12_381 (for advanced use cases)"
fi

echo ""
echo "💡 Usage in Flow Account Creation:"
echo "=================================="
if [[ "$FLOW_ALGORITHM" == "ECDSA_P256" ]]; then
    echo "SignatureAlgorithm.ECDSA_P256"
    echo "HashAlgorithm.SHA2_256"
elif [[ "$FLOW_ALGORITHM" == "ECDSA_secp256k1" ]]; then
    echo "SignatureAlgorithm.ECDSA_secp256k1"  
    echo "HashAlgorithm.SHA2_256"
else
    echo "⚠️  Please verify algorithm compatibility with Flow blockchain"
fi

# Clean up temporary file if created
[ "$cleanup_temp" = true ] && rm -f "$PEM_FILE"

echo ""
echo "✨ Analysis complete!"
