const hre = require('hardhat')
const ethers = hre.ethers
const { expect } = require('chai')

const GEN = '010100030101010303'
const GEN2 = '010100030102010303'
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.id('MONSTER_MINTER_ROLE')
const LOCKER_ROLE = ethers.utils.id('MONSTER_LOCKER_ROLE')

let myData, myFactory, myDeployer, myLending, myMPOLY

let accounts

describe('LendingGame', function () {
    let admin, lender, borrower

    before(async () => {
        accounts = await ethers.getSigners();
        admin = accounts[0]
        lender = accounts[1]
        borrower = accounts[2]
    })

    beforeEach(async () => {

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        myDeployer = await MonstropolyDeployer.deploy()

        const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
        let calldataerc721 = await erc721Factory.interface.encodeFunctionData('initialize', []);
        const factoryImp = await erc721Factory.deploy()

        const lendingFactory = await ethers.getContractFactory('MonstropolyLendingGame')
        let calldataLending = await lendingFactory.interface.encodeFunctionData('initialize', []);

        const Token = await ethers.getContractFactory('Token')
        myMPOLY = await Token.deploy('Monstropoly token', 'MPOLY')
        await myMPOLY.deployed()
        await myMPOLY.mint(borrower.address, ethers.utils.parseEther("10000"))

        await myDeployer.deployProxyWithImplementation(ethers.utils.id("FACTORY"), factoryImp.address, calldataerc721)
        await myDeployer.deploy(ethers.utils.id("LENDING_GAMING"), lendingFactory.bytecode, calldataLending)

        const [factory, lending] = await Promise.all([
            myDeployer.get(ethers.utils.id("FACTORY")),
            myDeployer.get(ethers.utils.id("LENDING_GAMING")),
        ])

        myFactory = await erc721Factory.attach(factory)
        myLending = await lendingFactory.attach(lending)

        await myDeployer.grantRole(MINTER_ROLE, admin.address)
        await myDeployer.grantRole(LOCKER_ROLE, lending)

        const owner = lender.address
        const tokenId = 0
        const rarity = 1
        const breedUses = 3
        const generation = 1
        const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
        await response.wait()
    })

    describe('Offer', () => {
        it('can create lend open offer in BNB price 0', async () => {
            const tokenId = 0
            const borrowerPercentage = ethers.utils.parseEther("30")
            const duration = 86400
            const price = ethers.utils.parseEther("0")
            const payToken = ethers.constants.AddressZero

            await myLending.connect(lender).offerLend(
                tokenId,
                ethers.constants.AddressZero,
                borrowerPercentage,
                duration,
                price,
                payToken
            )

            const lend = await myLending.getLend(tokenId)
            expect(lend.lender).to.equal(lender.address)
            expect(lend.borrower).to.equal(ethers.constants.AddressZero)
            expect(lend.borrowerPercentage).to.equal(borrowerPercentage)
            expect(lend.duration).to.equal(duration)
            expect(lend.price).to.equal(price)
            expect(lend.payToken).to.equal(payToken)
        })

        it('can create lend direct offer in MPOLY price not 0', async () => {
            const tokenId = 0
            const borrowerPercentage = ethers.utils.parseEther("30")
            const duration = parseInt(Date.now()) + 86400
            const price = ethers.utils.parseEther("77")
            const payToken = myMPOLY.address

            await myLending.connect(lender).offerLend(
                tokenId,
                borrower.address,
                borrowerPercentage,
                duration,
                price,
                payToken
            )

            const lend = await myLending.getLend(tokenId)
            expect(lend.lender).to.equal(lender.address)
            expect(lend.borrower).to.equal(borrower.address)
            expect(lend.borrowerPercentage).to.equal(borrowerPercentage)
            expect(lend.duration).to.equal(duration)
            expect(lend.price).to.equal(price)
            expect(lend.payToken).to.equal(payToken)
        })
    })

    describe('Take', () => {
        it('can take lend open offer in BNB price 0', async () => {
            const tokenId = 0
            const borrowerPercentage = ethers.utils.parseEther("30")
            const duration = 86400
            const price = ethers.utils.parseEther("0")
            const payToken = ethers.constants.AddressZero

            await myLending.connect(lender).offerLend(
                tokenId,
                ethers.constants.AddressZero,
                borrowerPercentage,
                duration,
                price,
                payToken
            )

            await myLending.connect(borrower).takeLend(tokenId)

            const gamer = await myLending.getGamer(tokenId)
            expect(gamer).to.equal(borrower.address)
        })

        it('can take lend direct offer in MPOLY price not 0', async () => {
            const tokenId = 0
            const borrowerPercentage = ethers.utils.parseEther("30")
            const duration = parseInt(Date.now()) + 86400
            const price = ethers.utils.parseEther("77")
            const payToken = myMPOLY.address

            await myLending.connect(lender).offerLend(
                tokenId,
                borrower.address,
                borrowerPercentage,
                duration,
                price,
                payToken
            )

            await myMPOLY.connect(borrower).approve(myLending.address, ethers.constants.MaxUint256)
            await myLending.connect(borrower).takeLend(tokenId)

            const gamer = await myLending.getGamer(tokenId)
            expect(gamer).to.equal(borrower.address)
        })
    })

    describe('Cancel', () => {
        it('cannot take lend open offer after cancel', async () => {
            const tokenId = 0
            const borrowerPercentage = ethers.utils.parseEther("30")
            const duration = 86400
            const price = ethers.utils.parseEther("0")
            const payToken = ethers.constants.AddressZero

            await myLending.connect(lender).offerLend(
                tokenId,
                ethers.constants.AddressZero,
                borrowerPercentage,
                duration,
                price,
                payToken
            )

            await myLending.connect(lender).cancelLend(tokenId)

            await expect(
                myLending.connect(borrower).takeLend(tokenId)
            ).to.revertedWith(
                "MonstropolyLendingGame: checkLender or inexistent"
            )
        })
    })

    describe('Claim', () => {
        it('can claim game rights after lend end', async () => {
            const tokenId = 0
            const borrowerPercentage = ethers.utils.parseEther("30")
            const duration = 86400
            const price = ethers.utils.parseEther("0")
            const payToken = ethers.constants.AddressZero

            await myLending.connect(lender).offerLend(
                tokenId,
                ethers.constants.AddressZero,
                borrowerPercentage,
                duration,
                price,
                payToken
            )

            await myLending.connect(borrower).takeLend(tokenId)

            const lend = await myLending.getLend(tokenId)
            await ethers.provider.send("evm_setNextBlockTimestamp", [parseInt(lend.startDate) + duration + 1])
            await myLending.claimGamer(tokenId)
            
            const gamer = await myLending.getGamer(tokenId)
            expect(gamer).to.equal(lender.address)
        })
    })
})
