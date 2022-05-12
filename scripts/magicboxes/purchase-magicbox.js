// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const MAGIC_BOXES_ADDR = '0xe387Be6718c67BD332a2CFd6b1A3321495B9DA87'
const FACTORY_ADDR = '0xA97b63EEb5a25E650C67838DA62d1D186AFa868A'
const MPOLY_ADDR = '0x6a4e41E9114B4E5528bE8C34f95a4F3134c903C7'
const RELAYER_ADDR = '0x5727d040A00ce144ec4d585c195C2d9b663210eA'
const PAYMASTER_ADDR = '0xF6fA4770831dE444266571cC0e8f3600a2f9d492'

const BOX_ID = 3 // 0-random, 1-4vips...

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
    const mpolyContract = await ethers.getContractAt('MonstropolyERC20', MPOLY_ADDR)
    let relayerContract = await ethers.getContractAt('MonstropolyRelayerFree', RELAYER_ADDR)

    /*** USER */

    const box = await magicBoxesContract.box(BOX_ID)
    const boxSupply = await magicBoxesContract.boxSupply(BOX_ID)

    if (boxSupply.isZero()) {
        console.log('Box supply is 0')
    } else {
        console.log('Enough box supply...')
    }

    let reqValue = ethers.BigNumber.from('0')
    if (box.token.toLowerCase() == MPOLY_ADDR.toLocaleLowerCase()) {
        console.log('Payment in MPOLY...')
        const allowanceMagicBoxes = await mpolyContract.allowance(user.address, MAGIC_BOXES_ADDR)
        const allowancePaymaster = await mpolyContract.allowance(user.address, PAYMASTER_ADDR)

        if (allowanceMagicBoxes.toString() == '0') {
            console.log('ERC20 approve to MagicBoxesShop...')
            await mpolyContract.approve(MAGIC_BOXES_ADDR, ethers.constants.MaxUint256)
        }

        if (allowancePaymaster.toString() == '0') {
            console.log('ERC20 approve to Paymaster...')
            await mpolyContract.approve(PAYMASTER_ADDR, ethers.constants.MaxUint256)
        }
    } else if (box.token == ethers.constants.AddressZero) {
        console.log('Payment in BNB...')
        reqValue = ethers.BigNumber.from(box.price.toString())
    } else {
        console.log('Unknown payment token')
    }
    
    console.log('Preparing offchain signature...')
    const openData = magicBoxesContract.interface.encodeFunctionData('purchase', [BOX_ID]);
    const nonce = await relayerContract.getNonce(user.address)

    const domain = {
        name: 'MonstropolyRelayerFree',
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
        value: reqValue,
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

    const GENETICS = ['010100030104050404'] //modify manually !!!
    const RARITIES = [1] //modify manually !!!
    const BREED_USES = [3] //modify manually !!!
    const GENERATIONS = [1] //modify manually !!!

    // Decode openData to get ASSET and VIP
    const decodedOpenData = magicBoxesContract.interface.decodeFunctionData('purchase', value.data)
    const _boxId = decodedOpenData.id

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
    const response = await relayerContract.callAndRelay(wrappData, MAGIC_BOXES_ADDR, value, signature, { value: reqValue })
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