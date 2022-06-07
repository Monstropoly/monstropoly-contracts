const hre = require('hardhat')
const ethers = hre.ethers
const { expect } = require('chai')

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = ethers.utils.id('TICKETS_MINTER_ROLE')
const TICKETS_ADMIN_ROLE = ethers.utils.id('TICKETS_ADMIN_ROLE')
const TREASURY_WALLET = ethers.utils.id('TREASURY_WALLET')
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
        discountedOG = accounts[4]
        discountedOG2 = accounts[5]
        discountedVIP = accounts[6]
        discountedVIP2 = accounts[7]
    })

    beforeEach(async () => {
        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        const MonstropolyTickets = await ethers.getContractFactory('MonstropolyTickets')
        const Launchpad = await ethers.getContractFactory('Launchpad')
        myDeployer = await MonstropolyDeployer.connect(accounts[9]).deploy()
        await myDeployer.connect(accounts[9]).grantRole(DEFAULT_ADMIN_ROLE, accounts[0].address)
        await myDeployer.connect(accounts[9]).renounceRole(DEFAULT_ADMIN_ROLE, accounts[9].address)
        myDeployer = myDeployer.connect(accounts[0])

        myLaunchpad = await Launchpad.deploy()
        const initializeCalldata = MonstropolyTickets.interface.encodeFunctionData('initialize', [NAME, SYMBOL, BASE_URI, LAUNCHPAD_MAX_SUPPLY, myLaunchpad.address]);
        const implementation = await MonstropolyTickets.deploy()
        await myDeployer.deployProxyWithImplementation(ethers.utils.id("TICKETS_"), implementation.address, initializeCalldata)
        const factory = await myDeployer.get(ethers.utils.id("TICKETS_"))
        myTickets = MonstropolyTickets.attach(factory)

        await myDeployer.grantRole(MINTER_ROLE, owner.address)
        await myDeployer.grantRole(TICKETS_ADMIN_ROLE, owner.address)
        await myDeployer.setId(TREASURY_WALLET, payee.address)
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

            const tokens = await myTickets.getLastOwnedTokenIds(person.address, amount, 0)

            for (let j = 0; j < amount; j++) {
                expect(parseInt(tokens[j])).to.equal(j)
            }
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
            const wrongTos = [person2.address, person2.address]
            const tokenIds = [0, 1, 2]
            const wrongTokenIds = [0, 1]

            await expect(
                myTickets.connect(person).safeTransferFromBatch(froms, tos, wrongTokenIds)
            ).to.revertedWith(
                'MonstropolyTickets: wrong lengths'
            )

            await expect(
                myTickets.connect(person).safeTransferFromBatch(froms, wrongTos, tokenIds)
            ).to.revertedWith(
                'MonstropolyTickets: wrong lengths'
            )

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
            await expect(
                myTickets.connect(person).setBaseURI(BASE_URI2)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + TICKETS_ADMIN_ROLE
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
            await expect(
                myTickets.connect(person).setContractURI(CONTRACT_URI2)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + TICKETS_ADMIN_ROLE
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

    describe('ETHManager', () => {

        it('can setMaster', async () => {
            const ethManager = await myTickets.ethManager()
            const ethManagerContract = await ethers.getContractAt('ETHManager', ethManager)
            const master1 = await ethManagerContract.master()
            await ethManagerContract.setMaster(owner.address)
            const master2 = await ethManagerContract.master()
            expect(master1).to.equal(myTickets.address)
            expect(master2).to.equal(owner.address)
        })

        it('only owner can setMaster', async () => {
            const ethManager = await myTickets.ethManager()
            const ethManagerContract = await ethers.getContractAt('ETHManager', ethManager)

            await expect(
                ethManagerContract.connect(person).setMaster(owner.address)
            ).to.be.revertedWith(
                "Ownable: caller is not the owner"
            )
        })

        it('only master can safeTransfer', async () => {
            const ethManager = await myTickets.ethManager()
            const ethManagerContract = await ethers.getContractAt('ETHManager', ethManager)

            await expect(
                ethManagerContract.connect(person).safeTransferETH(person.address, 1)
            ).to.be.revertedWith(
                "ETHManager: caller is not the _master"
            )
        })

        it('reverts if eth transfer fails', async () => {
            const ethManager = await myTickets.ethManager()
            const ethManagerContract = await ethers.getContractAt('ETHManager', ethManager)
            await ethManagerContract.setMaster(owner.address)

            await expect(
                ethManagerContract.safeTransferETH(myTickets.address, 1)
            ).to.be.revertedWith(
                "ETHManager: ETH_TRANSFER_FAILED"
            )
        })
    })

    describe('Galler', () => {
        const listingTime = parseInt(Date.now() * 2 / 1000)
        const expirationTime = parseInt(Date.now() * 3 / 1000)
        const discountAmount1 = ethers.utils.parseEther('0.2')
        const discountAmount2 = ethers.utils.parseEther('0.3')
        beforeEach(async () => {
            const ethManager = await myTickets.ethManager()
            const addresses = [
                myTickets.address,
                ethManager,
                payee.address,
                validator.address
            ]
            const values = [
                0,
                LAUNCHPAD_PRICE,
                LAUNCHPAD_MAX_SUPPLY,
                listingTime,
                expirationTime,
                LAUNCHPAD_MAX_BATCH,
                LAUNCHPAD_MAX_PER_ADDRESS
            ]
            await myLaunchpad.addCampaign(
                addresses,
                1,
                values
            )

            await myTickets.setDiscountAmounts(discountAmount1, discountAmount2)
            const discountAccountsOG = [discountedOG.address, discountedOG2.address]
            const discountAccountsVIP = [discountedVIP.address, discountedVIP2.address]
            await myTickets.setDiscountAccounts(discountAccountsOG, 1)
            await myTickets.setDiscountAccounts(discountAccountsVIP, 2)
        })

        it('can getDiscount', async () => {
            const discountAccountsOG = [discountedOG.address, discountedOG2.address]
            const discount = await myTickets.getDiscount(discountAccountsOG[0])
            await myTickets.setDiscountAccounts(discountAccountsOG, 0)
            const discount2 = await myTickets.getDiscount(discountAccountsOG[0])
            await myTickets.setDiscountAccounts(discountAccountsOG, 1)
            const discount3 = await myTickets.getDiscount(discountAccountsOG[1])
            await myTickets.setDiscountAccounts(discountAccountsOG, 2)
            const discount4 = await myTickets.getDiscount(discountAccountsOG[1])
            expect(discount.toString()).to.equal(discountAmount1.toString())
            expect(discount2.toString()).to.equal('0')
            expect(discount3.toString()).to.equal(discountAmount1.toString())
            expect(discount4.toString()).to.equal(discountAmount2.toString())
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
            const launchSupply1 = await myTickets.getLaunchpadSupply()
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

            const launchSupply2 = await myTickets.getLaunchpadSupply()
            expect(parseInt(launchSupply1)).to.equal(0)
            expect(parseInt(launchSupply2)).to.equal(1)
        })

        it('can mintWhitelisted with discountOG', async () => {
            const launchSupply1 = await myTickets.getLaunchpadSupply()

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, discountedOG.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))

            const ethManager = await myTickets.ethManager()
            const ethManagerBalancePre = await ethers.provider.getBalance(ethManager)
            const vaultBalancePre = await ethers.provider.getBalance(payee.address)
            const discountedBalancePre = await ethers.provider.getBalance(discountedOG.address)

            await myLaunchpad.connect(discountedOG).mintWhitelisted(
                myTickets.address, 
                1, 
                signature, 
                { value: LAUNCHPAD_PRICE }
            )

            const ethManagerBalancePost = await ethers.provider.getBalance(ethManager)
            const vaultBalancePost = await ethers.provider.getBalance(payee.address)
            const discountedBalancePost = await ethers.provider.getBalance(discountedOG.address)

            const vaultExpected = LAUNCHPAD_PRICE.sub(discountAmount1)
            const vaultReal = vaultBalancePost.sub(vaultBalancePre)
            const userSpent = discountedBalancePre.sub(discountedBalancePost)

            expect(ethManagerBalancePre.toString()).to.equal('0')
            expect(ethManagerBalancePost.toString()).to.equal('0')
            expect(vaultExpected.toString()).to.equal(vaultReal.toString())
            expect(parseInt(userSpent.toString())).to.be.gte(parseInt(vaultExpected.toString()))
            expect(parseInt(userSpent.toString())).to.be.lt(parseInt(LAUNCHPAD_PRICE.toString()))

            const _owner = await myTickets.ownerOf(0)
            expect(_owner).to.equal(discountedOG.address)

            const launchSupply2 = await myTickets.getLaunchpadSupply()
            expect(parseInt(launchSupply1)).to.equal(0)
            expect(parseInt(launchSupply2)).to.equal(1)
        })

        it('can mintWhitelisted with discountOG with size > 1', async () => {
            const launchSupply1 = await myTickets.getLaunchpadSupply()

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, discountedOG.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))
            const size = 3

            const ethManager = await myTickets.ethManager()
            const ethManagerBalancePre = await ethers.provider.getBalance(ethManager)
            const vaultBalancePre = await ethers.provider.getBalance(payee.address)
            const discountedBalancePre = await ethers.provider.getBalance(discountedOG.address)

            await myLaunchpad.connect(discountedOG).mintWhitelisted(
                myTickets.address, 
                size, 
                signature, 
                { value: LAUNCHPAD_PRICE.mul(size) }
            )

            const ethManagerBalancePost = await ethers.provider.getBalance(ethManager)
            const vaultBalancePost = await ethers.provider.getBalance(payee.address)
            const discountedBalancePost = await ethers.provider.getBalance(discountedOG.address)

            const vaultExpected = (LAUNCHPAD_PRICE.sub(discountAmount1)).mul(size)
            const vaultReal = vaultBalancePost.sub(vaultBalancePre)
            const userSpent = discountedBalancePre.sub(discountedBalancePost)

            expect(ethManagerBalancePre.toString()).to.equal('0')
            expect(ethManagerBalancePost.toString()).to.equal('0')
            expect(vaultExpected.toString()).to.equal(vaultReal.toString())
            expect(parseInt(userSpent.toString())).to.be.gte(parseInt(vaultExpected.toString()))
            expect(parseInt(userSpent.toString())).to.be.lt(parseInt((LAUNCHPAD_PRICE.mul(size)).toString()))

            const _owner = await myTickets.ownerOf(0)
            expect(_owner).to.equal(discountedOG.address)

            const launchSupply2 = await myTickets.getLaunchpadSupply()
            expect(parseInt(launchSupply1)).to.equal(0)
            expect(parseInt(launchSupply2)).to.equal(size)
        })

        it('can mintWhitelisted with discountVIP', async () => {
            const launchSupply1 = await myTickets.getLaunchpadSupply()

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, discountedVIP2.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))

            const ethManager = await myTickets.ethManager()
            const ethManagerBalancePre = await ethers.provider.getBalance(ethManager)
            const vaultBalancePre = await ethers.provider.getBalance(payee.address)
            const discountedBalancePre = await ethers.provider.getBalance(discountedVIP2.address)

            await myLaunchpad.connect(discountedVIP2).mintWhitelisted(
                myTickets.address, 
                1, 
                signature, 
                { value: LAUNCHPAD_PRICE }
            )

            const ethManagerBalancePost = await ethers.provider.getBalance(ethManager)
            const vaultBalancePost = await ethers.provider.getBalance(payee.address)
            const discountedBalancePost = await ethers.provider.getBalance(discountedVIP2.address)

            const vaultExpected = LAUNCHPAD_PRICE.sub(discountAmount2)
            const vaultReal = vaultBalancePost.sub(vaultBalancePre)
            const userSpent = discountedBalancePre.sub(discountedBalancePost)

            expect(ethManagerBalancePre.toString()).to.equal('0')
            expect(ethManagerBalancePost.toString()).to.equal('0')
            expect(vaultExpected.toString()).to.equal(vaultReal.toString())
            expect(parseInt(userSpent.toString())).to.be.gte(parseInt(vaultExpected.toString()))
            expect(parseInt(userSpent.toString())).to.be.lt(parseInt(LAUNCHPAD_PRICE.toString()))

            const _owner = await myTickets.ownerOf(0)
            expect(_owner).to.equal(discountedVIP2.address)

            const launchSupply2 = await myTickets.getLaunchpadSupply()
            expect(parseInt(launchSupply1)).to.equal(0)
            expect(parseInt(launchSupply2)).to.equal(1)
        })

        it('can mintWhitelisted with discountVIP with size > 1', async () => {
            const launchSupply1 = await myTickets.getLaunchpadSupply()

            const hash = ethers.utils.solidityKeccak256(
                ['uint256', 'address', 'address', 'address'],
                [ethers.provider._network.chainId, myLaunchpad.address, myTickets.address, discountedVIP.address]
            )
            const signature = validator.signMessage(ethers.utils.arrayify(hash))
            const size = 3

            const ethManager = await myTickets.ethManager()
            const ethManagerBalancePre = await ethers.provider.getBalance(ethManager)
            const vaultBalancePre = await ethers.provider.getBalance(payee.address)
            const discountedBalancePre = await ethers.provider.getBalance(discountedVIP.address)

            await myLaunchpad.connect(discountedVIP).mintWhitelisted(
                myTickets.address, 
                size, 
                signature, 
                { value: LAUNCHPAD_PRICE.mul(size) }
            )

            const ethManagerBalancePost = await ethers.provider.getBalance(ethManager)
            const vaultBalancePost = await ethers.provider.getBalance(payee.address)
            const discountedBalancePost = await ethers.provider.getBalance(discountedVIP.address)

            const vaultExpected = (LAUNCHPAD_PRICE.sub(discountAmount2)).mul(size)
            const vaultReal = vaultBalancePost.sub(vaultBalancePre)
            const userSpent = discountedBalancePre.sub(discountedBalancePost)

            expect(ethManagerBalancePre.toString()).to.equal('0')
            expect(ethManagerBalancePost.toString()).to.equal('0')
            expect(vaultExpected.toString()).to.equal(vaultReal.toString())
            expect(parseInt(userSpent.toString())).to.be.gte(parseInt(vaultExpected.toString()))
            expect(parseInt(userSpent.toString())).to.be.lt(parseInt((LAUNCHPAD_PRICE.mul(size)).toString()))

            const _owner = await myTickets.ownerOf(0)
            expect(_owner).to.equal(discountedVIP.address)

            const launchSupply2 = await myTickets.getLaunchpadSupply()
            expect(parseInt(launchSupply1)).to.equal(0)
            expect(parseInt(launchSupply2)).to.equal(size)
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
                'reach campaign total max supply'
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
