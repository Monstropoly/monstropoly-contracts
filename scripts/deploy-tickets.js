const { ethers } = require('hardhat');

const DEPLOYER_ADDR = '0xe6f5BA3712CfAe6b4cDd27E4d26f77dF3b10d21b'
const N_BOXES = 3
const BOXES_CONFIG = [[0], [1], [2, 3, 4, 5]]

async function main() {
    await hre.run('compile');

    // We get the contract to deploy
    const deployer = await ethers.getContractAt("MonstropolyDeployer", DEPLOYER_ADDR);

    const Factory = await ethers.getContractFactory('MonstropolyTickets')
    const emptyInitializeCalldata = Factory.interface.encodeFunctionData('initialize', [0, ethers.constants.AddressZero]);
    const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy')
    const implementation = await Factory.deploy()
    await implementation.deployed()

    for (let i = 0; i < N_BOXES; i++) {
        const myProxy = await ERC1967Proxy.deploy(implementation.address, emptyInitializeCalldata)
        await myProxy.deployed()

        const magicBoxesAddress = await deployer.get(ethers.utils.id("MAGIC_BOXES"))
        const magicBoxes = await ethers.getContractAt("MonstropolyMagicBoxesShop", magicBoxesAddress)
        for (let j = 0; j < BOXES_CONFIG[i].length; j++) {
            const response = await magicBoxes.updateTicketToBoxId(myProxy.address, BOXES_CONFIG[i][j], true)
            await response.wait()
        }
        
        console.log('Proxy:', myProxy.address)
        console.log("Implementation:", implementation.address)
        console.log("hardhat verify --network bsctestnet ", implementation.address)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});