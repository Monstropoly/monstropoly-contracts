const hre = require('hardhat')
const ethers = hre.ethers
const { expect } = require('chai')

const GEN = '010100030101010303'
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const LOCKER_ROLE = ethers.utils.id('LOCKER_ROLE')
let myData, myFactory, myDeployer, myNFTSTaking

let accounts

describe('NFTStaking', function () {
    let admin, staker

    before(async () => {
        accounts = await ethers.getSigners();
        admin = accounts[0]
        staker = accounts[1]
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

        const MonstropolyNFTStaking = await ethers.getContractFactory('MonstropolyNFTStaking')
        await myDeployer.deploy(ethers.utils.id("NFT_STAKING"), MonstropolyNFTStaking.bytecode, calldataData)

        const [data, factory, nftStaking] = await Promise.all([
            myDeployer.get(ethers.utils.id("DATA")),
            myDeployer.get(ethers.utils.id("FACTORY")),
            myDeployer.get(ethers.utils.id("NFT_STAKING")),
        ])

        myData = await dataFactory.attach(data)
        myFactory = await erc721Factory.attach(factory)
        myNFTSTaking = await MonstropolyNFTStaking.attach(nftStaking)

        await myDeployer.grantRole(MINTER_ROLE, admin.address)
        await myDeployer.grantRole(LOCKER_ROLE, nftStaking)

        const owner = staker.address
        const gen = GEN
        const rarity = 1
        const breedUses = 3
        const generation = 1
        const response = await myFactory.mint(owner, gen, rarity, breedUses, generation)
        await response.wait()
    })
    describe('Stake', () => {
        it('owner can stake', async () => {
            const tokenId = 0
            await expect(
                myNFTSTaking.connect(staker).stake(tokenId)
            ).to.emit(
                myNFTSTaking, 'StakeNFT'
            ).withArgs(
                tokenId,
                staker.address
            )
        })

        it('revert when stake if not owner', async () => {
            const tokenId = 0
            await expect(
                myNFTSTaking.connect(admin).stake(tokenId)
            ).to.be.revertedWith(
                'MonstropolyNFTStaking: checkStaker or inexistent'
            )
        })

        it('revert when stake if token inexistent', async () => {
            const tokenId = 1
            await expect(
                myNFTSTaking.connect(admin).stake(tokenId)
            ).to.be.revertedWith(
                'ERC721: owner query for nonexistent token'
            )
        })
    })

    describe('Unstake', () => {
        it('owner can unstake', async () => {
            const tokenId = 0
            await expect(
                myNFTSTaking.connect(staker).stake(tokenId)
            ).to.emit(
                myNFTSTaking, 'StakeNFT'
            ).withArgs(
                tokenId,
                staker.address
            )

            await expect(
                myNFTSTaking.connect(staker).unstake(tokenId)
            ).to.emit(
                myNFTSTaking, 'UnstakeNFT'
            ).withArgs(
                tokenId
            )
        })

        it('revert when unstake if not owner', async () => {
            const tokenId = 0

            await expect(
                myNFTSTaking.connect(staker).stake(tokenId)
            ).to.emit(
                myNFTSTaking, 'StakeNFT'
            ).withArgs(
                tokenId,
                staker.address
            )

            await expect(
                myNFTSTaking.connect(admin).unstake(tokenId)
            ).to.be.revertedWith(
                'MonstropolyNFTStaking: checkStaker or inexistent'
            )

            await expect(
                myNFTSTaking.connect(staker).unstake(tokenId)
            ).to.emit(
                myNFTSTaking, 'UnstakeNFT'
            ).withArgs(
                tokenId
            )
        })

        it('revert when unstake if not owner', async () => {
            const tokenId = 0
            const wrongTokenId = 1

            await expect(
                myNFTSTaking.connect(staker).stake(tokenId)
            ).to.emit(
                myNFTSTaking, 'StakeNFT'
            ).withArgs(
                tokenId,
                staker.address
            )

            await expect(
                myNFTSTaking.connect(staker).unstake(wrongTokenId)
            ).to.be.revertedWith(
                'ERC721: owner query for nonexistent token'
            )

            await expect(
                myNFTSTaking.connect(staker).unstake(tokenId)
            ).to.emit(
                myNFTSTaking, 'UnstakeNFT'
            ).withArgs(
                tokenId
            )
        })
    })
})
