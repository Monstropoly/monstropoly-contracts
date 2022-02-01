const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Deployer = artifacts.require('MonstropolyDeployer')
const UUPSNotUpgradeable = artifacts.require('UUPSNotUpgradeable')

const _IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
const UPGRADER_ROLE = ethers.utils.id('UPGRADER_ROLE')
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'

let owner, person, person2
let myDeployer, myProxy, myUpgradeableImp, myNotUpgradeableImp, myUpgradeableProxy, myNotUpgradeableProxy


describe('Deployer', function () {
    beforeEach(async () => {
        [owner, person, person2] = await ethers.getSigners();

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        const UUPSUpgradeableMock = await ethers.getContractFactory('UUPSUpgradeableMock')
        const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy')

        const emptyInitializableData = await UUPSUpgradeableMock.interface.encodeFunctionData('initialize', [])
        myDeployer = await MonstropolyDeployer.deploy()

        const response = await myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSUpgradeableMock.bytecode, emptyInitializableData)
        const receipt = await response.wait()
        const proxy = await myDeployer.get(ethers.utils.id('UUPSMOCK'))
        const proxyAddress = receipt.events[2].args.proxy
        const impAddress = receipt.events[2].args.implementation

        myProxy = await ERC1967Proxy.attach(proxyAddress)
        myUpgradeableProxy = await UUPSUpgradeableMock.attach(proxyAddress)
        myUpgradeableImp = await UUPSUpgradeableMock.attach(impAddress)
    });

    describe('deploy', function () {

        it('can upgrade to new imp and call a function', async () => {
            const UUPSNotUpgradeableMock = await ethers.getContractFactory('UUPSNotUpgradeableMock')
            const setVersionData = await UUPSNotUpgradeableMock.interface.encodeFunctionData('setVersion', ['UUPSNotUpgradeableMock'])
            myDeployer = await Deployer.at(myDeployer.address)
            const response = await myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSNotUpgradeableMock.bytecode, setVersionData)
            expectEvent(response, 'Deployment', {
                proxy: myProxy.address,
                upgrade: true
            })
            let version = await myUpgradeableProxy.version()
            expect(version).to.equal('UUPSNotUpgradeableMock')
        });

        it('can upgrade to new imp without call a function', async () => {
            const UUPSNotUpgradeableMock = await ethers.getContractFactory('UUPSNotUpgradeableMock')
            myDeployer = await Deployer.at(myDeployer.address)
            const response = await myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSNotUpgradeableMock.bytecode, '0x')
            expectEvent(response, 'Deployment', {
                proxy: myProxy.address,
                upgrade: true
            })
            let version = await myUpgradeableProxy.version()
            expect(version).to.equal('UUPSUpgradeableMock')
        });
    });

    describe('deployProxyWithImplementation', function () {

        it('can deploy a proxy pointing to an already deployed implementation', async () => {
            const UUPSUpgradeableMock = await ethers.getContractFactory('UUPSUpgradeableMock')
            const emptyInitializableData = await UUPSUpgradeableMock.interface.encodeFunctionData('initialize', [])
            const implementation = await UUPSUpgradeableMock.deploy()
            myDeployer = await Deployer.at(myDeployer.address)
            const response = await myDeployer.deployProxyWithImplementation(
                ethers.utils.id('NEW_ID'),
                implementation.address,
                emptyInitializableData
            )

            let proxyAddress = await myDeployer.get(ethers.utils.id('NEW_ID'))

            expectEvent(response, 'Deployment', {
                proxy: proxyAddress,
                upgrade: false
            })
            let myContract = await UUPSUpgradeableMock.attach(proxyAddress)
            let version = await myContract.version()
            expect(version).to.equal('UUPSUpgradeableMock')
        });

        it('reverts when deploying in a locked id', async () => {
            const UUPSUpgradeableMock = await ethers.getContractFactory('UUPSUpgradeableMock')
            const emptyInitializableData = await UUPSUpgradeableMock.interface.encodeFunctionData('initialize', [])
            const implementation = await UUPSUpgradeableMock.deploy()
            myDeployer = await Deployer.at(myDeployer.address)

            await myDeployer.lock(ethers.utils.id('NEW_ID'))

            await expectRevert(
                myDeployer.deployProxyWithImplementation(
                    ethers.utils.id('NEW_ID'),
                    implementation.address,
                    emptyInitializableData
                ),
                'MonstropolyDeployer: id locked'
            )
        });

        it('only default admin role can deployProxyWithImplementation', async () => {
            const UUPSUpgradeableMock = await ethers.getContractFactory('UUPSUpgradeableMock')
            const emptyInitializableData = await UUPSUpgradeableMock.interface.encodeFunctionData('initialize', [])
            const implementation = await UUPSUpgradeableMock.deploy()

            await expectRevert(
                (await myDeployer.connect(person)).deployProxyWithImplementation(
                    ethers.utils.id('NEW_ID'),
                    implementation.address,
                    emptyInitializableData
                ),
                'AccessControl: account ' + String(person.address).toLowerCase() + ' is missing role ' + DEFAULT_ADMIN_ROLE
            )
        });
    });

    describe('setId', function () {

        it('can setId of empty id', async () => {
            myDeployer = await Deployer.at(myDeployer.address)
            const response = await myDeployer.setId(
                ethers.utils.id('NEW_ID'),
                person.address
            )

            let newAddress = await myDeployer.get(ethers.utils.id('NEW_ID'))

            expectEvent(response, 'NewId', {
                addr: newAddress
            })

            expect(newAddress).to.equal(person.address)
        });

        it('can setId of a previously setted id', async () => {
            myDeployer = await Deployer.at(myDeployer.address)
            const response = await myDeployer.setId(
                ethers.utils.id('NEW_ID2'),
                person.address
            )

            let newAddress = await myDeployer.get(ethers.utils.id('NEW_ID2'))

            expectEvent(response, 'NewId', {
                addr: newAddress
            })

            expect(newAddress).to.equal(person.address)

            const response2 = await myDeployer.setId(
                ethers.utils.id('NEW_ID2'),
                person2.address
            )

            let newAddress2 = await myDeployer.get(ethers.utils.id('NEW_ID2'))

            expectEvent(response2, 'NewId', {
                addr: newAddress2
            })

            expect(newAddress2).to.equal(person2.address)
        });

        it('reverts when trying to set a locked id', async () => {
            myDeployer = await Deployer.at(myDeployer.address)
            const response = await myDeployer.setId(
                ethers.utils.id('NEW_ID3'),
                person.address
            )

            let newAddress = await myDeployer.get(ethers.utils.id('NEW_ID3'))

            expectEvent(response, 'NewId', {
                addr: newAddress
            })

            expect(newAddress).to.equal(person.address)

            await myDeployer.lock(ethers.utils.id('NEW_ID3'))

            await expectRevert(
                myDeployer.setId(
                    ethers.utils.id('NEW_ID3'),
                    person2.address
                ),
                'MonstropolyDeployer: id locked'
            )
        });
    });
})