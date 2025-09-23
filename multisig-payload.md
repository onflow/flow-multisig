# Flow Multisig Payload Signing Process

## Overview

This document explains how Flow multisig transactions work, specifically focusing on what different authorizers sign and how transaction payloads are constructed. The Flow Client Library (FCL) orchestrates this process by creating signable payloads that multiple parties must sign before a transaction can be executed on the blockchain.

**Key Concepts:**
- **Payload Signatures**: What most participants sign - the core transaction data
- **Envelope Signatures**: Optional additional signatures for enhanced security
- **Signable Objects**: The data structure FCL creates for each signer
- **RLP Encoding**: How transaction data is serialized for signing
- **Weight-based Multisig**: Flow's signature threshold system (requires 1000+ weight)

This system ensures all participants sign identical transaction data, preventing tampering after signature collection.

## FCL Transaction Flow

### 1. Transaction Initiation with FCL

FCL orchestrates the entire multisig process through its transaction builder:

```javascript
// From pages/[env]/index.js
const tx = await fcl.send([
  fcl.transaction(cadencePayload),           // The Cadence script to execute
  fcl.args(userDefinedArgs),                 // Transaction arguments
  fcl.proposer(resolveProposer),             // Account proposing the transaction
  fcl.authorizations(authorizations),        // List of authorizing accounts
  fcl.payer(resolver),                       // Account paying gas fees
  fcl.limit(parseInt(exeEffort)),            // Gas limit
]);
```

**FCL's Role:**
- Constructs the transaction voucher with all necessary data
- Calls signing functions for each required participant
- Manages the asynchronous signature collection process
- Submits the complete transaction once all signatures are collected

### 2. FCL Authorization Functions

FCL uses authorization functions to handle multisig scenarios:

```javascript
// From utils/authz.js
export const authzManyKeyResolver = (account, proposerKeyId, keys, dispatch) => {
  return {
    ...account,
    addr: fcl.sansPrefix(account.address),
    resolve: (account) => {
      return keys.map(({ index, publicKey }) => ({
        ...account,
        keyId: index,
        signingFunction: async (signable) => {
          // Send signable to backend for signature collection
          const { id } = await fetch(`/api/signatures/${signable.addr}/${signable.keyId}`, {
            method: "post",
            body: JSON.stringify(signable),
          });
          
          // Wait for signature collection and threshold completion
          // Returns signature when weight threshold (1000+) is met
        }
      }))
    }
  }
}
```

## Transaction Payload Structure

### The Signable Object

When FCL needs a signature, it creates a signable object containing all transaction data:

```javascript
const signable = {
  addr: "0x1234...",           // Signer's Flow address
  keyId: 0,                    // Key index to use for signing
  voucher: {                   // Complete transaction data
    cadence: "transaction { prepare(signer: AuthAccount) { ... } }",
    arguments: [arg1, arg2],   // Transaction arguments
    refBlock: "0xabc123...",   // Reference block ID
    computeLimit: 1000,        // Gas limit
    proposalKey: {             // Proposer account info
      address: "0x5678...",
      keyId: 0,
      sequenceNum: 42
    },
    payer: "0x9abc...",        // Gas payer address
    authorizers: [             // All authorizing accounts
      "0x1234...",
      "0x5678..."
    ],
    payloadSigs: [],           // Initially empty
    envelopeSigs: []           // Initially empty
  },
  publicKey: "abc123..."       // Signer's public key
}
```

### Payload Encoding Process

The transaction payload is encoded using RLP (Recursive Length Prefix) encoding:

```javascript
// From utils/fclCLI.js - preparePayload function
const preparePayload = (tx) => {
  return [
    scriptBuffer(tx.cadence),                    // Cadence code as buffer
    tx.arguments.map(argumentToString),          // Arguments as JSON strings
    blockBuffer(tx.refBlock),                    // Reference block (32 bytes)
    tx.computeLimit,                             // Gas limit as number
    addressBuffer(tx.proposalKey.address),       // Proposer address (8 bytes)
    tx.proposalKey.keyId,                        // Proposer key ID
    tx.proposalKey.sequenceNum,                  // Proposer sequence number
    addressBuffer(tx.payer),                     // Payer address (8 bytes)
    tx.authorizers.map(addressBuffer),           // All authorizer addresses
  ];
};
```

