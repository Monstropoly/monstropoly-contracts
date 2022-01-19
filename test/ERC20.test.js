const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

const ERC20_ID = ethers.utils.id('ERC20')
const DISTRIBUTION_VAULT_ID = ethers.utils.id('DISTRIBUTION_VAULT')
const ANTIBOT_ROLE = ethers.utils.id('ANTIBOT_ROLE')
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('ERC20', function () {
    let owner, team, person, bot
    let myDeployer, myMPOLY, myVault

    before(async () => {
        await hre.run('compile');
        [owner, team, person, bot] = await ethers.getSigners();
    })
    beforeEach(async () => {
        const Deployer = await ethers.getContractFactory('MonstropolyDeployer')
        myDeployer = await Deployer.deploy()

        const ERC20 = await ethers.getContractFactory('MonstropolyERC20')
        const calldataData = await ERC20.interface.encodeFunctionData('initialize', []);

        await myDeployer.setId(DISTRIBUTION_VAULT_ID, owner.address)
        await myDeployer.deploy(ERC20_ID, ERC20.bytecode, calldataData)

        const erc20Address = await myDeployer.get(ERC20_ID)
        myMPOLY = await ERC20.attach(erc20Address)

        await myDeployer.grantRole(ANTIBOT_ROLE, team.address)
    })
    describe('Antibot', () => {
        it('antibot role can start functionalities', async () => {
            await (await myMPOLY.connect(team)).startAntiBot()
            await expectRevert(
                (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000')),
                'MonstropolyERC20: Maxbalance for antibot'
            )
        })

        it('only antibot role can start functionalities', async () => {
            await expectRevert(
                (await myMPOLY.connect(person)).startAntiBot(),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + ANTIBOT_ROLE
            )
        })

        it('antibot role can stop functionalities', async () => {
            await (await myMPOLY.connect(team)).startAntiBot()
            await expectRevert(
                (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000')),
                'MonstropolyERC20: Maxbalance for antibot'
            )
            await (await myMPOLY.connect(team)).stopAntiBot()
            await (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000'))
        })

        it('antibot role cannot start functionalities again', async () => {
            await (await myMPOLY.connect(team)).startAntiBot()
            await expectRevert(
                (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000')),
                'MonstropolyERC20: Maxbalance for antibot'
            )
            await (await myMPOLY.connect(team)).stopAntiBot()
            await (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000'))
            await expectRevert(
                (await myMPOLY.connect(team)).startAntiBot(),
                'MonstropolyERC20: antibot not startable anymore'
            )
        })

        it('whitelisted addr passes antibot', async () => {
            await (await myMPOLY.connect(team)).startAntiBot()
            await expectRevert(
                (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000')),
                'MonstropolyERC20: Maxbalance for antibot'
            )
            await (await myMPOLY.connect(team)).whitelist([person.address])
            await (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000'))
        })

        it('unwhitelisted addr reverts on antibot', async () => {
            await (await myMPOLY.connect(team)).startAntiBot()
            await expectRevert(
                (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000')),
                'MonstropolyERC20: Maxbalance for antibot'
            )
            await (await myMPOLY.connect(team)).whitelist([person.address])
            await (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('20000'))
            await (await myMPOLY.connect(team)).unwhitelist([person.address])
            await expectRevert(
                (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('1')),
                'MonstropolyERC20: Maxbalance for antibot'
            )
        })
    })

    describe('Snapshot', () => {
        it('snapshot saves balances', async () => {
            const value = ethers.utils.parseEther('100')
            const value2 = ethers.utils.parseEther('50')
            const ownerBalance1 = await myMPOLY.balanceOf(owner.address)
            const personBalance1 = await myMPOLY.balanceOf(person.address)
            await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, team.address)
            await (await myMPOLY.connect(owner)).transfer(person.address, value)
            const ownerBalance2 = await myMPOLY.balanceOf(owner.address)
            const personBalance2 = await myMPOLY.balanceOf(person.address)
            const response = await (await myMPOLY.connect(team)).snapshot()
            const receipt = await response.wait()
            const snapshotId = receipt.events[0].args.id
            await (await myMPOLY.connect(person)).transfer(owner.address, value2)
            const ownerBalance3 = await myMPOLY.balanceOf(owner.address)
            const personBalance3 = await myMPOLY.balanceOf(person.address)
            const ownerBalanceAt = await myMPOLY.balanceOfAt(owner.address, snapshotId)
            const personBalanceAt = await myMPOLY.balanceOfAt(person.address, snapshotId)
            expect(ownerBalance1.toString()).to.equal(ownerBalance2.add(value).toString())
            expect(personBalance1.toString()).to.equal(personBalance2.sub(value).toString())
            expect(ownerBalanceAt.toString()).to.equal(ownerBalance3.sub(value2).toString())
            expect(personBalanceAt.toString()).to.equal(personBalance3.add(value2).toString())
        })

        it('snapshot saves supply', async () => {
            const value = ethers.utils.parseEther('100')
            const value2 = ethers.utils.parseEther('50')
            const supply1 = await myMPOLY.totalSupply()
            await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, team.address)
            await (await myMPOLY.connect(owner)).burnFrom(owner.address, value)
            const supply2 = await myMPOLY.totalSupply()
            const response = await (await myMPOLY.connect(team)).snapshot()
            const receipt = await response.wait()
            const snapshotId = receipt.events[0].args.id
            await (await myMPOLY.connect(owner)).burnFrom(owner.address, value2)
            const supply3 = await myMPOLY.totalSupply()
            const supplyAt = await myMPOLY.totalSupplyAt(snapshotId)
            expect(supply1.toString()).to.equal(supply2.add(value).toString())
            expect(supplyAt.toString()).to.equal(supply3.add(value2).toString())
        })

        it('only deafult admin role can snapshot', async () => {
            await expectRevert(
                (await myMPOLY.connect(team)).snapshot(),
                'AccessControlProxyPausable: account ' + String(team.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
            await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, team.address)
            const response = await (await myMPOLY.connect(team)).snapshot()
            await response.wait()
        })
    })

    describe('meta-txs(GSN) support', () => {
        let myRelayer, paymaster
        beforeEach(async () => {
            await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, team.address)
            const Uniswap = await ethers.getContractFactory('UniswapMock')
            let myUniswap = await Uniswap.deploy(myMPOLY.address)
            const Relayer = await ethers.getContractFactory('MonstropolyRelayer')
            myRelayer = await Relayer.deploy(myUniswap.address)
            paymaster = await myRelayer.paymaster()
        })

        it('default admin role can setTrustedForwarder', async () => {
            await (await myMPOLY.connect(team)).setTrustedForwarder(myRelayer.address)
        })

        it('only default admin role can setTrustedForwarder', async () => {
            await expectRevert(
                (await myMPOLY.connect(person)).setTrustedForwarder(myRelayer.address),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
            await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, person.address)
            await (await myMPOLY.connect(person)).setTrustedForwarder(myRelayer.address)
        })

        it('can use token with meta-txs', async () => {
            await (await myMPOLY.connect(team)).setTrustedForwarder(myRelayer.address)
            const amount = ethers.utils.parseEther('10')

            //signerWallet
            await (await myMPOLY.connect(owner)).transfer(person.address, ethers.utils.parseEther('10000'))
            await (await myMPOLY.connect(person)).approve(paymaster, ethers.constants.MaxUint256)

            //create meta-tx
            const ERC20 = await ethers.getContractFactory('MonstropolyERC20')
            const transferData = ERC20.interface.encodeFunctionData('transfer', [team.address, amount])
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
                to: myMPOLY.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: transferData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)

            const response = await (await myRelayer.connect(owner)).relay(value, signature)

            let balance = await myMPOLY.balanceOf(team.address)
            expect(balance.toString()).to.equal(amount.toString())
        })
    })
})
