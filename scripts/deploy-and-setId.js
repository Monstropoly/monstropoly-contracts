// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const ID = ethers.utils.id("TICKETS");
const DEPLOYER_ADDR = '0xe6f5BA3712CfAe6b4cDd27E4d26f77dF3b10d21b'

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
    const deployer = DeployerFactory.attach(DEPLOYER_ADDR);

    const Factory = await ethers.getContractFactory('MonstropolyTickets')
    const emptyInitializeCalldata = Factory.interface.encodeFunctionData('initialize', []);
    console.log(emptyInitializeCalldata)
    const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy')
    const implementation = await Factory.deploy()
    await implementation.deployed()
    const myProxy = await ERC1967Proxy.deploy(implementation.address, emptyInitializeCalldata)
    await myProxy.deployed()
    const contract = Factory.attach(myProxy.address)

    const response = await deployer.setId(ID, contract.address)
    await response.wait()
    
    console.log('Implementation', implementation.address)
    console.log('Proxy', myProxy.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});