## What Each Participant Signs

### Payload Signatures (Primary Signing Process)

All participants sign the **same payload**, which includes:

1. **Transaction Script**: The Cadence code to execute
2. **Arguments**: All parameters passed to the transaction
3. **Gas Information**: Compute limit and payer details
4. **Account Information**: Proposer, payer, and all authorizers
5. **Blockchain Context**: Reference block for replay protection

**The actual signed message:**
```javascript
// From utils/kmsHelpers.js
const message = TRANSACTION_DOMAIN_TAG + RLP_ENCODE([payload, []])

// Where TRANSACTION_DOMAIN_TAG = "FLOW-V0.0-transaction" (padded to 32 bytes)
```

### Who Signs What:

- **Proposer**: Signs payload (required - manages transaction sequence)
- **Authorizers**: Sign payload (required - accounts executing the transaction)
- **Payer**: Signs payload (required - account paying gas fees)

*Note: The same account can serve multiple roles (proposer + authorizer + payer)*

### Envelope Signatures (Optional Enhanced Security)

Envelope signatures are less common and sign:
- The complete transaction envelope (payload + existing payload signatures)
- Used for additional authorization layers in high-security scenarios

## Backend Coordination Process

### 1. Signature Request Storage

When FCL's signing function is called:

```javascript
// POST /api/signatures/{address}/{keyId}
{
  signatureRequestId: "abc123...",    // Unique ID derived from RLP hash
  keyId: 0,                           // Key index
  address: "0x1234...",               // Signer address
  signable: { /* full signable object */ },
  rlp: "deadbeef...",                 // RLP-encoded transaction
  publicKey: "abc123..."              // Signer's public key
}
```

### 2. RLP Generation for Signers

The backend creates a standardized RLP message:

```javascript
// From pages/api/signatures/[address]/[keyId]/index.js
const cliRLP = encodeVoucherToEnvelope({
  ...body.voucher,
  envelopeSigs: [],      // Empty - we're signing the payload
  payloadSigs: []        // Empty - we're signing the payload
});

const signatureRequestId = getSignatureRequestIdFromRLP(cliRLP);
```

### 3. Signature Collection

The system waits for signatures from all required participants:

```javascript
// From utils/authz.js - signature waiting loop
while (true) {
  const { data } = await fetch(`/api/${id}`);
  
  const weights = data.reduce((total, sig) => 
    sig.sig ? total + parseInt(keysWeight[sig.keyId]) : total, 0
  );
  
  const proposerSigned = data.find(d => d.keyId === proposerKeyId);
  
  // Check if we have enough weight (1000+) and proposer signature
  if (weights >= 1000 && proposerSigned.sig && await isTriggerSend(id)) {
    return signature; // Transaction ready to submit
  }
}
```

## Key Implementation Details

### FCL Integration Points

1. **Transaction Builder**: FCL constructs the voucher with all transaction data
2. **Authorization Functions**: Custom functions handle multisig signature collection
3. **Signing Functions**: Async functions that coordinate with the backend
4. **Weight Management**: FCL respects Flow's weight-based signature system

### Security Guarantees

1. **Immutable Payload**: All signers sign identical transaction data
2. **Deterministic Hashing**: Same transaction always produces same signature request ID
3. **Complete Transparency**: Every signer sees all transaction details
4. **Threshold Security**: Requires sufficient signature weight to execute
5. **Replay Protection**: Reference block prevents transaction replay

### Backend Architecture Benefits

1. **Async Coordination**: Signers don't need to be online simultaneously
2. **Partial Signature Storage**: Signatures collected incrementally
3. **Status Tracking**: Real-time updates on signature collection progress
4. **CLI Integration**: Standard Flow CLI can interact with stored transactions

## Usage for New Applications

To implement a similar multisig system:

