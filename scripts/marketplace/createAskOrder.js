const { ethers } = require('hardhat');

const MARKETPLACE_ADDR = '0x2876a0872D9121eA4B6D68dB8ec121eFa9ABfB07'
const FACTORY_ADDR = '0xA97b63EEb5a25E650C67838DA62d1D186AFa868A'
const TOKEN_ID = 158
const PRICE = ethers.utils.parseEther('0.1')
const TOKEN_ADDR = ethers.constants.AddressZero // address(0) in case of BNB

async function main() {
    await hre.run('compile');

    const marketplaceContract = await ethers.getContractAt('MonstropolyMarketplace', MARKETPLACE_ADDR)
    const factoryContract = await ethers.getContractAt('MonstropolyFactory', FACTORY_ADDR)

    const approved = await factoryContract.isApproved(marketplaceContract.address, TOKEN_ID)
    
    if (!approved) {
        const approveResponse = await factoryContract.setApprovalForAll(marketplaceContract.address, true)
        await approveResponse.wait()
        console.log("Approved...")
    }

    const response = await marketplaceContract.createAskOrder(
        FACTORY_ADDR,
        TOKEN_ID,
        PRICE,
        TOKEN_ADDR
    )
    await response.wait()
    console.log('Ask order created...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});