// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const DEPLOYER_ADDR = '0xd18777b83a56c04422eed1036221C5879Ee837cf'

const hre = require('hardhat')

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run('compile');

    const signers = await ethers.getSigners()

    // We get the contract to deploy
    const DeployerFactory = await ethers.getContractFactory("MonstropolyDeployer");

    const deployer = await DeployerFactory.attach(DEPLOYER_ADDR);

    console.log("Deployer:", deployer.address);

    const ID = ethers.utils.id('TICKETS_MCB')
    const Factory = await ethers.getContractFactory('MonstropolyTickets')
    // let initializeCalldata = await Factory.interface.encodeFunctionData('initialize', ['15401576', '16265576', '15603176', '138888888888888888888', '492281033396345']);
    const response = await deployer.deploy(ID, Factory.bytecode, '0x')
    const receipt = await response.wait()
    const ProxyFactory = await ethers.getContractFactory('UUPSUpgradeableByRole')
    const proxy = await ProxyFactory.attach(await deployer.get(ID))
    const implementation = await proxy.implementation()
    console.log("Implementation deployed:", implementation)
    console.log("hardhat verify --network bsctestnet ", implementation)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});