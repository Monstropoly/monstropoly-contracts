const { getWhitelistTree, solKeccak256 } = require('../utils/whitelistTree')
const hre = require('hardhat')

const {
	ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')
const { artifacts } = require('hardhat')
const { BigNumber } = require('@ethersproject/bignumber')
const { expect } = require('chai')
const { formatEther } = require('@ethersproject/units')
const { providers } = require('ethers')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const Deployer = artifacts.require('MonstropolyDeployer')
const Data = artifacts.require('MonstropolyData')
const Factory = artifacts.require('MonstropolyFactory')
const Science = artifacts.require('MonstropolyGenScience')

const SALT = '748398223409078271829384132948734346321498890831874398135738578741832983748391111111111111111111987654987654987654987654'
const SALT_RARITY_0_INF = '777777777777000000777779999999999999999999999999999999991234000000765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_0_SUP = '7777777777770AB348777779999999999999999999999999999999991234701256765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_1_INF = '7777777777770AB349777779999999999999999999999999999999991234701257765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_1_SUP = '7777777777770E4460777779999999999999999999999999999999991234935008765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_2_INF = '7777777777770E4461777779999999999999999999999999999999991234935009765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_1_INF_VIP = '777777777777000000777779999999999999999999999999999999991234000000765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_1_SUP_VIP = '7777777777770BF075777779999999999999999999999999999999991234782453765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_2_INF_VIP = '7777777777770BF076777779999999999999999999999999999999991234782454765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_2_SUP_VIP = '7777777777770EEC93777779999999999999999999999999999999991234978067765678999999111111111111111111987654987654987654987654'
const SALT_RARITY_3_INF_VIP = '7777777777770EEC94777779999999999999999999999999999999991234978068765678999999111111111111111111987654987654987654987654'
const SALT_OVERFLOW = '777777777777999999777779999999999999999999999999999999991234978068765678999999111111111111111111987654987654987654987654'

let myData, myFactory, myBreeder, myScience, myDeployer

let accounts

describe('MonstropolyGenScience', function () {
	let owner, person, person2

	before(async () => {
		await hre.run('compile')
		accounts = await web3.eth.getAccounts()
		owner = accounts[0]
		person = accounts[1]
		person2 = accounts[2]
	})

	beforeEach(async () => {

		myDeployer = await Deployer.new()

		const dataFactory = await ethers.getContractFactory('MonstropolyData')
		let calldataData = await dataFactory.interface.encodeFunctionData('initialize', []);

		const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
		let calldataerc721 = await erc721Factory.interface.encodeFunctionData('initialize', []);

		const scienceFactory = await ethers.getContractFactory('MonstropolyGenScience')
		let calldataScience = await scienceFactory.interface.encodeFunctionData('initialize', []);

		await myDeployer.deploy(solKeccak256("DATA"), dataFactory.bytecode, calldataData)
		await myDeployer.deploy(solKeccak256("FACTORY"), erc721Factory.bytecode, calldataerc721)
		await myDeployer.deploy(solKeccak256("SCIENCE"), scienceFactory.bytecode, calldataScience)

		const [data, factory, science] = await Promise.all([
			myDeployer.get(solKeccak256("DATA")),
			myDeployer.get(solKeccak256("FACTORY")),
			myDeployer.get(solKeccak256("SCIENCE"))
		])

		myData = await Data.at(data)
		myFactory = await Factory.at(factory)
		myScience = await Science.at(science)
	})
	describe('generate', () => {
		it('can generate a random gen with fixed asset', async () => {
			let asset1 = 0
			let asset2 = 1
			let gen1 = await myScience.generateAssetView(asset1, SALT, false);
			let gen2 = await myScience.generateAssetView(asset2, SALT, false);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let dec2 = await myData.deconstructGen(gen2.gen_)
			let decAsset1 = dec1._asset.random % dec1._asset.module
			let decAsset2 = dec2._asset.random % dec2._asset.module
			expect(decAsset1).to.eq(asset1)
			expect(decAsset2).to.eq(asset2)
		})
		it('can generate a random gen with rarity 0 (by salt_inf)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_0_INF, false);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(0)
		})
		it('can generate a random gen with rarity 0 (by salt_sup)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_0_SUP, false);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(0)
		})
		it('can generate a random gen with rarity 1 (by salt_inf)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_1_INF, false);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(1)
		})
		it('can generate a random gen with rarity 1 (by salt_sup)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_1_SUP, false);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(1)
		})
		it('can generate a random gen with rarity 1 (by salt_sup)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_2_INF, false);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(2)
		})
		it('can generate a random gen with VIP rarity 0 (by salt_inf)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_1_INF_VIP, true);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(1)
		})
		it('can generate a random gen with VIP rarity 0 (by salt_sup)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_1_SUP_VIP, true);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(1)
		})
		it('can generate a random gen with VIP rarity 1 (by salt_inf)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_2_INF_VIP, true);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(2)
		})
		it('can generate a random gen with VIP rarity 1 (by salt_sup)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_2_SUP_VIP, true);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(2)
		})
		it('can generate a random gen with VIP rarity 1 (by salt_sup)', async () => {
			let gen1 = await myScience.generateAssetView(0, SALT_RARITY_3_INF_VIP, true);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let _rarity = dec1._rarity.random % dec1._rarity.module
			expect(_rarity).to.eq(3)
		})
		it('can generate a random gen with fixed asset and type', async () => {
			let asset1 = 0
			let asset2 = 1
			let type1 = 0
			let type2 = 1
			let gen1 = await myScience.generateTypeView(asset1, type1, SALT, false);
			let gen2 = await myScience.generateTypeView(asset2, type2, SALT, false);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let dec2 = await myData.deconstructGen(gen2.gen_)
			let decAsset1 = dec1._asset.random % dec1._asset.module
			let decAsset2 = dec2._asset.random % dec2._asset.module
			let decType1 = dec1._type.random % dec1._type.module
			let decType2 = dec2._type.random % dec2._type.module
			expect(decAsset1).to.eq(asset1)
			expect(decAsset2).to.eq(asset2)
			expect(decType1).to.eq(type1)
			expect(decType2).to.eq(type2)
		})
		it('can generate a random gen with fixed asset and rarity', async () => {
			let asset1 = 0
			let asset2 = 1
			let rarity1 = 0
			let rarity2 = 1
			let gen1 = await myScience.generateRarityView(asset1, rarity1, SALT);
			let gen2 = await myScience.generateRarityView(asset2, rarity2, SALT);
			let dec1 = await myData.deconstructGen(gen1.gen_)
			let dec2 = await myData.deconstructGen(gen2.gen_)
			let decAsset1 = dec1._asset.random % dec1._asset.module
			let decAsset2 = dec2._asset.random % dec2._asset.module
			let decRarity1 = dec1._rarity.random % dec1._rarity.module
			let decRarity2 = dec2._rarity.random % dec2._rarity.module
			expect(decAsset1).to.eq(asset1)
			expect(decAsset2).to.eq(asset2)
			expect(decRarity1).to.eq(rarity1)
			expect(decRarity2).to.eq(rarity2)
		})
		it('can generate a random gen with fixed asset, type and rarity', async () => {
			let asset = 0
			let type = 5
			let rarity = 4
			let gen = await myScience.generateFromRootView([asset, type, rarity], [true, true, true], SALT, false);
			let dec = await myData.deconstructGen(gen.gen_)
			let decAsset = dec._asset.random % dec._asset.module
			let decType = dec._type.random % dec._type.module
			let decRarity = dec._rarity.random % dec._rarity.module
			expect(decAsset).to.eq(asset)
			expect(decType).to.eq(type)
			expect(decRarity).to.eq(rarity)
		})
		it('given a gen it can set stat 0', async () => {
			let asset = 0
			let type = 5
			let rarity = 4
			let gen = await myScience.generateFromRootView([asset, type, rarity], [true, true, true], SALT, false);
			let dec = await myData.deconstructGen(gen.gen_)
			let stat0 = dec._stats[0].random % dec._stats[0].module
			let newStatStr = '123456'
			let newStatBN = new ethers.BigNumber.from('0x123456')
			let newGen = await myData.setStatInGen(gen.gen_, newStatStr, 0)
			let newDec = await myData.deconstructGen(newGen)
			expect(newStatBN.toString()).to.eq(newDec._stats[0].random.toString())
			expect(newStatBN.toString()).to.not.eq(stat0.toString())
		})
		it('given a gen it can set stat 3 (last)', async () => {
			let asset = 0
			let type = 5
			let rarity = 4
			let gen = await myScience.generateFromRootView([asset, type, rarity], [true, true, true], SALT, false);
			let dec = await myData.deconstructGen(gen.gen_)
			let stat0 = dec._stats[3].random % dec._stats[3].module
			let newStat = '123456'
            let newStatBN = new ethers.BigNumber.from('0x123456')
			let newGen = await myData.setStatInGen(gen.gen_, newStat, 3)
			let newDec = await myData.deconstructGen(newGen)
			expect(newStatBN.toString()).to.eq(newDec._stats[3].random)
			expect(newStatBN.toString()).to.not.eq(stat0.toString())
		})
		it('given a gen it can increment in 1 stat 0', async () => {
			let asset = 0
			let type = 5
			let rarity = 4
			let gen = await myScience.generateFromRootView([asset, type, rarity], [true, true, true], SALT, false);
			let dec = await myData.deconstructGen(gen.gen_)
			let stat0 = dec._stats[0].random % dec._stats[0].module
			let increment = 1
			let newGen = await myData.incrementStatInGen(gen.gen_, increment, 0)
			let newDec = await myData.deconstructGen(newGen)
			let newStat0 = newDec._stats[0].random % newDec._stats[0].module
			expect(newStat0).to.eq((stat0 + increment))
		})
		it('reverts when trying to increment stat and stat.random is max', async () => {
			let asset = 0
			let type = 5
			let rarity = 4
			let gen = await myScience.generateFromRootView([asset, type, rarity], [true, true, true], SALT, false);
			let newStat = 'ffffff'
			gen = await myData.setStatInGen(gen.gen_, newStat, 0)
			let dec = await myData.deconstructGen(gen)
			let increment = 1
			await expectRevert(myData.incrementStatInGen(gen, increment, 0),
			'MonstropolyData: random is max');
		})
		it('reverts when trying to increment a max stat', async () => {
			let asset = 0
			let type = 5
			let rarity = 4
			let gen = await myScience.generateFromRootView([asset, type, rarity], [true, true, true], SALT, false);
			let newStat = '000063' //hex99
			gen = await myData.setStatInGen(gen.gen_, newStat, 0)
			let increment = 1
			await expectRevert(myData.incrementStatInGen(gen, increment, 0),
			'MonstropolyData: stat overflow');
		})
        it('cannot generate a random gen with rarity > 999999 (because of hex)', async () => {
            await expectRevert(
                myScience.generateAssetView(0, SALT_OVERFLOW, false),
                'MonstropolyData: rarity too high'
            )
		})
	})
})