const { ethers } = require('hardhat');

const DEPLOYER_ADDR = '0xe6f5BA3712CfAe6b4cDd27E4d26f77dF3b10d21b'
const N_BOXES = 2
const BOXES_CONFIG = [[0], [1]]
const LAUNCH_MAX_SUPPLIES = [500, 500]
const TICKET_NAMES = ["Monstropoly MonsterBox", "Monstropoly ComboBox"]
const TICKET_SYMBOLS = ["MMB", "MCB"]
const TICKET_URIS = ["https://beta.monstropoly.io/monsterbox/", "https://beta.monstropoly.io/combobox/"]
const LAUNCHPAD_ADDR = "0x7407d219E56309c050c5cDAE9687542234eBA584"

const MINTER_ROLE = ethers.utils.id("MINTER_ROLE")
const DEV1 = "0x9DAcB499c9eB6725679A62617e4DA97df52598c1"
const DEV2 = "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142"

async function main() {
    await hre.run('compile');

    // We get the contract to deploy
    const deployer = await ethers.getContractAt("MonstropolyDeployer", DEPLOYER_ADDR);

    const MonstropolyTickets = await ethers.getContractFactory('MonstropolyTickets')
    const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy')
    const implementation = await MonstropolyTickets.deploy()
    await implementation.deployed()

    for (let i = 0; i < N_BOXES; i++) {
        const ticketsInitializeCalldata = MonstropolyTickets.interface.encodeFunctionData("initialize", [TICKET_NAMES[i], TICKET_SYMBOLS[i], TICKET_URIS[i], LAUNCH_MAX_SUPPLIES[i], LAUNCHPAD_ADDR]);
        const myProxy = await ERC1967Proxy.deploy(implementation.address, ticketsInitializeCalldata)
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

        const myTicket = MonstropolyTickets.attach(myProxy.address)
        await myTicket.grantRole(MINTER_ROLE, DEV1)
        await myTicket.grantRole(MINTER_ROLE, DEV2)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});