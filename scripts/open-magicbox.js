// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const MAGIC_BOXES_ADDR = '0x44E7f995bc37be0d27102a063c52f6e03A52DA3C'
const FACTORY_ADDR = '0x39C296E7046c27B3cfEF8514D368bA1aE8558399'
const MPOLY_ADDR = '0x6a4e41E9114B4E5528bE8C34f95a4F3134c903C7'
const RELAYER_ADDR = '0x7D86C5D294BDC06aD9d5075Cc7F77BD802A80308'
const PAYMASTER_ADDR = '0x67fFB0916204a85be70115D0DA03E6DB275139DA'
const GENSCIENCE_ADDR = '0x6aaa80b4eE5d0901ea3092BB11fe50636a9f5e83'

const ASSET = 0 // 0-Character 1-Weapon. The asset you want to open
const VIP = false // Is your asset from a VIP box?

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
    let relayerContract = await ethers.getContractAt('MonstropolyRelayer', RELAYER_ADDR)
    const scienceContract = await ethers.getContractAt('MonstropolyGenScience', GENSCIENCE_ADDR)

    /*** USER */

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

    const boxBalance = await magicBoxesContract.balances(user.address, VIP, ASSET)

    if (boxBalance.toString() == '0') {
        console.log('Purchasing box...')
        const _response = await magicBoxesContract.purchase(0, 1)
        await _response.wait()
    }
    
    console.log('Preparing offchain signature...')
    const openData = magicBoxesContract.interface.encodeFunctionData('open', [ASSET, VIP]);
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
        gas: 2000000, //ToDo: estimate gas for this, not ready
        nonce: nonce,
        data: openData,
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

    const length = 'asset-type--raritystat0-stat1-stat2-stat3-attr0-attr1-attr2-attr3-attr4-attr5-attr6-attr7-attr8-colorRcolorGcolorBcolorA' // not used
    const RANDOM = '74009822340907827182938413294873434622149889083187439813573837874ee32983a48391141ab1110001132451987654987654987654987654' //modify manually !!!

    // Decode openData to get ASSET and VIP
    const decodedOpenData = magicBoxesContract.interface.decodeFunctionData('open', value.data)
    const _asset = decodedOpenData.asset
    const _vip = decodedOpenData.vip

    // Check signer balance to prevent failed TXs
    const _boxBalance = await magicBoxesContract.balances(signer, _vip, _asset)

    // Check if new gen (obtained from gen) is free.
    const genObj = await scienceContract.generateAssetView(ASSET, RANDOM, VIP)
    const gen = genObj.gen_ //Note gen != RANDOM in ASSET.random and RARITY.random fields as contract needs to set this in accordance to case
    
    if (genObj.free_ == true) {
        console.log('New gen is free!')
        console.log(gen)
    } else {
        console.log('Gen exists, generate a new random')
    }

    const wrappData = scienceContract.interface.encodeFunctionData('setRandom', [RANDOM])
    relayerContract = relayerContract.connect(backend)
    const response = await relayerContract.callAndRelay(wrappData, GENSCIENCE_ADDR, value, signature)
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