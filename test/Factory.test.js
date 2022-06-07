const hre = require('hardhat')
const ethers = hre.ethers
const { expect } = require('chai')

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.id('MONSTER_MINTER_ROLE')
const LOCKER_ROLE = ethers.utils.id('MONSTER_LOCKER_ROLE')
const MONSTER_BREED_USES_ROLE = ethers.utils.id('MONSTER_BREED_USES_ROLE')
const MONSTER_GAMER_UPDATER_ROLE = ethers.utils.id('MONSTER_GAMER_UPDATER_ROLE')
const MONSTER_BREEDER_UPDATER_ROLE = ethers.utils.id('MONSTER_BREEDER_UPDATER_ROLE')
const MONSTER_ADMIN_ROLE = ethers.utils.id('MONSTER_ADMIN_ROLE')
const BASE_URI = 'https://monstropoly.io/nfts/'
const BASE_URI2 = 'https://ifps.io/ipfs/'
const CONTRACT_URI = 'https://monstropoly.io/contractUri/'
const CONTRACT_URI2 = 'https://ifps.io/ipfs/'
const IPFS_CID = 'QmVSjEGecMaM6xSA9ZRoT565t7zHgYnabYrKcB9pSka78z'
const _INTERFACE_ID_ERC721_METADATA = '0x5b5e139f';

let myFactory, myDeployer, accounts

