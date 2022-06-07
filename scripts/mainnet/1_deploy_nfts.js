const { ethers } = require("hardhat");

const _IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
const FACTORY_ID = ethers.utils.id("FACTORY");
const MAGIC_BOXES_ID = ethers.utils.id("MAGIC_BOXES");
const NFT_STAKING = ethers.utils.id("NFT_STAKING");
const MONSTER_MINTER_ROLE = ethers.utils.id("MONSTER_MINTER_ROLE")
const TICKETS_MINTER_ROLE = ethers.utils.id("TICKETS_MINTER_ROLE")
const MONSTER_LOCKER_ROLE = ethers.utils.id("MONSTER_LOCKER_ROLE")
const MAGIC_BOXES_ADMIN_ROLE = ethers.utils.id("MAGIC_BOXES_ADMIN_ROLE")
const TREASURY_WALLET_ID = ethers.utils.id("TREASURY_WALLET");
const N_BOXES = 2
const BOXES_CONFIG = [[0], [1]]
const LAUNCH_MAX_SUPPLIES = [800, 0]
const TICKET_NAMES = ["Monstropoly MonsterBox", "Monstropoly ComboBox"]
const TICKET_SYMBOLS = ["MMB", "MCB"]
const TICKET_URIS = ["", ""]
const LAUNCHPAD_ADDR = "0x3Bd9dA5eF7f8093CE9F2Ed76BEA101309b1AA825"

const DEV1 = ""
const DEV2 = ""

