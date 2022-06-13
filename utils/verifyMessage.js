import * as fcl from "@onflow/fcl"

const WHITELIST = process.env.WHITELIST_ADDRESSES

export const userWhitelisted = (address) => {
    if (!WHITELIST) return true;
    const addresses = WHITELIST.split(",").map(fcl.sansPrefix);
    return addresses.includes(fcl.sansPrefix(address));
}

export const signMessage = async (message) => {
    let result = undefined;
    const MSG = Buffer.from(message).toString("hex")
    try {
        result = await fcl.currentUser.signUserMessage(MSG);
    } catch (error) {
        console.log(error)
    }
    return result;
}

export const isSignedMessageValid = async (message, signatures) => {
    let isValid = false;
    try {
        isValid = await fcl.verifyUserSignatures(
            Buffer.from(message).toString("hex"),
            signatures
        )
    } catch (error) {
        console.log(error)
    }

    return isValid
}