1. **Use FCL's transaction builder** with custom authorization functions
2. **Create signable objects** containing complete transaction data
3. **Implement backend storage** for signature coordination
4. **Use RLP encoding** for consistent message formatting
5. **Implement weight-based thresholds** for signature validation
6. **Provide status updates** to users during signature collection

The key insight is that **all authorizers sign the same payload** - they're all agreeing to execute the identical transaction with the same parameters, ensuring no tampering can occur after signature collection begins.

## Frontend + Backend Authorization Pattern

### Scenario: Web App with Backend Service Authorization

This is a common pattern where:
- **Frontend user** initiates the transaction using their wallet (proposer + payer)
- **Backend service** must also authorize the transaction to provide additional signature weight
- The transaction requires both signatures to meet the weight threshold

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Flow          │
│   Web App       │    │   Service       │    │   Blockchain    │
│                 │    │                 │    │                 │
│ User Wallet     │    │ Service Account │    │                 │
│ (Proposer +     │◄──►│ (Authorizer)    │───►│ Final TX        │
│  Payer)         │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Implementation Steps

#### 1. Frontend Transaction Initiation

The frontend builds the transaction with the backend service as an authorizer:

```javascript
// Frontend - pages/your-app/index.js
const submitTransaction = async () => {
  const userWallet = fcl.currentUser(); // User's connected wallet
  const backendServiceAddress = "0xBACKEND_SERVICE_ADDRESS";
  
  const tx = await fcl.send([
    fcl.transaction(`
      transaction(amount: UFix64, recipient: Address) {
        prepare(
          userSigner: AuthAccount,      // User's account (proposer/payer)
          serviceSigner: AuthAccount    // Backend service account (authorizer)
        ) {
          // Transaction logic requiring both accounts
          // userSigner handles user-specific operations
          // serviceSigner provides backend authorization
        }
      }
    `),
    fcl.args([
      fcl.arg("10.0", fcl.t.UFix64),
      fcl.arg(recipientAddress, fcl.t.Address)
    ]),
    fcl.proposer(userWallet),                    // User proposes transaction
    fcl.authorizations([
      userWallet,                                // User authorizes (weight: e.g., 500)
      createBackendAuthorizer(backendServiceAddress) // Backend authorizes (weight: e.g., 500+)
    ]),
    fcl.payer(userWallet),                       // User pays gas
    fcl.limit(1000)
  ]);
};
```

#### 2. Backend Authorizer Implementation

Create a custom authorization function that coordinates with your backend:

```javascript
// Frontend - utils/backendAuthz.js
const createBackendAuthorizer = (serviceAddress) => {
  return async (account) => {
    return {
      ...account,
      addr: fcl.sansPrefix(serviceAddress),
      keyId: 0, // Backend service key ID
      signingFunction: async (signable) => {
        // Send the signable payload to your backend service
        const response = await fetch('/api/backend-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signable: signable,
            userAddress: signable.addr,
            transactionId: getTransactionId(signable)
          })
        });
        
        const { signature } = await response.json();
        
        return {
          addr: fcl.withPrefix(serviceAddress),
          keyId: 0,
          signature: signature
        };
      }
    };
  };
};
```

#### 3. Backend Service Signing

Your backend service validates and signs the transaction:

```javascript
// Backend - /api/backend-sign
export default async function handler(req, res) {
  const { signable, userAddress, transactionId } = req.body;
  
  // 1. Validate the transaction
  const isValid = await validateTransaction(signable, userAddress);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid transaction' });
  }
  
  // 2. Extract the payload to sign
  const payload = preparePayloadForSigning(signable);
  
  // 3. Sign with your backend service key
  const signature = await signWithServiceKey(payload);
  
  // 4. Return the signature
  res.json({ 
    signature,
    address: SERVICE_ACCOUNT_ADDRESS,
    keyId: SERVICE_KEY_ID
  });
}

const signWithServiceKey = async (payload) => {
  // Use your backend's private key to sign
  // This could be:
  // - A stored private key
  // - KMS (Key Management Service)
  // - Hardware Security Module (HSM)
  // - Custodial service
  
  const privateKey = process.env.SERVICE_PRIVATE_KEY;
  const signer = new InMemoryECSigner(privateKey, hashAlgorithm);
  return await signer.sign(payload);
};

const validateTransaction = async (signable, userAddress) => {
  // Implement your business logic validation:
  // - Check user permissions
  // - Validate transaction amounts
  // - Verify recipient addresses
  // - Check rate limits
  // - Audit logging
  
  return true; // or false if invalid
};
```

