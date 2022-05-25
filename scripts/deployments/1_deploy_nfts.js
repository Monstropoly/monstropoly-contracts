const { ethers } = require("hardhat");

const _IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
const FACTORY_ID = ethers.utils.id("FACTORY");
const MAGIC_BOXES_ID = ethers.utils.id("MAGIC_BOXES");
const MINTER_ROLE = ethers.utils.id("MINTER_ROLE")
const TREASURY_WALLET_ID = ethers.utils.id("TREASURY_WALLET");
const DISTRIBUTION_VAULT_ID = ethers.utils.id("DISTRIBUTION_VAULT");
const N_BOXES = 2
const BOXES_CONFIG = [[0], [1]]
const LAUNCH_MAX_SUPPLIES = [800, 0]
const TICKET_NAMES = ["Monstropoly MonsterBox", "Monstropoly ComboBox"]
const TICKET_SYMBOLS = ["MMB", "MCB"]
const TICKET_URIS = ["https://beta.monstropoly.io/monsterbox/", "https://beta.monstropoly.io/combobox/"]
const LAUNCHPAD_ADDR = "0x7407d219E56309c050c5cDAE9687542234eBA584"

const DEV1 = "0x9DAcB499c9eB6725679A62617e4DA97df52598c1"
const DEV2 = "0xCD7669AAFffB7F683995E6eD9b53d1E5FE72c142"

async function main() {
    await hre.run("compile");

    const signers = await ethers.getSigners()

    console.log("Deploying deployer...")
    const MonstropolyDeployer = await ethers.getContractFactory("MonstropolyDeployer");
    const deployer = await MonstropolyDeployer.deploy();
    await deployer.deployed()
    console.log("Deployer:", deployer.address);

    await deployer.setId(TREASURY_WALLET_ID, signers[1].address)
    await deployer.setId(DISTRIBUTION_VAULT_ID, signers[0].address)

    const MonstropolyFactory = await ethers.getContractFactory("MonstropolyFactory")
    const MonstropolyMagicBoxesShop = await ethers.getContractFactory("MonstropolyMagicBoxesShop")

    const emptyInitializeCalldata = MonstropolyFactory.interface.encodeFunctionData("initialize", []);

    console.log("Deploying factory...")
    const factoryImpl = await MonstropolyFactory.deploy();
    await factoryImpl.deployed()
    const response1 = await deployer.deployProxyWithImplementation(FACTORY_ID, factoryImpl.address, emptyInitializeCalldata)
    await response1.wait()
    const factoryAddress = await deployer.get(FACTORY_ID)
    console.log("Factory:", factoryAddress)
    console.log("hardhat verify --network bsctestnet", factoryImpl.address)

    console.log("Deploying magic box shop...")
    const response3 = await deployer.deploy(MAGIC_BOXES_ID, MonstropolyMagicBoxesShop.bytecode, emptyInitializeCalldata)
    await response3.wait()
    const magicBoxesAddress = await deployer.get(MAGIC_BOXES_ID)
    console.log("MagicBoxesShop:", magicBoxesAddress)
	const implementationEncoded2 = await ethers.provider.getStorageAt(magicBoxesAddress, _IMPLEMENTATION_SLOT)
	const implementation2 = ethers.utils.defaultAbiCoder.decode(["address"], implementationEncoded2)
	const magicBoxesImp = implementation2[0]
    console.log("hardhat verify --network bsctestnet", magicBoxesImp)

    const myMagicBoxes = MonstropolyMagicBoxesShop.attach(magicBoxesAddress)

    await myMagicBoxes.updateMagicBox(0, 1, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"))
    await myMagicBoxes.updateMagicBox(1, 4, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"))
    // await myMagicBoxes.updateMagicBox(2, 1, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"))
    // await myMagicBoxes.updateMagicBox(3, 1, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"))
    // await myMagicBoxes.updateMagicBox(4, 1, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"))
    // await myMagicBoxes.updateMagicBox(5, 1, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"))
    console.log("MagicBoxes prices setted...")
    
    await myMagicBoxes.updateBoxSupply(0, 1000)
    await myMagicBoxes.updateBoxSupply(1, 1000)
    await myMagicBoxes.updateBoxSupply(2, 1000)
    await myMagicBoxes.updateBoxSupply(3, 1000)
    await myMagicBoxes.updateBoxSupply(4, 1000)
    await myMagicBoxes.updateBoxSupply(5, 1000)
    console.log("MagicBoxes supply setted...")

    await deployer.grantRole(MINTER_ROLE, myMagicBoxes.address);
    console.log("Minter roles setted...")

    console.log("Deploying magic box shop...")
    const MonstropolyNFTStaking = await ethers.getContractFactory("MonstropolyNFTStaking")
    const response4 = await deployer.deploy(ethers.utils.id("NFT_STAKING"), MonstropolyNFTStaking.bytecode, emptyInitializeCalldata)
    await response4.wait()
    const nftStakingAddress = await deployer.get(ethers.utils.id("NFT_STAKING"))
    await deployer.grantRole(ethers.utils.id("LOCKER_ROLE"), nftStakingAddress)

    console.log("MonstropolyNFTStaking:", nftStakingAddress)

    const implementationEncoded3 = await ethers.provider.getStorageAt(nftStakingAddress, _IMPLEMENTATION_SLOT)
	const implementation3 = ethers.utils.defaultAbiCoder.decode(["address"], implementationEncoded3)

    console.log("Implementation:", implementation3[0])
    console.log("hardhat verify --network bsctestnet ", implementation3[0])

    console.log("Deploying tickets stuff...")
    const MonstropolyTickets = await ethers.getContractFactory("MonstropolyTickets")
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy")
    const ticketsImp = await MonstropolyTickets.deploy()
    await ticketsImp.deployed()
    console.log("hardhat verify --network bsctestnet", ticketsImp.address)

    for (let i = 0; i < N_BOXES; i++) {
        const ticketsInitializeCalldata = MonstropolyTickets.interface.encodeFunctionData("initialize", [TICKET_NAMES[i], TICKET_SYMBOLS[i], TICKET_URIS[i], LAUNCH_MAX_SUPPLIES[i], LAUNCHPAD_ADDR]);
        // const myProxy = await ERC1967Proxy.deploy(ticketsImp.address, ticketsInitializeCalldata)
        const contractID = ethers.utils.id("TICKETS_" + TICKET_SYMBOLS[i])
        const myProxy = await deployer.deployProxyWithImplementation(contractID, ticketsImp.address, ticketsInitializeCalldata)
        await myProxy.wait()
        const ticketAddress = await deployer.get(contractID)

        for (let j = 0; j < BOXES_CONFIG[i].length; j++) {
            const response = await myMagicBoxes.updateTicketToBoxId(ticketAddress, BOXES_CONFIG[i][j], true)
            await response.wait()
        }
        
        console.log("Ticket:", ticketAddress)

        // TestNet
        await deployer.grantRole(MINTER_ROLE, DEV1)
        await deployer.grantRole(MINTER_ROLE, DEV2)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});