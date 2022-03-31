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
const CONTRACT_URI = 'https://monstropoly.io/ticketsContractUri/'
const CONTRACT_URI2 = 'https://ifps.io/ipfs/'
const IPFS_CID = 'QmVSjEGecMaM6xSA9ZRoT565t7zHgYnabYrKcB9pSka78z'
const _INTERFACE_ID_ERC721_METADATA = '0x5b5e139f';

let myTickets

let accounts

describe('MonstropolyTickets', function () {
    let owner, person, person2

    before(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0]
        person = accounts[1]
        person2 = accounts[2]
    })

    beforeEach(async () => {
        const MonstropolyTickets = await ethers.getContractFactory('MonstropolyTickets')
        const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy')
        const implementation = await MonstropolyTickets.deploy()
        const initializeCalldata = MonstropolyTickets.interface.encodeFunctionData('initialize', []);
        const myProxy = await ERC1967Proxy.deploy(implementation.address, initializeCalldata)
        myTickets = MonstropolyTickets.attach(myProxy.address)
    })

    describe('mint', () => {
        it('can mint and emit Transfer event', async () => {
            const boxId = 0
            await expect(
                myTickets.mint(person.address, boxId)
            ).to.emit(
                myTickets, 'Transfer'
            ).withArgs(
                ethers.constants.AddressZero,
                person.address,
                0
            )

            const _owner = await myTickets.ownerOf(0)
            const _boxId = await myTickets.boxIdOfToken(0)
            const _balance = await myTickets.balanceOf(person.address)
            expect(_owner).to.equal(person.address)
            expect(_boxId).to.equal(boxId)
            expect(_balance).to.equal(1)
        })

        it('only MINTER_ROLE can mint', async () => {
            const boxId = 0
            await expect(
                myTickets.connect(person).mint(person.address, boxId)
            ).to.be.revertedWith(
                'AccessControl: account ' + String(person.address).toLowerCase() + ' is missing role ' + MINTER_ROLE
            )
        })

        it('can mintBatch and emit Transfer event', async () => {
            const boxId = 1
            const amount = 10
            await expect(
                myTickets.mintBatch(person.address, boxId, amount)
            ).to.emit(
                myTickets, 'Transfer'
            ).withArgs(
                ethers.constants.AddressZero,
                person.address,
                1
            )

            for (let i = 0; i < amount; i++) {
                const _owner = await myTickets.ownerOf(i)
                const _boxId = await myTickets.boxIdOfToken(i)
                expect(_owner).to.equal(person.address)
                expect(_boxId).to.equal(boxId)
            }

            const _balance = await myTickets.balanceOf(person.address)
            expect(_balance).to.equal(10)
        })

        it('reverts when boxIdOfToken of inexistent', async () => {
            await expectRevert(
                myTickets.boxIdOfToken('0'),
                'MonstropolyTickets: inexistent'
            )
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
                'AccessControl: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
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

        it('only default admin role can setBaseURI', async () => {
            await expectRevert(
                (await myTickets.connect(person)).setContractURI(CONTRACT_URI2),
                'AccessControl: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        })

        it('can get tokenURI', async () => {
            const boxId = 1
            await myTickets.mint(person.address, boxId)
            let tokenURI = await myTickets.tokenURI('0')
            expect(tokenURI).to.equal(BASE_URI + '0')
        })

        it('can get tokenURI after setBaseURI', async () => {
            const boxId = 1
            await myTickets.mint(person.address, boxId)
            let tokenURI = await myTickets.tokenURI('0')
            await myTickets.setBaseURI(BASE_URI2)
            let tokenURI2 = await myTickets.tokenURI('0')
            expect(tokenURI).to.equal(BASE_URI + '0')
            expect(tokenURI2).to.equal(BASE_URI2 + '0')
        })
    })

    describe('approvals', () => {
        it('can get isApproved being the owner', async () => {
            const boxId = 1
            await myTickets.mint(person.address, boxId)
            let approval = await myTickets.isApproved(person.address, '0')
            expect(approval).to.equal(true)
        })

        it('can get isApproved after approve', async () => {
            const boxId = 1
            await myTickets.mint(person.address, boxId)
            await myTickets.connect(person).approve(person2.address, '0')
            let approval = await myTickets.isApproved(person2.address, '0')
            expect(approval).to.equal(true)
        })

        it('can get isApproved after setApprovalForAll', async () => {
            const boxId = 1
            await myTickets.mint(person.address, boxId)
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
            const boxId = 1
            await myTickets.mint(person.address, boxId)
            let existence = await myTickets.exists('0')
            expect(existence).to.equal(true)
            await myTickets.connect(person).burn('0')
            existence = await myTickets.exists('0')
            expect(existence).to.equal(false)
        })

        it('can burn being approved', async () => {
            const boxId = 1
            await myTickets.mint(person.address, boxId)
            await myTickets.connect(person).approve(person2.address, '0')
            let existence = await myTickets.exists('0')
            expect(existence).to.equal(true)
            await myTickets.connect(person2).burn('0')
            existence = await myTickets.exists('0')
            expect(existence).to.equal(false)
        })

        it('can burn being operator', async () => {
            const boxId = 1
            await myTickets.mint(person.address, boxId)
            await myTickets.connect(person).setApprovalForAll(person2.address, true)
            let existence = await myTickets.exists('0')
            expect(existence).to.equal(true)
            await myTickets.connect(person2).burn('0')
            existence = await myTickets.exists('0')
            expect(existence).to.equal(false)
        })
    })
})
