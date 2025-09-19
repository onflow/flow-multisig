# Flow Blockchain Hash Algorithm Guide

## 🔐 Hash Algorithm vs Signature Algorithm

**Important**: These are two separate concepts:

- **Signature Algorithm**: Determined by your key type (e.g., ECDSA_P256, ECDSA_secp256k1)
- **Hash Algorithm**: Your choice for how to hash messages before signing (SHA2_256 or SHA3_256)

## 🎯 Flow Supported Hash Algorithms

Flow blockchain supports two hash algorithms:

### 1. SHA2_256 (Recommended) ⭐
- **Standard**: SHA-256 (most widely used)
- **Performance**: Faster
- **Compatibility**: Better hardware/software support
- **Use case**: Most Flow accounts and applications

### 2. SHA3_256 (Alternative)
- **Standard**: SHA-3 (newer cryptographic standard)
- **Performance**: Slightly slower
- **Security**: Theoretically more secure against certain attacks
- **Use case**: High-security applications or specific requirements

## 🤔 How to Choose Hash Algorithm

### For Your ECDSA_P256 Key:

**Recommended Choice: SHA2_256**

Reasons:
1. ✅ Most common on Flow blockchain
2. ✅ Better performance
3. ✅ Wider ecosystem support
4. ✅ Default choice for most wallets and tools

**When to use SHA3_256:**
- Specific security requirements
- Legacy system compatibility
- Explicit requirement from your application

## 💻 Implementation Examples

### Cadence (Smart Contract)
```cadence
// In your account creation transaction
let publicKey = PublicKey(
    publicKey: "e2bc67fab550f092935b58e21dbc5ed7760220e3a6b86b18a62f9fd120d692ccf9d167c0049efba9773bc921d97ad7541451752fc73b2013d7f35bf7c42e243f".decodeHex(),
    signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
)

newAccount.keys.add(
    publicKey: publicKey,
    hashAlgorithm: HashAlgorithm.SHA2_256,  // <-- Hash algorithm choice
    weight: 1000.0
)
```

### FCL (JavaScript)
```javascript
const publicKey = "e2bc67fab550f092935b58e21dbc5ed7760220e3a6b86b18a62f9fd120d692ccf9d167c0049efba9773bc921d97ad7541451752fc73b2013d7f35bf7c42e243f";

// Account creation
const accountKey = {
  publicKey: publicKey,
  signatureAlgorithm: fcl.SignatureAlgorithm.ECDSA_P256,
  hashAlgorithm: fcl.HashAlgorithm.SHA2_256,  // <-- Hash algorithm choice
  weight: 1000
}
```

### Flow CLI
```bash
# When creating accounts, specify both algorithms:
flow accounts create \
  --key "e2bc67fab550f092935b58e21dbc5ed7760220e3a6b86b18a62f9fd120d692ccf9d167c0049efba9773bc921d97ad7541451752fc73b2013d7f35bf7c42e243f" \
  --sig-algo "ECDSA_P256" \
  --hash-algo "SHA2_256"
```

## 🔍 How Hash Algorithm is Used

1. **Message Preparation**: Transaction data is serialized
2. **Hashing**: Message is hashed using your chosen algorithm (SHA2_256 or SHA3_256)
3. **Signing**: The hash is signed using your private key and signature algorithm
4. **Verification**: Flow network verifies using the same hash algorithm

## ⚠️ Important Notes

- **Consistency**: Always use the same hash algorithm that was specified when the account was created
- **Multi-sig**: All keys in a multi-signature setup can use different hash algorithms
- **Wallets**: Most Flow wallets default to SHA2_256
- **Migration**: Hash algorithm cannot be changed after account creation (would need new key)

## 🎯 Your Specific Case

For your public key:
- **Signature Algorithm**: ECDSA_P256 (determined by your key)
- **Recommended Hash Algorithm**: SHA2_256
- **Alternative Hash Algorithm**: SHA3_256 (if needed)

Both will work perfectly with your key - choose based on your requirements!