describe('MonstropolyFactory', function () {
    let owner, person, person2

    before(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0]
        person = accounts[1]
        person2 = accounts[2]
        locker = accounts[3]
        breederContract = accounts[4]
        gameerContract = accounts[5]
        breedUsesContract = accounts[6]
    })

    beforeEach(async () => {

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        myDeployer = await MonstropolyDeployer.connect(accounts[9]).deploy()
        await myDeployer.connect(accounts[9]).grantRole(DEFAULT_ADMIN_ROLE, accounts[0].address)
        await myDeployer.connect(accounts[9]).renounceRole(DEFAULT_ADMIN_ROLE, accounts[9].address)
        myDeployer = myDeployer.connect(accounts[0])

        const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
        let calldataerc721 = erc721Factory.interface.encodeFunctionData('initialize', []);
        const factoryImp = await erc721Factory.deploy()

        await myDeployer.deployProxyWithImplementation(ethers.utils.id("FACTORY"), factoryImp.address, calldataerc721)
        const factory = await myDeployer.get(ethers.utils.id("FACTORY"))
        myFactory = erc721Factory.attach(factory)

        await myDeployer.grantRole(MINTER_ROLE, owner.address)
        await myDeployer.grantRole(MONSTER_ADMIN_ROLE, owner.address)
        await myDeployer.grantRole(LOCKER_ROLE, locker.address)
        await myDeployer.grantRole(MONSTER_BREEDER_UPDATER_ROLE, breederContract.address)
        await myDeployer.grantRole(MONSTER_GAMER_UPDATER_ROLE, gameerContract.address)
        await myDeployer.grantRole(MONSTER_BREED_USES_ROLE, breedUsesContract.address)
    })
    describe('mint', () => {
        it('can mint a random tokenId', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            const receipt = await response.wait()
            let nft = await myFactory.tokenOfId(tokenId)
            let tokenOwner = await myFactory.ownerOf(tokenId)
            const block = await ethers.provider.getBlock(receipt.blockHash)
            expect(tokenOwner).to.eq(owner)
            expect(nft.rarity).to.eq(rarity)
            expect(nft.breedUses).to.eq(breedUses)
            expect(nft.locked).to.eq(false)
            expect(nft.gamer).to.eq(owner)
            expect(nft.breeder).to.eq(owner)
            expect(nft.bornAt.toString()).to.eq(block.timestamp.toString())
        })

        it('can mint a random tokenId and get existence', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            await expect(
                myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            ).to.emit(
                myFactory, 'Mint'
            ).withArgs(
                owner,
                tokenId,
                rarity,
                breedUses,
                generation
            )
            const existence0 = await myFactory.exists(tokenId)
            const existence1 = await myFactory.exists('1')
            expect(existence0).to.equal(true)
            expect(existence1).to.equal(false)
        })

        it('reverts if mint an existing tokenId', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await expect(
                myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            ).to.be.revertedWith(
                'MonstropolyFactory: tokenId used'
            )
        })

        it('can mint a random tokenId and tokenId keeps used after burn', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            const isUsed = await myFactory.isTokenIdUsed(tokenId)
            await myFactory.connect(person).burn(tokenId)
            const isUsedBurn = await myFactory.isTokenIdUsed(tokenId)
            expect(isUsed).to.equal(true)
            expect(isUsedBurn).to.equal(true)
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
            await expect(
                myFactory.connect(person).setBaseURI(BASE_URI2)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + MONSTER_ADMIN_ROLE
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

        it('only default admin role can setContractURI', async () => {
            await expect(
                myFactory.connect(person).setContractURI(CONTRACT_URI2)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + MONSTER_ADMIN_ROLE
            )
        })

        it('can get tokenURI when _tokenURIs is empty', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let tokenURI = await myFactory.tokenURI(tokenId)
            expect(tokenURI).to.equal(BASE_URI + tokenId.toString())
        })

        it('can get tokenURI when _tokenURIs is empty after setBaseURI', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let tokenURI = await myFactory.tokenURI(tokenId)
            await myFactory.setBaseURI(BASE_URI2)
            let tokenURI2 = await myFactory.tokenURI(tokenId)
            expect(tokenURI).to.equal(BASE_URI + tokenId.toString())
            expect(tokenURI2).to.equal(BASE_URI2 + tokenId.toString())
        })

        it('can get tokenURI when _tokenURIs is setted', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await myFactory.setBaseURI(BASE_URI2)
            await myFactory.setTokenURI(tokenId, IPFS_CID)
            let tokenURI = await myFactory.tokenURI(tokenId)
            expect(tokenURI).to.equal(BASE_URI2 + IPFS_CID)
        })

        it('can get tokenURI when _tokenURIs is setted only in some IDs', async () => {
            const owner = person.address
            const tokenId = 7
            const tokenId2 = 2
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            const receipt2 = await myFactory.mint(owner, tokenId2, rarity, breedUses, generation)
            await myFactory.setTokenURI(tokenId2, IPFS_CID)
            let tokenURI0 = await myFactory.tokenURI(tokenId)
            let tokenURI1 = await myFactory.tokenURI(tokenId2)
            expect(tokenURI0).to.equal(BASE_URI + tokenId.toString())
            expect(tokenURI1).to.equal(BASE_URI + IPFS_CID)
        })
    })
    describe('lock stuff', () => {
        it('can get isLocked', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(false)
        })

        it('can lockToken', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(false)
            // await (await myFactory.connect(locker)).lockToken(tokenId)
            await expect(
                myFactory.connect(locker).lockToken(tokenId)
            ).to.emit(
                myFactory, 'LockToken'
            ).withArgs(
                tokenId
            )
            locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(true)
        })

        it('cant lockToken already locked', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await myFactory.connect(locker).lockToken(tokenId)
            await expect(
                myFactory.connect(locker).lockToken(tokenId)
            ).to.revertedWith(
                'MonstropolyFactory: already locked'
            )
        })

        it('can unlockToken', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(false)
            await myFactory.connect(locker).lockToken(tokenId)
            locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(true)
            await expect(
                myFactory.connect(locker).unlockToken(tokenId)
            ).to.emit(
                myFactory, 'UnlockToken'
            ).withArgs(
                tokenId
            )
            locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(false)
        })

        it('cant unlockToken already unlocked', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await (await myFactory.connect(locker)).lockToken(tokenId)
            await (await myFactory.connect(locker)).unlockToken(tokenId)
            await expect(
                myFactory.connect(locker).unlockToken(tokenId)
            ).to.revertedWith(
                'MonstropolyFactory: already unlocked'
            )
        })

        it('reverts when trying to transfer lockedToken', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(false)
            await (await myFactory.connect(locker)).lockToken(tokenId)
            locked = await myFactory.isLocked(tokenId)
            expect(locked).to.equal(true)

            await expect(
                myFactory.connect(person).transferFrom(person.address, person2.address, tokenId)
            ).to.revertedWith(
                'MonstropolyFactory: locked token'
            )
        })
    })

    describe('gaming and breeding stuff', () => {
        it('can setGamer', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let nft = await myFactory.tokenOfId(tokenId)
            const gamer1 = nft.gamer
            await expect(
                myFactory.connect(gameerContract).setGamer(tokenId, person2.address)
            ).to.emit(
                myFactory, 'SetGamer'
            ).withArgs(
                tokenId,
                person2.address
            )
            nft = await myFactory.tokenOfId(tokenId)
            const gamer2 = nft.gamer
            expect(gamer1).to.equal(person.address)
            expect(gamer2).to.equal(person2.address)
        })

        it('only role can setGamer', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await expect(
                myFactory.connect(person).setGamer(tokenId, person2.address)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + MONSTER_GAMER_UPDATER_ROLE
            )
            await expect(
                myFactory.connect(gameerContract).setGamer(tokenId, person2.address)
            ).to.emit(
                myFactory, 'SetGamer'
            ).withArgs(
                tokenId,
                person2.address
            )
        })

        it('can setBreeder', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let nft = await myFactory.tokenOfId(tokenId)
            const breeder1 = nft.breeder
            await expect(
                myFactory.connect(breederContract).setBreeder(tokenId, person2.address)
            ).to.emit(
                myFactory, 'SetBreeder'
            ).withArgs(
                tokenId,
                person2.address
            )
            nft = await myFactory.tokenOfId(tokenId)
            const breeder2 = nft.breeder
            expect(breeder1).to.equal(person.address)
            expect(breeder2).to.equal(person2.address)
        })

        it('only role can setBreeder', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await expect(
                myFactory.connect(person).setBreeder(tokenId, person2.address)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + MONSTER_BREEDER_UPDATER_ROLE
            )
            await expect(
                myFactory.connect(breederContract).setBreeder(tokenId, person2.address)
            ).to.emit(
                myFactory, 'SetBreeder'
            ).withArgs(
                tokenId,
                person2.address
            )
        })

        it('can setBreedUses', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let nft = await myFactory.tokenOfId(tokenId)
            const breeder1 = parseInt(nft.breedUses)
            const newBreedUses = breedUses - 1
            await expect(
                myFactory.connect(breedUsesContract).setBreedUses(tokenId, newBreedUses)
            ).to.emit(
                myFactory, 'SetBreedUses'
            ).withArgs(
                tokenId,
                newBreedUses
            )
            nft = await myFactory.tokenOfId(tokenId)
            const breeder2 = parseInt(nft.breedUses)
            expect(breeder1).to.equal(breedUses)
            expect(breeder2).to.equal(newBreedUses)
        })

        it('only role can setBreedUses', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            const newBreedUses = breedUses - 1
            await expect(
                myFactory.connect(person).setBreedUses(tokenId, newBreedUses)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + MONSTER_BREED_USES_ROLE
            )
            await expect(
                myFactory.connect(breedUsesContract).setBreedUses(tokenId, newBreedUses)
            ).to.emit(
                myFactory, 'SetBreedUses'
            ).withArgs(
                tokenId,
                newBreedUses
            )
        })
    })

    describe('approvals stuff', () => {
        it('can get isApproved being the owner', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let approval = await myFactory.isApproved(person.address, tokenId)
            expect(approval).to.equal(true)
        })

        it('can get isApproved after approve', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await (await myFactory.connect(person)).approve(person2.address, tokenId)
            let approval = await myFactory.isApproved(person2.address, tokenId)
            expect(approval).to.equal(true)
        })

        it('can get isApproved after setApprovalForAll', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await (await myFactory.connect(person)).setApprovalForAll(person2.address, true)
            let approval = await myFactory.isApproved(person2.address, tokenId)
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
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            let existence = await myFactory.exists(tokenId)
            expect(existence).to.equal(true)
            await (await myFactory.connect(person)).burn(tokenId)
            existence = await myFactory.exists(tokenId)
            expect(existence).to.equal(false)
        })

        it('can burn being approved', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await (await myFactory.connect(person)).approve(person2.address, tokenId)
            let existence = await myFactory.exists(tokenId)
            expect(existence).to.equal(true)
            await (await myFactory.connect(person2)).burn(tokenId)
            existence = await myFactory.exists(tokenId)
            expect(existence).to.equal(false)
        })

        it('can burn being operator', async () => {
            const owner = person.address
            const tokenId = 7
            const rarity = 1
            const breedUses = 3
            const generation = 1
            const response = await myFactory.mint(owner, tokenId, rarity, breedUses, generation)
            await (await myFactory.connect(person)).setApprovalForAll(person2.address, true)
            let existence = await myFactory.exists(tokenId)
            expect(existence).to.equal(true)
            await (await myFactory.connect(person2)).burn(tokenId)
            existence = await myFactory.exists(tokenId)
            expect(existence).to.equal(false)
        })
    })
})
