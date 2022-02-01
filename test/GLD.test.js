const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

const GLD_ID = ethers.utils.id('GLD')
const DISTRIBUTION_VAULT_ID = ethers.utils.id('DISTRIBUTION_VAULT')
const ANTIBOT_ROLE = ethers.utils.id('ANTIBOT_ROLE')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('GLD', function () {
    let owner, team, person, bot
    let myDeployer, myGLD, myVault

    before(async () => {
        await hre.run('compile');
        [owner, team, person, bot] = await ethers.getSigners();
    })
    beforeEach(async () => {
        const Deployer = await ethers.getContractFactory('MonstropolyDeployer')
        myDeployer = await Deployer.deploy()

        const GLD = await ethers.getContractFactory('MonstropolyGLD')
        const calldataData = await GLD.interface.encodeFunctionData('initialize', []);

        await myDeployer.deploy(GLD_ID, GLD.bytecode, calldataData)

        const GLDAddress = await myDeployer.get(GLD_ID)
        myGLD = await GLD.attach(GLDAddress)

        await myDeployer.grantRole(MINTER_ROLE, team.address)
        await (await myGLD.connect(team)).mint(owner.address, ethers.utils.parseEther('1000000'))
    })

    describe('general', () => {
        it('only minter role can (try to) mint', async () => {
            await expectRevert(
                (await myGLD.connect(owner)).mint(person.address, ethers.utils.parseEther('20000')),
                'AccessControlProxyPausable: account ' + String(owner.address).toLowerCase() + ' is missing role ' + MINTER_ROLE
            )
        })

        it('can approveAll balance', async () => {
            await (await myGLD.connect(owner)).approveAll(person.address)
            let allowance = await myGLD.allowance(owner.address, person.address)
            let balance = await myGLD.allowance(owner.address, person.address)

            expect(balance.toString()).to.equal(allowance.toString())
        })

        it('can burnFrom being the sender', async () => {
            let supplyPre = await myGLD.totalSupply()
            let burnAmount = ethers.utils.parseEther('1000')
            await (await myGLD.connect(owner)).burnFrom(owner.address, burnAmount)
            let supplyPost = await myGLD.totalSupply()

            expect(supplyPre.sub(supplyPost).toString()).to.equal(burnAmount.toString())
        })

        it('can burnFrom after approve maxuint', async () => {
            let supplyPre = await myGLD.totalSupply()
            let amount = ethers.utils.parseEther('1000')
            await (await myGLD.connect(owner)).approve(person.address, ethers.constants.MaxUint256)
            await (await myGLD.connect(person)).burnFrom(owner.address, amount)
            let supplyPost = await myGLD.totalSupply()

            expect(supplyPre.sub(supplyPost).toString()).to.equal(amount.toString())
        })

        it('can burnFrom after approve exact amount', async () => {
            let supplyPre = await myGLD.totalSupply()
            let amount = ethers.utils.parseEther('1000')
            await (await myGLD.connect(owner)).approve(person.address, amount)
            await (await myGLD.connect(person)).burnFrom(owner.address, amount)
            let supplyPost = await myGLD.totalSupply()

            expect(supplyPre.sub(supplyPost).toString()).to.equal(amount.toString())
        })

        it('cannot burnFrom without approving', async () => {
            await expectRevert(
                (await myGLD.connect(team)).burnFrom(owner.address, ethers.utils.parseEther('20000')),
                'MonstropolyGLD: amount exceeds allowance'
            )
        })
    })

    describe('meta-txs(GSN) support', () => {
        let myRelayer, paymaster
        beforeEach(async () => {
            await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, team.address)
            const Uniswap = await ethers.getContractFactory('UniswapMock')
            let myUniswap = await Uniswap.deploy(myGLD.address)
            const Relayer = await ethers.getContractFactory('MonstropolyRelayer')
            myRelayer = await Relayer.deploy(myUniswap.address)
            paymaster = await myRelayer.paymaster()
        })

        it('default admin role can setTrustedForwarder', async () => {
            await (await myGLD.connect(team)).setTrustedForwarder(myRelayer.address)
        })

        it('only default admin role can setTrustedForwarder', async () => {
            await expectRevert(
                (await myGLD.connect(person)).setTrustedForwarder(myRelayer.address),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
            await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, person.address)
            await (await myGLD.connect(person)).setTrustedForwarder(myRelayer.address)
        })

        it('can use token with meta-txs', async () => {
            await (await myGLD.connect(team)).setTrustedForwarder(myRelayer.address)
            const amount = ethers.utils.parseEther('10')

            //signerWallet
            await (await myGLD.connect(owner)).transfer(person.address, ethers.utils.parseEther('10000'))
            await (await myGLD.connect(person)).approve(paymaster, ethers.constants.MaxUint256)

            //create meta-tx
            const GLD = await ethers.getContractFactory('MonstropolyGLD')
            const transferData = GLD.interface.encodeFunctionData('transfer', [team.address, amount])
            const nonce = await myRelayer.getNonce(person.address)

            //sign
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
                from: person.address,
                to: myGLD.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: transferData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)

            const response = await (await myRelayer.connect(owner)).relay(value, signature)

            let balance = await myGLD.balanceOf(team.address)
            expect(balance.toString()).to.equal(amount.toString())
        })
    })
})
