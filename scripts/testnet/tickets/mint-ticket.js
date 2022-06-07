const { ethers } = require('hardhat');

const TICKETS_ADDR = '0xe1B436d38Ba7492dae279bE61Efd85cB1b9b474F'
// const TICKETS_ADDR = '0xc241221B82F08398CF70d2fB73e21b3C22666444'
// const TICKETS_ADDR = '0x4AaFb46C74D4Cd17D59190dc0B86A0b9e041C6e8'

async function main() {
    console.log('Ticket minting...')

    const signers = await ethers.getSigners()
    const receiver = signers[1]

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    const response = await ticketsContract.mint(receiver.address)
    await response.wait()
    console.log('Ticket minted')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});