const { ethers } = require('hardhat');

async function main() {
    const Launchpad = await ethers.getContractFactory('Launchpad')

    const launch = await Launchpad.deploy()
    await launch.deployed()
    console.log('Launchpad: ', launch.address)
    console.log('hardhat verify --network bsctestnet ' + launch.address)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});