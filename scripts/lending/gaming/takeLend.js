const { ethers } = require('hardhat');

const LENDING_ADDR = '0x60D40BaCaFD4035a6f95dda8Aeb9612C69c25992'
const TOKEN_ID = 112

async function main() {
    await hre.run('compile');

    const accounts = await ethers.getSigners()

    const lendingContract = await ethers.getContractAt('MonstropolyLendingGame', LENDING_ADDR)
    const lend = await lendingContract.getLend(TOKEN_ID)

    let value = ethers.utils.parseEther('0')
    if (lend.price.gt(0)) {
        if (lend.payToken == ethers.constants.AddressZero) {
            const balance = await ethers.provider.getBalance(accounts[0].address)
            if (balance.lt(lend.price)) console.log('Not enough balance')

            value = lend.price
        } else {
            const token = await ethers.getContractAt('Token', lend.payToken)
            const balance = await token.balanceOf(accounts[0].address)

            if (balance.lt(lend.price)) console.log('Not enough balance')

            const allowance = await token.allowance(accounts[0].address, lendingContract.address)
            if (allowance.lt(lend.price)) {
                await token.approve(lendingContract.address, ethers.constants.MaxUint256)
                console.log('Pay token approved')
            }
        }
    }

    const response = await lendingContract.connect(accounts[1]).takeLend(
        TOKEN_ID,
        { value: value }
    )
    await response.wait()
    console.log('Lend offer taken...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});