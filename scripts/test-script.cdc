transaction(publicKeys: [String]) {
	prepare(signer: AuthAccount) {
		for key in publicKeys {
			signer.addPublicKey(key.decodeHex())
		}
	}
}