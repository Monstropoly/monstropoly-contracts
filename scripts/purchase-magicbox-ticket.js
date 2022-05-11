// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const MAGIC_BOXES_ADDR = '0xe387Be6718c67BD332a2CFd6b1A3321495B9DA87'
const FACTORY_ADDR = '0xA97b63EEb5a25E650C67838DA62d1D186AFa868A'
const RELAYER_ADDR = '0x78Fa325d3Ac89EccDBff65cEA1C89463D4FCC31f'
const PAYMASTER_ADDR = '0xF6fA4770831dE444266571cC0e8f3600a2f9d492'

const TICKETS_ADDR = '0x6b8ff7c5594126125A2d0A56D9Cb372890888677' // BOX_IDs: 0
// const TICKETS_ADDR = '0x134B061985C6C77a6735B72D9fa270E0B01C019A' // BOX_IDs: 1
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
    const user = signers[0]
    const backend = signers[1]

    const magicBoxesContract = await ethers.getContractAt('MonstropolyMagicBoxesShop', MAGIC_BOXES_ADDR)
    const factoryContract = await ethers.getContractAt('MonstropolyFactory', FACTORY_ADDR)
    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)
    let relayerContract = await ethers.getContractAt('MonstropolyRelayer', RELAYER_ADDR)

    /*** USER */

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
        const response = await ticketsContract.setApprovalForAll(magicBoxesContract.address, true)
        await response.wait()
    } else {
        console.log('Operator already approved...')
    }
    
    console.log('Preparing offchain signature...')
    const openData = magicBoxesContract.interface.encodeFunctionData('purchaseWithTicket', [NFT_ID, TICKETS_ADDR, BOX_ID]);
    const nonce = await relayerContract.getNonce(user.address)

    const domain = {
        name: 'MonstropolyRelayer',
        version: '1',
        chainId: ethers.provider._network.chainId,
        verifyingContract: RELAYER_ADDR
    }

    const types = {
        Execute: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'gas', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'data', type: 'bytes' },
            { name: 'validUntil', type: 'uint256' }
        ]
    }

    const value = {
        from: user.address,
        to: MAGIC_BOXES_ADDR,
        value: 0,
        gas: 2500000, //ToDo: estimate gas for this, not ready
        nonce: nonce,
        data: openData.toString(),
        validUntil: 0
    }

    const signature = await user._signTypedData(domain, types, value);
    console.log('Offchain user signature:')
    console.log(signature)

    /*** USER ENDS */

    // POST req including value object (needed to verify signature) and signature

    /*** BACKEND */

    // Check signature to be sure value.to = MAGIC_BOXES_ADDR
    const signer = ethers.utils.verifyTypedData(domain, types, value, signature) //we already know domain and types objs, dont need it in POST
    if ((signer.toLowerCase() == value.from.toLowerCase()) && (value.to == MAGIC_BOXES_ADDR)) {
        console.log('Valid signature!')
    }

    const GENETICS = ['010100030101020409'] //modify manually !!!
    const RARITIES = [1] //modify manually !!!
    const BREED_USES = [3] //modify manually !!!
    const GENERATIONS = [1] //modify manually !!!

    // Decode openData to get ASSET and VIP
    const decodedOpenData = magicBoxesContract.interface.decodeFunctionData('purchaseWithTicket', value.data)
    const _boxId = decodedOpenData.tokenId

    // Check if new gen (obtained from gen) is free
    for(let i = 0; i < GENETICS.length; i++) {
        let isFree = await factoryContract.freeGen(GENETICS[i])
        
        if (isFree) {
            console.log('New gen ' + GENETICS[i] + ' is free!')
        } else {
            console.log('Gen ' + GENETICS[i] + ' exists, generate a new random')
        }
    }

    const wrappData = magicBoxesContract.interface.encodeFunctionData('setMintParams', [GENETICS, RARITIES, BREED_USES, GENERATIONS])
    relayerContract = relayerContract.connect(backend)
    const response = await relayerContract.callAndRelay(wrappData, MAGIC_BOXES_ADDR, value, signature)
    // You can find txHash in response.hash so user can await in frontend (?)
    const receipt = await response.wait()
    // const receipt = await ethers.provider.getTransactionReceipt(response.hash) //that's how you can do it in frontend

    let logs = receipt.logs.filter(x => x.address.toLowerCase() === FACTORY_ADDR.toLowerCase())
    logs.forEach(async(log) => {
        let transferEvent = factoryContract.interface.parseLog(log)

        if (transferEvent.args.genetic != undefined) {
            console.log('Mint event')
            console.log('    From: ', transferEvent.args.from)
            console.log('    To: ', transferEvent.args.to)
            console.log('    TokenID: ', transferEvent.args.tokenId.toString())
            console.log('    Genetic: ', transferEvent.args.genetic)
            console.log('    Rarity: ', transferEvent.args.rarity)
            console.log('    Breed uses: ', transferEvent.args.breedUses)
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