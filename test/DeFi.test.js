const { getWhitelistTree, solKeccak256 } = require('../utils/whitelistTree')
const hre = require('hardhat')
const { ethers } = require('hardhat');
const {
  ether, time, expectRevert
} = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')
const { artifacts } = require('hardhat');
const { expect } = require('chai');
const { formatEther } = require('@ethersproject/units');
const { getBalanceTree } = require('../utils/balanceTree');
const { BigNumber } = require('@ethersproject/bignumber');
const Deployer = artifacts.require('MonstropolyDeployer')
const ERC20 = artifacts.require('MonstropolyERC20')
const Staking = artifacts.require('MonstropolyStaking')
const Farming = artifacts.require('MonstropolyFarming')
const DistributionVault = artifacts.require('MonstropolyDistributionVault')
const Distributor = artifacts.require('MonstropolyDistributor')
const RewardsDistributor = artifacts.require('MonstropolyRewardsDistributor')

let myDistributionVault
let myRewardsDist
let myDeployer
let myTeamDist
let myErc20
let myStaking
let myFarming

let privateTree, teamTree

let owner, person, person2, ido, marketing, liquidity, p2e, stakingNFT

const ONE_ETHER = ether('1')
const TWO_ETHER = ether('2')
const H_ETHER = ether('100')

const etherToNumber = (bn) => {
  return Number(formatEther(bn.toString()))
}

const nBlocks = (currentBlock, n) => {
  return (Number(currentBlock.toString()) + n).toString()
}

