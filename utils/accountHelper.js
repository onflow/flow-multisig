import * as fcl from "@onflow/fcl";

export const getUserAccount = async (address) => {
    if (!address) return null;
    let result = null;
    try {
        return await fcl.account(address);
    } catch (e) {
        console.error(e)
       // setErrorMessage(e)
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


export const getPrimaryPublicKeys = (loggedInUser, keyId) => {
    if (!loggedInUser) return null;
    return loggedInUser?.keys[keyId]?.publicKey;
}


export const getUserAccountKeyId = async (user) => {
    // user has services, look for "fcl-goog-kms-authz" service
    const service = user.services.find(s => s.uid === "fcl-goog-kms-authz");
    if (!service) return null;

    return service?.identity?.keyId;
}