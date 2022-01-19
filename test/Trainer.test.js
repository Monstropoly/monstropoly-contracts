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
const GLD_ID = ethers.utils.id('GLD')
const DISTRIBUTION_VAULT_ID = ethers.utils.id('DISTRIBUTION_VAULT')
const DATA_ID = ethers.utils.id('DATA')
const SCIENCE_ID = ethers.utils.id('SCIENCE')
const TRAINER_ID = ethers.utils.id('TRAINER')
const FACTORY_ID = ethers.utils.id('FACTORY')
const TREASURY_WALLET = ethers.utils.id('TREASURY_WALLET')
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
const SALT =   '748398223409078271829384132948734346321065890831874398135738578741832983748391111111111111111111987654987654987654987654'
const SALT2 =  '748398223409078271829385132948734346321065890831874398135738578741832983748391111111111111111111987654987654987654987654'


describe('Trainer', function () {
    let owner, team, person
    let myDeployer, myMPOLY, myVault, myData, myScience, myFactory, myTrainer, myRelayer, paymaster

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
        const Trainer = await ethers.getContractFactory('MonstropolyTrainer')
        const calldataData = await ERC20.interface.encodeFunctionData('initialize', []);

        await myDeployer.setId(DISTRIBUTION_VAULT_ID, owner.address)
        const dataImpl = await Data.deploy();
        await myDeployer.deployProxyWithImplementation(DATA_ID, dataImpl.address, calldataData)
        await myDeployer.deploy(SCIENCE_ID, GenScience.bytecode, calldataData)
        await myDeployer.deploy(FACTORY_ID, Factory.bytecode, calldataData)
        await myDeployer.deploy(TRAINER_ID, Trainer.bytecode, calldataData)
        await myDeployer.deploy(ERC20_ID, ERC20.bytecode, calldataData)

        const erc20Address = await myDeployer.get(ERC20_ID)
        const dataAddress = await myDeployer.get(DATA_ID)
        const scienceAddress = await myDeployer.get(SCIENCE_ID)
        const factoryAddress = await myDeployer.get(FACTORY_ID)
        const trainerAddress = await myDeployer.get(TRAINER_ID)

        myMPOLY = await ERC20.attach(erc20Address)
        myData = await Data.attach(dataAddress)
        myScience = await GenScience.attach(scienceAddress)
        myFactory = await Factory.attach(factoryAddress)
        myTrainer = await Trainer.attach(trainerAddress)

        await myMPOLY.transfer(person.address, ethers.utils.parseEther('10000'))

        await myDeployer.grantRole(MINTER_ROLE, myTrainer.address)
        await myDeployer.grantRole(MINTER_ROLE, owner.address)
        await myDeployer.grantRole(DEFAULT_ADMIN_ROLE, team.address)
        await myDeployer.setId(TREASURY_WALLET, team.address)
        await myDeployer.setId(GLD_ID, myMPOLY.address) //TBD: use real GLD

        const Uniswap = await ethers.getContractFactory('UniswapMock')
        let myUniswap = await Uniswap.deploy(myMPOLY.address)
        const Relayer = await ethers.getContractFactory('MonstropolyRelayer')
        myRelayer = await Relayer.deploy(myUniswap.address)
        paymaster = await myRelayer.paymaster()
        await (await myTrainer.connect(team)).setTrustedForwarder(myRelayer.address)
    })
    describe('train', () => {

        it('can get price', async () => {
            let gen = await myScience.generateAssetView('0', SALT, false)
            await myFactory.mint(person.address, gen.gen_)
            let price = await myTrainer.prices('0', '0', '1')
            expect(price.toString()).to.equal(ethers.utils.parseEther('100').toString())
        })

        it('can update price', async () => {
            let gen = await myScience.generateAssetView('0', SALT, false)
            await myFactory.mint(person.address, gen.gen_)
            let price = await myTrainer.prices('0', '0', '1')
            let price2 = await myTrainer.prices('1', '1', '5')
            await (await myTrainer.connect(team)).updatePrice(
                [
                    '0',
                    '1'
                ],
                [
                    '0',
                    '1'
                ],
                [
                    '1',
                    '5'
                ],
                [
                    ethers.utils.parseEther('199'),
                    ethers.utils.parseEther('599')
                ]
            )
            let newPrice = await myTrainer.prices('0', '0', '1')
            let newPrice2 = await myTrainer.prices('1', '1', '5')
            expect(price.toString()).to.equal(ethers.utils.parseEther('100').toString())
            expect(price2.toString()).to.equal(ethers.utils.parseEther('350').toString())
            expect(newPrice.toString()).to.equal(ethers.utils.parseEther('199').toString())
            expect(newPrice2.toString()).to.equal(ethers.utils.parseEther('599').toString())
        })

        it('only role can update price', async () => {

            await expectRevert(
                (await myTrainer.connect(person)).updatePrice(
                    [
                        '0',
                        '1'
                    ],
                    [
                        '0',
                        '1'
                    ],
                    [
                        '1',
                        '5'
                    ],
                    [
                        ethers.utils.parseEther('199'),
                        ethers.utils.parseEther('599')
                    ]
                ),
                'AccessControlProxyPausable: account ' + String(person.address).toLowerCase() + ' is missing role 0x0000000000000000000000000000000000000000000000000000000000000000'
            )
            let price = await myTrainer.prices('0', '0', '1')
            await (await myTrainer.connect(team)).updatePrice(
                [
                    '0',
                    '1'
                ],
                [
                    '0',
                    '1'
                ],
                [
                    '1',
                    '5'
                ],
                [
                    ethers.utils.parseEther('199'),
                    ethers.utils.parseEther('599')
                ]
            )
            let newPrice = await myTrainer.prices('0', '0', '1')
            expect(price.toString()).to.equal(ethers.utils.parseEther('100').toString())
            expect(newPrice.toString()).to.equal(ethers.utils.parseEther('199').toString())
        })

        it('can train asset 0, statIndex 0 and increment 1', async () => {
            let increment = 1
            let statIndex = 0
            let asset = 0

            let price = await myTrainer.prices(asset, statIndex, increment)
            let personBalancePre = await myMPOLY.balanceOf(person.address)
            let teamBalancePre = await myMPOLY.balanceOf(team.address)

            let gen = await myScience.generateAssetView(asset, SALT, false);
            await myFactory.mint(person.address, gen.gen_);
            await (await myFactory.connect(person)).setApprovalForAll(myTrainer.address, true)
            await (await myMPOLY.connect(person)).approve(myTrainer.address, ethers.constants.MaxUint256)
            await (await myTrainer.connect(person)).trainStat('0', statIndex, increment)

            const hero0 = await myFactory.heroeOfId('0')
            const hero1 = await myFactory.heroeOfId('1')
            const dec0 = await myData.deconstructGen(hero0.genetic)
            const dec1 = await myData.deconstructGen(hero1.genetic)
            const stat0 = dec0._stats[statIndex].random % dec0._stats[statIndex].module
            const stat1 = dec1._stats[statIndex].random % dec1._stats[statIndex].module

            let personBalancePost = await myMPOLY.balanceOf(person.address)
            let teamBalancePost = await myMPOLY.balanceOf(team.address)

            expect(stat0 + increment).to.equal(stat1)
            expect(personBalancePost.toString()).to.equal((personBalancePre.sub(price)).toString())
            expect(teamBalancePost.toString()).to.equal((teamBalancePre.add(price)).toString())
        })

        it('can train asset 0, statIndex 0 and increment 5', async () => {
            let increment = 5
            let statIndex = 0
            let asset = 0

            let price = await myTrainer.prices(asset, statIndex, increment)
            let personBalancePre = await myMPOLY.balanceOf(person.address)
            let teamBalancePre = await myMPOLY.balanceOf(team.address)

            let gen = await myScience.generateAssetView(asset, SALT, false);
            await myFactory.mint(person.address, gen.gen_);
            await (await myFactory.connect(person)).setApprovalForAll(myTrainer.address, true)
            await (await myMPOLY.connect(person)).approve(myTrainer.address, ethers.constants.MaxUint256)
            await (await myTrainer.connect(person)).trainStat('0', statIndex, increment)

            const hero0 = await myFactory.heroeOfId('0')
            const hero1 = await myFactory.heroeOfId('1')
            const dec0 = await myData.deconstructGen(hero0.genetic)
            const dec1 = await myData.deconstructGen(hero1.genetic)
            const stat0 = dec0._stats[statIndex].random % dec0._stats[statIndex].module
            const stat1 = dec1._stats[statIndex].random % dec1._stats[statIndex].module

            let personBalancePost = await myMPOLY.balanceOf(person.address)
            let teamBalancePost = await myMPOLY.balanceOf(team.address)

            expect(stat0 + increment).to.equal(stat1)
            expect(personBalancePost.toString()).to.equal((personBalancePre.sub(price)).toString())
            expect(teamBalancePost.toString()).to.equal((teamBalancePre.add(price)).toString())
        })

        it('can train asset 1, statIndex 0 and increment 5', async () => {
            let increment = 5
            let statIndex = 0
            let asset = 1

            let price = await myTrainer.prices(asset, statIndex, increment)
            let personBalancePre = await myMPOLY.balanceOf(person.address)
            let teamBalancePre = await myMPOLY.balanceOf(team.address)

            let gen = await myScience.generateAssetView(asset, SALT, false);
            await myFactory.mint(person.address, gen.gen_);
            await (await myFactory.connect(person)).setApprovalForAll(myTrainer.address, true)
            await (await myMPOLY.connect(person)).approve(myTrainer.address, ethers.constants.MaxUint256)
            await (await myTrainer.connect(person)).trainStat('0', statIndex, increment)

            const hero0 = await myFactory.heroeOfId('0')
            const hero1 = await myFactory.heroeOfId('1')
            const dec0 = await myData.deconstructGen(hero0.genetic)
            const dec1 = await myData.deconstructGen(hero1.genetic)
            const stat0 = dec0._stats[statIndex].random % dec0._stats[statIndex].module
            const stat1 = dec1._stats[statIndex].random % dec1._stats[statIndex].module

            let personBalancePost = await myMPOLY.balanceOf(person.address)
            let teamBalancePost = await myMPOLY.balanceOf(team.address)

            expect(stat0 + increment).to.equal(stat1)
            expect(personBalancePost.toString()).to.equal((personBalancePre.sub(price)).toString())
            expect(teamBalancePost.toString()).to.equal((teamBalancePre.add(price)).toString())
        })

        it('can train asset 0, statIndex 0 and increment 5', async () => {
            let increment = 5
            let statIndex = 1
            let asset = 0

            let price = await myTrainer.prices(asset, statIndex, increment)
            let personBalancePre = await myMPOLY.balanceOf(person.address)
            let teamBalancePre = await myMPOLY.balanceOf(team.address)

            let gen = await myScience.generateAssetView(asset, SALT, false);
            await myFactory.mint(person.address, gen.gen_);
            await (await myFactory.connect(person)).setApprovalForAll(myTrainer.address, true)
            await (await myMPOLY.connect(person)).approve(myTrainer.address, ethers.constants.MaxUint256)
            await (await myTrainer.connect(person)).trainStat('0', statIndex, increment)

            const hero0 = await myFactory.heroeOfId('0')
            const hero1 = await myFactory.heroeOfId('1')
            const dec0 = await myData.deconstructGen(hero0.genetic)
            const dec1 = await myData.deconstructGen(hero1.genetic)
            const stat0 = dec0._stats[statIndex].random % dec0._stats[statIndex].module
            const stat1 = dec1._stats[statIndex].random % dec1._stats[statIndex].module

            let personBalancePost = await myMPOLY.balanceOf(person.address)
            let teamBalancePost = await myMPOLY.balanceOf(team.address)

            expect(stat0 + increment).to.equal(stat1)
            expect(personBalancePost.toString()).to.equal((personBalancePre.sub(price)).toString())
            expect(teamBalancePost.toString()).to.equal((teamBalancePre.add(price)).toString())
        })

        it('reverts in stat overflow', async () => {
            let increment = 5
            let statIndex = 3
            let asset = 0


            let gen = await myScience.generateAssetView(asset, SALT, false);
            await myFactory.mint(person.address, gen.gen_);
            await (await myFactory.connect(person)).setApprovalForAll(myTrainer.address, true)
            await (await myMPOLY.connect(person)).approve(myTrainer.address, ethers.constants.MaxUint256)

            await expectRevert(
                (await myTrainer.connect(person)).trainStat('0', statIndex, increment),
                'MonstropolyData: stat overflow'
            )
        })

        it('reverts if gen already exists', async () => {
            let increment = 1
            let statIndex = 0
            let asset = 0

            let gen = await myScience.generateAssetView(asset, SALT, false);
            let gen2 = await myScience.generateAssetView(asset, SALT2, false);
            await myFactory.mint(person.address, gen.gen_);
            await myFactory.mint(person.address, gen2.gen_);
            await (await myFactory.connect(person)).setApprovalForAll(myTrainer.address, true)
            await (await myMPOLY.connect(person)).approve(myTrainer.address, ethers.constants.MaxUint256)
            await expectRevert(
                (await myTrainer.connect(person)).trainStat('0', statIndex, increment),
                'MonstropolyFactory: gen already exists'
            )
        })

        it('reverts if price is 0 (not allowed)', async () => {
            let increment = 10
            let statIndex = 0
            let asset = 0

            let gen = await myScience.generateAssetView(asset, SALT, false);
            let gen2 = await myScience.generateAssetView(asset, SALT2, false);
            await myFactory.mint(person.address, gen.gen_);
            await myFactory.mint(person.address, gen2.gen_);
            await (await myFactory.connect(person)).setApprovalForAll(myTrainer.address, true)
            await (await myMPOLY.connect(person)).approve(myTrainer.address, ethers.constants.MaxUint256)
            await expectRevert(
                (await myTrainer.connect(person)).trainStat('0', statIndex, increment),
                'MonstropolyTrainer: train not allowed'
            )
        })
    })
})
