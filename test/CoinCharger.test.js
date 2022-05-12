const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

let owner, person
let myDeployer, myCharger, myMPOLY


describe('CoinCharger', function () {
    beforeEach(async () => {
        [owner, person] = await ethers.getSigners();

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        const CoinChargerMock = await ethers.getContractFactory('CoinChargerMock')
        const MontropolyERC20 = await ethers.getContractFactory('MonstropolyERC20')

        const emptyInitializableData = await CoinChargerMock.interface.encodeFunctionData('initialize', [])
        myDeployer = await MonstropolyDeployer.deploy()

        let response = await myDeployer.setId(ethers.utils.id('DISTRIBUTION_VAULT'), person.address)
        let receipt = await response.wait()
        response = await myDeployer.deploy(ethers.utils.id('COIN_CHARGER'), CoinChargerMock.bytecode, emptyInitializableData)
        receipt = await response.wait()
        response = await myDeployer.deploy(ethers.utils.id('ERC20'), MontropolyERC20.bytecode, emptyInitializableData)
        receipt = await response.wait()
        
        const proxy = await myDeployer.get(ethers.utils.id('COIN_CHARGER'))
        myCharger = await CoinChargerMock.attach(proxy)
        const erc20 = await myDeployer.get(ethers.utils.id('ERC20'))
        myMPOLY = await MontropolyERC20.attach(erc20)
    });

    describe('transferFrom & burnFromERC20', function () {

        it('can transferFrom ERC20 to EOA', async () => {
            const amount = ethers.utils.parseEther('77')

            const chargerBalancePre = await myMPOLY.balanceOf(myCharger.address)
            const ownerBalancePre = await myMPOLY.balanceOf(owner.address)
            const personBalancePre = await myMPOLY.balanceOf(person.address)

            await (await myMPOLY.connect(person)).approve(myCharger.address, ethers.constants.MaxUint256)
            await (await myCharger.connect(person)).transferFrom(myMPOLY.address, person.address, owner.address, amount)

            const chargerBalancePost = await myMPOLY.balanceOf(myCharger.address)
            const ownerBalancePost = await myMPOLY.balanceOf(owner.address)
            const personBalancePost = await myMPOLY.balanceOf(person.address)

            expect(chargerBalancePre.toString()).to.equal('0')
            expect(chargerBalancePost.toString()).to.equal('0')
            expect(ownerBalancePost.sub(ownerBalancePre).toString()).to.equal(amount.toString())
            expect(personBalancePre.sub(personBalancePost).toString()).to.equal(amount.toString())
        });

        it('can transferFrom ERC20 to charger contract', async () => {
            const amount = ethers.utils.parseEther('77')

            const chargerBalancePre = await myMPOLY.balanceOf(myCharger.address)
            const ownerBalancePre = await myMPOLY.balanceOf(owner.address)
            const personBalancePre = await myMPOLY.balanceOf(person.address)

            await (await myMPOLY.connect(person)).approve(myCharger.address, ethers.constants.MaxUint256)
            await (await myCharger.connect(person)).transferFrom(myMPOLY.address, person.address, myCharger.address, amount)

            const chargerBalancePost = await myMPOLY.balanceOf(myCharger.address)
            const ownerBalancePost = await myMPOLY.balanceOf(owner.address)
            const personBalancePost = await myMPOLY.balanceOf(person.address)

            expect(chargerBalancePost.sub(chargerBalancePre).toString()).to.equal(amount.toString())
            expect(personBalancePre.sub(personBalancePost).toString()).to.equal(amount.toString())
        });

        it('can transferFrom ETH to EOA', async () => {
            const amount = ethers.utils.parseEther('77')

            const chargerBalancePre = await ethers.provider.getBalance(myCharger.address)
            const ownerBalancePre = await ethers.provider.getBalance(owner.address)
            const personBalancePre = await ethers.provider.getBalance(person.address)

            await (await myCharger.connect(person)).transferFrom(ethers.constants.AddressZero, person.address, owner.address, amount, { value: amount})

            const chargerBalancePost = await ethers.provider.getBalance(myCharger.address)
            const ownerBalancePost = await ethers.provider.getBalance(owner.address)
            const personBalancePost = await ethers.provider.getBalance(person.address)

            expect(chargerBalancePre.toString()).to.equal('0')
            expect(chargerBalancePost.toString()).to.equal('0')
            expect(ownerBalancePost.sub(ownerBalancePre).toString()).to.equal(amount.toString())
            expect(personBalancePre.gt(personBalancePost)).to.equal(true)
        });

        it('can transferFrom ETH to charger contract', async () => {
            const amount = ethers.utils.parseEther('77')

            const chargerBalancePre = await ethers.provider.getBalance(myCharger.address)
            const ownerBalancePre = await ethers.provider.getBalance(owner.address)
            const personBalancePre = await ethers.provider.getBalance(person.address)

            await (await myCharger.connect(person)).transferFrom(ethers.constants.AddressZero, person.address, myCharger.address, amount, { value: amount})

            const chargerBalancePost = await ethers.provider.getBalance(myCharger.address)
            const ownerBalancePost = await ethers.provider.getBalance(owner.address)
            const personBalancePost = await ethers.provider.getBalance(person.address)

            expect(chargerBalancePost.sub(chargerBalancePre).toString()).to.equal(amount.toString())
            expect(personBalancePre.gt(personBalancePost)).to.equal(true)
        });

        it('cant transferFrom ERC20 to EOA if no approved', async () => {
            const amount = ethers.utils.parseEther('77')

            await expectRevert(
                (await myCharger.connect(person)).transferFrom(myMPOLY.address, person.address, owner.address, amount),
                'ERC20: insufficient allowance'
            )
        });

        it('cant transferFrom ERC20 to EOA if no balance', async () => {
            const amount = ethers.constants.MaxUint256

            await myMPOLY.connect(person).approve(myCharger.address, ethers.constants.MaxUint256)

            await expectRevert(
                (await myCharger.connect(person)).transferFrom(myMPOLY.address, person.address, owner.address, amount),
                'ERC20: transfer amount exceeds balance'
            )
        });

        it('cant transferFrom ETH to EOA if wrong msg.value', async () => {
            const amount = ethers.constants.MaxUint256

            await expectRevert(
                (await myCharger.connect(person)).transferFrom(ethers.constants.AddressZero, person.address, owner.address, amount, { value: ethers.utils.parseEther('1')}),
                'CoinCharger: wrong msg.value'
            )
        });

        it('cant transferFrom ETH to EOA if contract isnt payable', async () => {
            const amount = ethers.utils.parseEther('1')

            await expectRevert(
                (await myCharger.connect(person)).transferFrom(ethers.constants.AddressZero, person.address, myMPOLY.address, amount, { value: amount }),
                'CoinCharger: ETH_TRANSFER_FAILED'
            )
        });

        it('can burnFromERC20', async () => {
            const amount = ethers.utils.parseEther('77')

            const chargerBalancePre = await myMPOLY.balanceOf(myCharger.address)
            const personBalancePre = await myMPOLY.balanceOf(person.address)
            const totalSupplyPre = await myMPOLY.totalSupply()

            await (await myMPOLY.connect(person)).approve(myCharger.address, ethers.constants.MaxUint256)
            await (await myCharger.connect(person)).burnFromERC20(myMPOLY.address, person.address, amount)

            const chargerBalancePost = await myMPOLY.balanceOf(myCharger.address)
            const personBalancePost = await myMPOLY.balanceOf(person.address)
            const totalSupplyPost = await myMPOLY.totalSupply()

            expect(chargerBalancePre.toString()).to.equal('0')
            expect(chargerBalancePost.toString()).to.equal('0')
            expect(personBalancePre.sub(personBalancePost).toString()).to.equal(amount.toString())
            expect(totalSupplyPre.sub(totalSupplyPost).toString()).to.equal(amount.toString())
        });
    });
})