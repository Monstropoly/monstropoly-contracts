// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const ERC20_ID = ethers.utils.id("ERC20");
const STAKING_ID = ethers.utils.id("STAKING");
const FARMING_ID = ethers.utils.id("FARMING");
const REWARDS_ID = ethers.utils.id("REWARDS");
const DISTRIBUTION_VAULT_ID = ethers.utils.id("DISTRIBUTION_VAULT");
const DATA_ID = ethers.utils.id("DATA");
const FACTORY_ID = ethers.utils.id("FACTORY");
const SCIENCE_ID = ethers.utils.id("SCIENCE");
const MAGIC_BOXES_ID = ethers.utils.id("MAGIC_BOXES");
const UPGRADER_ID = ethers.utils.id("UPGRADER");

const IDS_TO_UPDATE = [
    ERC20_ID,
    STAKING_ID,
    FARMING_ID,
    DISTRIBUTION_VAULT_ID,
    REWARDS_ID
]

const UPDATE_ORJUST_SETID = [
    true,
    true,
    true,
    true,
    false
]

const MANAGER_OLD = '0xC868BFB5e1B9cE9D6728175aC9Dd4F632efCf210'
const MANAGER_NEW = '0xe6f5BA3712CfAe6b4cDd27E4d26f77dF3b10d21b'

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run('compile');

    // We get the contract to deploy
    const DeployerFactory = await ethers.getContractFactory("MonstropolyDeployer");

    const deployer = await DeployerFactory.attach(MANAGER_OLD);
    const newDeployer = await DeployerFactory.attach(MANAGER_NEW);
    console.log("Deployer:", deployer.address);

    for(let i = 0; i < IDS_TO_UPDATE.length; i++) {
        let addr = await deployer.get(IDS_TO_UPDATE[i])
        let response
        if (UPDATE_ORJUST_SETID[i]) {
            let contract = await ethers.getContractAt("AccessControlProxyPausable", addr)
            response = await contract.updateManager(MANAGER_NEW)
            await response.wait()
            console.log('ID ' + IDS_TO_UPDATE[i] + ' in ' + addr + ' updated')
        }
        
        response = await newDeployer.setId(IDS_TO_UPDATE[i], addr)
        await response.wait()
        console.log('ID ' + IDS_TO_UPDATE[i] + ' in ' + addr + ' setted in deployer')
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});