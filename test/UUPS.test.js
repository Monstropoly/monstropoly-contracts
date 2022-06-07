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

let owner, person
let myDeployer, myProxy, myUpgradeableImp, myNotUpgradeableImp, myUpgradeableProxy, myNotUpgradeableProxy


describe('UUPS', function () {
    beforeEach(async () => {
        [owner, person] = await ethers.getSigners();

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        const UUPSUpgradeableMock = await ethers.getContractFactory('UUPSUpgradeableMock')
        const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy')

        const emptyInitializableData = await UUPSUpgradeableMock.interface.encodeFunctionData('initialize', [])
        myDeployer = await MonstropolyDeployer.deploy()

        const response = await myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSUpgradeableMock.bytecode, emptyInitializableData)
        const receipt = await response.wait()
        const proxy = await myDeployer.get(ethers.utils.id('UUPSMOCK'))
        const proxyAddress = receipt.events[3].args.proxy
        const impAddress = receipt.events[3].args.implementation
        myProxy = await ERC1967Proxy.attach(proxyAddress)
        myUpgradeableProxy = await UUPSUpgradeableMock.attach(proxyAddress)
        myUpgradeableImp = await UUPSUpgradeableMock.attach(impAddress)
    });

    describe('Proxy and implementation', function () {

        it('proxy has right implementation address', async () => {
            let implementationEncoded = await ethers.provider.getStorageAt(myProxy.address, _IMPLEMENTATION_SLOT)
            let implementation = ethers.utils.defaultAbiCoder.decode(['address'], implementationEncoded)
            let callImplementation = await myUpgradeableProxy.implementation()
            expect(implementation[0]).to.equal(myUpgradeableImp.address)
            expect(implementation[0]).to.equal(callImplementation)
        });
        it('proxy delegates on right implementation', async () => {
            let version = await myUpgradeableProxy.version()
            expect(version).to.equal('UUPSUpgradeableMock')
        });
    });
    describe('UpgradeToAndCall', function () {

        it('can upgrade to new imp and call a function', async () => {
            const UUPSNotUpgradeableMock = await ethers.getContractFactory('UUPSNotUpgradeableMock')
            const setVersionData = await UUPSNotUpgradeableMock.interface.encodeFunctionData('setVersion', ['UUPSNotUpgradeableMock'])
            myDeployer = await Deployer.at(myDeployer.address)
            const response = await myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSNotUpgradeableMock.bytecode, setVersionData)
            const impAddress = response.logs[0].args.implementation
            const myNotUpgradeableProxy = await UUPSNotUpgradeable.at(myUpgradeableProxy.address)
            let callImplementation = await myNotUpgradeableProxy.implementation()
            expect(impAddress).to.equal(callImplementation)

            expectEvent(response, 'Deployment', {
                proxy: myProxy.address,
                upgrade: true
            })
            let version = await myUpgradeableProxy.version()
            expect(version).to.equal('UUPSNotUpgradeableMock')
        });

        it('can upgrade to new imp and make not upgradeable anymore', async () => {
            const UUPSNotUpgradeableMock = await ethers.getContractFactory('UUPSNotUpgradeableMock')
            const setVersionData = await UUPSNotUpgradeableMock.interface.encodeFunctionData('setVersion', ['UUPSNotUpgradeableMock'])
            myDeployer = await Deployer.at(myDeployer.address)
            await myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSNotUpgradeableMock.bytecode, setVersionData)
            const myNotUpgradeableProxy = await UUPSNotUpgradeable.at(myUpgradeableProxy.address)
            await myDeployer.grantRole(UPGRADER_ROLE, owner.address)
            // await myNotUpgradeableProxy.endUpgradeability() //use if second endUpgradeability pattern used
            await expectRevert(
                myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSNotUpgradeableMock.bytecode, setVersionData),
                'UUPSNotUpgradeable: not upgradeable anymore'
            )
        });

        it('can upgrade to new imp and only upgrader role can endUpgradeability', async () => {
            const UUPSNotUpgradeableMock = await ethers.getContractFactory('UUPSNotUpgradeableMock')
            const setVersionData = await UUPSNotUpgradeableMock.interface.encodeFunctionData('setVersion', ['UUPSNotUpgradeableMock'])
            myDeployer = await Deployer.at(myDeployer.address)
            await myDeployer.deploy(ethers.utils.id('UUPSMOCK'), UUPSNotUpgradeableMock.bytecode, setVersionData)
            const myNotUpgradeableProxy = await UUPSNotUpgradeable.at(myUpgradeableProxy.address)
            // uncomment if 2nd pattern used
            // await expectRevert(
            //     myNotUpgradeableProxy.endUpgradeability(),
            //     'AccessControlProxyPausable: account ' + String(owner.address).toLowerCase() + ' is missing role ' + UPGRADER_ROLE
            // )
        });
    });
})