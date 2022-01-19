const { bufferToHex, keccak256 } = require('ethereumjs-util')

const combinedHash = (first, second) => {
  if (!first) {
    return second
  }
  if (!second) {
    return first
  }

  return keccak256(sortAndConcat(first, second))
}

const getPairElement = (idx, layer) => {
  const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1

  if (pairIdx < layer.length) {
    return layer[pairIdx]
  } else {
    return null
  }
}

const bufDedup = elements => {
  return elements.filter((el, idx) => {
    return idx === 0 || !elements[idx - 1].equals(el)
  })
}

const bufArrToHexArr = arr => {
  if (arr.some((el) => !Buffer.isBuffer(el))) {
    throw new Error('Array is not an array of buffers')
  }

  return arr.map((el) => '0x' + el.toString('hex'))
}

const sortAndConcat = (...args) => {
  return Buffer.concat([...args].sort(Buffer.compare))
}

const getLayers = (elements) => {
  if (elements.length === 0) {
    throw new Error('empty tree')
  }

  const layers = []
  layers.push(elements)

  // Get next layer until we reach the root
  while (layers[layers.length - 1].length > 1) {
    layers.push(getNextLayer(layers[layers.length - 1]))
  }

  return layers
}

const getNextLayer = (elements) => {
  return elements.reduce((layer, el, idx, arr) => {
    if (idx % 2 === 0) {
      layer.push(combinedHash(el, arr[idx + 1]))
    }

    return layer
  }, [])
}

module.exports = (original = []) => {
  let elements = [...original]
  // Sort elements
  elements.sort(Buffer.compare)

  // Deduplicate elements
  elements = bufDedup(elements)

  const indexByElement = elements.reduce((memo, el, index) => {
    memo[bufferToHex(el)] = index
    return memo
  }, {})

  const layers = getLayers(elements)

  const getRoot = () => {
    return layers[layers.length - 1][0]
  }

  const getProof = el => {
    let idx = indexByElement[bufferToHex(el)]

    if (typeof idx !== 'number') {
      throw new Error('Element does not exist in Merkle tree')
    }

    return layers.reduce((proof, layer) => {
      const pairElement = getPairElement(idx, layer)

      if (pairElement) {
        proof.push(pairElement)
      }

      idx = Math.floor(idx / 2)

      return proof
    }, [])
  }

  return {
    getHexRoot: () => {
      return bufferToHex(getRoot())
    },
    getHexProof: el => {
      const proof = getProof(el)

      return bufArrToHexArr(proof)
    }
  }
}
