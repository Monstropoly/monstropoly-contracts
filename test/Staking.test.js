const { getWhitelistTree, solKeccak256 } = require('../utils/whitelistTree')
const hre = require('hardhat')
const { ethers } = require('hardhat');
const {
  ether, time, expectRevert, expectEvent
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

describe('Staking', function () {

  before(async () => {
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

  describe('Deposit', () => {
    it('can deposit and claim correctly', async () => {
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
    it('can deposit twice', async () => {
      await myErc20.approve(myStaking.address, TWO_ETHER)
      await myStaking.depositFrom(owner, ONE_ETHER)
      await myStaking.depositFrom(owner, ONE_ETHER)
      const balance = await myStaking.getUserBalance(owner)
      expect(etherToNumber(balance)).to.eq(etherToNumber(TWO_ETHER))
    })
    it('cannot deposit 0 tokens', async () => {
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
    it('depositAll & toggling autoreward', async () => {
      const balance = await myErc20.balanceOf(owner)
      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositAll(owner)
      await myStaking.toggleAutoreward()
      await myStaking.withdrawAll()
      const pending = await myStaking.pendingRewards(owner)
      expect(etherToNumber(pending)).to.gt(0)
    })
    it('cannot deposit if not approved', async () => {
      await expectRevert(myStaking.depositFrom(owner, ONE_ETHER), "ERC20: insufficient allowance")
    })
    it('cannot deposit if exceeds balance', async () => {
      await expectRevert(myStaking.depositFrom(owner, ether('1000000000000')), "ERC20: insufficient allowance")
    })
    it('can deposit twice (not getting rewards)', async () => {
      await myErc20.approve(myStaking.address, TWO_ETHER)
      await myStaking.depositFrom(owner, ONE_ETHER)
      await myStaking.toggleAutoreward()
      await myStaking.depositFrom(owner, ONE_ETHER)
      const balance = await myStaking.getUserBalance(owner)
      const pending = await myStaking.pendingRewards(owner)
      expect(etherToNumber(balance)).to.eq(etherToNumber(TWO_ETHER))
      expect(etherToNumber(pending)).to.gt(0)
    })
  })
  describe('Withdraw', () => {
    it('can withdraw', async () => {
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
    it('can (emergency) withdraw if paused', async () => {
      const balance = await myErc20.balanceOf(owner)

      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositFrom(owner, balance)

      await myStaking.pause()

      await myStaking.emergencyWithdraw()

      const balancePost = await myErc20.balanceOf(owner)

      expect(etherToNumber(balance)).to.eq(etherToNumber(balancePost))
    })
    it('cannot withdraw zero', async () => {
      await expectRevert(myStaking.withdrawAll(), "MonstropolyStaking: amount must be over zero")
    })
    it('cannot withdraw more than balance', async () => {
      await expectRevert(myStaking.withdraw(ether('20')), "MonstropolyStaking: user has not enough staking balance")
    })
    it('cannot (emergency) withdraw if not deposited', async () => {
      await myStaking.pause()
      await expectRevert(myStaking.emergencyWithdraw(), "MonstropolyStaking: no tokens to withdraw")
    })
    it('can partially withdraw', async () => {
      await myErc20.approve(myStaking.address, TWO_ETHER)
      await myStaking.depositFrom(owner, TWO_ETHER)
      await myStaking.withdraw(ONE_ETHER)
      const balance = await myStaking.getUserBalance(owner)
      expect(etherToNumber(balance)).to.eq(1)
    })
  })
  describe('Claim', () => {
    it('cannot claim zero tokens', async () => {
      await expectRevert(myStaking.claim(), "MonstropolyStaking: nothing to claim")
    })
  })
  describe('Fees', () => {
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
      const setTx = await myStaking.setFeeInterval(0)

      expectEvent(setTx, 'SetFeeInterval', {
        feeInterval: '0'
      })

      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositFrom(owner, balance)

      await myStaking.withdrawAll()

      const burned = await myErc20.burned()
      expect(etherToNumber(burned)).to.eq(0)
    })
    it('cannot set if minfee exceeds maxfee', async () => {
      await expectRevert(myStaking.setFees(TWO_ETHER, ONE_ETHER), "MonstropolyStaking: mininum fee must be greater or equal than maximum fee")
    })
    it('cannot set if maxfee exceeds 100 ether', async () => {
      await expectRevert(myStaking.setFees(ether('80'), ether('200')), "MonstropolyStaking: maxFee cannot exceed 100 ether")
    })
    it('cannot set if minfee exceeds 100 ether', async () => {
      await expectRevert(myStaking.setFees(ether('200'), ether('300')), "MonstropolyStaking: minFee cannot exceed 100 ether")
    })
  })
  describe('Other functions', () => {
    it('getBlocksLeft', async () => {
      await myStaking.setFeeInterval(30)
      const feeInterval = await myStaking.feeInterval()
      const balance = await myErc20.balanceOf(owner)
      await myErc20.approve(myStaking.address, balance)
      await myStaking.depositAll(owner)
      const left = await myStaking.getBlocksLeft(owner)
      expect(feeInterval.toString()).to.eq(left.toString())
      const currentBlock = await time.latestBlock()
      const endInterval = parseInt(currentBlock) + parseInt(feeInterval)
      await time.advanceBlockTo(endInterval+1)
      const left2 = await myStaking.getBlocksLeft(owner)
      expect(left2.toString()).to.eq('0')
      const pending = await myStaking.pendingRewards(owner)
      expect(etherToNumber(pending)).to.gt(0)
    })
    it('can syncBalance', async () => {
      await myErc20.transfer(myStaking.address, ONE_ETHER)

      const [gapS, gapF] = await Promise.all([
        myStaking.getTokenGap()
      ]) 

      expect(etherToNumber(gapS)).to.gt(0)

      const syncS = await myStaking.syncBalance(owner)
      expectEvent(syncS, 'SyncBalance', {
        account: owner,
        amount: ONE_ETHER.toString()
      })
    })
    it('cannot syncBalance if no gap', async () => {
      await expectRevert(myStaking.syncBalance(owner), "MonstropolyStaking: there is no gap")
    })
    it('can migrate', async () => {
      const stakingFactory = await ethers.getContractFactory('MonstropolyStaking')
      let calldataStaking = await stakingFactory.interface.encodeFunctionData('initialize', []);
      await myDeployer.deploy(solKeccak256("STAKING2"), Staking.bytecode, calldataStaking)

      await myErc20.approve(myStaking.address, ONE_ETHER)
      await myStaking.depositFrom(owner, ONE_ETHER)

      const staking2 = await myDeployer.get(solKeccak256("STAKING2"))
      const balance = await myStaking.getUserBalance(owner)

      await myErc20.approve(staking2, balance) 

      const mig = await myStaking.migrate(staking2)
      expectEvent(mig, 'Migrate', {
        from: myStaking.address,
        to: staking2,
        account: owner
      })
    })
    it('cannot migrate if not approved token', async () => {
      const stakingFactory = await ethers.getContractFactory('MonstropolyStaking')
      let calldataStaking = await stakingFactory.interface.encodeFunctionData('initialize', []);
      await myDeployer.deploy(solKeccak256("STAKING2"), Staking.bytecode, calldataStaking)

      await myErc20.approve(myStaking.address, ONE_ETHER)
      await myStaking.depositFrom(owner, ONE_ETHER)

      const staking2 = await myDeployer.get(solKeccak256("STAKING2"))
      const balance = await myStaking.getUserBalance(owner)

      // await myErc20.approve(staking2, balance) 

      await expectRevert(myStaking.migrate(staking2), "MonstropolyStaking: migration failed") 

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

      const firstLast = await myStaking.lastReward()

      expect(etherToNumber(firstLast)).to.eq(etherToNumber(rewardPerBlock.mul(stakingAllocation).div(H_ETHER)))

      const firstReward = increment.mul(ONE_ETHER).div(TWO_ETHER)

      await time.advanceBlockTo(parseInt(changeBlock.toString()) + 1)

      const stakingLastReward = await myStaking.lastReward()

      const expSReward = rewardPerBlock.add(firstReward).mul(stakingAllocation).div(H_ETHER)
      
      expect(etherToNumber(expSReward)).to.eq(etherToNumber(stakingLastReward))
     
      await time.advanceBlockTo(parseInt(endBlock.toString()) + 1)

      const lastS = await myStaking.lastReward()

      expect(etherToNumber(lastS)).to.eq(0)
    }) 
  })
})