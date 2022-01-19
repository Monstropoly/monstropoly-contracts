const { getWhitelistTree, solKeccak256 } = require('../utils/whitelistTree')
const { ethers } = require('hardhat');

const {
	ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')
const { artifacts } = require('hardhat')
const { BigNumber } = require('@ethersproject/bignumber')
const { expect } = require('chai')
const { formatEther, formatUnits } = require('@ethersproject/units')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { MAX_UINT256 } = require('@openzeppelin/test-helpers/src/constants')
const Deployer = artifacts.require('MonstropolyDeployer')
const Whitelist = artifacts.require('MonstropolyWhitelist')
const Airdrop = artifacts.require('MonstropolyAirdrop')
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
const RANDOM =  '748398223409078271829384132948734346321498890831874398135738578741832983748391111111111111111111987654987654987654987654'
const RANDOM1 = '748398223409078271829384132948734346321498890831874398135738578741832983748398134791348010684586001613748386163847501638'

describe('MonstropolyMagicBoxesShop', function () {
	let owner, person, person2

	before(async () => {
		await hre.run('compile')
		accounts = await ethers.getSigners();
		owner = accounts[0]
		person = accounts[1]
		person2 = accounts[2]

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

		await myMagicBoxes.updateMagicBox(0, [0], ether('1250'), false)
		await myMagicBoxes.updateMagicBox(1, [1], ether('1250'), false)
		await myMagicBoxes.updateMagicBox(2, [0, 1], ether('2125'), false)
		await myMagicBoxes.updateMagicBox(3, [0, 0, 0, 1, 1, 1], ether('15000'), true)
		await myMagicBoxes.updateFeeds(myBnbUsdFeed.address, poolAddress)
		myUniswap = await Uniswap.new(myErc20.address)
		myRelayer = await Relayer.new(myUniswap.address)
	})
	describe('MagicBoxes', () => {
		it('can purchase a box', async () => {
			await (await myErc20.connect(person)).approve(myMagicBoxes.address, ethers.constants.MaxUint256)
			const magicBoxesFactory = await ethers.getContractFactory('MonstropolyMagicBoxesShop')
			myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
			const response = await (await myMagicBoxes.connect(person)).purchase(0, 1)
			//TBD: find how to do it in a tx with ethers
            // expectEvent(response, 'MagicBoxPurchased', {
			// 	account: person,
			// 	id: '0',
			// 	amount: '1'
			// })
		})

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
			await myMagicBoxes.purchase(0, 1)

			//create meta-tx
			const ScienceFactory = await ethers.getContractFactory('MonstropolyGenScience')
			const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
			const openData = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false])
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

			let prevBalance = await myMagicBoxes.balances(person.address, false, '0')

			const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value, signature)
			let owner0 = await myFactory.ownerOf(0)
			let postBalance = await myMagicBoxes.balances(person.address, false, '0')

			expect(owner0).to.eq(person.address)
			expect(prevBalance.toString()).to.eq('1')
			expect(postBalance.toString()).to.eq('0')
		})

		it('can open a box through GSN buying amount > 1', async () => {
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
			let buyAmount = '3'
			await myMagicBoxes.purchase(0, buyAmount)

			//create meta-tx
			const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
			const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
			const openData = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false])
			const nonce = await myRelayer.getNonce(person.address)

			//sign
			const domain = {
				name: 'MonstropolyRelayer',
				version: '1',
				chainId: hre.ethers.provider._network.chainId,
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

			let prevBalance = await myMagicBoxes.balances(person.address, false, '0')

			const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value, signature)
			let owner0 = await myFactory.ownerOf(0)
			let postBalance = await myMagicBoxes.balances(person.address, false, '0')

			expect(owner0).to.eq(person.address)
			expect(prevBalance.toString()).to.eq(buyAmount)
			expect(postBalance.toString()).to.eq((parseInt(buyAmount) - 1).toString())
		})

		it('can open a box of multiple assets through GSN', async () => {
			//signerWallet
			myErc20 = myErc20.connect(person)
			const paymaster = await myRelayer.paymaster()
			await myMagicBoxes.setTrustedForwarder(myRelayer.address)
			await myErc20.approve(paymaster, hre.ethers.constants.MaxUint256)
			await myErc20.approve(myMagicBoxes.address, hre.ethers.constants.MaxUint256)

			//purchase
			const magicBoxesFactory = await hre.ethers.getContractFactory('MonstropolyMagicBoxesShop')
			myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
			myMagicBoxes = myMagicBoxes.connect(person)
			let buyAmount = '1'
			await myMagicBoxes.purchase(2, buyAmount)

			//create meta-tx
			const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
			const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
			const openData0 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false])
			const openData1 = magicBoxesFactory.interface.encodeFunctionData('open', ['1', false])
			let nonce = await myRelayer.getNonce(person.address)

			//sign
			const domain = {
				name: 'MonstropolyRelayer',
				version: '1',
				chainId: hre.ethers.provider._network.chainId,
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

			const value0 = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData0,
				validUntil: 0
			}

			const signature = await person._signTypedData(domain, types, value0);

			let prevBalance = await myMagicBoxes.balances(person.address, false, '0')

			const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value0, signature)
			let owner0 = await myFactory.ownerOf(0)
			let postBalance = await myMagicBoxes.balances(person.address, false, '0')

			expect(owner0).to.eq(person.address)
			expect(prevBalance.toString()).to.eq(buyAmount)
			expect(postBalance.toString()).to.eq((parseInt(buyAmount) - 1).toString())

			nonce = await myRelayer.getNonce(person.address)

			const value1 = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData1,
				validUntil: 0
			}

			const signature1 = await person._signTypedData(domain, types, value1);

			let prevBalance1 = await myMagicBoxes.balances(person.address, false, '1')

			await myRelayer.callAndRelay(setRandomData, myScience.address, value1, signature1)
			let owner1 = await myFactory.ownerOf(1)
			let postBalance1 = await myMagicBoxes.balances(person.address, false, '1')

			expect(owner1).to.eq(person.address)
			expect(prevBalance1.toString()).to.eq(buyAmount)
			expect(postBalance1.toString()).to.eq((parseInt(buyAmount) - 1).toString())
		})

		it('can open a box of multiple assets through GSN buying amount > 1', async () => {
			//signerWallet
			myErc20 = myErc20.connect(person)
			const paymaster = await myRelayer.paymaster()
			await myMagicBoxes.setTrustedForwarder(myRelayer.address)
			await myErc20.approve(paymaster, hre.ethers.constants.MaxUint256)
			await myErc20.approve(myMagicBoxes.address, hre.ethers.constants.MaxUint256)

			//purchase
			const magicBoxesFactory = await hre.ethers.getContractFactory('MonstropolyMagicBoxesShop')
			myMagicBoxes = magicBoxesFactory.attach(myMagicBoxes.address)
			myMagicBoxes = myMagicBoxes.connect(person)
			let buyAmount = '3'
			await myMagicBoxes.purchase(2, buyAmount)

			//create meta-tx
			const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
			const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
			const setRandomData1 = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM1])
			const openData0 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false])
			const openData1 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', false])
			let nonce = await myRelayer.getNonce(person.address)

			//sign
			const domain = {
				name: 'MonstropolyRelayer',
				version: '1',
				chainId: hre.ethers.provider._network.chainId,
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

			const value0 = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData0,
				validUntil: 0
			}

			const signature = await person._signTypedData(domain, types, value0);

			let prevBalance = await myMagicBoxes.balances(person.address, false, '0')

			const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value0, signature)
			let owner0 = await myFactory.ownerOf(0)
			let postBalance = await myMagicBoxes.balances(person.address, false, '0')

			expect(owner0).to.eq(person.address)
			expect(prevBalance.toString()).to.eq(buyAmount)
			expect(postBalance.toString()).to.eq((parseInt(buyAmount) - 1).toString())

			nonce = await myRelayer.getNonce(person.address)

			const value1 = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData1,
				validUntil: 0
			}

			const signature1 = await person._signTypedData(domain, types, value1);

			let prevBalance1 = await myMagicBoxes.balances(person.address, false, '0')

			await myRelayer.callAndRelay(setRandomData1, myScience.address, value1, signature1)
			let owner1 = await myFactory.ownerOf(1)
			let postBalance1 = await myMagicBoxes.balances(person.address, false, '0')

			expect(owner1).to.eq(person.address)
			expect(prevBalance1.toString()).to.eq((parseInt(buyAmount) - 1).toString())
			expect(postBalance1.toString()).to.eq((parseInt(buyAmount) - 2).toString())
		})

		it('can open a boxVIP of multiple assets through GSN buying amount > 1', async () => {
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
			let buyAmount = '2'
			await myMagicBoxes.purchase(3, buyAmount)

			//create meta-tx
			const ScienceFactory = await ethers.getContractFactory('MonstropolyGenScience')
			const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM])
			const setRandomData1 = ScienceFactory.interface.encodeFunctionData('setRandom', [RANDOM1])
			const openData0 = magicBoxesFactory.interface.encodeFunctionData('open', ['0', true])
			const openData1 = magicBoxesFactory.interface.encodeFunctionData('open', ['1', true])
			let nonce = await myRelayer.getNonce(person.address)

			//sign
			const domain = {
				name: 'MonstropolyRelayer',
				version: '1',
				chainId: hre.ethers.provider._network.chainId,
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

			const value0 = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData0,
				validUntil: 0
			}

			const signature = await person._signTypedData(domain, types, value0);

			let prevBalance = await myMagicBoxes.balances(person.address, true, '0')

			const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value0, signature)
			let owner0 = await myFactory.ownerOf(0)
			let postBalance = await myMagicBoxes.balances(person.address, true, '0')

			expect(owner0).to.eq(person.address)
			expect(prevBalance.toString()).to.eq((parseInt(buyAmount)*3).toString())
			expect(postBalance.toString()).to.eq((parseInt(buyAmount)*3 - 1).toString())

			nonce = await myRelayer.getNonce(person.address)

			const value1 = {
				from: person.address,
				to: myMagicBoxes.address,
				value: 0,
				gas: 3000000,
				nonce: nonce.toString(),
				data: openData1,
				validUntil: 0
			}

			const signature1 = await person._signTypedData(domain, types, value1);

			let prevBalance1 = await myMagicBoxes.balances(person.address, true, '1')

			await myRelayer.callAndRelay(setRandomData1, myScience.address, value1, signature1)
			let owner1 = await myFactory.ownerOf(1)
			let postBalance1 = await myMagicBoxes.balances(person.address, true, '1')

			expect(owner1).to.eq(person.address)
			expect(prevBalance1.toString()).to.eq((parseInt(buyAmount)*3).toString())
			expect(postBalance1.toString()).to.eq((parseInt(buyAmount)*3 - 1).toString())
		})
	})
})
