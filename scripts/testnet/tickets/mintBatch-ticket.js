const { ethers } = require('hardhat');

const TICKETS_ADDR = '0x9A41D24Bd60dAcfc6c3Bb2ae32Fdb7F237B4c31F'
// const TICKETS_ADDR = '0x712f13B95775E7f1354341AA29d5Ce9cAe357a65'

const AMOUNT = 5

async function main() {
    console.log('Tickets batch minting...')

    const signers = await ethers.getSigners()
    const receiver = signers[1]

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    const response = await ticketsContract.mintBatch(receiver.address, AMOUNT)
    await response.wait()
    console.log('Tickets batch minted')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});