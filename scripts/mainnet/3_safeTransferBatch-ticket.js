const { ethers } = require('hardhat');

const TICKETS_ADDR = ''
// const TICKETS_ADDR = ''

// Note: use this script for CONSECUTIVE tokenIds
const FROM_TOKEN_ID = 0
const TO_TOKEN_ID = 2
const FIXED_TO = ''

async function main() {
    console.log('Tickets batch transfering...')

    const signers = await ethers.getSigners()
    const sender = signers[0]

    const FROMS = []
    const TOS = []
    const TOKEN_IDS = []

    for (let i = 0; i < (TO_TOKEN_ID - FROM_TOKEN_ID + 1); i++) {
        FROMS.push(sender.address)
        TOS.push(FIXED_TO)
        TOKEN_IDS.push(i + FROM_TOKEN_ID)
    }

    const ticketsContract = await ethers.getContractAt('MonstropolyTickets', TICKETS_ADDR)

    const response = await ticketsContract.connect(sender).safeTransferFromBatch(
        FROMS,
        TOS,
        TOKEN_IDS
    )
    await response.wait()
    console.log('Tickets batch transfered')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});