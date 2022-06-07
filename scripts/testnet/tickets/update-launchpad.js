const { ethers } = require('hardhat');

const LAUNCHPAD = '0x7407d219E56309c050c5cDAE9687542234eBA584'
// const TICKETS_ADDR = '0x9A41D24Bd60dAcfc6c3Bb2ae32Fdb7F237B4c31F'
const TICKETS_ADDR = '0x712f13B95775E7f1354341AA29d5Ce9cAe357a65'

async function main() {
    console.log('Ticket config...')

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    const response = await ticketsContract.updateLaunchpadConfig(800, LAUNCHPAD)
    await response.wait()
    console.log('Ticket configured')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});