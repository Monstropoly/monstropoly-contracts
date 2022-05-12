const { ethers } = require("hardhat");

async function main() {
    // We get the contract to deploy
    const MonstropolyRelayerFree = await ethers.getContractFactory("MonstropolyRelayerFree");
    const deployer = await MonstropolyRelayerFree.deploy();
    await deployer.deployed();
    console.log("MonstropolyRelayerFree:", deployer.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});