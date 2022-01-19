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
const DATA_ID = ethers.utils.id('DATA')
const SCIENCE_ID = ethers.utils.id('SCIENCE')
const UPGRADER_ID = ethers.utils.id('UPGRADER')
const FACTORY_ID = ethers.utils.id('FACTORY')
const UPGRADER_WALLET = ethers.utils.id('UPGRADER_WALLET')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const SALT =    '748398223409078271829384132948734346321498890831874398135738578741832983748391111111111111111111987654987654987654987654'
const SALT_0 =  '999999765678000000777777777777777777777799999999999999999999999999999989912340000007656789999991987654987654987654987654'
const SALT_1 =  '999999765678000001777777777778777777777799999999999999999999999999999979912340000017656789999991987654987654987654987654'
const SALT_2 =  '999999765678000002777777777779777777777799999999999999999999999999999969912340000027656789999991987654987654987654987654'
const SALT_3 =  '999999765678000003777777777770777777777799999999999999999999999999999959912340000037656789999991987654987654987654987654'
const SALT_4 =  '999999765678000004777777777771777777777799999999999999999999999999999949912340000047656789999991987654987654987654987654'
const SALT_X0 = '9999997656780F423F777777777727777777777799999999999999999999999999999989912349999997656789999991987654987654987654987651'
const SALT_X1 = '9999997656780F423F777777777737777777777799999999999999999999999999999979912349999997656789999991987654987654987654987652'
const SALT_X2 = '9999997656780F423F777777777747777777777799999999999999999999999999999969912349999997656789999991987654987654987654987653'
const SALT_X3 = '9999997656780F423F777777777757777777777799999999999999999999999999999959912349999997656789999991987654987654987654987654'
const SALT_X4 = '9999997656780F423F777777777767777777777799999999999999999999999999999949912349999997656789999991987654987654987654987655'
const SALTS = [SALT_0, SALT_1, SALT_2, SALT_3, SALT_4]
const SALTS_INCONSISTENT_RARITY = [SALT_0, SALT_1, SALT_2, SALT_3, SALT_X0]
const SALTS_MAX_RARITY = [SALT_X0, SALT_X1, SALT_X2, SALT_X3, SALT_X4]

async function mintBatch(genScience, factory, receiver, assets, salts) {
    for (let i = 0; i < SALTS.length; i++) {
        let gen = await genScience.generateAssetView(assets[i], salts[i], false)
        await factory.mint(receiver, gen.gen_)
    }
}

