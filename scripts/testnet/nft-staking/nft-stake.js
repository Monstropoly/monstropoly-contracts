const { ethers } = require('hardhat');

const NFT_STAKING_ADDR = '0xeC0381EA4d5585C191e2dd4442e064e47e20Eaf2'
const TOKEN_ID = 108

async function main() {
    await hre.run('compile');

    const contract = await ethers.getContractAt('MonstropolyNFTStaking', NFT_STAKING_ADDR)

    const response = await contract.stake(
        TOKEN_ID
    )
    await response.wait()
    console.log('NFT staked...')
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});