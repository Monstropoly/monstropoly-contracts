const { ethers } = require('hardhat');

const MPOLY = '0x6a4e41E9114B4E5528bE8C34f95a4F3134c903C7'
const MIN_PRICES = [
    ethers.utils.parseEther('0.01'), //BNB
    ethers.utils.parseEther('1') //MPOLY
]
const MAX_PRICES = [
    ethers.utils.parseEther('10000'), //BNB
    ethers.utils.parseEther('1000000') //MPOLY
]
const TOKENS = [
    ethers.constants.AddressZero,
    MPOLY
]

async function main() {
    await hre.run('compile');

    const accounts = await ethers.getSigners()
    const admin = accounts[1]
    const treasury = accounts[2]

    const WBNB = await ethers.getContractFactory('WBNB')
    const myWBNB = await WBNB.deploy()
    await myWBNB.deployed()
    console.log('WBNB: ', myWBNB.address)

    const MonstropolyMarketplace = await ethers.getContractFactory('MonstropolyMarketplace')

    const marketplace = await MonstropolyMarketplace.deploy(
        admin.address,
        treasury.address,
        myWBNB.address,
        MIN_PRICES,
        MAX_PRICES,
        TOKENS
    )
    await marketplace.deployed()
    console.log('Marketplace: ', marketplace.address)
    console.log('hardhat verify --network bsctestnet --constructor-args mp-arguments.js ' + marketplace.address)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});