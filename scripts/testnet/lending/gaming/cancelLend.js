const { ethers } = require('hardhat');

const LENDING_ADDR = '0x60D40BaCaFD4035a6f95dda8Aeb9612C69c25992'
const TOKEN_ID = 112

async function main() {
    await hre.run('compile');

    const lendingContract = await ethers.getContractAt('MonstropolyLendingGame', LENDING_ADDR)

    const response = await lendingContract.cancelLend(
        TOKEN_ID
    )
    await response.wait()
    console.log('Lend offer cancelled...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});