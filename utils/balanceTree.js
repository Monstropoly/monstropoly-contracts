const { utils, BigNumber } = require('ethers')
const assert = require('assert')
const MerkelTree = require('./merkleTree')
const ERROR_INVALID_JSON = 'JSON not valid'

const validAmount = amount => {
  const fNum = parseInt(amount)
  return typeof amount === 'string' && !isNaN(fNum)
}

const checkValidJSON = (object = {}) => {
  Object.keys(object).forEach(key => {
    assert(utils.isAddress(key), ERROR_INVALID_JSON)
    const amount = object[key]
    assert(validAmount(amount), ERROR_INVALID_JSON)
  })
}

const toArray = (object = {}) => {
  const sortedKeys = Object.keys(object).sort()
  return sortedKeys.reduce((acu, key) => {
    acu.push({
      account: key,
      amount: BigNumber.from(object[key])
    })
    return acu
  }, [])
}

const toHexNode = (array = []) =>
  array.map(({ account, amount }, index) =>
    keccak256({ index, account, amount })
  )

// keccak256(abi.encode(index, account, amount))
const keccak256 = ({ index, account, amount }) => {
  // console.log('> keccak256', index, account, amount)
  return Buffer.from(
    utils.solidityKeccak256(
      ['uint256', 'address', 'uint256'], [index, account, amount]).substr(2),
    'hex'
  )
}

exports.checkValidJSON = (balanceJSON) => {
  checkValidJSON(balanceJSON)
}

exports.getBalanceTree = (balanceJSON) => {
  checkValidJSON(balanceJSON)
  const balanceArray = toArray(balanceJSON)
  const nodesArray = toHexNode(balanceArray)
  const tree = MerkelTree(nodesArray)

  const getProof = ({ index, account, amount }) =>
    tree.getHexProof(keccak256({ index, account, amount }))

  const tokenTotal =
    balanceArray.reduce(
      (acu, { amount }) => acu.add(amount),
      BigNumber.from(0)
    )

  const claims =
    balanceArray.reduce((acu, { account, amount }, index) => {
      // console.log('claims', account, amount, index)
      acu[account] = {
        index,
        amount: amount.toHexString(),
        proof: getProof({ index, account, amount })
      }
      return acu
    }, {})

  return {
    getTree: () => tree,
    getProof,
    toJSON: () => ({
      merkleRoot: tree.getHexRoot(),
      tokenTotal: tokenTotal.toHexString(),
      claims
    })
  }
}
