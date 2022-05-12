// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const DATA_ID = ethers.utils.id("DATA");
const FACTORY_ID = ethers.utils.id("FACTORY");
const MAGIC_BOXES_ID = ethers.utils.id("MAGIC_BOXES");
const UPGRADER_ID = ethers.utils.id("UPGRADER");
const ERC20_ID = ethers.utils.id("ERC20");
const TREASURY_WALLET_ID = ethers.utils.id("TREASURY_WALLET");
const DEPLOYER_ADDR = '0x0000000000000000000000000000000000000000'
const MANAGER_OLD = '0xC868BFB5e1B9cE9D6728175aC9Dd4F632efCf210'
const TREASURY_WALLET = '0xcd7669aafffb7f683995e6ed9b53d1e5fe72c142'
const RELAYER_ADDR = '0x78Fa325d3Ac89EccDBff65cEA1C89463D4FCC31f'

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
    let deployer, oldDeployer

    if (DEPLOYER_ADDR == ethers.constants.AddressZero) {
        deployer = await DeployerFactory.deploy();
        await deployer.deployed()
    } else {
        deployer = await DeployerFactory.attach(DEPLOYER_ADDR);
    }

    oldDeployer = await DeployerFactory.attach(MANAGER_OLD);
    console.log("Deployer:", deployer.address);

    const erc20Factory = await ethers.getContractFactory('MonstropolyERC20')
    const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
    const dataFactory = await ethers.getContractFactory('MonstropolyData')
    const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
    // const upgraderFactory = await ethers.getContractFactory('MonstropolyUpgrader')
    const tokenFactory = await ethers.getContractFactory('Token')
    const uniswapRouterFactory = await ethers.getContractFactory('UniswapV2Router02')
    const uniswapFactory = await ethers.getContractFactory('UniswapV2Factory')

    let emptyInitializeCalldata = await dataFactory.interface.encodeFunctionData('initialize', []);

    let response = await deployer.deploy(FACTORY_ID, erc721Factory.bytecode, emptyInitializeCalldata)
    let receipt = await response.wait()
    // response = await deployer.deploy(DATA_ID, dataFactory.bytecode, emptyInitializeCalldata)
    // workaround initialize call giving some problem
    const dataImpl = await dataFactory.deploy();
    response = await deployer.deployProxyWithImplementation(DATA_ID, dataImpl.address, emptyInitializeCalldata)
    await dataImpl.deployed()
    receipt = await response.wait()
    response = await deployer.deploy(MAGIC_BOXES_ID, magicBoxesFactory.bytecode, emptyInitializeCalldata)
    receipt = await response.wait()
    // response = await deployer.deploy(UPGRADER_ID, upgraderFactory.bytecode, emptyInitializeCalldata)
    // receipt = await response.wait()
    response = await deployer.setId(TREASURY_WALLET_ID, TREASURY_WALLET)
    receipt = await response.wait()

    let [data, erc721, magicBoxes, upgrader, erc20] = await Promise.all([
        deployer.get(DATA_ID),
        deployer.get(FACTORY_ID),
        deployer.get(MAGIC_BOXES_ID),
        deployer.get(UPGRADER_ID),
        deployer.get(ERC20_ID)
    ])

    console.log("Data:", data);
    console.log("ERC721:", erc721);
    console.log("MagicBoxesShop:", magicBoxes);
    // console.log("Upgrader:", upgrader);

    // const myBTC = await tokenFactory.deploy('BTCB Token', 'BTCB')
    // await myBTC.deployed();
    // console.log("BTCB:", myBTC.address);

    // const myRouter = await uniswapRouterFactory.attach(ROUTER_ADDR)

    if (erc20 == ethers.constants.AddressZero) erc20 = await oldDeployer.get(ERC20_ID)
    const myMPOLY = await erc20Factory.attach(erc20)

    // const ADD_AMOUNT_MPOLY = ethers.utils.parseEther('')
    // const ADD_AMOUNT_WBTC = ethers.utils.parseEther('')

    // await myRouter.addLiquidity(
    //     myMPOLY.address,
    //     myBTC.address,
    //     ADD_AMOUNT_MPOLY,
    //     ADD_AMOUNT_WBTC,
    //     ADD_AMOUNT_MPOLY,
    //     ADD_AMOUNT_WBTC,
    //     signers[0].address,
    //     Date.now()
    // )

    // const pairAddress = await uniswapFactory.getPair(myMPOLY.address, myBTC.address)
    // console.log("Pool:", pairAddress);

    const Uniswap = await ethers.getContractFactory('UniswapMock')
    const myUniswap = await Uniswap.deploy(erc20)

    const Relayer = await ethers.getContractFactory('MonstropolyRelayer')
    let myRelayer
    if (RELAYER_ADDR == ethers.constants.AddressZero) {
        myRelayer = await Relayer.deploy(myUniswap.address)
    } else {
        myRelayer = await Relayer.attach(RELAYER_ADDR);
    }

    const paymaster = await myRelayer.paymaster()

    console.log("Uniswap:", myUniswap.address);
    console.log("Relayer:", myRelayer.address);
    console.log("Paymaster:", paymaster);

    const myMagicBoxes = await magicBoxesFactory.attach(magicBoxes)
    // const myUpgrader = await upgraderFactory.attach(upgrader)

    await myMagicBoxes.setTrustedForwarder(myRelayer.address)
    // await myUpgrader.setTrustedForwarder(myRelayer.address)

    console.log("Trusted forwarder setted...")

    await myMagicBoxes.updateMagicBox(0, 1, ethers.utils.parseEther('1250'), myMPOLY.address, ethers.utils.parseEther('20'), ethers.utils.parseEther('80'), 0)
    await myMagicBoxes.updateMagicBox(1, 4, ethers.utils.parseEther('2'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 0)
    await myMagicBoxes.updateMagicBox(2, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 1)
    await myMagicBoxes.updateMagicBox(3, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 2)
    await myMagicBoxes.updateMagicBox(4, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 3)
    await myMagicBoxes.updateMagicBox(5, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 4)
    
    console.log('MagicBoxes prices setted...')

    const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
    await deployer.grantRole(MINTER_ROLE, myMagicBoxes.address);
    // await deployer.grantRole(MINTER_ROLE, myUpgrader.address);

    console.log('Minter roles setted...')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});