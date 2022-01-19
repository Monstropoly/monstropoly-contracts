// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const ERC20_ID = ethers.utils.id("ERC20");
const DISTRIBUTION_VAULT_ID = ethers.utils.id("DISTRIBUTION_VAULT");

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

    const deployer = await DeployerFactory.deploy();

    await deployer.deployed();
    console.log("Deployer:", deployer.address);

    const Erc20Factory = await ethers.getContractFactory('MonstropolyERC20')
    let calldataErc20 = await Erc20Factory.interface.encodeFunctionData('initialize', []);

    const DistributionVaultFactory = await ethers.getContractFactory('MonstropolyDistributionVault')
    let calldataDistributionVault = await DistributionVaultFactory.interface.encodeFunctionData('initialize', []);

    const response1 = await deployer.deploy(DISTRIBUTION_VAULT_ID, DistributionVaultFactory.bytecode, calldataDistributionVault)
    const response2 = await deployer.deploy(ERC20_ID, Erc20Factory.bytecode, calldataErc20)
    await response1.wait()
    await response2.wait()

    const [erc20, distribution] = await Promise.all([
        deployer.get(ERC20_ID),
        deployer.get(DISTRIBUTION_VAULT_ID)
    ])

    console.log("ERC20:", erc20);
    console.log("DistributionVault:", distribution);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});