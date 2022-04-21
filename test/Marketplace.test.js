const hre = require('hardhat')
const ethers = hre.ethers
const {
    ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { expect } = require('chai')

const GEN = '010100030101010303'
const GEN2 = '010100030102010303'
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const MIN_PRICES = [
    ethers.utils.parseEther('0.01'), //BNB
    ethers.utils.parseEther('1') //MPOLY
]
const MAX_PRICES = [
    ethers.utils.parseEther('10000'), //BNB
    ethers.utils.parseEther('1000000') //MPOLY
]
let TOKENS
const TRADING_FEES = [
    200, //BNB
    100 //MPOLY
]
const CREATOR_FEES = [
    100, //BNB
    50 //MPOLY
]

let myData, myFactory, myDeployer, myMarketplace, myWBNB, myMPOLY

let accounts

describe('Marketplace', function () {
    let admin, treasury, seller, buyer

    before(async () => {
        accounts = await ethers.getSigners();
        admin = accounts[0]
        treasury = accounts[1]
        seller = accounts[2]
        buyer = accounts[3]
    })

    beforeEach(async () => {

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        myDeployer = await MonstropolyDeployer.deploy()

        const dataFactory = await ethers.getContractFactory('MonstropolyData')
        let calldataData = await dataFactory.interface.encodeFunctionData('initialize', []);

        const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
        let calldataerc721 = await erc721Factory.interface.encodeFunctionData('initialize', []);
        const factoryImp = await erc721Factory.deploy()

        await myDeployer.deploy(ethers.utils.id("DATA"), dataFactory.bytecode, calldataData)
        await myDeployer.deployProxyWithImplementation(ethers.utils.id("FACTORY"), factoryImp.address, calldataerc721)

        const WBNB = await ethers.getContractFactory('WBNB')
        myWBNB = await WBNB.deploy()
        await myWBNB.deployed()

        const Token = await ethers.getContractFactory('Token')
        myMPOLY = await Token.deploy('Monstropoly token', 'MPOLY')
        await myMPOLY.deployed()

        await myMPOLY.transfer(buyer.address, ethers.utils.parseEther('100000'))

        TOKENS = [
            ethers.constants.AddressZero,
            myMPOLY.address
        ]

        const MonstropolyMarketplace = await ethers.getContractFactory('MonstropolyMarketplace')
        myMarketplace = await MonstropolyMarketplace.deploy(
            admin.address,
            treasury.address,
            myWBNB.address,
            MIN_PRICES,
            MAX_PRICES,
            TOKENS
        )
        await myMarketplace.deployed()

        const [data, factory] = await Promise.all([
            myDeployer.get(ethers.utils.id("DATA")),
            myDeployer.get(ethers.utils.id("FACTORY")),
        ])

        myData = await dataFactory.attach(data)
        myFactory = await erc721Factory.attach(factory)

        await myDeployer.grantRole(MINTER_ROLE, admin.address)

        const owner = seller.address
        const gen = GEN
        const rarity = 1
        const breedUses = 3
        const response = await myFactory.mint(owner, gen, rarity, breedUses)
        await response.wait()

        const response1 = await myMarketplace.addCollection(
            myFactory.address,
            admin.address,
            ethers.constants.AddressZero,
            TRADING_FEES,
            CREATOR_FEES,
            TOKENS
        )
        await response1.wait()
    })
    describe('Ask', () => {
        it('can create ask order in MPOLY', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = myMPOLY.address
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()
            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )
            expect(asks.statuses[0]).to.equal(true)
            expect(asks.askInfo[0].seller).to.equal(seller.address)
            expect(asks.askInfo[0].price.toString()).to.equal(price.toString())
            expect(asks.askInfo[0].token).to.equal(token)

            const owner = await myFactory.ownerOf(tokenId)
            expect(owner).to.equal(myMarketplace.address)
        })

        it('can create ask order in BNB', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = ethers.constants.AddressZero
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()
            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )
            expect(asks.statuses[0]).to.equal(true)
            expect(asks.askInfo[0].seller).to.equal(seller.address)
            expect(asks.askInfo[0].price.toString()).to.equal(price.toString())
            expect(asks.askInfo[0].token).to.equal(token)

            const owner = await myFactory.ownerOf(tokenId)
            expect(owner).to.equal(myMarketplace.address)
        })

        it('can modify ask order', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = myMPOLY.address
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()

            const newPrice = ethers.utils.parseEther('20')

            response = await myMarketplace.connect(seller).modifyAskOrder(
                collection,
                tokenId,
                newPrice
            )
            await response.wait()

            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )

            expect(asks.statuses[0]).to.equal(true)
            expect(asks.askInfo[0].seller).to.equal(seller.address)
            expect(asks.askInfo[0].price.toString()).to.equal(newPrice.toString())
            expect(asks.askInfo[0].token).to.equal(token)
        })

        it('can cancel ask order', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = myMPOLY.address
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()

            response = await myMarketplace.connect(seller).cancelAskOrder(
                collection,
                tokenId
            )
            await response.wait()

            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )
            expect(asks.statuses[0]).to.equal(false)
            expect(asks.askInfo[0].seller).to.equal(ethers.constants.AddressZero)
            expect(asks.askInfo[0].token).to.equal(ethers.constants.AddressZero)
            expect(asks.askInfo[0].price.toString()).to.equal('0')

            const owner = await myFactory.ownerOf(tokenId)
            expect(owner).to.equal(seller.address)
        })
    })

    describe('Buy', () => {
        it('can buy using BNB', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = ethers.constants.AddressZero
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()
            
            response = await myMarketplace.connect(buyer).buyTokenUsingBNB(
                collection,
                tokenId,
                { value: price }
            )
            await response.wait()
            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )
            expect(asks.statuses[0]).to.equal(false)
            expect(asks.askInfo[0].seller).to.equal(ethers.constants.AddressZero)
            expect(asks.askInfo[0].price.toString()).to.equal('0')

            const owner = await myFactory.ownerOf(tokenId)
            expect(owner).to.equal(buyer.address)
        })

        it('can buy using WBNB', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = ethers.constants.AddressZero
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()

            response = await myWBNB.connect(buyer).deposit({ value: price })
            await response.wait()
            response = await myWBNB.connect(buyer).approve(myMarketplace.address, ethers.constants.MaxUint256)
            await response.wait()
            
            response = await myMarketplace.connect(buyer).buyTokenUsingWBNB(
                collection,
                tokenId,
                price
            )
            await response.wait()
            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )
            expect(asks.statuses[0]).to.equal(false)
            expect(asks.askInfo[0].seller).to.equal(ethers.constants.AddressZero)
            expect(asks.askInfo[0].price.toString()).to.equal('0')

            const owner = await myFactory.ownerOf(tokenId)
            expect(owner).to.equal(buyer.address)
        })

        it('can buy using MPOLY', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = myMPOLY.address
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()

            response = await myMPOLY.connect(buyer).approve(myMarketplace.address, ethers.constants.MaxUint256)
            await response.wait()

            console.log(await myMPOLY.allowance(buyer.address, myMarketplace.address))
            response = await myMarketplace.connect(buyer).buyTokenUsingToken(
                collection,
                tokenId,
                price
            )
            await response.wait()
            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )
            expect(asks.statuses[0]).to.equal(false)
            expect(asks.askInfo[0].seller).to.equal(ethers.constants.AddressZero)
            expect(asks.askInfo[0].price.toString()).to.equal('0')

            const owner = await myFactory.ownerOf(tokenId)
            expect(owner).to.equal(buyer.address)
        })

        it('can buy modified ask order', async () => {
            const collection = myFactory.address
            const tokenId = 0
            const price = ethers.utils.parseEther('10')
            const token = ethers.constants.AddressZero
            let response = await myFactory.connect(seller).setApprovalForAll(myMarketplace.address, true)
            await response.wait()
            response = await myMarketplace.connect(seller).createAskOrder(
                collection,
                tokenId,
                price,
                token
            )
            await response.wait()

            const newPrice = ethers.utils.parseEther('20')

            response = await myMarketplace.connect(seller).modifyAskOrder(
                collection,
                tokenId,
                newPrice
            )
            await response.wait()

            response = await myMarketplace.connect(buyer).buyTokenUsingBNB(
                collection,
                tokenId,
                { value: newPrice }
            )
            await response.wait()
            const asks = await myMarketplace.viewAsksByCollectionAndTokenIds(
                collection,
                [tokenId]
            )
            expect(asks.statuses[0]).to.equal(false)
            expect(asks.askInfo[0].seller).to.equal(ethers.constants.AddressZero)
            expect(asks.askInfo[0].price.toString()).to.equal('0')

            const owner = await myFactory.ownerOf(tokenId)
            expect(owner).to.equal(buyer.address)
        })
    })
})
