export const abbrvKey = (publicKey) => {
    if (!publicKey) return ""
    const NUM_CHARS = 8;
    return `${publicKey.substring(0, NUM_CHARS)}...${publicKey.substring(publicKey.length - NUM_CHARS, publicKey.length)}`
  }
