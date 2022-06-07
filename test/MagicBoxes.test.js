const { ethers } = require('hardhat');
const { expect } = require('chai')

let myDeployer
let myMagicBoxes
let myErc20
let myTickets
let myTickets2
let myFactory

let accounts

const BNB_PRICE = "50000000000"
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const MONSTER_MINTER_ROLE = ethers.utils.id('MONSTER_MINTER_ROLE')
const TICKETS_MINTER_ROLE = ethers.utils.id('TICKETS_MINTER_ROLE')
const MAGIC_BOXES_ADMIN_ROLE = ethers.utils.id('MAGIC_BOXES_ADMIN_ROLE')
const MAGIC_BOXES_SIGNER_ROLE = ethers.utils.id('MAGIC_BOXES_SIGNER_ROLE')
const TREASURY_WALLET = ethers.utils.id('TREASURY_WALLET')
const TICKETS = ethers.utils.id('TICKETS')
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

const BASE_URI = 'https://monstropoly.io/tickets/'
const LAUNCHPAD_MAX_SUPPLY = 10
const NAME = "NAME"
const SYMBOL = "SYMBOL"

describe('MonstropolyMagicBoxesShop', function () {
	let owner, person, person2, backend

	before(async () => {
		accounts = await ethers.getSigners();
		owner = accounts[0]
		person = accounts[1]
		person2 = accounts[2]
		team = accounts[3]
		backend = accounts[0]
	})
	beforeEach(async () => {
        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
		myDeployer = await MonstropolyDeployer.connect(accounts[9]).deploy()
        await myDeployer.connect(accounts[9]).grantRole(DEFAULT_ADMIN_ROLE, accounts[0].address)
        await myDeployer.connect(accounts[9]).renounceRole(DEFAULT_ADMIN_ROLE, accounts[9].address)
        myDeployer = myDeployer.connect(accounts[0])

		const MonstropolyMagicBoxesShop = await hre.ethers.getContractFactory('MonstropolyMagicBoxesShop')
		const MonstropolyFactory = await hre.ethers.getContractFactory('MonstropolyFactory')
		const MonstropolyERC20 = await hre.ethers.getContractFactory('MonstropolyERC20')
		let emptyInitializeCalldata = await MonstropolyMagicBoxesShop.interface.encodeFunctionData('initialize', []);

		await myDeployer.setId(ethers.utils.id("DISTRIBUTION_VAULT"), person.address)
		await myDeployer.deploy(ethers.utils.id("ERC20"), MonstropolyERC20.bytecode, emptyInitializeCalldata)
		await myDeployer.deploy(ethers.utils.id("MAGIC_BOXES"), MonstropolyMagicBoxesShop.bytecode, emptyInitializeCalldata)
        const factoryImp = await MonstropolyFactory.deploy()
        await myDeployer.deployProxyWithImplementation(ethers.utils.id("FACTORY"), factoryImp.address, emptyInitializeCalldata)

		const MonstropolyTickets = await ethers.getContractFactory('MonstropolyTickets')
        const Launchpad = await ethers.getContractFactory('Launchpad')
        const myLaunchpad = await Launchpad.deploy()
        const initializeCalldata = MonstropolyTickets.interface.encodeFunctionData('initialize', [NAME, SYMBOL, BASE_URI, LAUNCHPAD_MAX_SUPPLY, myLaunchpad.address]);
        const implementation = await MonstropolyTickets.deploy()
        await myDeployer.deployProxyWithImplementation(ethers.utils.id("TICKETS_"), implementation.address, initializeCalldata)
        await myDeployer.deployProxyWithImplementation(ethers.utils.id("TICKETS_2"), implementation.address, initializeCalldata)
        const ticketAddress = await myDeployer.get(ethers.utils.id("TICKETS_"))
        const ticketAddress2 = await myDeployer.get(ethers.utils.id("TICKETS_2"))
        myTickets = MonstropolyTickets.attach(ticketAddress)
        myTickets2 = MonstropolyTickets.attach(ticketAddress2)
        await myDeployer.grantRole(MINTER_ROLE, owner.address)

		const [erc20, magicBoxes, factory] = await Promise.all([
			myDeployer.get(ethers.utils.id("ERC20")),
			myDeployer.get(ethers.utils.id("MAGIC_BOXES")),
			myDeployer.get(ethers.utils.id("FACTORY"))
		])

		myErc20 = await MonstropolyERC20.attach(erc20)
		myMagicBoxes = await MonstropolyMagicBoxesShop.attach(magicBoxes)
		myFactory = await MonstropolyFactory.attach(factory)

		await myDeployer.grantRole(MONSTER_MINTER_ROLE, myMagicBoxes.address);
		await myDeployer.grantRole(TICKETS_MINTER_ROLE, owner.address);
		await myDeployer.grantRole(MAGIC_BOXES_ADMIN_ROLE, owner.address);
		await myDeployer.grantRole(MAGIC_BOXES_SIGNER_ROLE, backend.address);
        await myDeployer.setId(TREASURY_WALLET, team.address)

		await myMagicBoxes.updateMagicBox(0, 1, ethers.utils.parseEther('1250'), myErc20.address, ethers.utils.parseEther('20'), ethers.utils.parseEther('80'))
		await myMagicBoxes.updateMagicBox(1, 4, ethers.utils.parseEther('2'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'))
		await myMagicBoxes.updateMagicBox(2, 1, ethers.utils.parseEther('0'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'))
		await myMagicBoxes.updateMagicBox(3, 1, ethers.utils.parseEther('1'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'))
		await myMagicBoxes.updateMagicBox(4, 1, ethers.utils.parseEther('0'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'))
		await myMagicBoxes.updateMagicBox(5, 1, ethers.utils.parseEther('0'), ethers.constants.AddressZero, '0', ethers.utils.parseEther('100'))
		
		await myMagicBoxes.updateBoxSupply(0, 1000)
		await myMagicBoxes.updateBoxSupply(1, 1000)
		await myMagicBoxes.updateBoxSupply(2, 1000)
		await myMagicBoxes.updateBoxSupply(3, 0)
		await myMagicBoxes.updateBoxSupply(4, 1000)
		await myMagicBoxes.updateBoxSupply(5, 1000)

		await myMagicBoxes.updateTicketToBoxId(myTickets.address, 0, true)
		await myMagicBoxes.updateTicketToBoxId(myTickets2.address, 1, true)
		await myMagicBoxes.updateTicketToBoxId(myTickets2.address, 3, true)
	})
	describe('purchase with token or BNB', () => {

		it('can open a monster box paying price', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.emit(
				myMagicBoxes, 'Purchase'
			).withArgs(
				boxId,
				tokenId
			)

			let owner0 = await myFactory.ownerOf(tokenId[0])

			expect(owner0).to.eq(person.address)
		})

		it('can open a combo box paying price', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7, 12, 1, 300]
            const rarity = [1, 2, 0, 1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 1

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			const response = await myMagicBoxes.connect(person).purchase(
				boxId,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				signature,
				backend.address,
				{ value: ethers.utils.parseEther('2') }
			)
			let owner0 = await myFactory.ownerOf(tokenId[0])
			let owner1 = await myFactory.ownerOf(tokenId[1])
			let owner2 = await myFactory.ownerOf(tokenId[2])
			let owner3 = await myFactory.ownerOf(tokenId[3])

			expect(owner0).to.eq(person.address)
			expect(owner1).to.eq(person.address)
			expect(owner2).to.eq(person.address)
			expect(owner3).to.eq(person.address)
		})

		it('reverts when trying to buy a box with price 0', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 2

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: wrong 0 price'
			)
		})

		it('reverts if tokenId array length isnt equal to box.amount', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7, 12, 1]
            const rarity = [1, 2, 0, 1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 1

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address,
					{ value: ethers.utils.parseEther('2') }
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: wrong tokenId array len'
			)
		})

		it('reverts if rarity array length isnt equal to box.amount', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7, 12, 1, 300]
            const rarity = [1, 2, 0, 1, 8]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 1

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address,
					{ value: ethers.utils.parseEther('2') }
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: wrong rarity array len'
			)
		})

		it('reverts if not enough box supply', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 3

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address,
					{ value: ethers.utils.parseEther('1') }
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: no box supply'
			)
		})

		it('reverts if signature expired', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 1
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address,
					{ value: ethers.utils.parseEther('1') }
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: Expired signature'
			)
		})

		it('reverts if wrong signature', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				person
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address,
					{ value: ethers.utils.parseEther('1') }
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: Wrong signature'
			)
		})

		it('reverts if wrong signer', async () => {
			//signerWallet
			await myErc20.connect(person).approve(myMagicBoxes.address, ethers.constants.MaxUint256)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchase(
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					person.address,
					{ value: ethers.utils.parseEther('1') }
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: Wrong signer'
			)
		})
	})
	describe('purchasing with tickets', () => {

		it('can open a box spending a ticket', async () => {
			await myTickets.mint(person.address)
			await myTickets.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.emit(
				myMagicBoxes, 'PurchaseWithTicket'
			).withArgs(
				0,
				myTickets.address,
				boxId,
				tokenId
			)
			
			let owner0 = await myFactory.ownerOf(tokenId[0])

			expect(owner0).to.eq(person.address)
		})

		it('reverts when wrong ticket to boxId', async () => {
			await myTickets.mint(person.address)
			await myTickets.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 1

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: Invalid ticket'
			)
		})

		it('reverts when wrong msg.sender or ticketTokenId', async () => {
			await myTickets.mint(person.address)
			await myTickets.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person2.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person2).purchaseWithTicket(
					0,
					myTickets.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: wrong ticketTokenId or sender'
			)
		})

		it('can open a combo box spending ticket', async () => {
			await myTickets2.mint(person.address)
			await myTickets2.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7, 12, 1, 300]
            const rarity = [1, 2, 0, 1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 1

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await myMagicBoxes.connect(person).purchaseWithTicket(
				0,
				myTickets2.address,
				boxId,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				signature,
				backend.address
			)
			let owner0 = await myFactory.ownerOf(tokenId[0])
			let owner1 = await myFactory.ownerOf(tokenId[1])
			let owner2 = await myFactory.ownerOf(tokenId[2])
			let owner3 = await myFactory.ownerOf(tokenId[3])

			expect(owner0).to.eq(person.address)
			expect(owner1).to.eq(person.address)
			expect(owner2).to.eq(person.address)
			expect(owner3).to.eq(person.address)
		})

		it('reverts if tokenId array length isnt equal to box.amount', async () => {
			await myTickets2.mint(person.address)
			await myTickets2.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7, 12, 1]
            const rarity = [1, 2, 0, 1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 1

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets2.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: wrong tokenId array len'
			)
		})

		it('reverts if rarity array length isnt equal to box.amount', async () => {
			await myTickets2.mint(person.address)
			await myTickets2.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7, 12, 1, 300]
            const rarity = [1, 2, 0, 1, 8]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 1

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets2.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: wrong rarity array len'
			)
		})

		it('reverts if not enough box supply', async () => {
			await myTickets2.mint(person.address)
			await myTickets2.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 3

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets2.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: no box supply'
			)
		})

		it('reverts if signature expired', async () => {
			await myTickets.mint(person.address)
			await myTickets.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 1
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: Expired signature'
			)
		})

		it('reverts if wrong signature', async () => {
			await myTickets.mint(person.address)
			await myTickets.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				person
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					backend.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: Wrong signature'
			)
		})

		it('reverts if wrong signer', async () => {
			await myTickets.mint(person.address)
			await myTickets.connect(person).setApprovalForAll(myMagicBoxes.address, true)

			const owner = person.address
            const tokenId = [7]
            const rarity = [1]
            const breedUses = 3
            const generation = 1
			const validUntil = 0
			const boxId = 0

			const signature = await offchainSignature(
				myMagicBoxes.address,
				owner,
				tokenId,
				rarity,
				breedUses,
				generation,
				validUntil,
				backend
			)

			await expect(
				myMagicBoxes.connect(person).purchaseWithTicket(
					0,
					myTickets.address,
					boxId,
					tokenId,
					rarity,
					breedUses,
					generation,
					validUntil,
					signature,
					person.address
				)
			).to.revertedWith(
				'MonstropolyMagicBoxesShop: Wrong signer'
			)
		})
	})

	describe('others', () => {

		it('role can setTrustedForwarder', async () => {
            await expect(
                myMagicBoxes.connect(person).setTrustedForwarder(person.address)
            ).to.revertedWith(
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + MAGIC_BOXES_ADMIN_ROLE
            )
            await myMagicBoxes.connect(owner).setTrustedForwarder(person.address)
        })

		it('reverts when wrong percentages in burn and treasury config', async () => {
            await expect(
				myMagicBoxes.updateMagicBox(6, 1, ethers.utils.parseEther('0'), ethers.constants.AddressZero, ethers.utils.parseEther('70'), ethers.utils.parseEther('50'))
            ).to.revertedWith(
                'MonstropolyMagicBoxesShop: wrong percentages'
            )
            await expect(
				myMagicBoxes.updateMagicBox(6, 1, ethers.utils.parseEther('0'), ethers.constants.AddressZero, ethers.utils.parseEther('70'), ethers.utils.parseEther('10'))
            ).to.revertedWith(
                'MonstropolyMagicBoxesShop: wrong percentages'
            )
        })
	})
})

