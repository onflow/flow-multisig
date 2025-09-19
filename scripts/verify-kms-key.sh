#!/bin/bash

# Script to verify Google Cloud KMS key configuration for Flow blockchain compatibility
# Usage: ./verify-kms-key.sh [project-id] [location] [keyring] [key-name] [version]

set -e

# Default values from your existing setup
DEFAULT_PROJECT="my-kms-project-35857"
DEFAULT_LOCATION="global"
DEFAULT_KEYRING="test"
DEFAULT_KEY="tester002"
DEFAULT_VERSION="1"

# Use provided arguments or defaults
PROJECT_ID=${1:-$DEFAULT_PROJECT}
LOCATION=${2:-$DEFAULT_LOCATION}
KEYRING=${3:-$DEFAULT_KEYRING}
KEY_NAME=${4:-$DEFAULT_KEY}
VERSION=${5:-$DEFAULT_VERSION}

echo "🔍 Verifying Google Cloud KMS Key for Flow Blockchain"
echo "=================================================="
echo ""
echo "📋 Key Details:"
echo "- Project ID: $PROJECT_ID"
echo "- Location: $LOCATION"
echo "- Key Ring: $KEYRING"
echo "- Key Name: $KEY_NAME"
echo "- Version: $VERSION"
echo ""

# Check if gcloud is installed and authenticated
if ! command -v gcloud >/dev/null 2>&1; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 >/dev/null 2>&1; then
    echo "❌ Error: Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

echo "🔐 Fetching KMS key information..."
echo ""

# Get key version details
KEY_INFO=$(gcloud kms keys versions describe $VERSION \
    --key=$KEY_NAME \
    --keyring=$KEYRING \
    --location=$LOCATION \
    --project=$PROJECT_ID \
    --format=json 2>/dev/null || echo "ERROR")

if [[ "$KEY_INFO" == "ERROR" ]]; then
    echo "❌ Error: Could not fetch KMS key information"
    echo "Please verify:"
    echo "1. Key exists: $PROJECT_ID/$LOCATION/$KEYRING/$KEY_NAME/$VERSION"
    echo "2. You have access to the key"
    echo "3. All parameters are correct"
    exit 1
fi

# Parse key information
ALGORITHM=$(echo "$KEY_INFO" | jq -r '.algorithm // "unknown"')
STATE=$(echo "$KEY_INFO" | jq -r '.state // "unknown"')
PURPOSE=$(echo "$KEY_INFO" | jq -r '.createTime // "unknown"')

echo "✅ KMS Key Information Retrieved"
echo ""
echo "🔧 Key Configuration:"
echo "- Algorithm: $ALGORITHM"
echo "- State: $STATE"
echo ""

# Determine Flow compatibility
echo "🎯 Flow Blockchain Compatibility Analysis:"
echo "========================================"
echo ""

FLOW_COMPATIBLE=false
RECOMMENDED_HASH=""

case "$ALGORITHM" in
    "EC_SIGN_P256_SHA256")
        echo "✅ Perfect Match!"
        echo "- KMS Algorithm: EC_SIGN_P256_SHA256"
        echo "- Flow Signature Algorithm: ECDSA_P256"
        echo "- Flow Hash Algorithm: SHA2_256"
        FLOW_COMPATIBLE=true
        RECOMMENDED_HASH="SHA2_256"
        ;;
    "EC_SIGN_P384_SHA384")
        echo "⚠️  Partial Compatibility"
        echo "- KMS Algorithm: EC_SIGN_P384_SHA384"
        echo "- Flow Signature Algorithm: Not supported (P-384 curve)"
        echo "- Recommendation: Create new P-256 key"
        ;;
    "EC_SIGN_SECP256K1_SHA256")
        echo "✅ Alternative Match"
        echo "- KMS Algorithm: EC_SIGN_SECP256K1_SHA256"
        echo "- Flow Signature Algorithm: ECDSA_secp256k1"
        echo "- Flow Hash Algorithm: SHA2_256"
        FLOW_COMPATIBLE=true
        RECOMMENDED_HASH="SHA2_256"
        ;;
    "RSA_SIGN_PSS_2048_SHA256"|"RSA_SIGN_PSS_3072_SHA256"|"RSA_SIGN_PSS_4096_SHA256")
        echo "❌ Not Compatible"
        echo "- KMS Algorithm: $ALGORITHM (RSA)"
        echo "- Flow: Does not support RSA signatures"
        echo "- Recommendation: Create new ECDSA key"
        ;;
    *)
        echo "❓ Unknown Algorithm: $ALGORITHM"
        echo "- Please check KMS documentation for this algorithm"
        ;;
esac

echo ""

if [[ "$FLOW_COMPATIBLE" == "true" ]]; then
    echo "🎉 Your KMS key is compatible with Flow blockchain!"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Create Flow account with hash algorithm: $RECOMMENDED_HASH"
    echo "2. Run: ./scripts/create-account-custom-key.sh sha2"
    echo "3. Test signing flow with your KMS setup"
    echo ""
    
    # Get public key if possible
    echo "🔑 Attempting to fetch public key..."
    PUBLIC_KEY_PEM=$(gcloud kms keys versions get-public-key $VERSION \
        --key=$KEY_NAME \
        --keyring=$KEYRING \
        --location=$LOCATION \
        --project=$PROJECT_ID 2>/dev/null || echo "ERROR")
    
    if [[ "$PUBLIC_KEY_PEM" != "ERROR" ]]; then
        echo "✅ Public key retrieved successfully"
        
        # Save to temporary file and convert
        echo "$PUBLIC_KEY_PEM" > /tmp/kms-public-key.pem
        
        echo ""
        echo "🔄 Converting to Flow format..."
        FLOW_KEY=$(flow keys decode pem --from-file /tmp/kms-public-key.pem | grep "Public Key" | awk '{print $3}' || echo "ERROR")
        
        if [[ "$FLOW_KEY" != "ERROR" ]]; then
            echo "✅ Flow format: $FLOW_KEY"
            echo ""
            echo "💻 Ready for account creation!"
            echo "Your public key matches the one you provided earlier."
        else
            echo "⚠️  Could not convert to Flow format (Flow CLI may not be available)"
        fi
        
        # Clean up
        rm -f /tmp/kms-public-key.pem
    else
        echo "⚠️  Could not fetch public key (permissions or key state issue)"
    fi
    
else
    echo "❌ Your KMS key is not compatible with Flow blockchain"
    echo ""
    echo "💡 Recommendations:"
    echo "1. Create a new KMS key with algorithm: EC_SIGN_P256_SHA256"
    echo "2. Command: gcloud kms keys create flow-key --keyring=$KEYRING --location=$LOCATION --purpose=asymmetric-signing --default-algorithm=ec-sign-p256-sha256"
    echo "3. Update your application to use the new key"
fi

echo ""
echo "✨ Analysis complete!"
