const { getWhitelistTree, solKeccak256 } = require('../utils/whitelistTree')
const { ethers } = require('hardhat');

const {
	ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { expect } = require('chai')
const Deployer = artifacts.require('MonstropolyDeployer')
const MagicBoxes = artifacts.require('MonstropolyMagicBoxesShop')
const AggregatorMock = artifacts.require('AggregatorMock')
const ERC20 = artifacts.require('MonstropolyERC20')
const UniswapFactory = artifacts.require('UniswapV2Factory')
const UniswapRouter = artifacts.require('UniswapRouter')
const UniswapPair = artifacts.require('IUniswapV2Pair')
const WETH = artifacts.require('WETH')
const DistributionVault = artifacts.require('MonstropolyDistributionVault')
const Data = artifacts.require('MonstropolyData')
const Factory = artifacts.require('MonstropolyFactory')
const Science = artifacts.require('MonstropolyGenScience')
const Relayer = artifacts.require('MonstropolyRelayer')
const Uniswap = artifacts.require('UniswapMock')

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
let myData, myFactory, myScience, myRelayer, myUniswap

let accounts

const BNB_PRICE = "50000000000"
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const TREASURY_WALLET = ethers.utils.id('TREASURY_WALLET')
const RANDOM =  '00002718C938632B498890'
const RANDOM1 = '00002718C938622B498A90'
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('MonstropolyMagicBoxesShop', function () {
	let owner, person, person2

	before(async () => {
		await hre.run('compile')
		accounts = await ethers.getSigners();
		owner = accounts[0]
		person = accounts[1]
		person2 = accounts[2]
		team = accounts[3]

		const whitelistArray = [
			owner.address,
			person.address
		]

		whitelistTree = getWhitelistTree(whitelistArray).toJSON()
	})
	beforeEach(async () => {
		myBnbUsdFeed = await AggregatorMock.new()
		await myBnbUsdFeed.initialize(8, BNB_PRICE)

		myDeployer = await Deployer.new()

		const dataFactory = await hre.ethers.getContractFactory('MonstropolyData')
		let emptyInitializeCalldata = await dataFactory.interface.encodeFunctionData('initialize', []);

		await myDeployer.setId(solKeccak256("DISTRIBUTION_VAULT"), person.address)
		await myDeployer.deploy(solKeccak256("ERC20"), ERC20.bytecode, emptyInitializeCalldata)
		await myDeployer.deploy(solKeccak256("MAGIC_BOXES"), MagicBoxes.bytecode, emptyInitializeCalldata)
		await myDeployer.deploy(solKeccak256("DATA"), Data.bytecode, emptyInitializeCalldata)
		await myDeployer.deploy(solKeccak256("FACTORY"), Factory.bytecode, emptyInitializeCalldata)
		await myDeployer.deploy(solKeccak256("SCIENCE"), Science.bytecode, emptyInitializeCalldata)

		const [erc20, magicBoxes, data, factory, science] = await Promise.all([
			myDeployer.get(solKeccak256("ERC20")),
			myDeployer.get(solKeccak256("MAGIC_BOXES")),
			myDeployer.get(solKeccak256("DATA")),
			myDeployer.get(solKeccak256("FACTORY")),
			myDeployer.get(solKeccak256("SCIENCE"))
		])

		myErc20 = await ethers.getContractAt('MonstropolyERC20', erc20)
		myMagicBoxes = await MagicBoxes.at(magicBoxes)
		myData = await Data.at(data)
		myFactory = await Factory.at(factory)
		myScience = await Science.at(science)

		await myDeployer.grantRole(MINTER_ROLE, myMagicBoxes.address);
        await myDeployer.setId(TREASURY_WALLET, team.address)

		myUniswapFactory = await UniswapFactory.new(owner.address)
		myWETH = await WETH.new()
		myRouter = await UniswapRouter.new(myUniswapFactory.address, myWETH.address)
		myRouter = await ethers.getContractAt('UniswapRouter', myRouter.address)

		await (await myErc20.connect(person)).approve(myRouter.address, ethers.constants.MaxUint256)

		await (await myRouter.connect(person)).addLiquidityETH(
			myErc20.address,
			ethers.utils.parseEther('12500'),
			ethers.utils.parseEther('12500'),
			ethers.utils.parseEther('1'),
			person.address,
			Date.now(),
			{ value: ethers.utils.parseEther('1') }
		)

		const poolAddress = await myUniswapFactory.getPair(myWETH.address, myErc20.address)

		await myMagicBoxes.updateMagicBox(0, [0], ether('1250'), myErc20.address, ether('20'), ether('80'), false)
		await myMagicBoxes.updateMagicBox(1, [1], ether('1250'), myErc20.address, ether('20'), ether('80'), false)
		await myMagicBoxes.updateMagicBox(2, [0, 1], ether('2125'), myErc20.address, ether('20'), ether('80'), false)
		await myMagicBoxes.updateMagicBox(3, [0, 0, 0, 1, 1, 1], ether('1.63'), ethers.constants.AddressZero, '0', ether('100'), true)
		myUniswap = await Uniswap.new(myErc20.address)
		myRelayer = await Relayer.new(myUniswap.address)
	})
	describe('MagicBoxes', () => {
		// it('can purchase a box', async () => {
		// 	await (await myErc20.connect(person)).approve(myMagicBoxes.address, ethers.constants.MaxUint256)
		// 	const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
		// 	myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
		// 	const response = await (await myMagicBoxes.connect(person)).purchase(0, 1)
		// 	//TBD: find how to do it in a tx with ethers
        //     // expectEvent(response, 'MagicBoxPurchased', {
		// 	// 	account: person,
		// 	// 	id: '0',
		// 	// 	amount: '1'
		// 	// })
		// })

		it('can open a box through GSN', async () => {
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
			// await myMagicBoxes.purchase(0, 1)

			//create meta-tx
			const setRandomData = magicBoxesFactory.interface.encodeFunctionData('setGenetics', [[RANDOM]])
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
