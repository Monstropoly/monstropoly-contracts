// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const MAGIC_BOXES_ADDR = '0xbaEa13191bD4D5a4e3521E6Ba1B0Db2742dE3AC6'
const FACTORY_ADDR = '0xa1546DE9787d9d28f29F3A2A44999fECf855442D'
const MPOLY_ADDR = '0x6a4e41E9114B4E5528bE8C34f95a4F3134c903C7'
const RELAYER_ADDR = '0x27E1d064f486e900B3bfFb0f7Db10B8405D2F4cC'
const PAYMASTER_ADDR = '0x900341a0Cd51e1e102808a1C5316776781D616fD'
const GENSCIENCE_ADDR = '0xf99d171A863502BFbB003A09F141c7DD03781aA6'

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
        gas: 3000000, //ToDo: estimate gas for this, not ready
        nonce: nonce,
        data: openData,
        validUntil: 0
    }

    const signature = await user._signTypedData(domain, types, value);
    console.log('Offchain user signature:')
    console.log(signature)

    /*** USER ENDS */

    /*** BACKEND */

    const length = 'asset-type--raritystat0-stat1-stat2-stat3-attr0-attr1-attr2-attr3-attr4-attr5-attr6-attr7-attr8-colorRcolorGcolorBcolorA' // not used
    const RANDOM = '740098223409078271829384132948734346321498890831874398135738a78741832983748391111b11110001111111987654987654987654987654' //modify manually !!!
    const wrappData = scienceContract.interface.encodeFunctionData('setRandom', [RANDOM])
    relayerContract = relayerContract.connect(backend)
    const response = await relayerContract.callAndRelay(wrappData, GENSCIENCE_ADDR, value, signature)
    // You can find txHash in response.hash so user can await in frontend (?)
    const receipt = await response.wait()
    // const receipt = await ethers.provider.getTransactionReceipt(response.hash) //that's how you can do it in frontend

    let log = receipt.logs.find(x => x.address.toLowerCase() === FACTORY_ADDR.toLowerCase())
    let transferEvent = factoryContract.interface.parseLog(log)

    console.log('Transfer event')
    console.log('    From: ', transferEvent.args.from)
    console.log('    To: ', transferEvent.args.to)
    console.log('    TokenID: ', transferEvent.args.tokenId.toString())

    /*** BACKEND ENDS */
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});