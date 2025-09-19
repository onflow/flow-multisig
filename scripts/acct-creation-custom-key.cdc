// Cadence 1.0 - testnet token addresses
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

// Transaction to create a new account with a custom public key
transaction(
    customPublicKey: String,
    amount: UFix64, // initial funding amount
    hashAlgorithm: UInt8 // 1 = SHA2_256, 2 = SHA3_256
) {

    // The Vault resource that holds the tokens that are being transferred
    let sentVault: @{FungibleToken.Vault}

    // FlowToken receiver for the new account
    let newAccountReceiver: &{FungibleToken.Receiver}

    prepare(signer: &Account) {

        // Create new account
        let newAccount = Account(payer: signer)

        // Create PublicKey from the hex string
        let publicKey = PublicKey(
            publicKey: customPublicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
        )

        // Determine hash algorithm based on parameter
        let selectedHashAlgorithm = hashAlgorithm == 1 ? HashAlgorithm.SHA2_256 : HashAlgorithm.SHA3_256

        // Add the public key to the new account
        newAccount.keys.add(
            publicKey: publicKey,
            hashAlgorithm: selectedHashAlgorithm,
            weight: 1000.0
        )

        // Get a reference to the signer's stored vault
        let vaultRef = signer.storage.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")

        // Withdraw tokens from the signer's stored vault
        self.sentVault <- vaultRef.withdraw(amount: amount)

        // Get a reference to the new account's Receiver
        self.newAccountReceiver = newAccount.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver).borrow()
            ?? panic("Unable to borrow receiver reference to the new account's Vault")
    }

    execute {
        // Deposit the withdrawn tokens in the new account's receiver
        self.newAccountReceiver.deposit(from: <-self.sentVault)
    }
}
