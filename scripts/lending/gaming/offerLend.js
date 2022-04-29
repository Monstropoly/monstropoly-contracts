const { ethers } = require('hardhat');

const LENDING_ADDR = '0xe4dB7F48e8c2415b5926aE7B47CA8897aE8F93FC'
const TOKEN_ID = 112
const DURATION = 86400
const PRICE = ethers.utils.parseEther('0')
const TOKEN_ADDR = ethers.constants.AddressZero // address(0) in case of BNB

async function main() {
    await hre.run('compile');

    const lendingContract = await ethers.getContractAt('MonstropolyLendingGame', LENDING_ADDR)

    const response = await lendingContract.offerLend(
        TOKEN_ID,
        ethers.constants.AddressZero,
        ethers.utils.parseEther('30'),
        DURATION,
        PRICE,
        TOKEN_ADDR
    )
    await response.wait()
    console.log('Lend offer created...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});