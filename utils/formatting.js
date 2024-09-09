export const abbrvKey = (publicKey, nums = 8) => {
  if (!publicKey) return ""
  return `${publicKey.substring(0, nums)}...${publicKey.substring(publicKey.length - nums, publicKey.length)}`
}

export const formatDate = (dateString) => {
  // 2022-10-17T19:55:30.662333+00:00
  const d = new Date(dateString);
  const h = `0${d.getHours()}`.slice(-2);
  const m = `0${d.getMinutes()}`.slice(-2);
  return `${d.toDateString()} ${h}:${m}`;
}