describe('DeFi', function () {

  before(async () => {
    await hre.run('compile')

    const accounts = await web3.eth.getAccounts()
    owner = accounts[0]
    person = accounts[1]
    person2 = accounts[2]

    const team = {}
    team[owner] = ether('100').toString()
    teamTree = getBalanceTree(team).toJSON()
  })

  beforeEach(async () => {

    myDeployer = await Deployer.new()

    const erc20Factory = await ethers.getContractFactory('MonstropolyERC20')
    let calldataErc20 = await erc20Factory.interface.encodeFunctionData('initialize', []);

    const stakingFactory = await ethers.getContractFactory('MonstropolyStaking')
    let calldataStaking = await stakingFactory.interface.encodeFunctionData('initialize', []);

    const farmingFactory = await ethers.getContractFactory('MonstropolyFarming')
    let calldataFarming = await farmingFactory.interface.encodeFunctionData('initialize', []);

    const distributionVaultFactory = await ethers.getContractFactory('MonstropolyDistributionVault')
    let calldataDistributionVault = await distributionVaultFactory.interface.encodeFunctionData('initialize', []);

    await myDeployer.deploy(solKeccak256("DISTRIBUTION_VAULT"), DistributionVault.bytecode, calldataDistributionVault)
    await myDeployer.deploy(solKeccak256("STAKING"), Staking.bytecode, calldataStaking)
    await myDeployer.deploy(solKeccak256("FARMING"), Farming.bytecode, calldataFarming)
    await myDeployer.deploy(solKeccak256("ERC20"), ERC20.bytecode, calldataErc20)
    
    const distributionVault = await myDeployer.get(solKeccak256("DISTRIBUTION_VAULT"))
    await myDeployer.grantRole("0x00", distributionVault)
    await myDeployer.grantRole(solKeccak256("PAUSER_ROLE"), owner)
    myDistributionVault = await DistributionVault.at(distributionVault)

    const currentBlock = (await time.latestBlock()).toString()

    await myDistributionVault.createDistributor(solKeccak256("TEAM"), nBlocks(currentBlock, 0) , nBlocks(currentBlock, 1), '0', ether('0'), ether('105000000'), teamTree.merkleRoot, '')
    await myDistributionVault.createRewards(RewardsDistributor.bytecode, nBlocks(currentBlock, 0) , nBlocks(currentBlock, 60), nBlocks(currentBlock, 20), ether('120000000'), ether('108000000'))

    const [erc20, staking, farming, rewardsDist, teamDist] = await Promise.all([
      myDeployer.get(solKeccak256("ERC20")),
      myDeployer.get(solKeccak256("STAKING")),
      myDeployer.get(solKeccak256("FARMING")),
      myDeployer.get(solKeccak256("REWARDS")),
      myDeployer.get(solKeccak256("TEAM"))
    ])  

    myErc20 = await ERC20.at(erc20) 
    myStaking = await Staking.at(staking)
    myFarming = await Farming.at(farming)
    myRewardsDist = await RewardsDistributor.at(rewardsDist)
    myTeamDist = await Distributor.at(teamDist)

    const claim = teamTree.claims[owner]

    await myTeamDist.claim(claim.index, owner, claim.amount, claim.proof)

    const balance = await myErc20.balanceOf(owner)
    
    await myErc20.transfer(person, ether('100000'))
  })

  describe('Staking', () => {
    it('staker can deposit and claim correctly', async () => {
      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositFrom(owner, balance)

      const perBlock = etherToNumber(await myRewardsDist.rewardPerBlock())
      const allocation = 20
      const rewardExp = perBlock * allocation / 100

      await myStaking.claim()

      const reward = await myErc20.balanceOf(owner)

      expect(etherToNumber(reward)).to.approximately(rewardExp, 0.000000001)
    })
    it('staker cannot deposit 0 tokens', async () => {
      await expectRevert(myStaking.depositFrom(owner, 0), "MonstropolyStaking: amount must be over zero")
    })
    it('two stakers can deposit and claim correctly', async () => {
      const balance = await myErc20.balanceOf(owner)
      const balance2 = await myErc20.balanceOf(person)

      await myErc20.approve(myStaking.address, balance)
      await myErc20.approve(myStaking.address, balance2, { from: person })

      await myStaking.depositFrom(owner, balance)
      await myStaking.depositFrom(person, balance2)

      await myStaking.claim()
      await myStaking.claim({ from: person })

      const reward = await myErc20.balanceOf(owner)
      const reward2 = await myErc20.balanceOf(person)

      expect(etherToNumber(reward2)).to.approximately(etherToNumber(reward) / 1000, etherToNumber(reward2) / 20)
    })
    it('staker can withdraw', async () => {
      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositFrom(owner, balance)

      const perBlock = etherToNumber(await myRewardsDist.rewardPerBlock())
      const allocation = 20
      const rewardExp = perBlock * allocation / 100

      await myStaking.withdrawAll()

      const burned = await myErc20.burned()
      const balancePost = await myErc20.balanceOf(owner)

      expect(etherToNumber(balance)).to.approximately(etherToNumber(balancePost.add(burned)) - rewardExp, 0.000000001)
    })
    it('staker can withdraw (emergency) if paused', async () => {
      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositFrom(owner, balance)

      await myStaking.pause()

      await myStaking.emergencyWithdraw()

      const balancePost = await myErc20.balanceOf(owner)

      expect(etherToNumber(balance)).to.eq(etherToNumber(balancePost))
    })
    it('staker cannot withdraw zero', async () => {
      await expectRevert(myStaking.withdrawAll(), "MonstropolyStaking: amount must be over zero")
    })
    it('staker cannot withdraw more than balance', async () => {
      await expectRevert(myStaking.withdraw(ether('20')), "MonstropolyStaking: user has not enough staking balance")
    })
    it('fees change do not apply to old depositors', async () => {
      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositFrom(owner, balance)

      await myStaking.setFees(ether('0'), ether('0'))
      await myStaking.withdrawAll()

      const burned = await myErc20.burned()
      expect(etherToNumber(burned)).to.greaterThan(0)
    })
    it('fees change do apply to new depositors', async () => {
      const balance = await myErc20.balanceOf(owner)

      await myStaking.setFees(ether('0'), ether('0'))

      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositFrom(owner, balance)

      await myStaking.withdrawAll()

      const burned = await myErc20.burned()
      expect(etherToNumber(burned)).to.eq(0)
    })
  })
  describe('Farming', () => {
    it('farmer can deposit and claim correctly', async () => {
      await myFarming.setLP(myErc20.address)

      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myFarming.address, balance)
      await myFarming.depositFrom(owner, balance)

      const perBlock = etherToNumber(await myRewardsDist.rewardPerBlock())
      const allocation = 30
      const rewardExp = perBlock * allocation / 100

      await myFarming.claim()

      const reward = await myErc20.balanceOf(owner)

      expect(etherToNumber(reward)).to.approximately(rewardExp, 0.000000001)
    })
    it('farmer can withdraw', async () => {

      await myFarming.setLP(myErc20.address)

      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myFarming.address, balance)
      await myFarming.depositFrom(owner, balance)

      const perBlock = etherToNumber(await myRewardsDist.rewardPerBlock())
      const allocation = 30
      const rewardExp = perBlock * allocation / 100

      await myFarming.withdrawAll()

      const balancePost = await myErc20.balanceOf(owner)
      
      expect(etherToNumber(balance)).to.approximately(etherToNumber(balancePost) - rewardExp, 0.000000001)
    })
    it('farmer can withdraw (emergency) if paused', async () => {
      await myFarming.setLP(myErc20.address)

      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myFarming.address, balance)
      await myFarming.depositFrom(owner, balance)

      await myFarming.pause()

      await myFarming.emergencyWithdraw()

      const balancePost = await myErc20.balanceOf(owner)

      expect(etherToNumber(balance)).to.eq(etherToNumber(balancePost))
    })
    it('autoreward disable', async () => {
      await myFarming.setLP(myErc20.address)

      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myFarming.address, balance)
      await myFarming.depositFrom(owner, balance)
      await myFarming.toggleAutoreward()

      await myFarming.withdrawAll()

      const postBalance = await myErc20.balanceOf(owner)

      await myFarming.claim()

      const afterClaim = await myErc20.balanceOf(owner)
      const reward = afterClaim.sub(postBalance)

      expect(etherToNumber(reward)).to.greaterThan(0)
      expect(etherToNumber(balance)).to.eq(etherToNumber(postBalance))
    })
    it('check lastReward', async () => {

      const [startBlock, endBlock, changeBlock, increment, rewardPerBlock, stakingAllocation, farmingAllocation] = await Promise.all([
        myRewardsDist.startBlock(),
        myRewardsDist.endBlock(),
        myRewardsDist.changeBlock(),
        myRewardsDist.increment(),
        myRewardsDist.rewardPerBlock(),
        myRewardsDist.allocation(solKeccak256("STAKING")),
        myRewardsDist.allocation(solKeccak256("FARMING"))
      ])

      const firstReward = increment.mul(ONE_ETHER).div(TWO_ETHER)

      await time.advanceBlockTo(parseInt(changeBlock.toString()) + 1)

      const stakingLastReward = await myStaking.lastReward()
      const farmingLastReward = await myFarming.lastReward()

      const expSReward = rewardPerBlock.add(firstReward).mul(stakingAllocation).div(H_ETHER)
      const expFReward = rewardPerBlock.add(firstReward).mul(farmingAllocation).div(H_ETHER)
      console.log(etherToNumber(expSReward), etherToNumber(expFReward))
      expect(etherToNumber(expSReward)).to.eq(etherToNumber(stakingLastReward))
      expect(etherToNumber(expFReward)).to.eq(etherToNumber(farmingLastReward))

    }) 
  })
})