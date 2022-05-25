const hre = require('hardhat')
const ethers = hre.ethers
const {
    expectRevert
} = require('@openzeppelin/test-helpers')
const { artifacts } = require('hardhat')
const { expect } = require('chai')

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const LOCKER_ROLE = ethers.utils.id('LOCKER_ROLE')
const BASE_URI = 'https://monstropoly.io/tickets/'
const BASE_URI2 = 'https://ifps.io/ipfs/'
const CONTRACT_URI = ''
const CONTRACT_URI2 = 'https://ifps.io/ipfs/'
const IPFS_CID = 'QmVSjEGecMaM6xSA9ZRoT565t7zHgYnabYrKcB9pSka78z'
const _INTERFACE_ID_ERC721_METADATA = '0x5b5e139f';
const LAUNCHPAD_MAX_SUPPLY = 10
const LAUNCHPAD_MAX_BATCH = 3
const LAUNCHPAD_MAX_PER_ADDRESS = 5
const LAUNCHPAD_PRICE = ethers.utils.parseEther('1')

const NAME = "NAME"
const SYMBOL = "SYMBOL"

let myTickets, myLaunchpad

let accounts

describe('MonstropolyTickets', function () {
    let owner, person, person2, payee, validator

    before(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0]
        person = accounts[1]
        person2 = accounts[2]
        payee = accounts[3]
        validator = accounts[3]
    })

    beforeEach(async () => {
        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        const MonstropolyTickets = await ethers.getContractFactory('MonstropolyTickets')
        const Launchpad = await ethers.getContractFactory('Launchpad')
        myDeployer = await MonstropolyDeployer.deploy()

        myLaunchpad = await Launchpad.deploy()
        const initializeCalldata = MonstropolyTickets.interface.encodeFunctionData('initialize', [NAME, SYMBOL, BASE_URI, LAUNCHPAD_MAX_SUPPLY, myLaunchpad.address]);
        const implementation = await MonstropolyTickets.deploy()
        await myDeployer.deployProxyWithImplementation(ethers.utils.id("TICKETS_"), implementation.address, initializeCalldata)
        const factory = await myDeployer.get(ethers.utils.id("TICKETS_"))
        myTickets = MonstropolyTickets.attach(factory)

        await myDeployer.grantRole(MINTER_ROLE, owner.address)
    })

    describe('mint', () => {
        it('can mint and emit Transfer event', async () => {
            await expect(
                myTickets.mint(person.address)
            ).to.emit(
                myTickets, 'Transfer'
            ).withArgs(
                ethers.constants.AddressZero,
                person.address,
                0
            )

            const _owner = await myTickets.ownerOf(0)
            const _balance = await myTickets.balanceOf(person.address)
            expect(_owner).to.equal(person.address)
            expect(_balance).to.equal(1)
        })

        it('only MINTER_ROLE can mint', async () => {
            await expect(
                myTickets.connect(person).mint(person.address)
            ).to.be.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + MINTER_ROLE
            )
        })

        it('can mintBatch and emit Transfer event', async () => {
            const amount = 10
            await expect(
                myTickets.mintBatch(person.address, amount)
            ).to.emit(
                myTickets, 'Transfer'
            ).withArgs(
                ethers.constants.AddressZero,
                person.address,
                1
            )

            for (let i = 0; i < amount; i++) {
                const _owner = await myTickets.ownerOf(i)
                expect(_owner).to.equal(person.address)
            }

            const _balance = await myTickets.balanceOf(person.address)
            expect(_balance).to.equal(10)
        })

        it('can safeTransferFromBatch and emit Transfer event', async () => {
            const amount = 3
            await expect(
                myTickets.mintBatch(person.address, amount)
            ).to.emit(
                myTickets, 'Transfer'
            ).withArgs(
                ethers.constants.AddressZero,
                person.address,
                1
            )

            const froms = [person.address, person.address, person.address]
            const tos = [person2.address, person2.address, payee.address]
            const tokenIds = [0, 1, 2]

            await expect(
                myTickets.connect(person).safeTransferFromBatch(froms, tos, tokenIds)
            ).to.emit(
                myTickets, 'Transfer'
            ).withArgs(
                person.address,
                person2.address,
                1
            )

            const _balance = await myTickets.balanceOf(person.address)
            expect(_balance).to.equal(0)
        })
    })

    describe('uris', () => {
        it('can get baseURI', async () => {
            let baseURI = await myTickets.baseURI()
            expect(baseURI).to.equal(BASE_URI)
        })

        it('can setBaseURI and get new baseURI', async () => {
            await myTickets.setBaseURI(BASE_URI2)
            let baseURI = await myTickets.baseURI()
            expect(baseURI).to.equal(BASE_URI2)
        })

        it('only default admin role can setBaseURI', async () => {
            await expectRevert(
                (await myTickets.connect(person)).setBaseURI(BASE_URI2),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        })

        it('can get contractURI', async () => {
            let contractURI = await myTickets.contractURI()
            expect(contractURI).to.equal(CONTRACT_URI)
        })

        it('can setBaseURI and get new baseURI', async () => {
            await myTickets.setContractURI(CONTRACT_URI2)
            let contractURI = await myTickets.contractURI()
            expect(contractURI).to.equal(CONTRACT_URI2)
        })

        it('only default admin role can setContractURI', async () => {
            await expectRevert(
                (await myTickets.connect(person)).setContractURI(CONTRACT_URI2),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        })

        it('can get tokenURI', async () => {
            await myTickets.mint(person.address)
            let tokenURI = await myTickets.tokenURI('0')
            expect(tokenURI).to.equal(BASE_URI + '0')
        })

        it('can get tokenURI after setBaseURI', async () => {
            await myTickets.mint(person.address)
            let tokenURI = await myTickets.tokenURI('0')
            await myTickets.setBaseURI(BASE_URI2)
            let tokenURI2 = await myTickets.tokenURI('0')
            expect(tokenURI).to.equal(BASE_URI + '0')
            expect(tokenURI2).to.equal(BASE_URI2 + '0')
        })
    })

    describe('approvals', () => {
        it('can get isApproved being the owner', async () => {
            await myTickets.mint(person.address)
            let approval = await myTickets.isApproved(person.address, '0')
            expect(approval).to.equal(true)
        })

        it('can get isApproved after approve', async () => {
            await myTickets.mint(person.address)
            await myTickets.connect(person).approve(person2.address, '0')
            let approval = await myTickets.isApproved(person2.address, '0')
            expect(approval).to.equal(true)
        })

        it('can get isApproved after setApprovalForAll', async () => {
            await myTickets.mint(person.address)
            await myTickets.connect(person).setApprovalForAll(person2.address, true)
            let approval = await myTickets.isApproved(person2.address, '0')
            expect(approval).to.equal(true)
        })
    })

    describe('erc165', () => {
        it('can get isApproved being the owner', async () => {
            let supported = await myTickets.supportsInterface(_INTERFACE_ID_ERC721_METADATA)
            expect(supported).to.equal(true)
        })
    })

    describe('burn', () => {
        it('can burn being owner', async () => {
            await myTickets.mint(person.address)
            let existence = await myTickets.exists('0')
            expect(existence).to.equal(true)
            await myTickets.connect(person).burn('0')
            existence = await myTickets.exists('0')
            expect(existence).to.equal(false)
        })

        it('can burn being approved', async () => {
            await myTickets.mint(person.address)
            await myTickets.connect(person).approve(person2.address, '0')
            let existence = await myTickets.exists('0')
            expect(existence).to.equal(true)
            await myTickets.connect(person2).burn('0')
            existence = await myTickets.exists('0')
            expect(existence).to.equal(false)
        })

        it('can burn being operator', async () => {
            await myTickets.mint(person.address)
            await myTickets.connect(person).setApprovalForAll(person2.address, true)
            let existence = await myTickets.exists('0')
            expect(existence).to.equal(true)
            await myTickets.connect(person2).burn('0')
            existence = await myTickets.exists('0')
            expect(existence).to.equal(false)
        })
    })

    describe('Galler', () => {
        const listingTime = parseInt(Date.now() * 2 / 1000)
        const expirationTime = parseInt(Date.now() * 3 / 1000)
        beforeEach(async () => {
            await myLaunchpad.addCampaign(
                myTickets.address,
                1,
                payee.address,
                LAUNCHPAD_PRICE,
                listingTime,
                expirationTime,
                LAUNCHPAD_MAX_SUPPLY,
                LAUNCHPAD_MAX_BATCH,
                LAUNCHPAD_MAX_PER_ADDRESS,
                validator.address
            )
        })

        it('cant mintWhitelisted before listingTime', async () => {

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, person.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))
            
            await expect(
                myLaunchpad.connect(person).mintWhitelisted(
                    myTickets.address, 
                    1, 
                    signature, 
                    { value: LAUNCHPAD_PRICE }
                )
            ).to.be.revertedWith(
                'activity not start'
            )
        })

        it('can mintWhitelisted', async () => {

            await ethers.provider.send("evm_setNextBlockTimestamp", [listingTime])

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, person.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))
            await myLaunchpad.connect(person).mintWhitelisted(
                myTickets.address, 
                1, 
                signature, 
                { value: LAUNCHPAD_PRICE }
            )

            const _owner = await myTickets.ownerOf(0)
            expect(_owner).to.equal(person.address)
        })

        it('cant mintWhitelisted more than batch size', async () => {

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, person.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))
            
            await expect(
                myLaunchpad.connect(person).mintWhitelisted(
                    myTickets.address, 
                    11, 
                    signature, 
                    { value: ethers.utils.parseEther('11') }
                )
            ).to.be.revertedWith(
                'reach max batch size'
            )
        })

        it('cant mintWhitelisted more than per address limit', async () => {

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, person.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))

            await myLaunchpad.connect(person).mintWhitelisted(
                myTickets.address, 
                3, 
                signature, 
                { value: ethers.utils.parseEther('3') }
            )
            
            await expect(
                myLaunchpad.connect(person).mintWhitelisted(
                    myTickets.address, 
                    3, 
                    signature, 
                    { value: ethers.utils.parseEther('3') }
                )
            ).to.be.revertedWith(
                'reach max per address limit'
            )
        })

        it('cant mintWhitelisted more than Tickets.LAUNCH_MAX_SUPPLY', async () => {

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, person.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))

            await myTickets.updateLaunchpadConfig(1, myLaunchpad.address)
            
            await expect(
                myLaunchpad.connect(person).mintWhitelisted(
                    myTickets.address, 
                    2, 
                    signature, 
                    { value: ethers.utils.parseEther('2') }
                )
            ).to.be.revertedWith(
                'MonstropolyTickets: max launchpad supply reached'
            )
        })

        it('only launchpad can call mintTo', async () => {

            await myTickets.updateLaunchpadConfig(100, ethers.constants.AddressZero)
            
            await expect(
                myTickets.mintTo(
                    person.address, 
                    1
                )
            ).to.be.revertedWith(
                "MonstropolyTickets: launchpad address must set"
            )
        })

        it('only launchpad can call mintTo', async () => {
            
            await expect(
                myTickets.mintTo(
                    person.address, 
                    1
                )
            ).to.be.revertedWith(
                "MonstropolyTickets: must call by launchpad"
            )
        })

        it('cant mintTo zero address', async () => {

            await myTickets.updateLaunchpadConfig(100, owner.address)
            
            await expect(
                myTickets.mintTo(
                    ethers.constants.AddressZero, 
                    2
                )
            ).to.be.revertedWith(
                "MonstropolyTickets: can't mint to empty address"
            )
        })

        it('cant mintTo with size zero', async () => {

            await myTickets.updateLaunchpadConfig(100, owner.address)
            
            await expect(
                myTickets.mintTo(
                    person.address, 
                    0
                )
            ).to.be.revertedWith(
                "MonstropolyTickets: size must greater than zero"
            )
        })

        it('cant mintWhitelisted after expirationTime', async () => {

            await ethers.provider.send("evm_setNextBlockTimestamp", [expirationTime + 1])

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, person.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))
            
            await expect(
                myLaunchpad.connect(person).mintWhitelisted(
                    myTickets.address, 
                    1, 
                    signature, 
                    { value: LAUNCHPAD_PRICE }
                )
            ).to.be.revertedWith(
                'activity ended'
            )
        })
    })
})
