// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const GLD_ID = ethers.utils.id("GLD");
const DEPLOYER_ADDR = '0x9f2D8bF61748c0EfBd57b02BD7569F674Fe0d47C'
const hre = require('hardhat')

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run('compile');

    // We get the contract to deploy
    const DeployerFactory = await ethers.getContractFactory("MonstropolyDeployer");
    let deployer

    if (DEPLOYER_ADDR == ethers.constants.AddressZero) {
        deployer = await DeployerFactory.deploy();
        await deployer.deployed()
        oldDeployer = await DeployerFactory.attach(MANAGER_OLD);
    } else {
        deployer = await DeployerFactory.attach(DEPLOYER_ADDR);
    }

    await deployer.deployed();
    console.log("Deployer:", deployer.address);

    const tokenFactory = await ethers.getContractFactory('MonstropolyGLD')
    let initCalldata = await tokenFactory.interface.encodeFunctionData('initialize', []);

    const response = await deployer.deploy(GLD_ID, tokenFactory.bytecode, initCalldata)
    await response.wait()

    const [gld] = await Promise.all([
        deployer.get(GLD_ID)
    ])

    console.log("GLD:", gld);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});