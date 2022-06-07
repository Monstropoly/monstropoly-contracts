const { ethers } = require('hardhat');

// const TICKETS_ADDR = '0x9A41D24Bd60dAcfc6c3Bb2ae32Fdb7F237B4c31F'
const TICKETS_ADDR = '0x712f13B95775E7f1354341AA29d5Ce9cAe357a65'

const AMOUNT1 = ethers.utils.parseEther('0.002')
const AMOUNT2 = ethers.utils.parseEther('0.003')

async function main() {
    console.log('Ticket config...')

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    const response = await ticketsContract.setDiscountAmounts(AMOUNT1, AMOUNT2)
    await response.wait()
    console.log('Ticket configured')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});