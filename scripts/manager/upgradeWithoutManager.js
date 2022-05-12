const { ethers, upgrades } = require("hardhat");

const PROXY_ADDR = "0x090038c87d0008F19Db1Df8471448b770e08CA22"

async function main() {
    await hre.run("compile");

    const proxy = await ethers.getContractAt("@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol:UUPSUpgradeable", PROXY_ADDR)
    const Factory = await ethers.getContractFactory("MonstropolyTickets")
    const newImplementation = await Factory.deploy()
    await newImplementation.deployed()
    const response = await proxy.upgradeTo(newImplementation.address)
    await response.wait()
    console.log("Implementation deployed:", newImplementation.address)
    console.log("hardhat verify --network bsctestnet ", newImplementation.address)

    // Using plugin (not working...)
    // // const FactoryOld = await ethers.getContractFactory("MonstropolyTicketsOld");
    // // await upgrades.forceImport(PROXY_ADDR, FactoryOld)
    // const Factory = await ethers.getContractFactory("MonstropolyTickets");
    // const response = await upgrades.upgradeProxy(PROXY_ADDR, Factory);
    // console.log("Proxy upgraded");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});