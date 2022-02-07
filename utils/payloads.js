export const CadencePayloadTypes = {
    TransferEscrow: "Transfer Escrow"
}
export const CadencePayloads = {
    [CadencePayloadTypes.TransferEscrow]: `
transaction() {
    prepare(acct: AuthAccount) {
      log("hello world")
    }
  }`

}