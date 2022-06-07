const { ethers } = require('hardhat');

const LAUNCHPAD = '0x2d0550620b17D748379273dC9E903E8298410Ccc'
// const TICKET = '0x9A41D24Bd60dAcfc6c3Bb2ae32Fdb7F237B4c31F'
const TICKET = '0x712f13B95775E7f1354341AA29d5Ce9cAe357a65'

async function main() {

    const ETHManager = await ethers.getContractFactory('ETHManager')

    const manager = await ETHManager.deploy()
    await manager.deployed()
    console.log('ETHManager: ', manager.address)
    console.log('hardhat verify --network bsctestnet ' + manager.address)

    const response = await manager.setMaster(TICKET)
    await response.wait()

    console.log('Master setted')

    // const myLaunchpad = await ethers.getContractAt('Launchpad', LAUNCHPAD)
    // const accounts = await ethers.getSigners()
    // const validator = accounts[0].address

    // const response2 = await myLaunchpad.addCampaign(
    //     TICKET,
    //     0,
    //     manager.address, //payee
    //     ethers.utils.parseEther('0.01'), //LAUNCHPAD_PRICE
    //     0,
    //     parseInt(Date.now() * 3 / 1000),
    //     400,
    //     100,
    //     10,
    //     validator
    // )

    // await response2.wait()
    // console.log("Launchpad configured")

    console.log('Ticket config...')

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKET)

    const response3 = await ticketsContract.setEthManager(manager.address)
    await response3.wait()
    console.log('Ticket configured')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});