function computeHashOfArray(array) {
	let concatenatedHashes = '0x'
	let itemHash
	for(let i = 0; i < array.length; i++) {
		itemHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint256"], [array[i]]))
		concatenatedHashes = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes32"], [concatenatedHashes, itemHash])
	}
	return ethers.utils.keccak256(concatenatedHashes)
}

function computeHashOfArrayUint8(array) {
	let concatenatedHashes = '0x'
	let itemHash
	for(let i = 0; i < array.length; i++) {
		itemHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint8"], [array[i]]))
		concatenatedHashes = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes32"], [concatenatedHashes, itemHash])
	}
	return ethers.utils.keccak256(concatenatedHashes)
}

async function offchainSignature(
	verifyingContract,
	owner,
	tokenId,
	rarity,
	breedUses,
	generation,
	validUntil,
	signer
) {
	//sign
	const domain = {
		name: 'MonstropolyMagicBoxesShop',
		version: '1',
		chainId: ethers.provider._network.chainId,
		verifyingContract: verifyingContract
	}

	const types = {
		Mint: [
			{ name: 'receiver', type: 'address' },
			{ name: 'tokenId', type: 'bytes32' },
			{ name: 'rarity', type: 'bytes32' },
			{ name: 'breedUses', type: 'uint8' },
			{ name: 'generation', type: 'uint8' },
			{ name: 'validUntil', type: 'uint256' }
		]
	}

	const value = {
		receiver: owner,
		tokenId: computeHashOfArray(tokenId),
		rarity: computeHashOfArrayUint8(rarity),
		breedUses: breedUses,
		generation: generation,
		validUntil: validUntil
	}
	return await signer._signTypedData(domain, types, value);
}