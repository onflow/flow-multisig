import * as fcl from "@onflow/fcl";

export const getUserAccount = async (address) => {
    if (!address) return null;
    let result = null;
    try {
        return await fcl.account(address);
    } catch (e) {
        console.error(e)
        setErrorMessage(e)
    }
    return result;
};


export const filerKeys = (txUser, user, signatures) => {
    let keys = [];
    if (!txUser || !user) return keys;
    const userPublicKeys = user.keys.map(k => k.publicKey)
    const signingKeys = txUser.keys.filter(k => userPublicKeys.includes(k.publicKey));
    const matchedKeys = signatures.reduce((p, s) => {
        const key = signingKeys.find(k => k.index === s.keyId)
        return key ? [...p, {weight: key.weight, ...s}] : p
    }, [])
    return matchedKeys;
}