import { CODE } from "@onflow/six-transfer-tokens"
export const CadencePayloadTypes = {
    TransferEscrow: "Transfer Escrow",
    BurnTokens: "Burn Tokens"
}
export const CadencePayloads = {
    [CadencePayloadTypes.TransferEscrow]: CODE,
    [CadencePayloadTypes.BurnTokens]: 
`
import FungibleToken from 0xFUNGIBLETOKENADDRESS
import FlowToken from 0xTOKENADDRESS

transaction(amount: UFix64) {

    prepare(signer: AuthAccount) {

        let tokenVault = signer
            .borrow<&FlowToken.Vault{FungibleToken.Provider}>(from: /storage/flowTokenVault)
            ?? panic("Could not get signer vault")

        let burner <- tokenVault.withdraw(amount: amount)
        destroy burner
    }

    execute {
        log("tokens have been burned")
    }
}
`
}