// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { time } = require('@openzeppelin/test-helpers');
const { ethers, artifacts } = require('hardhat');
const {
    ether
  } = require('@openzeppelin/test-helpers')

const ERC20_ID = ethers.utils.id("ERC20");
const STAKING_ID = ethers.utils.id("STAKING");
const FARMING_ID = ethers.utils.id("FARMING");
const REWARDS_ID = ethers.utils.id("REWARDS");
const DISTRIBUTION_VAULT_ID = ethers.utils.id("DISTRIBUTION_VAULT");
const TEAM_ID = ethers.utils.id("TEAM")

const Deployer = artifacts.require('MonstropolyDeployer')
const ERC20 = artifacts.require('MonstropolyERC20')
const Staking = artifacts.require('MonstropolyStaking')
const Farming = artifacts.require('MonstropolyFarming')
const DistributionVault = artifacts.require('MonstropolyDistributionVault')
// const Distributor = artifacts.require('MonstropolyDistributor')
const RewardsDistributor = artifacts.require('MonstropolyRewardsDistributor')

const teamJson = require('../data/team.json')

const hre = require('hardhat');
const { getBalanceTree } = require('../../utils/balanceTree');
const { solKeccak256 } = require('../../utils/whitelistTree');
const Proxy = hre.artifacts.require('UUPSUpgradeableByRole')

const nBlocks = (currentBlock, n) => {
    return (Number(currentBlock.toString()) + n).toString()
}

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run('compile');

    // We get the contract to deploy
    // const DeployerFactory = await ethers.getContractFactory("MonstropolyDeployer");

    // const deployer = await DeployerFactory.deploy();

    const myDeployer = await Deployer.new()

    const Erc20Factory = await ethers.getContractFactory('MonstropolyERC20')
    let calldataErc20 = await Erc20Factory.interface.encodeFunctionData('initialize', []);

    const StakingFactory = await ethers.getContractFactory('MonstropolyStaking')
    let calldataStaking = await StakingFactory.interface.encodeFunctionData('initialize', []);

    const FarmingFactory = await ethers.getContractFactory('MonstropolyFarming')
    let calldataFarming = await FarmingFactory.interface.encodeFunctionData('initialize', []);

    const DistributionVaultFactory = await ethers.getContractFactory('MonstropolyDistributionVault')
    let calldataDistributionVault = await DistributionVaultFactory.interface.encodeFunctionData('initialize', []);

    await myDeployer.deploy(STAKING_ID, Staking.bytecode, calldataStaking)
    await myDeployer.deploy(FARMING_ID, Farming.bytecode, calldataFarming)
    await myDeployer.deploy(DISTRIBUTION_VAULT_ID, DistributionVault.bytecode, calldataDistributionVault)
    await myDeployer.deploy(ERC20_ID, ERC20.bytecode, calldataErc20)

    const distribution = await myDeployer.get(DISTRIBUTION_VAULT_ID)
    await myDeployer.grantRole('0x00', distribution)
    const myDistributionVault = await DistributionVault.at(distribution)
    const currentBlock = await time.latestBlock()
    const teamTree = getBalanceTree(teamJson).toJSON()
    
    await myDistributionVault.createDistributor(TEAM_ID, nBlocks(currentBlock, 0) , nBlocks(currentBlock, 1), '0', '0', ether('105000000'), teamTree.merkleRoot, 'none')
    await myDistributionVault.createRewards(RewardsDistributor.bytecode, nBlocks(currentBlock, 0) , nBlocks(currentBlock, 864000), nBlocks(currentBlock, 201600), ether('120000000'), ether('108000000'))

    const [erc20, staking, farming, rewards, team] = await Promise.all([
        myDeployer.get(ERC20_ID),
        myDeployer.get(STAKING_ID),
        myDeployer.get(FARMING_ID),
        myDeployer.get(REWARDS_ID),
        myDeployer.get(TEAM_ID)
    ])
    console.log("CONTRATOS")
    console.log("Deployer:", myDeployer.address);
    console.log("Staking:", staking);
    console.log("Farming:", farming);
    console.log("DistributionVault:", distribution);
    console.log("ERC20:", erc20);
    console.log("Rewards:", rewards);
    console.log("Team:", team)

    const [erc20Imp, stakingImp, farmingImp, distributionImp] = await Promise.all([
        (await Proxy.at(erc20)).implementation(),
        (await Proxy.at(staking)).implementation(),
        (await Proxy.at(farming)).implementation(),
        (await Proxy.at(distribution)).implementation()
    ]) 

    console.log("IMPLEMENTACIONES")
    console.log("Staking:", stakingImp);
    console.log("Farming:", farmingImp);
    console.log("DistributionVault:", distributionImp);
    console.log("ERC20:", erc20Imp);
    console.log("Rewards:", rewards);
    console.log("Team:", team)

    console.log("VERIFIES...")

    console.log("hardhat verify --network bsctestnet ", myDeployer.address)
    console.log("hardhat verify --network bsctestnet ", erc20Imp)
    console.log("hardhat verify --network bsctestnet ", stakingImp)
    console.log("hardhat verify --network bsctestnet ", farmingImp)
    console.log("hardhat verify --network bsctestnet ", rewards)
    console.log("hardhat verify --network bsctestnet ", distributionImp)
    console.log("hardhat verify --network bsctestnet ", team)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});