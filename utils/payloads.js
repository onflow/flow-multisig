import { CODE } from "@onflow/six-transfer-tokens"
export const CadencePayloadTypes = {
    TransferEscrow: "Transfer Escrow",
    BurnTokens: "Burn Tokens"
}
export const CadencePayloads = {
    [CadencePayloadTypes.TransferEscrow]: CODE,
    [CadencePayloadTypes.BurnTokens]: 
`import FungibleToken from 0xFUNGIBLETOKENADDRESS
transaction(amount: UFix64) {
let vault: @FungibleToken.Vault
prepare(signer: AuthAccount) {
self.vault <- signer
.borrow<&{FungibleToken.Provider}>(from: /storage/flowTokenVault)!
.withdraw(amount: amount)
}
execute {
destroy self.vault
}
}`
}