#### 4. Payload Preparation for Backend Signing

The backend needs to construct the same payload the user signed:

```javascript
// Backend - utils/flowSigning.js
import { encodeTransactionPayload, TRANSACTION_DOMAIN_TAG } from './fclCLI';

const preparePayloadForSigning = (signable) => {
  // Extract the voucher from the signable
  const { voucher } = signable;
  
  // Create the payload that needs to be signed
  const payload = [
    Buffer.from(voucher.cadence, 'utf8'),           // Script
    voucher.arguments.map(arg => Buffer.from(JSON.stringify(arg), 'utf8')),
    Buffer.from(voucher.refBlock.padStart(64, '0'), 'hex'),  // Reference block
    voucher.computeLimit,                           // Gas limit
    Buffer.from(voucher.proposalKey.address.replace('0x', '').padStart(16, '0'), 'hex'),
    voucher.proposalKey.keyId,
    voucher.proposalKey.sequenceNum,
    Buffer.from(voucher.payer.replace('0x', '').padStart(16, '0'), 'hex'),
    voucher.authorizers.map(addr => 
      Buffer.from(addr.replace('0x', '').padStart(16, '0'), 'hex')
    )
  ];
  
  // Create the message to sign (same as what user signed)
  const rlpPayload = encode(payload).toString('hex');
  const message = TRANSACTION_DOMAIN_TAG + encode([decode('0x' + rlpPayload), []]).toString('hex');
  
  return message;
};
```

### Key Considerations

#### Security & Validation
- **Always validate** the transaction before signing on the backend
- **Implement rate limiting** to prevent abuse
- **Log all transactions** for audit purposes
- **Verify user identity** before processing signatures
- **Check business rules** (amounts, recipients, permissions)

#### Error Handling
```javascript
const createBackendAuthorizer = (serviceAddress) => {
  return async (account) => {
    return {
      ...account,
      signingFunction: async (signable) => {
        try {
          const response = await fetch('/api/backend-sign', {
            method: 'POST',
            body: JSON.stringify({ signable }),
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error(`Backend signing failed: ${response.statusText}`);
          }
          
          const { signature } = await response.json();
          return { addr: fcl.withPrefix(serviceAddress), keyId: 0, signature };
          
        } catch (error) {
          console.error('Backend authorization failed:', error);
          throw new Error('Backend service unavailable');
        }
      }
    };
  };
};
```

#### Account Setup Requirements

**Backend Service Account:**
- Must have sufficient signature weight
- Should have appropriate key permissions
- Needs to be added as an authorizer in your Cadence transactions

**Weight Configuration Example:**
- User wallet key: 500 weight
- Backend service key: 500+ weight
- Threshold: 1000 weight
- Result: Both signatures required

### Benefits of This Pattern

1. **User Control**: Users initiate transactions with their own wallets
2. **Backend Authorization**: Server can enforce business rules and permissions
3. **Security**: Dual authorization prevents unauthorized transactions
4. **Flexibility**: Backend can implement complex validation logic
5. **Audit Trail**: All transactions logged and validated server-side

### Common Use Cases

- **Financial Applications**: Require backend approval for large transfers
- **Enterprise Systems**: Need admin authorization for certain operations
- **Compliance**: Regulatory requirements for transaction approval
- **Rate Limiting**: Backend controls transaction frequency
- **Business Logic**: Complex rules that can't be implemented in Cadence alone

This pattern gives you the best of both worlds: user-controlled transaction initiation with backend service authorization and validation.
