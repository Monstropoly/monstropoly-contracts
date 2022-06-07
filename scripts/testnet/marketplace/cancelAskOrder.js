const { ethers } = require('hardhat');

const MARKETPLACE_ADDR = '0x760a1197691F0fABa449FD1fe246117262587bFd'
const FACTORY_ADDR = '0xA97b63EEb5a25E650C67838DA62d1D186AFa868A'
const TOKEN_ID = 108

async function main() {
    await hre.run('compile');

    const marketplaceContract = await ethers.getContractAt('MonstropolyMarketplace', MARKETPLACE_ADDR)

    const response = await marketplaceContract.cancelAskOrder(
        FACTORY_ADDR,
        TOKEN_ID
    )
    await response.wait()
    console.log('Ask order cancelled...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});