const { ethers } = require('hardhat');

const LAUNCHPAD = '0x2d0550620b17D748379273dC9E903E8298410Ccc'
const TICKET = '0x9A41D24Bd60dAcfc6c3Bb2ae32Fdb7F237B4c31F'
// const TICKET = '0x712f13B95775E7f1354341AA29d5Ce9cAe357a65'

const SIZE = 2
const PRICE = ethers.utils.parseEther('0.01')

async function main() {
    const accounts = await ethers.getSigners()
    const signer = accounts[1]

    const myLaunchpad = await ethers.getContractAt('Launchpad', LAUNCHPAD)

    const response2 = await myLaunchpad.connect(signer).mint(
        TICKET,
        SIZE,
        { value: PRICE.mul(SIZE) }
    )

    await response2.wait()
    console.log("Launchpad mint")
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});