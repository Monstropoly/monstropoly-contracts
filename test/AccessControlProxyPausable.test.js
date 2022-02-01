const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

let owner, person
let myDeployer, myACPP, myMPOLY
const NEW_ID = ethers.utils.id('NEW_ID')
const PAUSER_ROLE = ethers.utils.id('PAUSER_ROLE')

describe('AccessControlProxyPausable', function () {
    beforeEach(async () => {
        [owner, id1, id2] = await ethers.getSigners();

        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        const AccessControlProxyPausableMock = await ethers.getContractFactory('AccessControlProxyPausableMock')

        const emptyInitializableData = await AccessControlProxyPausableMock.interface.encodeFunctionData('initialize', [])
        myDeployer = await MonstropolyDeployer.deploy()

        let response = await myDeployer.setId(NEW_ID, id1.address)
        let receipt = await response.wait()
        response = await myDeployer.deploy(ethers.utils.id('ACPP'), AccessControlProxyPausableMock.bytecode, emptyInitializableData)
        receipt = await response.wait()
        
        const proxy = await myDeployer.get(ethers.utils.id('ACPP'))
        myACPP = await AccessControlProxyPausableMock.attach(proxy)
        await myDeployer.grantRole(PAUSER_ROLE, owner.address)
    });

    describe('whenPaused & whenNotPaused', function () {

        it('can call function whenNotPaused', async () => {
            let x = await myACPP.x()
            expect(x).to.equal('empty')

            const _string = 'string'
            await myACPP.set(_string)

            x = await myACPP.x()
            expect(x).to.equal(_string)
        });

        it('cant call function whenNotPaused after pause but can after unpause', async () => {
            let x = await myACPP.x()
            expect(x).to.equal('empty')

            const _string = 'string'

            await myACPP.pause()
            await expectRevert(
                myACPP.set(_string),
                'Pausable: paused'
            )

            await myACPP.unpause()

            await myACPP.set(_string)
            x = await myACPP.x()
            expect(x).to.equal(_string)
        });

        it('can call function whenPaused', async () => {
            let x = await myACPP.x()
            expect(x).to.equal('empty')

            const _string = 'string'
            await myACPP.set(_string)

            x = await myACPP.x()
            expect(x).to.equal(_string)

            await myACPP.pause()

            await myACPP.reset()

            x = await myACPP.x()
            expect(x).to.equal('reset')
        });

        it('cant call function whenPaused if not paused', async () => {
            await expectRevert(
                myACPP.reset(),
                'Pausable: not paused'
            )
        });
    });

    describe('getFromConfig', function () {

        it('can call function whenNotPaused', async () => {
            const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
            const newDeployer = await MonstropolyDeployer.deploy()

            await newDeployer.setId(NEW_ID, id2.address)

            let newId1 = await myACPP.getFromConfig(NEW_ID)

            await myACPP.updateManager(newDeployer.address)

            let newId2 = await myACPP.getFromConfig(NEW_ID)

            expect(newId1).to.equal(id1.address)
            expect(newId2).to.equal(id2.address)
            expect(newId1).not.to.equal(newId2)
        });

        it('roles reset when updateManager', async () => {
            const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
            const newDeployer = await MonstropolyDeployer.deploy()

            await myACPP.pause()

            await myACPP.updateManager(newDeployer.address)

            await expectRevert(
                myACPP.unpause(),
                'AccessControlProxyPausable: account ' + String(owner.address).toLowerCase() + ' is missing role ' + PAUSER_ROLE
            )

            await newDeployer.grantRole(PAUSER_ROLE, owner.address)
            await myACPP.unpause()
        });
    });
})