export const abbrvKey = (publicKey, nums = 8) => {
    if (!publicKey) return ""
    return `${publicKey.substring(0, nums)}...${publicKey.substring(publicKey.length - nums, publicKey.length)}`
  }
