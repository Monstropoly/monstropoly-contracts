const hre = require('hardhat')
const ethers = hre.ethers
const { expect } = require('chai')

const GEN = '010100030101010303'
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.id('MONSTER_MINTER_ROLE')
const LOCKER_ROLE = ethers.utils.id('MONSTER_LOCKER_ROLE')
const NFT_STAKING_ADMIN_ROLE = ethers.utils.id('NFT_STAKING_ADMIN_ROLE')
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
        myDeployer = await MonstropolyDeployer.connect(accounts[9]).deploy()
        await myDeployer.connect(accounts[9]).grantRole(DEFAULT_ADMIN_ROLE, accounts[0].address)
        await myDeployer.connect(accounts[9]).renounceRole(DEFAULT_ADMIN_ROLE, accounts[9].address)
        myDeployer = myDeployer.connect(accounts[0])

        const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
        let calldataerc721 = await erc721Factory.interface.encodeFunctionData('initialize', []);
        const factoryImp = await erc721Factory.deploy()

        await myDeployer.deployProxyWithImplementation(ethers.utils.id("FACTORY"), factoryImp.address, calldataerc721)

        const MonstropolyNFTStaking = await ethers.getContractFactory('MonstropolyNFTStaking')
        await myDeployer.deploy(ethers.utils.id("NFT_STAKING"), MonstropolyNFTStaking.bytecode, calldataerc721)

        const [factory, nftStaking] = await Promise.all([
            myDeployer.get(ethers.utils.id("FACTORY")),
            myDeployer.get(ethers.utils.id("NFT_STAKING")),
        ])

        myFactory = await erc721Factory.attach(factory)
        myNFTSTaking = await MonstropolyNFTStaking.attach(nftStaking)

        await myDeployer.grantRole(MINTER_ROLE, admin.address)
        await myDeployer.grantRole(LOCKER_ROLE, nftStaking)
        await myDeployer.grantRole(NFT_STAKING_ADMIN_ROLE, admin.address)

        const owner = staker.address
        const tokenId = 0
        const rarity = 1
        const breedUses = 3
        const generation = 1
        const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
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

        it('store stake time when staking', async () => {
            const tokenId = 0
            const response = await myNFTSTaking.connect(staker).stake(tokenId)
            const block = await ethers.provider.getBlock(response.blockHash)
            const blockTimestamp = block.timestamp
            const lastStakeTime = await myNFTSTaking.getLastStake(tokenId)
            
            expect(blockTimestamp).to.equal(parseInt(lastStakeTime))
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

        it('store unstake time when unstaking', async () => {
            const tokenId = 0
            await myNFTSTaking.connect(staker).stake(tokenId)
            const response = await myNFTSTaking.connect(staker).unstake(tokenId)
            const block = await ethers.provider.getBlock(response.blockHash)
            const blockTimestamp = block.timestamp
            const lastUnstakeTime = await myNFTSTaking.getLastUnstake(tokenId)
            
            expect(blockTimestamp).to.equal(parseInt(lastUnstakeTime))
        })

        it('resets unstake time when staking again', async () => {
            const tokenId = 0
            await myNFTSTaking.connect(staker).stake(tokenId)
            const response = await myNFTSTaking.connect(staker).unstake(tokenId)
            const block = await ethers.provider.getBlock(response.blockHash)
            const blockTimestamp = block.timestamp
            const lastUnstakeTime = await myNFTSTaking.getLastUnstake(tokenId)
            
            expect(blockTimestamp).to.equal(parseInt(lastUnstakeTime))

            await ethers.provider.send("evm_setNextBlockTimestamp", [parseInt(lastUnstakeTime) + 604801])
            await myNFTSTaking.connect(staker).stake(tokenId)
            const lastUnstakeTime2 = await myNFTSTaking.getLastUnstake(tokenId)

            expect(lastUnstakeTime2).to.equal('0')
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

        it('owner cant stake again until 1 week', async () => {
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

            await expect(
                myNFTSTaking.connect(staker).stake(tokenId)
            ).to.be.revertedWith(
                'MonstropolyNFTStaking: checkLastUnstake'
            )

            const lastUnstake = await myNFTSTaking.getLastUnstake(tokenId)

            await ethers.provider.send("evm_setNextBlockTimestamp", [parseInt(lastUnstake) + 604801])

            await expect(
                myNFTSTaking.connect(staker).stake(tokenId)
            ).to.emit(
                myNFTSTaking, 'StakeNFT'
            ).withArgs(
                tokenId,
                staker.address
            )
        })
    })

    describe('Others', () => {
        it('role can setTrustedForwarder', async () => {
            await expect(
                myNFTSTaking.connect(staker).setTrustedForwarder(staker.address)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(staker.address).toLowerCase() + ' is missing role ' + NFT_STAKING_ADMIN_ROLE
            )
            await myNFTSTaking.connect(admin).setTrustedForwarder(staker.address)
        })
    })
})
