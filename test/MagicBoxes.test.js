const { ethers } = require('hardhat');

const {
	ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { expect } = require('chai')
// const Deployer = artifacts.require('MonstropolyDeployer')
// const MagicBoxes = artifacts.require('MonstropolyMagicBoxesShop')
// const AggregatorMock = artifacts.require('AggregatorMock')
// const ERC20 = artifacts.require('MonstropolyERC20')
// const UniswapFactory = artifacts.require('UniswapV2Factory')
// const UniswapRouter = artifacts.require('UniswapRouter')
// const UniswapPair = artifacts.require('IUniswapV2Pair')
// const WETH = artifacts.require('WETH')
// const DistributionVault = artifacts.require('MonstropolyDistributionVault')
// const Data = artifacts.require('MonstropolyData')
// const Factory = artifacts.require('MonstropolyFactory')
// const Relayer = artifacts.require('MonstropolyRelayer')
// const Uniswap = artifacts.require('UniswapMock')

let myUniswapFactory
let myUniswapRouter
let myWhitelist
let myDeployer
let myAirdrop
let myMagicBoxes
let myErc20
let myBnbUsdFeed
let whitelistTree
let myDistributionVault
let myWETH
let myData, myFactory, myTickets, myRelayer, myUniswap

let accounts

const BNB_PRICE = "50000000000"
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const TREASURY_WALLET = ethers.utils.id('TREASURY_WALLET')
const TICKETS = ethers.utils.id('TICKETS')
const GEN =  '010100030101010303'
const GEN1 = '010100030102010303'
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('MonstropolyMagicBoxesShop', function () {
	let owner, person, person2

	before(async () => {
		accounts = await ethers.getSigners();
		owner = accounts[0]
		person = accounts[1]
		person2 = accounts[2]
		team = accounts[3]
	})
	beforeEach(async () => {
		const MonstropolyTickets = await ethers.getContractFactory('MonstropolyTickets')
        const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy')
        const implementation = await MonstropolyTickets.deploy()
        const initializeCalldata = MonstropolyTickets.interface.encodeFunctionData('initialize', [0, ethers.constants.AddressZero]);
        const myProxy = await ERC1967Proxy.deploy(implementation.address, initializeCalldata)
        myTickets = MonstropolyTickets.attach(myProxy.address)

		const AggregatorMock = await hre.ethers.getContractFactory('AggregatorMock')
		myBnbUsdFeed = await AggregatorMock.deploy()
		await myBnbUsdFeed.initialize(8, BNB_PRICE)

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
		myDeployer = await MonstropolyDeployer.deploy()

		const MonstropolyData = await hre.ethers.getContractFactory('MonstropolyData')
		const MonstropolyMagicBoxesShop = await hre.ethers.getContractFactory('MonstropolyMagicBoxesShop')
		const MonstropolyFactory = await hre.ethers.getContractFactory('MonstropolyFactory')
		const MonstropolyERC20 = await hre.ethers.getContractFactory('MonstropolyERC20')
		let emptyInitializeCalldata = await MonstropolyData.interface.encodeFunctionData('initialize', []);

		await myDeployer.setId(ethers.utils.id("DISTRIBUTION_VAULT"), person.address)
		await myDeployer.setId(ethers.utils.id("TICKETS"), myTickets.address)
		await myDeployer.deploy(ethers.utils.id("ERC20"), MonstropolyERC20.bytecode, emptyInitializeCalldata)
		await myDeployer.deploy(ethers.utils.id("MAGIC_BOXES"), MonstropolyMagicBoxesShop.bytecode, emptyInitializeCalldata)
		await myDeployer.deploy(ethers.utils.id("DATA"), MonstropolyData.bytecode, emptyInitializeCalldata)
        const factoryImp = await MonstropolyFactory.deploy()
        await myDeployer.deployProxyWithImplementation(ethers.utils.id("FACTORY"), factoryImp.address, emptyInitializeCalldata)

		const [erc20, magicBoxes, data, factory] = await Promise.all([
			myDeployer.get(ethers.utils.id("ERC20")),
			myDeployer.get(ethers.utils.id("MAGIC_BOXES")),
			myDeployer.get(ethers.utils.id("DATA")),
			myDeployer.get(ethers.utils.id("FACTORY"))
		])

		myErc20 = await MonstropolyERC20.attach(erc20)
		myMagicBoxes = await MonstropolyMagicBoxesShop.attach(magicBoxes)
		myData = await MonstropolyData.attach(data)
		myFactory = await MonstropolyFactory.attach(factory)

		await myDeployer.grantRole(MINTER_ROLE, myMagicBoxes.address);
        await myDeployer.setId(TREASURY_WALLET, team.address)

		const UniswapV2Factory = await hre.ethers.getContractFactory('UniswapV2Factory')
		const UniswapRouter = await hre.ethers.getContractFactory('UniswapRouter')
		const WETH = await hre.ethers.getContractFactory('WETH')

		myUniswapFactory = await UniswapV2Factory.deploy(owner.address)
		myWETH = await WETH.deploy()
		myRouter = await UniswapRouter.deploy(myUniswapFactory.address, myWETH.address)

		await myErc20.connect(person).approve(myRouter.address, ethers.constants.MaxUint256)

		await myRouter.connect(person).addLiquidityETH(
			myErc20.address,
			ethers.utils.parseEther('12500'),
			ethers.utils.parseEther('12500'),
			ethers.utils.parseEther('1'),
			person.address,
			Date.now(),
			{ value: ethers.utils.parseEther('1') }
		)

		const poolAddress = await myUniswapFactory.getPair(myWETH.address, myErc20.address)
		await myMagicBoxes.updateMagicBox(0, 1, ethers.utils.parseEther('1250'), myErc20.address, ethers.utils.parseEther('20'), ethers.utils.parseEther('80'), 0)
		await myMagicBoxes.updateMagicBox(1, 4, ethers.utils.parseEther('2'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 0)
		await myMagicBoxes.updateMagicBox(2, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 1)
		await myMagicBoxes.updateMagicBox(3, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 2)
		await myMagicBoxes.updateMagicBox(4, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 3)
		await myMagicBoxes.updateMagicBox(5, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'), 4)
		
		await myMagicBoxes.updateBoxSupply(0, 1000)
		await myMagicBoxes.updateBoxSupply(1, 1000)
		await myMagicBoxes.updateBoxSupply(2, 1000)
		await myMagicBoxes.updateBoxSupply(3, 1000)
		await myMagicBoxes.updateBoxSupply(4, 1000)
		await myMagicBoxes.updateBoxSupply(5, 1000)

		await myMagicBoxes.updateTicketToBoxId(myTickets.address, 0, true)
		
		const UniswapMock = await hre.ethers.getContractFactory('UniswapMock')
		const MonstropolyRelayer = await hre.ethers.getContractFactory('MonstropolyRelayer')

        myUniswap = await UniswapMock.deploy(myErc20.address)
		myRelayer = await MonstropolyRelayer.deploy(myUniswap.address)
	})
	describe('MagicBoxes', () => {

		it('can open a box through GSN paying price', async () => {
			//signerWallet
			myErc20 = myErc20.connect(person)
			const paymaster = await myRelayer.paymaster()
			await myMagicBoxes.setTrustedForwarder(myRelayer.address)
			await myErc20.approve(paymaster, ethers.constants.MaxUint256)
			await myErc20.approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			//purchase
			const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
			myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
			myMagicBoxes = myMagicBoxes.connect(person)

			//create meta-tx
			const setRandomData = magicBoxesFactory.interface.encodeFunctionData('setMintParams', [[GEN], [1], [3]])
			const openData = magicBoxesFactory.interface.encodeFunctionData('purchase', ['0'])
			const nonce = await myRelayer.getNonce(person.address)

			//sign
			const domain = {
				name: 'MonstropolyRelayer',
				version: '1',
				chainId: ethers.provider._network.chainId,
				verifyingContract: myRelayer.address
			}

			const types = {
				Execute: [
					{ name: 'from', type: 'address' },
					{ name: 'to', type: 'address' },
					{ name: 'value', type: 'uint256' },
					{ name: 'gas', type: 'uint256' },
					{ name: 'nonce', type: 'uint256' },
					{ name: 'data', type: 'bytes' },
					{ name: 'validUntil', type: 'uint256' }
				]
			}

			const value = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData,
				validUntil: 0
			}
			const signature = await person._signTypedData(domain, types, value);

			const response = await myRelayer.callAndRelay(setRandomData, myMagicBoxes.address, value, signature)
			let owner0 = await myFactory.ownerOf(0)

			expect(owner0).to.eq(person.address)
		})

		it('can open a box through GSN spending a ticket', async () => {
			await myTickets.mint(person.address)
			await myTickets.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			//signerWallet
			myErc20 = myErc20.connect(person)
			const paymaster = await myRelayer.paymaster()
			await myMagicBoxes.setTrustedForwarder(myRelayer.address)
			await myErc20.approve(paymaster, ethers.constants.MaxUint256)

			//purchase
			const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
			myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
			myMagicBoxes = myMagicBoxes.connect(person)

			//create meta-tx
			const setRandomData = magicBoxesFactory.interface.encodeFunctionData('setMintParams', [[GEN], [1], [3]])
			const openData = magicBoxesFactory.interface.encodeFunctionData('purchaseWithTicket', ['0', myTickets.address, '0'])
			const nonce = await myRelayer.getNonce(person.address)

			//sign
			const domain = {
				name: 'MonstropolyRelayer',
				version: '1',
				chainId: ethers.provider._network.chainId,
				verifyingContract: myRelayer.address
			}

			const types = {
				Execute: [
					{ name: 'from', type: 'address' },
					{ name: 'to', type: 'address' },
					{ name: 'value', type: 'uint256' },
					{ name: 'gas', type: 'uint256' },
					{ name: 'nonce', type: 'uint256' },
					{ name: 'data', type: 'bytes' },
					{ name: 'validUntil', type: 'uint256' }
				]
			}

			const value = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData,
				validUntil: 0
			}
			const signature = await person._signTypedData(domain, types, value);

			const response = await myRelayer.callAndRelay(setRandomData, myMagicBoxes.address, value, signature)
			let owner0 = await myFactory.ownerOf(0)

			expect(owner0).to.eq(person.address)
		})

		// it('can open a box through GSN buying amount > 1', async () => {
		// 	//signerWallet
		// 	myErc20 = myErc20.connect(person)
		// 	const paymaster = await myRelayer.paymaster()
		// 	await myMagicBoxes.setTrustedForwarder(myRelayer.address)
		// 	await myErc20.approve(paymaster, ethers.constants.MaxUint256)
		// 	await myErc20.approve(myMagicBoxes.address, ethers.constants.MaxUint256)

		// 	//purchase
		// 	const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
		// 	myMagicBoxes = myMagicBoxes.connect(person)
		// 	let buyAmount = '3'
		// 	await myMagicBoxes.purchase(0, buyAmount)

		// 	//create meta-tx
		// 	const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
		// 	const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
		// 	const openData = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false, RANDOM])
		// 	const nonce = await myRelayer.getNonce(person.address)

		// 	//sign
		// 	const domain = {
		// 		name: 'MonstropolyRelayer',
		// 		version: '1',
		// 		chainId: hre.ethers.provider._network.chainId,
		// 		verifyingContract: myRelayer.address
		// 	}

		// 	const types = {
		// 		Execute: [
		// 			{ name: 'from', type: 'address' },
		// 			{ name: 'to', type: 'address' },
		// 			{ name: 'value', type: 'uint256' },
		// 			{ name: 'gas', type: 'uint256' },
		// 			{ name: 'nonce', type: 'uint256' },
		// 			{ name: 'data', type: 'bytes' },
		// 			{ name: 'validUntil', type: 'uint256' }
		// 		]
		// 	}

		// 	const value = {
		// 		from: person.address,
		// 		to: myMagicBoxes.address,
		// 		value: 0,
		// 		gas: 3000000,
		// 		nonce: nonce.toString(),
		// 		data: openData,
		// 		validUntil: 0
		// 	}

		// 	const signature = await person._signTypedData(domain, types, value);

		// 	let prevBalance = await myMagicBoxes.balances(person.address, false, '0')

		// 	const response = await myRelayer.relay(value, signature)
		// 	let owner0 = await myFactory.ownerOf(0)
		// 	let postBalance = await myMagicBoxes.balances(person.address, false, '0')

		// 	expect(owner0).to.eq(person.address)
		// 	expect(prevBalance.toString()).to.eq(buyAmount)
		// 	expect(postBalance.toString()).to.eq((parseInt(buyAmount) - 1).toString())
		// })

		// it('can open a box of multiple assets through GSN', async () => {
		// 	//signerWallet
		// 	myErc20 = myErc20.connect(person)
		// 	const paymaster = await myRelayer.paymaster()
		// 	await myMagicBoxes.setTrustedForwarder(myRelayer.address)
		// 	await myErc20.approve(paymaster, hre.ethers.constants.MaxUint256)
		// 	await myErc20.approve(myMagicBoxes.address, hre.ethers.constants.MaxUint256)

		// 	//purchase
		// 	const magicBoxesFactory = await hre.ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
		// 	myMagicBoxes = myMagicBoxes.connect(person)
		// 	let buyAmount = '1'
		// 	await myMagicBoxes.purchase(2, buyAmount)

		// 	//create meta-tx
		// 	const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
		// 	const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
		// 	const openData0 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false, RANDOM])
		// 	const openData1 = magicBoxesFactory.interface.encodeFunctionData('open', ['1', false, RANDOM1])
		// 	let nonce = await myRelayer.getNonce(person.address)

		// 	//sign
		// 	const domain = {
		// 		name: 'MonstropolyRelayer',
		// 		version: '1',
		// 		chainId: hre.ethers.provider._network.chainId,
		// 		verifyingContract: myRelayer.address
		// 	}

		// 	const types = {
		// 		Execute: [
		// 			{ name: 'from', type: 'address' },
		// 			{ name: 'to', type: 'address' },
		// 			{ name: 'value', type: 'uint256' },
		// 			{ name: 'gas', type: 'uint256' },
		// 			{ name: 'nonce', type: 'uint256' },
		// 			{ name: 'data', type: 'bytes' },
		// 			{ name: 'validUntil', type: 'uint256' }
		// 		]
		// 	}

		// 	const value0 = {
		// 		from: person.address,
		// 		to: myMagicBoxes.address,
		// 		value: 0,
		// 		gas: 3000000,
		// 		nonce: nonce.toString(),
		// 		data: openData0,
		// 		validUntil: 0
		// 	}

		// 	const signature = await person._signTypedData(domain, types, value0);

		// 	let prevBalance = await myMagicBoxes.balances(person.address, false, '0')

		// 	const response = await myRelayer.relay(value0, signature)
		// 	let owner0 = await myFactory.ownerOf(0)
		// 	let postBalance = await myMagicBoxes.balances(person.address, false, '0')

		// 	expect(owner0).to.eq(person.address)
		// 	expect(prevBalance.toString()).to.eq(buyAmount)
		// 	expect(postBalance.toString()).to.eq((parseInt(buyAmount) - 1).toString())

		// 	nonce = await myRelayer.getNonce(person.address)

		// 	const value1 = {
		// 		from: person.address,
		// 		to: myMagicBoxes.address,
		// 		value: 0,
		// 		gas: 3000000,
		// 		nonce: nonce.toString(),
		// 		data: openData1,
		// 		validUntil: 0
		// 	}

		// 	const signature1 = await person._signTypedData(domain, types, value1);

		// 	let prevBalance1 = await myMagicBoxes.balances(person.address, false, '1')

		// 	await myRelayer.relay(value1, signature1)
		// 	let owner1 = await myFactory.ownerOf(1)
		// 	let postBalance1 = await myMagicBoxes.balances(person.address, false, '1')

		// 	expect(owner1).to.eq(person.address)
		// 	expect(prevBalance1.toString()).to.eq(buyAmount)
		// 	expect(postBalance1.toString()).to.eq((parseInt(buyAmount) - 1).toString())
		// })

		// it('can open a box of multiple assets through GSN buying amount > 1', async () => {
		// 	//signerWallet
		// 	myErc20 = myErc20.connect(person)
		// 	const paymaster = await myRelayer.paymaster()
		// 	await myMagicBoxes.setTrustedForwarder(myRelayer.address)
		// 	await myErc20.approve(paymaster, hre.ethers.constants.MaxUint256)
		// 	await myErc20.approve(myMagicBoxes.address, hre.ethers.constants.MaxUint256)

		// 	//purchase
		// 	const magicBoxesFactory = await hre.ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
		// 	myMagicBoxes = myMagicBoxes.connect(person)
		// 	let buyAmount = '3'
		// 	await myMagicBoxes.purchase(2, buyAmount)

		// 	//create meta-tx
		// 	const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
		// 	const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
		// 	const setRandomData1 = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM1])
		// 	const openData0 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false, RANDOM])
		// 	const openData1 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false, RANDOM1])
		// 	let nonce = await myRelayer.getNonce(person.address)

		// 	//sign
		// 	const domain = {
		// 		name: 'MonstropolyRelayer',
		// 		version: '1',
		// 		chainId: hre.ethers.provider._network.chainId,
		// 		verifyingContract: myRelayer.address
		// 	}

		// 	const types = {
		// 		Execute: [
		// 			{ name: 'from', type: 'address' },
		// 			{ name: 'to', type: 'address' },
		// 			{ name: 'value', type: 'uint256' },
		// 			{ name: 'gas', type: 'uint256' },
		// 			{ name: 'nonce', type: 'uint256' },
		// 			{ name: 'data', type: 'bytes' },
		// 			{ name: 'validUntil', type: 'uint256' }
		// 		]
		// 	}

		// 	const value0 = {
		// 		from: person.address,
		// 		to: myMagicBoxes.address,
		// 		value: 0,
		// 		gas: 3000000,
		// 		nonce: nonce.toString(),
		// 		data: openData0,
		// 		validUntil: 0
		// 	}

		// 	const signature = await person._signTypedData(domain, types, value0);

		// 	let prevBalance = await myMagicBoxes.balances(person.address, false, '0')

		// 	const response = await myRelayer.relay(value0, signature)
		// 	let owner0 = await myFactory.ownerOf(0)
		// 	let postBalance = await myMagicBoxes.balances(person.address, false, '0')

		// 	expect(owner0).to.eq(person.address)
		// 	expect(prevBalance.toString()).to.eq(buyAmount)
		// 	expect(postBalance.toString()).to.eq((parseInt(buyAmount) - 1).toString())

		// 	nonce = await myRelayer.getNonce(person.address)

		// 	const value1 = {
		// 		from: person.address,
		// 		to: myMagicBoxes.address,
		// 		value: 0,
		// 		gas: 3000000,
		// 		nonce: nonce.toString(),
		// 		data: openData1,
		// 		validUntil: 0
		// 	}

		// 	const signature1 = await person._signTypedData(domain, types, value1);

		// 	let prevBalance1 = await myMagicBoxes.balances(person.address, false, '0')

		// 	await myRelayer.relay(value1, signature1)
		// 	let owner1 = await myFactory.ownerOf(1)
		// 	let postBalance1 = await myMagicBoxes.balances(person.address, false, '0')

		// 	expect(owner1).to.eq(person.address)
		// 	expect(prevBalance1.toString()).to.eq((parseInt(buyAmount) - 1).toString())
		// 	expect(postBalance1.toString()).to.eq((parseInt(buyAmount) - 2).toString())
		// })

		// it('can open a boxVIP of multiple assets through GSN buying amount > 1', async () => {
		// 	//signerWallet
		// 	myErc20 = myErc20.connect(person)
		// 	const paymaster = await myRelayer.paymaster()
		// 	await myMagicBoxes.setTrustedForwarder(myRelayer.address)
		// 	await myErc20.approve(paymaster, ethers.constants.MaxUint256)
		// 	await myErc20.approve(myMagicBoxes.address, ethers.constants.MaxUint256)

		// 	//purchase
		// 	const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
		// 	myMagicBoxes = myMagicBoxes.connect(person)
		// 	let buyAmount = '2'
        //     let value = ethers.utils.parseEther('3.26')
		// 	await myMagicBoxes.purchase(3, buyAmount, { value: value })

		// 	//create meta-tx
		// 	const ScienceFactory = await ethers.getContractFactory('MonstropolyGenScience')
		// 	const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
		// 	const setRandomData1 = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM1])
		// 	const openData0 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', true, RANDOM])
		// 	const openData1 = magicBoxesFactory.interface.encodeFunctionData('open', ['1', true, RANDOM1])
		// 	let nonce = await myRelayer.getNonce(person.address)

		// 	//sign
		// 	const domain = {
		// 		name: 'MonstropolyRelayer',
		// 		version: '1',
		// 		chainId: hre.ethers.provider._network.chainId,
		// 		verifyingContract: myRelayer.address
		// 	}

		// 	const types = {
		// 		Execute: [
		// 			{ name: 'from', type: 'address' },
		// 			{ name: 'to', type: 'address' },
		// 			{ name: 'value', type: 'uint256' },
		// 			{ name: 'gas', type: 'uint256' },
		// 			{ name: 'nonce', type: 'uint256' },
		// 			{ name: 'data', type: 'bytes' },
		// 			{ name: 'validUntil', type: 'uint256' }
		// 		]
		// 	}

		// 	const value0 = {
		// 		from: person.address,
		// 		to: myMagicBoxes.address,
		// 		value: 0,
		// 		gas: 3000000,
		// 		nonce: nonce.toString(),
		// 		data: openData0,
		// 		validUntil: 0
		// 	}

		// 	const signature = await person._signTypedData(domain, types, value0);

		// 	let prevBalance = await myMagicBoxes.balances(person.address, true, '0')

		// 	const response = await myRelayer.relay(value0, signature)
		// 	let owner0 = await myFactory.ownerOf(0)
		// 	let postBalance = await myMagicBoxes.balances(person.address, true, '0')

		// 	expect(owner0).to.eq(person.address)
		// 	expect(prevBalance.toString()).to.eq((parseInt(buyAmount)*3).toString())
		// 	expect(postBalance.toString()).to.eq((parseInt(buyAmount)*3 - 1).toString())

		// 	nonce = await myRelayer.getNonce(person.address)

		// 	const value1 = {
		// 		from: person.address,
		// 		to: myMagicBoxes.address,
		// 		value: 0,
		// 		gas: 3000000,
		// 		nonce: nonce.toString(),
		// 		data: openData1,
		// 		validUntil: 0
		// 	}

		// 	const signature1 = await person._signTypedData(domain, types, value1);

		// 	let prevBalance1 = await myMagicBoxes.balances(person.address, true, '1')

		// 	await myRelayer.relay(value1, signature1)
		// 	let owner1 = await myFactory.ownerOf(1)
		// 	let postBalance1 = await myMagicBoxes.balances(person.address, true, '1')

		// 	expect(owner1).to.eq(person.address)
		// 	expect(prevBalance1.toString()).to.eq((parseInt(buyAmount)*3).toString())
		// 	expect(postBalance1.toString()).to.eq((parseInt(buyAmount)*3 - 1).toString())
		// })

        // it('can updateMagicBox', async () => {
        //     let boxId = 0
        //     let newAssets = [1,0]
        //     let newPrice = ether('777')
        //     let newBurnPercentage = ether('40')
        //     let newTreasuryPercentage = ether('60')
        //     let newTokenAddress = person.address
        //     let newVip = true
        //     await myMagicBoxes.updateMagicBox(boxId, newAssets, newPrice, newTokenAddress, newBurnPercentage, newTreasuryPercentage, newVip)
        //     let box = await myMagicBoxes.box(boxId)
        //     expect(box.price.toString()).to.equal(newPrice.toString())
        //     expect(box.burnPercentage.toString()).to.equal(newBurnPercentage.toString())
        //     expect(box.treasuryPercentage.toString()).to.equal(newTreasuryPercentage.toString())
        //     expect(box.token).to.equal(newTokenAddress)
        //     expect(box.vip).to.equal(newVip)
		// })

        // it('only default admin role can updateMagicBox', async () => {
        //     let boxId = 0
        //     let newAssets = [1,0]
        //     let newPrice = ethers.utils.parseEther('777')
        //     let newBurnPercentage = ethers.utils.parseEther('40')
        //     let newTreasuryPercentage = ethers.utils.parseEther('60')
        //     let newTokenAddress = person.address
        //     let newVip = true
        //     const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
        //     await expectRevert(
        //         (await myMagicBoxes.connect(person)).updateMagicBox(boxId, newAssets, newPrice, newTokenAddress, newBurnPercentage, newTreasuryPercentage, newVip),
        //         'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
        //     )
		// })

        // it('updateMagicBox reverts if wrong percentages', async () => {
        //     let boxId = 0
        //     let newAssets = [1,0]
        //     let newPrice = ether('777')
        //     let newBurnPercentage = ether('70')
        //     let newTreasuryPercentage = ether('60')
        //     let newTokenAddress = person.address
        //     let newVip = true
        //     await expectRevert(
        //         myMagicBoxes.updateMagicBox(boxId, newAssets, newPrice, newTokenAddress, newBurnPercentage, newTreasuryPercentage, newVip),
        //         'MonstropolyMagicBoxesShop: wrong percentages'
        //     )
		// })

        // it('reverts if trying to buy an inexistent box', async () => {
		// 	//signerWallet
		// 	myErc20 = myErc20.connect(person)
		// 	const paymaster = await myRelayer.paymaster()
		// 	await myMagicBoxes.setTrustedForwarder(myRelayer.address)
		// 	await myErc20.approve(paymaster, ethers.constants.MaxUint256)
		// 	await myErc20.approve(myMagicBoxes.address, ethers.constants.MaxUint256)

		// 	//purchase
		// 	const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
		// 	myMagicBoxes = myMagicBoxes.connect(person)
        //     await expectRevert(
        //         myMagicBoxes.purchase(4, 1),
        //         'MonstropolyMagicBoxesShop: wrong 0 price'
        //     )
		// })

        // it('reverts if trying to buy a box with price 0', async () => {
		// 	//signerWallet
		// 	myErc20 = myErc20.connect(person)
		// 	const paymaster = await myRelayer.paymaster()
		// 	await myMagicBoxes.setTrustedForwarder(myRelayer.address)
		// 	await myErc20.approve(paymaster, ethers.constants.MaxUint256)
		// 	await myErc20.approve(myMagicBoxes.address, ethers.constants.MaxUint256)

		// 	//purchase
		//     await myMagicBoxes.updateMagicBox(0, [0], ether('0'), myErc20.address, ether('20'), ether('80'), false)
        //     await expectRevert(
        //         myMagicBoxes.purchase(0, 1),
        //         'MonstropolyMagicBoxesShop: wrong 0 price'
        //     )
		// })

        // it('reverts if trying to buy a box with amount 0', async () => {
		// 	//signerWallet
		// 	myErc20 = myErc20.connect(person)
		// 	const paymaster = await myRelayer.paymaster()
		// 	await myMagicBoxes.setTrustedForwarder(myRelayer.address)
		// 	await myErc20.approve(paymaster, ethers.constants.MaxUint256)
		// 	await myErc20.approve(myMagicBoxes.address, ethers.constants.MaxUint256)

		// 	//purchase
		// 	const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
		// 	myMagicBoxes = myMagicBoxes.connect(person)
        //     await expectRevert(
        //         myMagicBoxes.purchase(0, 0),
        //         'MonstropolyMagicBoxesShop: wrong 0 price'
        //     )
		// })

        // it('reverts if trying to open without balance', async () => {
        //     await expectRevert(
        //         myMagicBoxes.open(0, false, RANDOM),
        //         'MonstropolyMagicBoxesShop: amount exceeds balance'
        //     )
		// })
	})
})