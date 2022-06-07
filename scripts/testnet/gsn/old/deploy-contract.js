const { ethers } = require("hardhat");
const json = require('./addresses.json')
const fs = require('fs')
const path = require('path')

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the contract to deploy
    const MyGSNContractFactory = await hre.ethers.getContractFactory("MyGSNContract");

    const deployer = await MyGSNContractFactory.deploy(json.forwarder);

    const contract = await deployer.deployed();
    console.log("MyGSNContract deployed to:", deployer.address);

    json.contract = deployer.address

    fs.writeFileSync(path.join(__dirname, './addresses.json'), JSON.stringify(json, null, 4))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});