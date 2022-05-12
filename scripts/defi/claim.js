// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { time } = require('@openzeppelin/test-helpers');
const { ethers, artifacts, web3 } = require('hardhat');
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
const Distributor = artifacts.require('MonstropolyDistributor')
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
    await hre.run('compile')

    const tree = getBalanceTree(teamJson).toJSON()
    const myDistributor = await Distributor.at('0x108F589CD568aB39c55FCdeb00450CE7E71C7A20')

    Object.keys(tree.claims).map(async account => {
        const claim = tree.claims[account]
        const pending = await myDistributor.pending(claim.index, account, claim.amount, claim.proof)
        if (pending.gt('0')) {
            await myDistributor.claim(claim.index, account, claim.amount, claim.proof)
        }
    })


    // await myDistributor.claim(claim.index, accounts[0], claim.amount, claim.proof)

    // accounts.map(account => {
    //     console.log(tree.claims[account])
    // })
    
    // const me = account[0]

    // const downloadJson

    // await myDistributor.claim()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});