describe('Upgrader', function () {
    let owner, team, person
    let myDeployer, myMPOLY, myVault, myData, myScience, myFactory, myUpgrader, myRelayer, paymaster

    before(async () => {
        await hre.run('compile');
        [owner, team, person] = await ethers.getSigners();
    })
    beforeEach(async () => {
        const Deployer = await ethers.getContractFactory('MonstropolyDeployer')
        myDeployer = await Deployer.deploy()

        const ERC20 = await ethers.getContractFactory('MonstropolyERC20')
        const Data = await ethers.getContractFactory('MonstropolyData')
        const GenScience = await ethers.getContractFactory('MonstropolyGenScience')
        const Factory = await ethers.getContractFactory('MonstropolyFactory')
        const Upgrader = await ethers.getContractFactory('MonstropolyUpgrader')
        const calldataData = await ERC20.interface.encodeFunctionData('initialize', []);

        await myDeployer.setId(DISTRIBUTION_VAULT_ID, owner.address)
        const dataImpl = await Data.deploy();
        await myDeployer.deployProxyWithImplementation(DATA_ID, dataImpl.address, calldataData)
        await myDeployer.deploy(SCIENCE_ID, GenScience.bytecode, calldataData)
        await myDeployer.deploy(FACTORY_ID, Factory.bytecode, calldataData)
        await myDeployer.deploy(UPGRADER_ID, Upgrader.bytecode, calldataData)
        await myDeployer.deploy(ERC20_ID, ERC20.bytecode, calldataData)

        const erc20Address = await myDeployer.get(ERC20_ID)
        const dataAddress = await myDeployer.get(DATA_ID)
        const scienceAddress = await myDeployer.get(SCIENCE_ID)
        const factoryAddress = await myDeployer.get(FACTORY_ID)
        const upgraderAddress = await myDeployer.get(UPGRADER_ID)

        myMPOLY = await ERC20.attach(erc20Address)
        myData = await Data.attach(dataAddress)
        myScience = await GenScience.attach(scienceAddress)
        myFactory = await Factory.attach(factoryAddress)
        myUpgrader = await Upgrader.attach(upgraderAddress)

        await myMPOLY.transfer(person.address, ethers.utils.parseEther('10000'))

        await myDeployer.grantRole(MINTER_ROLE, myUpgrader.address)
        await myDeployer.grantRole(MINTER_ROLE, owner.address)
        await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, team.address)
        await myDeployer.setId(UPGRADER_WALLET, team.address)

        const Uniswap = await ethers.getContractFactory('UniswapMock')
        let myUniswap = await Uniswap.deploy(myMPOLY.address)
        const Relayer = await ethers.getContractFactory('MonstropolyRelayer')
        myRelayer = await Relayer.deploy(myUniswap.address)
        paymaster = await myRelayer.paymaster()
        await (await myUpgrader.connect(team)).setTrustedForwarder(myRelayer.address)
    })
    describe('upgrade', () => {

        it('can get price', async () => {
            let gen = await myScience.generateAssetView('0', SALT, false)
            await myFactory.mint(person.address, gen.gen_)
            let price = await myUpgrader.price('0')
            expect(price.toString()).to.equal(ethers.utils.parseEther('50').toString())
        })

        it('can update price', async () => {
            let gen = await myScience.generateAssetView('0', SALT, false)
            await myFactory.mint(person.address, gen.gen_)
            let price = await myUpgrader.price('0')
            await (await myUpgrader.connect(team)).updatePrices([
                ethers.utils.parseEther('199'),
                ethers.utils.parseEther('599'),
                ethers.utils.parseEther('1999'),
                ethers.utils.parseEther('5999'),
                ethers.utils.parseEther('19999')
            ])
            let newPrice = await myUpgrader.price('0')
            expect(price.toString()).to.equal(ethers.utils.parseEther('50').toString())
            expect(newPrice.toString()).to.equal(ethers.utils.parseEther('199').toString())
        })

        it('only role can update price', async () => {
            let gen = await myScience.generateAssetView('0', SALT, false)
            await myFactory.mint(person.address, gen.gen_)
            let prices = [
                ethers.utils.parseEther('199'),
                ethers.utils.parseEther('599'),
                ethers.utils.parseEther('1999'),
                ethers.utils.parseEther('5999'),
                ethers.utils.parseEther('19999')
            ]
            await expectRevert(
                (await myUpgrader.connect(person)).updatePrices(prices),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
            )
            let price = await myUpgrader.price('0')
            await (await myUpgrader.connect(team)).updatePrices(prices)
            let newPrice = await myUpgrader.price('0')
            expect(price.toString()).to.equal(ethers.utils.parseEther('50').toString())
            expect(newPrice.toString()).to.equal(ethers.utils.parseEther('199').toString())
        })

        it('can upgrade through relayer', async () => {
            await mintBatch(myScience, myFactory, person.address, ['0', '0', '0', '0', '0'], SALTS)
            await (await myMPOLY.connect(person)).approve(myUpgrader.address, ethers.constants.MaxUint256)
            await (await myMPOLY.connect(person)).approve(paymaster, ethers.constants.MaxUint256)
            await (await myFactory.connect(person)).setApprovalForAll(myUpgrader.address, true)

            const _hero = await myFactory.heroeOfId('0')
            const dec = await myData.deconstructGen(_hero.genetic)
            const asset = dec._rarity.random % dec._rarity.module
            let rarity = dec._rarity.random % dec._rarity.module
            rarity = rarity + 1
            const gen = await myScience.generateFromRootView([asset, 0, rarity], [true, false, true], SALT, false)

            //create meta-tx
            const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
            const UpgraderFactory = await hre.ethers.getContractFactory('MonstropolyUpgrader')
            const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [SALT])
            const upgradeData = UpgraderFactory.interface.encodeFunctionData('upgrade', [['0', '1', '2', '3', '4'], '-1'])
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
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'validUntil', type: 'uint256' }
                ]
            }

            const value = {
                from: person.address,
                to: myUpgrader.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: upgradeData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)
            const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value, signature)
            const _newHero = await myFactory.heroeOfId('5')
            expect(_newHero.owner).to.equal(person.address)
            expect(_newHero.genetic).to.equal(gen.gen_)
            const _oldHero = await myFactory.heroeOfId('4')
            expect(_oldHero.owner).to.equal('0x000000000000000000000000000000000000dEaD')
        })

        it('can upgrade clonning through relayer', async () => {
            await mintBatch(myScience, myFactory, person.address, ['0', '0', '0', '0', '0'], SALTS)
            await (await myMPOLY.connect(person)).approve(myUpgrader.address, ethers.constants.MaxUint256)
            await (await myMPOLY.connect(person)).approve(paymaster, ethers.constants.MaxUint256)
            await (await myFactory.connect(person)).setApprovalForAll(myUpgrader.address, true)

            const _hero = await myFactory.heroeOfId('2')
            const dec = await myData.deconstructGen(_hero.genetic)
            const asset = dec._rarity.random % dec._rarity.module
            let rarity = dec._rarity.random % dec._rarity.module
            rarity = rarity + 1
            const gen = await myScience.generateFromRootView([asset, 0, rarity], [true, false, true], SALT, false)

            //create meta-tx
            const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
            const UpgraderFactory = await hre.ethers.getContractFactory('MonstropolyUpgrader')
            const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [SALT])
            const upgradeData = UpgraderFactory.interface.encodeFunctionData('upgrade', [['0', '1', '2', '3', '4'], '2'])
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
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'validUntil', type: 'uint256' }
                ]
            }

            const value = {
                from: person.address,
                to: myUpgrader.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: upgradeData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)
            const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value, signature)
            const _newHero = await myFactory.heroeOfId('5')
            expect(_newHero.owner).to.equal(person.address)
            // expect(_newHero.genetic).to.equal(gen.gen_) //doesnt apply here because of attrs-clonning
            const _oldHero = await myFactory.heroeOfId('2')
            expect(_oldHero.owner).to.equal('0x000000000000000000000000000000000000dEaD')

            const _oldDec = await myData.deconstructGen(_oldHero.genetic)
            const _newDec = await myData.deconstructGen(_newHero.genetic)

            for(let i = 0; i < _newDec._attributes.length; i++) {
                expect(_newDec._attributes[i].random % _newDec._attributes[i].module).to.eq(_oldDec._attributes[i].random % _oldDec._attributes[i].module)
            }
        })

        it('upgrade reverts if no balance or allowance', async () => {
            await mintBatch(myScience, myFactory, person.address, ['0', '0', '0', '0', '0'], SALTS)
            await (await myMPOLY.connect(person)).approve(paymaster, ethers.constants.MaxUint256)
            await (await myFactory.connect(person)).setApprovalForAll(myUpgrader.address, true)

            const _hero = await myFactory.heroeOfId('0')
            const dec = await myData.deconstructGen(_hero.genetic)
            const asset = dec._rarity.random % dec._rarity.module
            let rarity = dec._rarity.random % dec._rarity.module
            rarity = rarity + 1
            const gen = await myScience.generateFromRootView([asset, 0, rarity], [true, false, true], SALT, false)

            //create meta-tx
            const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
            const UpgraderFactory = await hre.ethers.getContractFactory('MonstropolyUpgrader')
            const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [SALT])
            const upgradeData = UpgraderFactory.interface.encodeFunctionData('upgrade', [['0', '1', '2', '3', '4'], '-1'])
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
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'validUntil', type: 'uint256' }
                ]
            }

            const value = {
                from: person.address,
                to: myUpgrader.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: upgradeData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)

            await (await myMPOLY.connect(person)).transfer(owner.address, ethers.utils.parseEther('9999'))

            await expectRevert(
                myRelayer.callAndRelay(setRandomData, myScience.address, value, signature),
                'MonstropolyUpgrader: Insufficient MPOLY'
            )

            await myMPOLY.transfer(person.address, ethers.utils.parseEther('10000'))

            await expectRevert(
                myRelayer.callAndRelay(setRandomData, myScience.address, value, signature),
                'MonstropolyUpgrader: Insufficient allowance'
            )
            await (await myMPOLY.connect(person)).approve(myUpgrader.address, ethers.constants.MaxUint256)
            const response = await myRelayer.callAndRelay(setRandomData, myScience.address, value, signature)
            const _newHero = await myFactory.heroeOfId('5')
            expect(_newHero.owner).to.equal(person.address)
            expect(_newHero.genetic).to.equal(gen.gen_)
            const _oldHero = await myFactory.heroeOfId('4')
            expect(_oldHero.owner).to.equal('0x000000000000000000000000000000000000dEaD')
        })

        it('cannot upgrade different assets', async () => {
            await mintBatch(myScience, myFactory, person.address, ['1', '0', '0', '0', '0'], SALTS)
            await (await myMPOLY.connect(person)).approve(myUpgrader.address, ethers.constants.MaxUint256)
            await (await myMPOLY.connect(person)).approve(paymaster, ethers.constants.MaxUint256)
            await (await myFactory.connect(person)).setApprovalForAll(myUpgrader.address, true)

            const _hero = await myFactory.heroeOfId('0')
            const dec = await myData.deconstructGen(_hero.genetic)
            const asset = dec._rarity.random % dec._rarity.module
            let rarity = dec._rarity.random % dec._rarity.module
            rarity = rarity + 1
            const gen = await myScience.generateFromRootView([asset, 0, rarity], [true, false, true], SALT, false)

            //create meta-tx
            const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
            const UpgraderFactory = await hre.ethers.getContractFactory('MonstropolyUpgrader')
            const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [SALT])
            const upgradeData = UpgraderFactory.interface.encodeFunctionData('upgrade', [['0', '1', '2', '3', '4'], '-1'])
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
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'validUntil', type: 'uint256' }
                ]
            }

            const value = {
                from: person.address,
                to: myUpgrader.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: upgradeData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)

            await expectRevert(
                myRelayer.callAndRelay(setRandomData, myScience.address, value, signature),
                'MonstropolyUpgrader: inconsistent asset'
            )
        })

        it('cannot upgrade different rarities', async () => {
            await mintBatch(myScience, myFactory, person.address, ['0', '0', '0', '0', '0'], SALTS_INCONSISTENT_RARITY)
            await (await myMPOLY.connect(person)).approve(myUpgrader.address, ethers.constants.MaxUint256)
            await (await myMPOLY.connect(person)).approve(paymaster, ethers.constants.MaxUint256)
            await (await myFactory.connect(person)).setApprovalForAll(myUpgrader.address, true)

            const _hero = await myFactory.heroeOfId('0')
            const dec = await myData.deconstructGen(_hero.genetic)
            const asset = dec._rarity.random % dec._rarity.module
            let rarity = dec._rarity.random % dec._rarity.module
            rarity = rarity + 1
            const gen = await myScience.generateFromRootView([asset, 0, rarity], [true, false, true], SALT, false)

            //create meta-tx
            const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
            const UpgraderFactory = await hre.ethers.getContractFactory('MonstropolyUpgrader')
            const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [SALT])
            const upgradeData = UpgraderFactory.interface.encodeFunctionData('upgrade', [['0', '1', '2', '3', '4'], '-1'])
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
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'validUntil', type: 'uint256' }
                ]
            }

            const value = {
                from: person.address,
                to: myUpgrader.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: upgradeData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)

            await expectRevert(
                myRelayer.callAndRelay(setRandomData, myScience.address, value, signature),
                'MonstropolyUpgrader: inconsistent rarity'
            )
        })

        it('cannot upgrade max rarity', async () => {
            await mintBatch(myScience, myFactory, person.address, ['0', '0', '0', '0', '0'], SALTS_MAX_RARITY)
            await (await myMPOLY.connect(person)).approve(myUpgrader.address, ethers.constants.MaxUint256)
            await (await myMPOLY.connect(person)).approve(paymaster, ethers.constants.MaxUint256)
            await (await myFactory.connect(person)).setApprovalForAll(myUpgrader.address, true)

            const _hero = await myFactory.heroeOfId('0')
            const dec = await myData.deconstructGen(_hero.genetic)
            const asset = dec._rarity.random % dec._rarity.module
            let rarity = dec._rarity.random % dec._rarity.module
            rarity = rarity + 1
            const gen = await myScience.generateFromRootView([asset, 0, rarity], [true, false, true], SALT, false)

            //create meta-tx
            const ScienceFactory = await hre.ethers.getContractFactory('MonstropolyGenScience')
            const UpgraderFactory = await hre.ethers.getContractFactory('MonstropolyUpgrader')
            const setRandomData = ScienceFactory.interface.encodeFunctionData('setRandom', [SALT])
            const upgradeData = UpgraderFactory.interface.encodeFunctionData('upgrade', [['0', '1', '2', '3', '4'], '-1'])
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
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'validUntil', type: 'uint256' }
                ]
            }

            const value = {
                from: person.address,
                to: myUpgrader.address,
                value: 0,
                gas: 3000000,
                nonce: nonce.toString(),
                data: upgradeData,
                validUntil: 0
            }

            const signature = await person._signTypedData(domain, types, value)

            await expectRevert(
                myRelayer.callAndRelay(setRandomData, myScience.address, value, signature),
                'MonstropolyUpgrader: You reach max rarity'
            )
        })
    })
})
