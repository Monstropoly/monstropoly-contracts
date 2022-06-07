const { ethers } = require('hardhat');

const MARKETPLACE_ADDR = '0xCDEF60b732647Df005EdF1aD30e9fb5473fC94Ef'
const FACTORY_ADDR = '0xA97b63EEb5a25E650C67838DA62d1D186AFa868A'
const TOKEN_ID = 9
const NEW_PRICE = ethers.utils.parseEther('1')

async function main() {
    await hre.run('compile');

    const marketplaceContract = await ethers.getContractAt('MonstropolyMarketplace', MARKETPLACE_ADDR)

    const response = await marketplaceContract.modifyAskOrder(
        FACTORY_ADDR,
        TOKEN_ID,
        NEW_PRICE,
    )
    await response.wait()
    console.log('Ask order modified...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});