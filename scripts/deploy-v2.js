// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const DATA_ID = ethers.utils.id("DATA");
const FACTORY_ID = ethers.utils.id("FACTORY");
const SCIENCE_ID = ethers.utils.id("SCIENCE");
const MAGIC_BOXES_ID = ethers.utils.id("MAGIC_BOXES");
const UPGRADER_ID = ethers.utils.id("UPGRADER");
const ERC20_ID = ethers.utils.id("ERC20");
const DEPLOYER_ADDR = '0xa5D0A86fBd67166251d33A950c4Beb2683836C24'
const ROUTER_ADDR = ''

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
    let deployer

    if (DEPLOYER_ADDR == ethers.constants.AddressZero) {
        deployer = await DeployerFactory.deploy();
        await deployer.deployed()
    } else {
        deployer = await DeployerFactory.attach(DEPLOYER_ADDR);
    }
    console.log("Deployer:", deployer.address);

    const erc20Factory = await ethers.getContractFactory('MonstropolyERC20')
    const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
    const dataFactory = await ethers.getContractFactory('MonstropolyData')
    const scienceFactory = await ethers.getContractFactory('MonstropolyGenScience')
    const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
    const upgraderFactory = await ethers.getContractFactory('MonstropolyUpgrader')
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
    response = await deployer.deploy(SCIENCE_ID, scienceFactory.bytecode, emptyInitializeCalldata)
    receipt = await response.wait()
    response = await deployer.deploy(MAGIC_BOXES_ID, magicBoxesFactory.bytecode, emptyInitializeCalldata)
    receipt = await response.wait()
    response = await deployer.deploy(UPGRADER_ID, upgraderFactory.bytecode, emptyInitializeCalldata)
    receipt = await response.wait()

    const [data, erc721, science, magicBoxes, upgrader, erc20] = await Promise.all([
        deployer.get(DATA_ID),
        deployer.get(FACTORY_ID),
        deployer.get(SCIENCE_ID),
        deployer.get(MAGIC_BOXES_ID),
        deployer.get(UPGRADER_ID),
        deployer.get(ERC20_ID)
    ])

    console.log("Data:", data);
    console.log("ERC721:", erc721);
    console.log("GenScience:", science);
    console.log("MagicBoxesShop:", magicBoxes);
    console.log("Upgrader:", upgrader);

    // const myBTC = await tokenFactory.deploy('BTCB Token', 'BTCB')
    // await myBTC.deployed();
    // console.log("BTCB:", myBTC.address);

    // const myRouter = await uniswapRouterFactory.attach(ROUTER_ADDR)
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
    const myUniswap = await Uniswap.deploy(myMPOLY.address)

    const Relayer = await ethers.getContractFactory('MonstropolyRelayer')
    const myRelayer = await Relayer.deploy(myUniswap.address)
    const paymaster = await myRelayer.paymaster()

    console.log("Uniswap:", myUniswap.address);
    console.log("Relayer:", myRelayer.address);
    console.log("Paymaster:", paymaster);

    const myMagicBoxes = await magicBoxesFactory.attach(magicBoxes)
    const myUpgrader = await upgraderFactory.attach(upgrader)

    await myMagicBoxes.setTrustedForwarder(myRelayer.address)
    await myUpgrader.setTrustedForwarder(myRelayer.address)

    console.log("Trusted forwarder setted...")

    await myMagicBoxes.updateMagicBox(0, [0], ethers.utils.parseEther('1250'), false)
    await myMagicBoxes.updateMagicBox(1, [1], ethers.utils.parseEther('1250'), false)
    await myMagicBoxes.updateMagicBox(2, [0, 1], ethers.utils.parseEther('2125'), false)
    await myMagicBoxes.updateMagicBox(3, [0, 0, 0, 1, 1, 1], ethers.utils.parseEther('15000'), true)

    console.log('MagicBoxes prices setted...')

    const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
    await deployer.grantRole(MINTER_ROLE, myMagicBoxes.address);
    await deployer.grantRole(MINTER_ROLE, myUpgrader.address);

    console.log('Minter roles setted...')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});