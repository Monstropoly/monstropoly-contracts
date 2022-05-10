const { ethers } = require("hardhat");

const DEPLOYER_ADDR = "0xe6f5BA3712CfAe6b4cDd27E4d26f77dF3b10d21b"
const _IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

async function main() {
    await hre.run("compile");

    // We get the contract to deploy
    const deployer = await ethers.getContractAt("MonstropolyDeployer", DEPLOYER_ADDR);

    const Factory = await ethers.getContractFactory("MonstropolyLendingGame")
    const emptyInitializeCalldata = Factory.interface.encodeFunctionData("initialize", []);
    const response = await deployer.deploy(ethers.utils.id("LENDING_GAME_V2"), Factory.bytecode, emptyInitializeCalldata)
    await response.wait()
    const lendingAddress = await deployer.get(ethers.utils.id("LENDING_GAME_V2"))
    await deployer.grantRole(ethers.utils.id("LOCKER_ROLE"), lendingAddress)

    console.log("LendingGame:", lendingAddress)

    const implementationEncoded = await ethers.provider.getStorageAt(lendingAddress, _IMPLEMENTATION_SLOT)
	const implementation = ethers.utils.defaultAbiCoder.decode(["address"], implementationEncoded)

    console.log("Implementation:", implementation[0])
    console.log("hardhat verify --network bsctestnet ", implementation[0])
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});