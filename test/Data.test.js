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

const SALT = '00002718C938632B498890'
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

let myData, myFactory, myScience, myDeployer

let accounts

describe('MonstropolyData', function () {
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

        await myDeployer.grantRole(MINTER_ROLE, owner)
    })
    describe('lengths stuff', () => {
        it('can updateLengths and getLengths', async () => {
            let nStats = '5'
            let nAttributes = '18'
            await myData.updateLengths(nStats, nAttributes)
            let lengths = await myData.getLengths()
            expect(lengths[1].toString()).to.equal(nStats)
            expect(lengths[2].toString()).to.equal(nAttributes)
        })

        it('can deconstructGen if extra length', async () => {
            let gen = await myScience.generateAssetView(0, SALT, false)
            await myData.deconstructGen(gen.gen_)
        })

        it('can deconstructGen if right length', async () => {
            let gen = await myScience.generateAssetView(0, SALT, false)
            await myData.deconstructGen(gen.gen_.replace('00001', ''))
        })

        it('reverts if gen is empty', async () => {
            let gen = await myScience.generateAssetView(0, SALT, false)
            expectRevert(
                myData.deconstructGen(''),
                'MonstropolyData: wrong gen length'
            )
        })
    })
})
