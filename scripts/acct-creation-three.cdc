// testnet token addresses
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

// Transaction for the token admin to send bonus tokens to a new bonus account
transaction(
    partialAdminPublicKey: String,
    partialUserPublicKey: String,
    partialUser2PublicKey: String
)  {

    // The Vault resource that holds the tokens that are being transferred
    let sentVault: @FungibleToken.Vault

    // FlowToken receiver for the locked account
    let bonusReceiver: &AnyResource{FungibleToken.Receiver}

    prepare(signer: AuthAccount) {

        let bonusAccount = AuthAccount(payer: signer)

        let AdminKey = PublicKey(
            publicKey: partialAdminPublicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
        )

        let UserKey = PublicKey(
            publicKey: partialUserPublicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
        )

        let UserKey2 = PublicKey(
            publicKey: partialUser2PublicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
        )

        bonusAccount.keys.add(
            publicKey: AdminKey,
            hashAlgorithm: HashAlgorithm.SHA2_256,
            weight: 400.0
        )

        bonusAccount.keys.add(
            publicKey: UserKey,
            hashAlgorithm: HashAlgorithm.SHA2_256,
            weight: 400.0
        )

        bonusAccount.keys.add(
            publicKey: UserKey2,
            hashAlgorithm: HashAlgorithm.SHA2_256,
            weight: 400.0
        )

        // Get a reference to the signers stored vault
        let vaultRef = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
			?? panic("Could not borrow reference to the owner's Vault!")

        // Withdraw tokens from the signers stored vault
        self.sentVault <- vaultRef.withdraw(amount: 1.000000)

        // Get a reference to the recipients Receiver
        self.bonusReceiver = bonusAccount
          .getCapability(/public/flowTokenReceiver)!
          .borrow<&{FungibleToken.Receiver}>()
          ?? panic("Unable to borrow receiver reference to the recipient's Vault")
    }

    execute {
        // Deposit the withdrawn tokens in the recipient's bonus tokens receiver
        self.bonusReceiver.deposit(from: <-self.sentVault)
    }
}