const { ethers } = require('hardhat');

const MARKETPLACE_ADDR = '0x760a1197691F0fABa449FD1fe246117262587bFd'
const FACTORY_ADDR = '0xA97b63EEb5a25E650C67838DA62d1D186AFa868A'
const TRADING_FEES = [
    200, //BNB
    100 //MPOLY
]
const CREATOR_FEES = [
    100, //BNB
    50 //MPOLY
]
const TOKENS = [
    ethers.constants.AddressZero,
    '0x6a4e41E9114B4E5528bE8C34f95a4F3134c903C7'
]

async function main() {
    await hre.run('compile');

    const accounts = await ethers.getSigners()
    const creator = accounts[0].address
    const admin = accounts[1]

    const marketplaceContract = await ethers.getContractAt('MonstropolyMarketplace', MARKETPLACE_ADDR)

    const response = await marketplaceContract.connect(admin).addCollection(
        FACTORY_ADDR,
        creator,
        ethers.constants.AddressZero,
        TRADING_FEES,
        CREATOR_FEES,
        TOKENS
    )
    await response.wait()
    console.log('Collection added...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});