const { utils, BigNumber } = require('ethers')
const assert = require('assert')
const MerkelTree = require('./merkleTree')

const checksumArray = (array = []) => array.map((address) => {
  assert(utils.isAddress(address), `${address} is not a valid address`)
  return utils.getAddress(address)
})

const toHexNode = (array = []) =>
  array.map((account, index) =>
    keccak256({ index, account })
  )

// keccak256(abi.encode(index, account, amount))
const keccak256 = ({ index, account }) => {
  // console.log('> keccak256', index, account, amount)
  return Buffer.from(
    utils.solidityKeccak256(
      ['uint256', 'address'], [index, account]).substr(2),
    'hex'
  )
}

// keccak256(abi.encode(index, account, amount))
exports.solKeccak256 = (string) => {
  // console.log('> keccak256', index, account, amount)
  return Buffer.from(
    utils.solidityKeccak256(
      ['string'], [string]).substr(2),
    'hex'
  )
}

exports.getWhitelistTree = (array = []) => {
  const checksumedArray = checksumArray(array)
  const nodesArray = toHexNode(checksumedArray)
  const tree = MerkelTree(nodesArray)

  const getProof = ({ index, account }) =>
    tree.getHexProof(keccak256({ index, account }))

  const claims =
    checksumedArray.reduce((acu, account, index) => {
      // console.log('claims', account, index)
      acu[account] = {
        index,
        account,
        proof: getProof({ index, account })
      }
      return acu
    }, {})

  return {
    getTree: () => tree,
    getProof,
    toJSON: () => ({
      merkleRoot: tree.getHexRoot(),
      claims
    })
  }
}
