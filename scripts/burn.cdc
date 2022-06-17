import FungibleToken from 0x9a0766d93b6608b7
transaction() {
    let vault: @FungibleToken.Vault
    prepare(signer: AuthAccount) {
        let vaultRef = signer.borrow<&FungibleToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow a reference to the owner's vault")

        self.vault <- signer
            .borrow<&{FungibleToken.Provider}>(from: /storage/flowTokenVault)!
            .withdraw(amount: UFix64(1.0))
    }
    execute {
        destroy self.vault
    }
}
