const { ethers } = require('hardhat');

const TICKETS_ADDR = ''
// const TICKETS_ADDR = ''

const AMOUNT = 0

async function main() {
    console.log('Tickets batch minting...')

    const signers = await ethers.getSigners()
    const receiver = signers[0]

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    const response = await ticketsContract.mintBatch(receiver.address, AMOUNT)
    await response.wait()
    console.log('Tickets batch minted')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});