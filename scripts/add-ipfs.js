const { create: ipfsHttpClient, globSource } = require('ipfs-http-client')

const jsonObj = {
    "key": "value"
}
const file = JSON.stringify(jsonObj)

const data = {
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
}

async function main() {

    const ipfs = ipfsHttpClient(data);
    
    try {
        const added = await ipfs.add(file)
        console.log('Uri: https://ipfs.io/ipfs/' + added.cid.toString())
    } catch (error) {
        console.error('ERROR', error)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
