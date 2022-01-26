const { getWhitelistTree, solKeccak256 } = require('../utils/whitelistTree')
const hre = require('hardhat')

const {
    ether, expectRevert
} = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')
const { artifacts } = require('hardhat')
const { BigNumber } = require('@ethersproject/bignumber')
const { expect } = require('chai')
const { formatEther } = require('@ethersproject/units')
const { providers } = require('ethers')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const Deployer = artifacts.require('MonstropolyDeployer')
const Data = artifacts.require('MonstropolyData')
const Factory = artifacts.require('MonstropolyFactory')
const Science = artifacts.require('MonstropolyGenScience')

const SALT = '7483982234090782718293841329487343463214988908318743981357385787418329837483911111111111111111119876'
const MINTER_ROLE = ethers.utils.id('MINTER_ROLE')

let myData, myFactory, myScience, myDeployer

let accounts

describe('MonstropolyData', function () {
    let owner, person, person2

    before(async () => {
        await hre.run('compile')
        accounts = await web3.eth.getAccounts()
        owner = accounts[0]
        person = accounts[1]
        person2 = accounts[2]
    })

    beforeEach(async () => {

        myDeployer = await Deployer.new()

        const dataFactory = await ethers.getContractFactory('MonstropolyData')
        let calldataData = await dataFactory.interface.encodeFunctionData('initialize', []);

        const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
        let calldataerc721 = await erc721Factory.interface.encodeFunctionData('initialize', []);

        const scienceFactory = await ethers.getContractFactory('MonstropolyGenScience')
        let calldataScience = await scienceFactory.interface.encodeFunctionData('initialize', []);

        await myDeployer.deploy(solKeccak256("DATA"), dataFactory.bytecode, calldataData)
        await myDeployer.deploy(solKeccak256("FACTORY"), erc721Factory.bytecode, calldataerc721)
        await myDeployer.deploy(solKeccak256("SCIENCE"), scienceFactory.bytecode, calldataScience)

        const [data, factory, science] = await Promise.all([
            myDeployer.get(solKeccak256("DATA")),
            myDeployer.get(solKeccak256("FACTORY")),
            myDeployer.get(solKeccak256("SCIENCE"))
        ])

        myData = await Data.at(data)
        myFactory = await Factory.at(factory)
        myScience = await Science.at(science)

        await myDeployer.grantRole(MINTER_ROLE, owner)
    })
    describe('lengths stuff', () => {
        it('can updateLengths and getLengths', async () => {
            let nStats = '5'
            let nAttributes = '18'
            await myData.updateLengths(nStats, nAttributes)
            let lengths = await myData.getLengths()
            expect(lengths[1].toString()).to.equal(nStats)
            expect(lengths[2].toString()).to.equal(nAttributes)
        })

        it('can updateLengths and setModules', async () => {
            let nStats = '3'
            let nAttributes = '12'
            let MODULES0 = '0000200006000060006400064000640000F0000A000050000F0000F0000E000150000D000080FDE80FDE80FDE8'
            let MODULES1 = '0000200006000060006400064000640000F0000A000000000000000000000000000000000080FDE80FDE80FDE8'
            await myData.updateLengths(nStats, nAttributes)
            await myData.setModules(
                [
                    '0',
                    '1'
                ],
                [
                    MODULES0,
                    MODULES1
                ]
            )
            let modules0 = await myData.moduleStrings('0')
            let modules1 = await myData.moduleStrings('1')
            expect(MODULES0).to.equal(modules0)
            expect(MODULES1).to.equal(modules1)
        })

        it('can updateLengths and setModulesByAsset', async () => {
            let nStats = '3'
            let nAttributes = '12'
            let MODULES0 = '0000200006000060006400064000640000F0000A000050000F0000F0000E000150000D000080FDE80FDE80FDE8'
            await myData.updateLengths(nStats, nAttributes)
            await myData.setModulesByAsset(
                '0',
                MODULES0
            )
            let modules0 = await myData.moduleStrings('0')
            expect(MODULES0).to.equal(modules0)
        })

        it('reverts in setModules if wrong length', async () => {
            let nStats = '3'
            let nAttributes = '12'
            let MODULES0 = '000200006000060006400064000640000F0000A000050000F0000F0000E000150000D000080FDE80FDE80FDE8'
            let MODULES1 = '000200006000060006400064000640000F0000A000000000000000000000000000000000080FDE80FDE80FDE8'
            await myData.updateLengths(nStats, nAttributes)
            await expectRevert(
                myData.setModules(
                    [
                        '0',
                        '1'
                    ],
                    [
                        MODULES0,
                        MODULES1
                    ]
                ),
                'MonstropolyData: invalid length'
            )
        })

        it('reverts in setModules if lengths doesnt match', async () => {
            let nStats = '3'
            let nAttributes = '12'
            let MODULES0 = '0000200006000060006400064000640000F0000A000050000F0000F0000E000150000D000080FDE80FDE80FDE8'
            let MODULES1 = '000200006000060006400064000640000F0000A000000000000000000000000000000000080FDE80FDE80FDE8'
            await myData.updateLengths(nStats, nAttributes)
            await expectRevert(
                myData.setModules(
                    [
                        '0',
                        '1'
                    ],
                    [
                        MODULES0,
                        MODULES1
                    ]
                ),
                'MonstropolyData: invalid length'
            )
        })
    })
})
