const { ethers } = require('hardhat');

const LENDING_ADDR = '0xe4dB7F48e8c2415b5926aE7B47CA8897aE8F93FC'
const LEND_ID = 1

async function main() {
    await hre.run('compile');

    const lendingContract = await ethers.getContractAt('MonstropolyLendingGame', LENDING_ADDR)

    const response = await lendingContract.claimGamer(
        LEND_ID
    )
    await response.wait()
    console.log('Lend gamer claimed...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});