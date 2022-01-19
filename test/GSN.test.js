const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const SALT = '777'

let deployer, relayer, user
let myUniswap, myRelayer, myContract, myToken


describe('GSN', function () {
    beforeEach(async () => {
        [deployer, relayer, user] = await ethers.getSigners();

        const ERC20 = await ethers.getContractFactory('Token')
        myToken = await ERC20.deploy('My Token', 'MTK')

        const Uniswap = await ethers.getContractFactory('UniswapMock')
        myUniswap = await Uniswap.deploy(myToken.address)

        const Relayer = await ethers.getContractFactory('MonstropolyRelayer')
        myRelayer = await Relayer.deploy(myUniswap.address)

        const MyGSNContract = await ethers.getContractFactory('MyGSNContract')
        myContract = await MyGSNContract.deploy(myRelayer.address)
    });

    describe('relay', function () {

        it('User can relay with execute', async () => {
            const nonce = await myRelayer.getNonce(user.address)
            const MyGSNContract = await ethers.getContractFactory('MyGSNContract')
            const data = MyGSNContract.interface.encodeFunctionData('set', [])

            await myToken.mint(user.address, ethers.utils.parseEther('1000000'))
            const paymaster = await myRelayer.paymaster()
            await (await myToken.connect(user)).approve(paymaster, ethers.constants.MaxUint256)

            const domain = {
                name: 'MonstropolyRelayer',
                version: '1',
                chainId: ethers.provider._network.chainId,
                verifyingContract: myRelayer.address
            }

            const types = {
                Execute: [
                    { name: 'from', type: 'address'},
                    { name: 'to', type: 'address'},
                    { name: 'value', type: 'uint256'},
                    { name: 'gas', type: 'uint256'},
                    { name: 'nonce', type: 'uint256'},
                    { name: 'data', type: 'bytes'},
                    { name: 'validUntil', type: 'uint256'}
                ]
            }

            const value = {
                from: user.address,
                to: myContract.address,
                value: 0,
                gas: 3000000,
                nonce: nonce,
                data: data,
                validUntil: 0
            }

            const signature = await user._signTypedData(domain, types, value);

            await myRelayer.relay(value, signature)

            const last = await myContract.last()
            expect(last).to.eq(user.address)

            const walletBalance = await myToken.balanceOf(user.address)
            const relayerBalance = await myToken.balanceOf(paymaster)

            expect(ethers.utils.parseEther('1000000').toString()).to.equal((walletBalance.add(relayerBalance)).toString())
        });

        it('User can relay with call & execute', async () => {
            const nonce = await myRelayer.getNonce(user.address)
            const MyGSNContract = await ethers.getContractFactory('MyGSNContract')
            const data = MyGSNContract.interface.encodeFunctionData('set', [])
            const dataSalt = MyGSNContract.interface.encodeFunctionData('setSalt', [SALT])

            await myToken.mint(user.address, ethers.utils.parseEther('1000000'))
            const paymaster = await myRelayer.paymaster()
            await (await myToken.connect(user)).approve(paymaster, ethers.constants.MaxUint256)

            const domain = {
                name: 'MonstropolyRelayer',
                version: '1',
                chainId: ethers.provider._network.chainId,
                verifyingContract: myRelayer.address
            }

            const types = {
                Execute: [
                    { name: 'from', type: 'address'},
                    { name: 'to', type: 'address'},
                    { name: 'value', type: 'uint256'},
                    { name: 'gas', type: 'uint256'},
                    { name: 'nonce', type: 'uint256'},
                    { name: 'data', type: 'bytes'},
                    { name: 'validUntil', type: 'uint256'}
                ]
            }

            const value = {
                from: user.address,
                to: myContract.address,
                value: 0,
                gas: 3000000,
                nonce: nonce,
                data: data,
                validUntil: 0
            }

            const signature = await user._signTypedData(domain, types, value);

            await myRelayer.callAndRelay(dataSalt, myContract.address, value, signature)

            const last = await myContract.last()
            const salt = await myContract.salt()
            expect(last).to.eq(user.address)
            expect(salt.toString()).to.eq(SALT)

            const walletBalance = await myToken.balanceOf(user.address)
            const relayerBalance = await myToken.balanceOf(paymaster)
            expect(ethers.utils.parseEther('1000000').toString()).to.equal((walletBalance.add(relayerBalance)).toString())
        });
    });
})