function toDecimal(bigNumber, decimals= 6, roundDecimals = 2) {
    let regularNumber = parseFloat(ethers.utils.formatUnits(bigNumber, decimals))
    return Math.round(regularNumber * 10 ** roundDecimals) / 10 ** roundDecimals
  }

  exports.toDecimal = toDecimal

function toBigNumber(n, decimals = 6) {
    return ethers.utils.parseUnits(n.toString(), decimals)
  }

  exports.toBigNumber = toBigNumber


  