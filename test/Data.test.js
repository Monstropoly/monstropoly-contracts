const { ethers } = require('hardhat')
const { expect } = require('chai')

const GEN = '010100030101010303'

let myData, myDeployer

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
        const MonstropolyDeployer = await ethers.getContractFactory('MonstropolyDeployer')
        myDeployer = await MonstropolyDeployer.deploy()

        const MonstropolyData = await ethers.getContractFactory('MonstropolyData')
        let calldataData = await MonstropolyData.interface.encodeFunctionData('initialize', []);

        await myDeployer.deploy(ethers.utils.id("DATA"), MonstropolyData.bytecode, calldataData)
        myData = await MonstropolyData.attach(await myDeployer.get(ethers.utils.id('DATA')))

    })
    describe('lengths stuff', () => {
        it('can updateLengths and getLengths', async () => {
            
        })
    })
})
