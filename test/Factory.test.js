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
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

let myData, myFactory, myScience, myDeployer

let accounts

describe('MonstropolyFactory', function () {
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
    myFactory= await Factory.at(factory)
    myScience = await Science.at(science)

    await myDeployer.grantRole(MINTER_ROLE, owner)
  })
  describe('generateGen and mint', () => {
    it('can mint a random gen', async () => {
        let asset = '0'
        let gen = await myScience.generateAssetView(asset, SALT, false);
        const receipt = await myFactory.mint(person, gen.gen_)
        let hero = await myFactory.heroeOfId('0')
        let genAfterMint = await myScience.generateAssetView(asset, SALT, false);
        expect(hero.owner).to.eq(person)
        expect(hero.genetic).to.eq(gen.gen_)
        expect(hero.exists).to.eq(true)
        expect(gen.free_).to.eq(true)
        expect(genAfterMint.free_).to.eq(false)
    })
  })
})
