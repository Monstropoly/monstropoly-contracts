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

const SALT = '00002718C938632B498890'
const SALT2 = '00002718C938632B498891'
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const LOCKER_ROLE = ethers.utils.id('LOCKER_ROLE')
const BASE_URI = 'https://monstropoly.io/nfts/'
const BASE_URI2 = 'https://ifps.io/ipfs/'
const CONTRACT_URI = 'https://monstropoly.io/contractUri/'
const CONTRACT_URI2 = 'https://ifps.io/ipfs/'
const IPFS_CID = 'QmVSjEGecMaM6xSA9ZRoT565t7zHgYnabYrKcB9pSka78z'
const _INTERFACE_ID_ERC721_METADATA = '0x5b5e139f';

let myData, myFactory, myScience, myDeployer

let accounts

describe('MonstropolyFactory', function () {
    let owner, person, person2

    before(async () => {
        await hre.run('compile')
        accounts = await ethers.getSigners();
        owner = accounts[0]
        person = accounts[1]
        person2 = accounts[2]
        locker = accounts[3]
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

        myData = await dataFactory.attach(data)
        myFactory = await erc721Factory.attach(factory)
        myScience = await scienceFactory.attach(science)

        await myDeployer.grantRole(MINTER_ROLE, owner.address)
        await myDeployer.grantRole(LOCKER_ROLE, locker.address)
    })
    describe('generateGen and mint', () => {
        it('can mint a random gen', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let hero = await myFactory.tokenOfId('0')
            let tokenOwner = await myFactory.ownerOf('0')
            let genAfterMint = await myScience.generateAssetView(asset, SALT, false);
            expect(tokenOwner).to.eq(person.address)
            expect(hero.genetic).to.eq(gen.gen_)
            expect(gen.free_).to.eq(true)
            expect(genAfterMint.free_).to.eq(false)
        })

        it('can mint a random gen and get existence', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let existence0 = await myFactory.exists('0')
            let existence1 = await myFactory.exists('1')
            expect(existence0).to.equal(true)
            expect(existence1).to.equal(false)
        })
    })
    describe('uris stuff', () => {
        it('can get baseURI', async () => {
            let baseURI = await myFactory.baseURI()
            expect(baseURI).to.equal(BASE_URI)
        })

        it('can setBaseURI and get new baseURI', async () => {
            await myFactory.setBaseURI(BASE_URI2)
            let baseURI = await myFactory.baseURI()
            expect(baseURI).to.equal(BASE_URI2)
        })

        it('only default admin role can setBaseURI', async () => {
            await expectRevert(
                (await myFactory.connect(person)).setBaseURI(BASE_URI2),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        })

        it('can get contractURI', async () => {
            let contractURI = await myFactory.contractURI()
            expect(contractURI).to.equal(CONTRACT_URI)
        })

        it('can setBaseURI and get new baseURI', async () => {
            await myFactory.setContractURI(CONTRACT_URI2)
            let contractURI = await myFactory.contractURI()
            expect(contractURI).to.equal(CONTRACT_URI2)
        })

        it('only default admin role can setBaseURI', async () => {
            await expectRevert(
                (await myFactory.connect(person)).setContractURI(CONTRACT_URI2),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        })

        it('can get tokenURI when _tokenURIs is empty', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let tokenURI = await myFactory.tokenURI('0')
            expect(tokenURI).to.equal(BASE_URI + '0')
        })

        it('can get tokenURI when _tokenURIs is empty after setBaseURI', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let tokenURI = await myFactory.tokenURI('0')
            await myFactory.setBaseURI(BASE_URI2)
            let tokenURI2 = await myFactory.tokenURI('0')
            expect(tokenURI).to.equal(BASE_URI + '0')
            expect(tokenURI2).to.equal(BASE_URI2 + '0')
        })

        it('can get tokenURI when _tokenURIs is setted', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            await myFactory.setBaseURI(BASE_URI2)
            await myFactory.setTokenURI('0', IPFS_CID)
            let tokenURI = await myFactory.tokenURI('0')
            expect(tokenURI).to.equal(BASE_URI2 + IPFS_CID)
        })

        it('can get tokenURI when _tokenURIs is setted only in some IDs', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            let gen2 = await myScience.generateAssetView(asset, SALT2, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            const receipt2 = await myFactory.mint(person.address, gen2.gen_)
            await myFactory.setTokenURI('1', IPFS_CID)
            let tokenURI0 = await myFactory.tokenURI('0')
            let tokenURI1 = await myFactory.tokenURI('1')
            expect(tokenURI0).to.equal(BASE_URI + '0')
            expect(tokenURI1).to.equal(BASE_URI + IPFS_CID)
        })
    })
    describe('lock stuff', () => {
        it('can get isLocked', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let locked = await myFactory.isLocked('0')
            expect(locked).to.equal(false)
        })

        it('can lockToken', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let locked = await myFactory.isLocked('0')
            expect(locked).to.equal(false)
            await (await myFactory.connect(locker)).lockToken('0')
            locked = await myFactory.isLocked('0')
            expect(locked).to.equal(true)
        })

        it('can unlockToken', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let locked = await myFactory.isLocked('0')
            expect(locked).to.equal(false)
            await (await myFactory.connect(locker)).lockToken('0')
            locked = await myFactory.isLocked('0')
            expect(locked).to.equal(true)
            await (await myFactory.connect(locker)).unlockToken('0')
            locked = await myFactory.isLocked('0')
            expect(locked).to.equal(false)
        })

        it('reverts when trying to transfer lockedToken', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let locked = await myFactory.isLocked('0')
            expect(locked).to.equal(false)
            await (await myFactory.connect(locker)).lockToken('0')
            locked = await myFactory.isLocked('0')
            expect(locked).to.equal(true)
            await expectRevert(
                (await myFactory.connect(person)).transferFrom(person.address, person2.address, '0'),
                'MonstropolyFactory: locked token'
            )
        })
    })

    describe('approvals stuff', () => {
        it('can get isApproved being the owner', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let approval = await myFactory.isApproved(person.address, '0')
            expect(approval).to.equal(true)
        })

        it('can get isApproved after approve', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            await (await myFactory.connect(person)).approve(person2.address, '0')
            let approval = await myFactory.isApproved(person2.address, '0')
            expect(approval).to.equal(true)
        })

        it('can get isApproved after setApprovalForAll', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            await (await myFactory.connect(person)).setApprovalForAll(person2.address, true)
            let approval = await myFactory.isApproved(person2.address, '0')
            expect(approval).to.equal(true)
        })
    })

    describe('erc165 stuff', () => {
        it('can get isApproved being the owner', async () => {
            let supported = await myFactory.supportsInterface(_INTERFACE_ID_ERC721_METADATA)
            expect(supported).to.equal(true)
        })
    })

    describe('burn stuff', () => {
        it('can burn being owner', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let existence = await myFactory.exists('0')
            expect(existence).to.equal(true)
            await (await myFactory.connect(person)).burn('0')
            existence = await myFactory.exists('0')
            expect(existence).to.equal(false)
        })

        it('can burn being approved', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            await (await myFactory.connect(person)).approve(person2.address, '0')
            let existence = await myFactory.exists('0')
            expect(existence).to.equal(true)
            await (await myFactory.connect(person2)).burn('0')
            existence = await myFactory.exists('0')
            expect(existence).to.equal(false)
        })

        it('can burn being operator', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            await (await myFactory.connect(person)).setApprovalForAll(person2.address, true)
            let existence = await myFactory.exists('0')
            expect(existence).to.equal(true)
            await (await myFactory.connect(person2)).burn('0')
            existence = await myFactory.exists('0')
            expect(existence).to.equal(false)
        })

        it('when burn gen is free again', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let free0 = await myFactory.freeGen(gen.gen_)
            let existence = await myFactory.exists('0')
            expect(existence).to.equal(true)
            await (await myFactory.connect(person)).burn('0')
            existence = await myFactory.exists('0')
            let free1 = await myFactory.freeGen(gen.gen_)
            expect(existence).to.equal(false)
            expect(free0).to.equal(false)
            expect(free1).to.equal(true)
        })

        it('when burn gen is free again and can mint same gen', async () => {
            let asset = '0'
            let gen = await myScience.generateAssetView(asset, SALT, false);
            const receipt = await myFactory.mint(person.address, gen.gen_)
            let free0 = await myFactory.freeGen(gen.gen_)
            let existence = await myFactory.exists('0')
            expect(existence).to.equal(true)
            await (await myFactory.connect(person)).burn('0')
            existence = await myFactory.exists('0')
            let free1 = await myFactory.freeGen(gen.gen_)
            expect(existence).to.equal(false)
            expect(free0).to.equal(false)
            expect(free1).to.equal(true)
            await myFactory.mint(person.address, gen.gen_)
            let free2 = await myFactory.freeGen(gen.gen_)
            expect(free2).to.equal(false)
            let token = await myFactory.tokenOfId('0')
            expect(token.genetic).to.equal(gen.gen_)
        })
    })
})
