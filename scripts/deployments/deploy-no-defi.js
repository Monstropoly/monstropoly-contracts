const { ethers } = require("hardhat");

const _IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
const DATA_ID = ethers.utils.id("DATA");
const FACTORY_ID = ethers.utils.id("FACTORY");
const MAGIC_BOXES_ID = ethers.utils.id("MAGIC_BOXES");
const MINTER_ROLE = ethers.utils.id("MINTER_ROLE")
const ERC20_ID = ethers.utils.id("ERC20");
const TREASURY_WALLET_ID = ethers.utils.id("TREASURY_WALLET");
const DISTRIBUTION_VAULT_ID = ethers.utils.id("DISTRIBUTION_VAULT");
const N_BOXES = 2
const BOXES_CONFIG = [[0], [1]]
const LAUNCH_MAX_SUPPLIES = [500, 500]
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

    const MonstropolyERC20 = await ethers.getContractFactory("MonstropolyERC20")
    const MonstropolyFactory = await ethers.getContractFactory("MonstropolyFactory")
    const MonstropolyData = await ethers.getContractFactory("MonstropolyData")
    const MonstropolyMagicBoxesShop = await ethers.getContractFactory("MonstropolyMagicBoxesShop")

    const emptyInitializeCalldata = MonstropolyERC20.interface.encodeFunctionData("initialize", []);

    console.log("Deploying factory...")
    const factoryImpl = await MonstropolyFactory.deploy();
    await factoryImpl.deployed()
    const response1 = await deployer.deployProxyWithImplementation(FACTORY_ID, factoryImpl.address, emptyInitializeCalldata)
    await response1.wait()
    const factoryAddress = await deployer.get(FACTORY_ID)
    console.log("Factory:", factoryAddress)
    console.log("hardhat verify --network bsctestnet", factoryImpl.address)

    console.log("Deploying Data...")
    const dataImpl = await MonstropolyData.deploy();
    await dataImpl.deployed()
    const response2 = await deployer.deployProxyWithImplementation(DATA_ID, dataImpl.address, emptyInitializeCalldata)
    await response2.wait()
    const dataAddress = await deployer.get(DATA_ID)
    console.log("Data:", dataAddress)
    console.log("hardhat verify --network bsctestnet", dataImpl.address)

    console.log("Deploying magic box shop...")
    const response3 = await deployer.deploy(MAGIC_BOXES_ID, MonstropolyMagicBoxesShop.bytecode, emptyInitializeCalldata)
    await response3.wait()
    const magicBoxesAddress = await deployer.get(MAGIC_BOXES_ID)
    console.log("MagicBoxesShop:", magicBoxesAddress)
	const implementationEncoded2 = await ethers.provider.getStorageAt(magicBoxesAddress, _IMPLEMENTATION_SLOT)
	const implementation2 = ethers.utils.defaultAbiCoder.decode(["address"], implementationEncoded2)
	const magicBoxesImp = implementation2[0]
    console.log("hardhat verify --network bsctestnet", magicBoxesImp)

    console.log("Deploying MPOLY...")
    const response4 = await deployer.deploy(ERC20_ID, MonstropolyERC20.bytecode, emptyInitializeCalldata)
    await response4.wait()
    const mpolyAddress = await deployer.get(ERC20_ID)
    console.log("MPOLY:", mpolyAddress)
	const implementationEncoded3 = await ethers.provider.getStorageAt(mpolyAddress, _IMPLEMENTATION_SLOT)
	const implementation3 = ethers.utils.defaultAbiCoder.decode(["address"], implementationEncoded3)
	const mpolyImp = implementation3[0]
    console.log("hardhat verify --network bsctestnet", mpolyImp)

    // TestNet
    const myMPOLY = MonstropolyERC20.attach(mpolyAddress)
    await myMPOLY.transfer(DEV1, ethers.utils.parseEther('500000'))

    console.log("Deploying relayer stuff...")
    const Relayer = await ethers.getContractFactory("MonstropolyRelayerFree")
    const myRelayer = await Relayer.deploy()
    await myRelayer.deployed()
    const paymaster = await myRelayer.paymaster()
    console.log("Relayer:", myRelayer.address);
    console.log("Paymaster:", paymaster);

    const myMagicBoxes = MonstropolyMagicBoxesShop.attach(magicBoxesAddress)
    await myMagicBoxes.setTrustedForwarder(myRelayer.address)
    console.log("Trusted forwarder setted...")

    await myMagicBoxes.updateMagicBox(0, 1, ethers.utils.parseEther("1250"), mpolyAddress, ethers.utils.parseEther("20"), ethers.utils.parseEther("80"), 0)
    await myMagicBoxes.updateMagicBox(1, 4, ethers.utils.parseEther("2"), ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"), 0)
    await myMagicBoxes.updateMagicBox(2, 1, ethers.utils.parseEther("1"), ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"), 1)
    await myMagicBoxes.updateMagicBox(3, 1, ethers.utils.parseEther("1"), ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"), 2)
    await myMagicBoxes.updateMagicBox(4, 1, ethers.utils.parseEther("1"), ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"), 3)
    await myMagicBoxes.updateMagicBox(5, 1, ethers.utils.parseEther("1"), ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"), 4)
    console.log("MagicBoxes prices setted...")

    await myMagicBoxes.updateBoxSupply(0, 1000)
    await myMagicBoxes.updateBoxSupply(1, 1000)
    await myMagicBoxes.updateBoxSupply(2, 1000)
    await myMagicBoxes.updateBoxSupply(3, 1000)
    await myMagicBoxes.updateBoxSupply(4, 1000)
    await myMagicBoxes.updateBoxSupply(5, 1000)

    await deployer.grantRole(MINTER_ROLE, myMagicBoxes.address);
    console.log("Minter roles setted...")

    console.log("Deploying tickets stuff...")
    const MonstropolyTickets = await ethers.getContractFactory("MonstropolyTickets")
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy")
    const ticketsImp = await MonstropolyTickets.deploy()
    await ticketsImp.deployed()
    console.log("hardhat verify --network bsctestnet", ticketsImp.address)

    for (let i = 0; i < N_BOXES; i++) {
        const ticketsInitializeCalldata = MonstropolyTickets.interface.encodeFunctionData("initialize", [TICKET_NAMES[i], TICKET_SYMBOLS[i], TICKET_URIS[i], LAUNCH_MAX_SUPPLIES[i], LAUNCHPAD_ADDR]);
        const myProxy = await ERC1967Proxy.deploy(ticketsImp.address, ticketsInitializeCalldata)
        await myProxy.deployed()

        for (let j = 0; j < BOXES_CONFIG[i].length; j++) {
            const response = await myMagicBoxes.updateTicketToBoxId(myProxy.address, BOXES_CONFIG[i][j], true)
            await response.wait()
        }
        
        console.log("Ticket:", myProxy.address)

        // TestNet
        const myTicket = MonstropolyTickets.attach(myProxy.address)
        await myTicket.grantRole(MINTER_ROLE, DEV1)
        await myTicket.grantRole(MINTER_ROLE, DEV2)
    }

    console.log("Deploying marketplace...")
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
        myMPOLY.address
    ]

    const admin = signers[1]
    const treasury = signers[2]

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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});