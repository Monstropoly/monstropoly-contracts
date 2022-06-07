// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const MAGIC_BOXES_ADDR = '0xcb73644C994D0EaD4BCA7f3B8f2e10B01DD98Af1'
const FACTORY_ADDR = '0x46A16FEc5332360C255b0846E6425D6762bc8b78'

const TICKETS_ADDR = '0xe1B436d38Ba7492dae279bE61Efd85cB1b9b474F' // BOX_IDs: 0
// const TICKETS_ADDR = '0xc241221B82F08398CF70d2fB73e21b3C22666444' // BOX_IDs: 1
// const TICKETS_ADDR = '0x4AaFb46C74D4Cd17D59190dc0B86A0b9e041C6e8' // BOX_IDs: 2, 3, 4, 5

const NFT_ID = 0
const BOX_ID = 0

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run('compile');

    const signers = await ethers.getSigners()
    const user = signers[1]
    const backend = signers[0]

    const magicBoxesContract = await ethers.getContractAt('MonstropolyMagicBoxesShop', MAGIC_BOXES_ADDR)
    const factoryContract = await ethers.getContractAt('MonstropolyFactory', FACTORY_ADDR)
    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    /*** BACKEND */

    console.log('Preparing offchain signature...')

    const domain = {
        name: 'MonstropolyMagicBoxesShop',
        version: '1',
        chainId: ethers.provider._hardhatProvider._provider._chainId, //mainnet
        // chainId: ethers.provider._network.chainId, //testnet
        verifyingContract: MAGIC_BOXES_ADDR
    }

    const types = {
        Mint: [
            { name: 'receiver', type: 'address' },
            { name: 'tokenId', type: 'bytes32' },
            { name: 'rarity', type: 'bytes32' },
            { name: 'breedUses', type: 'uint8' },
            { name: 'generation', type: 'uint8' },
            { name: 'validUntil', type: 'uint256' }
        ]
    }

    const tokenId = [7]
    const rarity = [1]
    const breedUses = 3
    const generation = 1
    const validUntil = 0

    const value = {
        receiver: user.address,
        tokenId: computeHashOfArray(tokenId),
        rarity: computeHashOfArrayUint8(rarity),
        breedUses: breedUses,
        generation: generation,
        validUntil: validUntil
    }

    const signature = await backend._signTypedData(domain, types, value);
    console.log('Offchain backend signature:')
    console.log(signature)

    /*** USER ENDS */

    // POST req including value object (needed to verify signature) and signature

    /*** FRONTEND */

    const owner = await ticketsContract.ownerOf(NFT_ID)

    const box = await magicBoxesContract.box(BOX_ID)
    const boxSupply = await magicBoxesContract.boxSupply(BOX_ID)

    if (boxSupply.isZero()) {
        console.log('Box supply is 0')
    } else {
        console.log('Enough box supply...')
    }

    const isApproved = await ticketsContract.isApproved(magicBoxesContract.address, NFT_ID)

    if (!isApproved) {
        console.log('Approving as operator...')
        const response = await ticketsContract.connect(user).setApprovalForAll(magicBoxesContract.address, true)
        await response.wait()
    } else {
        console.log('Operator already approved...')
    }

    // Check signature to be sure value.to = MAGIC_BOXES_ADDR
    const signer = ethers.utils.verifyTypedData(domain, types, value, signature) //we already know domain and types objs, dont need it in POST
    if (signer.toLowerCase() == backend.address) {
        console.log('Valid signature!')
    }

    const response = await magicBoxesContract.connect(user).purchaseWithTicket(
        NFT_ID,
        TICKETS_ADDR,
        BOX_ID,
        tokenId,
        rarity,
        value.breedUses,
        value.generation,
        value.validUntil,
        signature,
        backend.address
    )
    const receipt = await response.wait()
    // const receipt = await ethers.provider.getTransactionReceipt(response.hash) //that's how you can do it in frontend

    let logs = receipt.logs.filter(x => x.address.toLowerCase() === FACTORY_ADDR.toLowerCase())
    logs.forEach(async(log) => {
        let transferEvent = factoryContract.interface.parseLog(log)

        if (transferEvent.args.generation != undefined) {
            console.log('Mint event')
            console.log('    To: ', transferEvent.args.to)
            console.log('    TokenID: ', transferEvent.args.tokenId.toString())
            console.log('    Rarity: ', transferEvent.args.rarity)
            console.log('    Breed uses: ', transferEvent.args.breedUses)
            console.log('    Generation: ', transferEvent.args.generation)
        }
    })

    /*** BACKEND ENDS */
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

function computeHashOfArray(array) {
	let concatenatedHashes = '0x'
	let itemHash
	for(let i = 0; i < array.length; i++) {
		itemHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint256"], [array[i]]))
		concatenatedHashes = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes32"], [concatenatedHashes, itemHash])
	}
	return ethers.utils.keccak256(concatenatedHashes)
}

function computeHashOfArrayUint8(array) {
	let concatenatedHashes = '0x'
	let itemHash
	for(let i = 0; i < array.length; i++) {
		itemHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint8"], [array[i]]))
		concatenatedHashes = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes32"], [concatenatedHashes, itemHash])
	}
	return ethers.utils.keccak256(concatenatedHashes)
}