async function main() {
    await hre.run("compile");

    const signers = await ethers.getSigners()

    console.log("Deploying deployer...")
    const MonstropolyDeployer = await ethers.getContractFactory("MonstropolyDeployer");
    const deployer = await MonstropolyDeployer.deploy({ gasPrice: 10000000000 });
    await deployer.deployed()
    console.log("Deployer:", deployer.address);
    console.log("hardhat verify --network bscmainnet", deployer.address)

    await deployer.setId(TREASURY_WALLET_ID, signers[0].address, { gasPrice: 10000000000 })

    const MonstropolyFactory = await ethers.getContractFactory("MonstropolyFactory")
    const MonstropolyMagicBoxesShop = await ethers.getContractFactory("MonstropolyMagicBoxesShop")

    const emptyInitializeCalldata = MonstropolyFactory.interface.encodeFunctionData("initialize", []);

    console.log("Deploying factory...")
    const factoryImpl = await MonstropolyFactory.deploy({ gasPrice: 10000000000 });
    await factoryImpl.deployed()
    const response1 = await deployer.deployProxyWithImplementation(FACTORY_ID, factoryImpl.address, emptyInitializeCalldata, { gasPrice: 10000000000 })
    await response1.wait()
    const factoryAddress = await deployer.get(FACTORY_ID)
    console.log("Factory:", factoryAddress)
    console.log("hardhat verify --network bscmainnet", factoryImpl.address)
    console.log("hardhat verify --network bscmainnet", factoryAddress, factoryImpl.address, emptyInitializeCalldata)

    console.log("Deploying magic box shop...")
    const response3 = await deployer.deploy(MAGIC_BOXES_ID, MonstropolyMagicBoxesShop.bytecode, emptyInitializeCalldata, { gasPrice: 10000000000 })
    await response3.wait()
    const magicBoxesAddress = await deployer.get(MAGIC_BOXES_ID)
    console.log("MagicBoxesShop:", magicBoxesAddress)
	const implementationEncoded2 = await ethers.provider.getStorageAt(magicBoxesAddress, _IMPLEMENTATION_SLOT)
	const implementation2 = ethers.utils.defaultAbiCoder.decode(["address"], implementationEncoded2)
	const magicBoxesImp = implementation2[0]
    console.log("hardhat verify --network bscmainnet", magicBoxesImp)
    console.log("hardhat verify --network bscmainnet", magicBoxesAddress, magicBoxesImp, emptyInitializeCalldata)

    const myMagicBoxes = MonstropolyMagicBoxesShop.attach(magicBoxesAddress)

    await deployer.grantRole(MAGIC_BOXES_ADMIN_ROLE, signers[0].address, { gasPrice: 10000000000 });
    await myMagicBoxes.updateMagicBox(0, 1, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"), { gasPrice: 10000000000 })
    await myMagicBoxes.updateMagicBox(1, 4, 0, ethers.constants.AddressZero, "0", ethers.utils.parseEther("100"), { gasPrice: 10000000000 })
    console.log("MagicBoxes prices setted...")
    
    await myMagicBoxes.updateBoxSupply(0, 1000, { gasPrice: 10000000000 })
    await myMagicBoxes.updateBoxSupply(1, 1000, { gasPrice: 10000000000 })
    console.log("MagicBoxes supply setted...")

    await deployer.grantRole(MONSTER_MINTER_ROLE, myMagicBoxes.address, { gasPrice: 10000000000 });
    console.log("Minter roles setted...")

    console.log("Deploying nft staking...")
    const MonstropolyNFTStaking = await ethers.getContractFactory("MonstropolyNFTStaking")
    const response4 = await deployer.deploy(NFT_STAKING, MonstropolyNFTStaking.bytecode, emptyInitializeCalldata, { gasPrice: 10000000000 })
    await response4.wait()
    const nftStakingAddress = await deployer.get(NFT_STAKING)
    await deployer.grantRole(MONSTER_LOCKER_ROLE, nftStakingAddress, { gasPrice: 10000000000 })

    console.log("MonstropolyNFTStaking:", nftStakingAddress)

    const implementationEncoded3 = await ethers.provider.getStorageAt(nftStakingAddress, _IMPLEMENTATION_SLOT)
	const implementation3 = ethers.utils.defaultAbiCoder.decode(["address"], implementationEncoded3)

    console.log("Implementation:", implementation3[0])
    console.log("hardhat verify --network bscmainnet ", implementation3[0])
    console.log("hardhat verify --network bscmainnet", nftStakingAddress, implementation3[0], emptyInitializeCalldata)

    console.log("Deploying tickets stuff...")
    const MonstropolyTickets = await ethers.getContractFactory("MonstropolyTickets")
    const ticketsImp = await MonstropolyTickets.deploy({ gasPrice: 10000000000 })
    await ticketsImp.deployed()
    console.log("hardhat verify --network bscmainnet", ticketsImp.address)

    for (let i = 0; i < N_BOXES; i++) {
        const ticketsInitializeCalldata = MonstropolyTickets.interface.encodeFunctionData("initialize", [TICKET_NAMES[i], TICKET_SYMBOLS[i], TICKET_URIS[i], LAUNCH_MAX_SUPPLIES[i], LAUNCHPAD_ADDR]);
        const contractID = ethers.utils.id("TICKETS_" + TICKET_SYMBOLS[i])
        const myProxy = await deployer.deployProxyWithImplementation(contractID, ticketsImp.address, ticketsInitializeCalldata, { gasPrice: 10000000000 })
        await myProxy.wait()
        const ticketAddress = await deployer.get(contractID)
        console.log("hardhat verify --network bscmainnet", ticketAddress, ticketsImp.address, ticketsInitializeCalldata)

        for (let j = 0; j < BOXES_CONFIG[i].length; j++) {
            const response = await myMagicBoxes.updateTicketToBoxId(ticketAddress, BOXES_CONFIG[i][j], true, { gasPrice: 10000000000 })
            await response.wait()
        }
        
        console.log("Ticket:", ticketAddress)

        // TestNet
        await deployer.grantRole(TICKETS_MINTER_ROLE, DEV1, { gasPrice: 10000000000 })
        await deployer.grantRole(TICKETS_MINTER_ROLE, DEV2, { gasPrice: 10000000000 })
    }

    await deployer.renounceRole(MAGIC_BOXES_ADMIN_ROLE, signers[0].address, { gasPrice: 10000000000 });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});