exports.CHAIN_ID = '0x1'

exports.convertChainIdFromHex = (chainId) => {
  return parseInt(chainId, 16).toString()
}
