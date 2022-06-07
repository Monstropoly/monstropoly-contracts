const { ethers } = require('hardhat');

const TICKETS_ADDR = '0x9A41D24Bd60dAcfc6c3Bb2ae32Fdb7F237B4c31F'
// const TICKETS_ADDR = '0x712f13B95775E7f1354341AA29d5Ce9cAe357a65'

const ACCOUNTS = [
    '0xcd7669aafffb7f683995e6ed9b53d1e5fe72c142',
    '0xcc18024a12fcf2099693cb6c22eb127765ae6dbf',
    '0x9DAcB499c9eB6725679A62617e4DA97df52598c1'
]
const DISCOUNT_TYPE = 1

async function main() {
    console.log('Ticket discounts...')

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    const response = await ticketsContract.setDiscountAccounts(ACCOUNTS, DISCOUNT_TYPE)
    await response.wait()
    console.log('Ticket discounts setted')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});