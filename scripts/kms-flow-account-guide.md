# Google Cloud KMS + Flow Blockchain Account Setup Guide

## 🔐 Your Current Setup

Based on your codebase, you have:
- **Google Cloud KMS** for secure key management and signing
- **Flow blockchain integration** with existing KMS helpers
- **Multi-signature support** for enhanced security
- **Web interface** for transaction signing

## 🎯 For Your Specific Public Key

### Key Details (from KMS analysis):
- **Public Key**: `e2bc67fab550f092935b58e21dbc5ed7760220e3a6b86b18a62f9fd120d692ccf9d167c0049efba9773bc921d97ad7541451752fc73b2013d7f35bf7c42e243f`
- **Signature Algorithm**: `ECDSA_P256`
- **Curve**: P-256 (secp256r1/prime256v1)
- **Source**: Google Cloud KMS

## 🔍 Hash Algorithm Considerations for KMS

### Important: KMS Digest Configuration

Google Cloud KMS keys are configured with a specific digest algorithm when created. Check your KMS key configuration:

```bash
# Check your KMS key configuration
gcloud kms keys versions describe 1 \
  --key=YOUR_KEY_NAME \
  --keyring=YOUR_KEYRING \
  --location=YOUR_LOCATION \
  --project=YOUR_PROJECT
```

### Common KMS Digest Configurations:
- **SHA256** → Use `HashAlgorithm.SHA2_256` in Flow
- **SHA384** → Not supported by Flow (use SHA256 keys)
- **SHA512** → Not supported by Flow (use SHA256 keys)

### ⚠️ Critical: Hash Algorithm Matching

Your Flow account's hash algorithm **MUST** match your KMS key's digest algorithm:

- If KMS key uses `SHA256` digest → Flow account uses `SHA2_256`
- If KMS key uses different digest → You need a SHA256 KMS key for Flow

## 🚀 Account Creation Options

### Option 1: Create New KMS Key (Recommended)
If you need to ensure compatibility:

```bash
# Create a new KMS key specifically for Flow
gcloud kms keys create flow-signing-key \
  --keyring=YOUR_KEYRING \
  --location=YOUR_LOCATION \
  --purpose=asymmetric-signing \
  --default-algorithm=ec-sign-p256-sha256
```

### Option 2: Use Existing Key (If Compatible)
If your current KMS key uses SHA256 digest, proceed with account creation.

## 💻 Modified Account Creation for KMS

### Updated Cadence Transaction
Your account creation should specify the hash algorithm that matches your KMS key:

```cadence
// For KMS keys with SHA256 digest
newAccount.keys.add(
    publicKey: publicKey,
    hashAlgorithm: HashAlgorithm.SHA2_256,  // Must match KMS digest
    weight: 1000.0
)
```

### KMS-Specific Considerations

1. **Signature Format**: Your existing `kmsHelpers.js` already handles KMS signature conversion
2. **Public Key Extraction**: You have `convertPublicKey()` function for KMS PEM conversion
3. **Signing Process**: Your KMS signing flow is already integrated

## 🔧 Integration with Your Existing Code

### Your KMS Helper Functions:
- ✅ `convertPublicKey()` - Converts KMS PEM to Flow format
- ✅ `convert()` - Converts KMS signatures to Flow format
- ✅ `getDigest()` - Prepares message digest for KMS signing

### Web Interface:
- ✅ OAuth flow for KMS authentication
- ✅ Transaction signing UI
- ✅ Multi-signature coordination

## 📋 Action Items for Your Setup

### 1. Verify KMS Key Configuration
```bash
# Check your current KMS key's digest algorithm
gcloud kms keys versions describe 1 \
  --key=YOUR_KEY_NAME \
  --keyring=YOUR_KEYRING \
  --location=global \
  --project=my-kms-project-35857
```

### 2. Create Flow Account
If your KMS key uses SHA256 digest:
```bash
# Use SHA2_256 (matches KMS SHA256)
./scripts/create-account-custom-key.sh sha2
```

### 3. Test Signing Flow
After account creation, test the full signing flow:
1. Create a test transaction
2. Sign with KMS through your web interface
3. Verify signature on Flow testnet

## 🎯 Recommended Hash Algorithm

For Google Cloud KMS + Flow integration:

**Use SHA2_256** because:
- ✅ Matches standard KMS SHA256 digest
- ✅ Better performance than SHA3_256
- ✅ Most compatible with existing KMS setups
- ✅ Default for most Flow + KMS integrations

## 🔄 Next Steps

1. **Verify** your KMS key uses SHA256 digest
2. **Create** Flow account with matching hash algorithm
3. **Test** signing flow end-to-end
4. **Document** your specific KMS configuration for team reference

Your existing codebase is already well-prepared for KMS + Flow integration! 🎉
