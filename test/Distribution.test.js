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
const { id } = require('ethers/lib/utils');
const Deployer = artifacts.require('MonstropolyDeployer')
const ERC20 = artifacts.require('MonstropolyERC20')
const Staking = artifacts.require('MonstropolyStaking')
const Farming = artifacts.require('MonstropolyFarming')
const DistributionVault = artifacts.require('MonstropolyDistributionVault')
const Distributor = artifacts.require('MonstropolyDistributor')
const RewardsDistributor = artifacts.require('MonstropolyRewardsDistributor')

const ONE_ETHER = ether('1')
const TWO_ETHER = ether('2')

let myDistributionVault
let myRewardsDist
let myDeployer
let mySeedDist
let myPrivateDist
let myMarketingDist
let myTeamDist
let myErc20
let myStaking
let myFarming

let privateTree, teamTree

let owner, person, person2, ido, marketing, liquidity, p2e, stakingNFT

const etherToNumber = (bn) => {
  return Number(formatEther(bn.toString()))
}

const deployDistributor = async (
  deployer,
  vaultName,
  startBlock,
  endBlock,
  cliff,
  initial,
  total,
  merkleRoot
) => {
  const distributorFactory = await ethers.getContractFactory('MonstropolyDistributor')
  let calldataDistributor = await distributorFactory.interface.encodeFunctionData('initialize', [startBlock, endBlock, cliff, initial.toString(), total.toString(), merkleRoot, '']);
  await deployer.deploy(solKeccak256(vaultName), Distributor.bytecode, calldataDistributor)
}

const nBlocks = (currentBlock, n) => {
  return (Number(currentBlock.toString()) + n).toString()
}

describe('Distribution', function () {

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    owner = accounts[0]
    person = accounts[1]
    person2 = accounts[2]
    ido = accounts[3]      
    marketing = accounts[4]
    liquidity = accounts[5] 
    stakingNFT = accounts[6] 
    p2e = accounts[7] 
    player = accounts[8]

    // Vaults
    const team = {}
    team[owner] = ether('100').toString()

    const mark = {}
    mark[marketing] = ether('100').toString()

    const private = {}
    private[person] = ether('60').toString(),
    private[person2] = ether('20').toString()

    const seed = {}
    seed[person] = ether('30').toString(),
    seed[person2] = ether('70').toString()

    privateTree = getBalanceTree(private).toJSON()
    teamTree = getBalanceTree(team).toJSON()
    seedTree = getBalanceTree(seed).toJSON()
    marketingTree = getBalanceTree(mark).toJSON()

  })

  beforeEach(async () => {

    myDeployer = await Deployer.new()

    const currentBlock = (await time.latestBlock()).toString()

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
    await myDeployer.setId(solKeccak256("STAKING_NFT"), stakingNFT)
    await myDeployer.setId(solKeccak256("P2E"), p2e)
    await myDeployer.deploy(solKeccak256("ERC20"), ERC20.bytecode, calldataErc20)

    // mint IDO and LIQUIDITY

    const distributionVault = await myDeployer.get(solKeccak256("DISTRIBUTION_VAULT"))
    await myDeployer.grantRole("0x00", distributionVault)
    myDistributionVault = await DistributionVault.at(distributionVault)
    
    await myDistributionVault.createDistributor(solKeccak256("SEED"), nBlocks(currentBlock, 0) , nBlocks(currentBlock, 16), '1', ether('1125000'), ether('15000000'), seedTree.merkleRoot, '')
    await myDistributionVault.createDistributor(solKeccak256("PS"), nBlocks(currentBlock, 0) , nBlocks(currentBlock, 13), '1', ether('5400000'), ether('54000000'), privateTree.merkleRoot, '')
    await myDistributionVault.createDistributor(solKeccak256("MARKETING"), nBlocks(currentBlock, 1) , nBlocks(currentBlock, 37), '0',ether('10500000'), ether('70000000'), marketingTree.merkleRoot, '')
    await myDistributionVault.createDistributor(solKeccak256("TEAM"), nBlocks(currentBlock, 6) , nBlocks(currentBlock, 18), '0', ether('0'), ether('105000000'), teamTree.merkleRoot, '')
    await myDistributionVault.createRewards(RewardsDistributor.bytecode, nBlocks(currentBlock, 20) , nBlocks(currentBlock, 60), nBlocks(currentBlock, 30), ether('120000000'), ether('108000000'))

    const [erc20, staking, farming, seedDist, privateDist, marketingDist, teamDist, rewardsDist] = await Promise.all([
      myDeployer.get(solKeccak256("ERC20")),
      myDeployer.get(solKeccak256("STAKING")),
      myDeployer.get(solKeccak256("FARMING")),
      myDeployer.get(solKeccak256("SEED")),
      myDeployer.get(solKeccak256("PS")),
      myDeployer.get(solKeccak256("MARKETING")),
      myDeployer.get(solKeccak256("TEAM")),
      myDeployer.get(solKeccak256("REWARDS"))
    ])  

    myErc20 = await ERC20.at(erc20)
    myStaking = await Staking.at(staking)
    myFarming = await Farming.at(farming)
    mySeedDist = await Distributor.at(seedDist)
    myPrivateDist = await Distributor.at(privateDist)
    myMarketingDist = await Distributor.at(marketingDist)
    myTeamDist = await Distributor.at(teamDist)
    myRewardsDist = await RewardsDistributor.at(rewardsDist)
  })

  describe('Distributor', () => {
    it('can claim on seed distributor', async () => {
      const released = await mySeedDist.released()
      const claim = seedTree.claims[person]
      const allocation = claim.amount
      const expected = released.mul(ether(BigNumber.from(allocation).div(BigNumber.from('1000000000000000000')).toString())).div(ether('100'))
      const pending = await mySeedDist.pending(claim.index, person, claim.amount, claim.proof)

      expect(pending.toString()).to.eq(expected.toString())

      await mySeedDist.claim(claim.index, person, claim.amount, claim.proof)
      const [claimed, balance] = await Promise.all([
        mySeedDist.claimed(person),
        myErc20.balanceOf(person)
      ])
      expect(balance.toString()).to.eq(claimed.toString())
    })
    it('cannot claim if invalid proof', async () => {
      const released = await mySeedDist.released()
      const claim = seedTree.claims[person]
      const allocation = claim.amount
      const expected = released.mul(ether(BigNumber.from(allocation).div(BigNumber.from('1000000000000000000')).toString())).div(ether('100'))
      const pending = await mySeedDist.pending(claim.index, person, claim.amount, claim.proof)

      expect(pending.toString()).to.eq(expected.toString())

      await expectRevert(mySeedDist.claim(claim.index, owner, claim.amount, claim.proof), "MonstropolyDistributor: invalid proof.")

    })
    it('can claim on team distributor', async () => {
      const claim = teamTree.claims[owner]
      const teamEndBlock = Number((await myTeamDist.endBlock()).toString())
      await time.advanceBlockTo(teamEndBlock)

      await myTeamDist.claim(claim.index, owner, claim.amount, claim.proof)
      const [claimed, balance, released] = await Promise.all([
        myTeamDist.claimed(owner), 
        myErc20.balanceOf(owner),
        myTeamDist.released()
      ])

      expect(etherToNumber(balance)).to.eq(etherToNumber(claimed))
      expect(etherToNumber(claimed)).to.eq(etherToNumber(released))
      expect(etherToNumber(released)).to.eq(etherToNumber(ether('105000000')))
    })
    it('checking tokens release', async () => {

      const initial = ether('50')
      const total = ether('100')
      const claim = teamTree.claims[owner]
      const currentBlock = await time.latestBlock()

      await myDistributionVault.createDistributor(solKeccak256("MY_VAULT"), nBlocks(currentBlock, 10) , nBlocks(currentBlock, 20), '5', initial, total, teamTree.merkleRoot, '')
      const vault = await myDeployer.get(solKeccak256('MY_VAULT'))
      const myVault = await Distributor.at(vault)

      const [start, end, cliff, perBlock] = await Promise.all([
        myVault.startBlock(),
        myVault.endBlock(),
        myVault.cliff(),
        myVault.perBlock()
      ])
      
      const startBlock = Number((start).toString())
      const endBlock = Number((end).toString())
      const cliffBlock = startBlock + Number((cliff).toString())

      const pendingBeforeStart = await myVault.pending(claim.index, owner, claim.amount, claim.proof)
      await time.advanceBlockTo(startBlock + 1)
      const pendingBeforeCliff = await myVault.pending(claim.index, owner, claim.amount, claim.proof)
      await time.advanceBlockTo(cliffBlock + 1)
      const pendingAfterCliff = await myVault.pending(claim.index, owner, claim.amount, claim.proof)
      await time.advanceBlockTo(endBlock - 1)
      const pendingBeforeEnd = await myVault.pending(claim.index, owner, claim.amount, claim.proof)
      await time.advanceBlockTo(endBlock + 1)
      const pendingAfterEnd = await myVault.pending(claim.index, owner, claim.amount, claim.proof)

      expect(etherToNumber(pendingBeforeStart)).to.eq(0)
      expect(etherToNumber(pendingBeforeCliff)).to.eq(etherToNumber(initial))
      expect(etherToNumber(pendingAfterCliff)).to.eq(etherToNumber(initial.add(perBlock)))
      expect(etherToNumber(pendingBeforeEnd)).to.eq(etherToNumber(total.sub(perBlock)))
      expect(etherToNumber(pendingAfterEnd)).to.eq(etherToNumber(total))
    })
    it('nothing to claim after claiming all', async () => {

      const initial = ether('50')
      const total = ether('100')
      const claim = teamTree.claims[owner]
      const currentBlock = await time.latestBlock()

      await myDistributionVault.createDistributor(solKeccak256("MY_VAULT"), nBlocks(currentBlock, 10) , nBlocks(currentBlock, 20), '5', initial, total, teamTree.merkleRoot, '')
      const vault = await myDeployer.get(solKeccak256('MY_VAULT'))
      const myVault = await Distributor.at(vault)

      const [end] = await Promise.all([
        myVault.endBlock()
      ])
      const endBlock = Number((end).toString())
      await time.advanceBlockTo(endBlock + 1)

      await myVault.claim(claim.index, owner, claim.amount, claim.proof)
      const balance = await myErc20.balanceOf(owner)
      expect(etherToNumber(balance)).to.eq(etherToNumber(total))

      await expectRevert(myVault.claim(claim.index, owner, claim.amount, claim.proof), 'MonstropolyDistributor: nothing to claim.')
    })
    it('cannot finish if not vault', async () => {
      await expectRevert(mySeedDist.finish(), "MonstropolyDistributor: only vault can finish it")
    })
    it('cannot create distributor where startblock exceeds endblock', async () => {
      const currentBlock = await time.latestBlock()
      await expectRevert(myDistributionVault.createDistributor(solKeccak256("MYDIST"), nBlocks(currentBlock, 10) , nBlocks(currentBlock, 0), '1', ether('1125000'), ether('15000000'), teamTree.merkleRoot, ''), "MonstropolyDistributor: endBlock must exceed startBlock")
    })
  })

  describe('DistributionVault', () => {
    it('migrate Distributor', async () => {

      const initial = ether('50')
      const total = ether('100')
      const claim = teamTree.claims[owner]
      const claim2 = seedTree.claims[person]
      const claim3 = seedTree.claims[person2]
      const currentBlock = await time.latestBlock()

      await myDistributionVault.createDistributor(solKeccak256("MY_VAULT"), nBlocks(currentBlock, 0) , nBlocks(currentBlock, 20), '5', initial, total, teamTree.merkleRoot, '')
      const distributor = await myDeployer.get(solKeccak256('MY_VAULT'))
      const myDistributor = await Distributor.at(distributor)

      await myDistributionVault.migrateDistributor(solKeccak256("MY_VAULT"), solKeccak256("MY_VAULT2"), seedTree.merkleRoot, '')
      const distributor2 = await myDeployer.get(solKeccak256('MY_VAULT2'))
      const myDistributor2 = await Distributor.at(distributor2)

      const end = await myDistributor2.endBlock()

      await time.advanceBlockTo(Number(end.toString()))

      await myDistributor.claim(claim.index, owner, claim.amount, claim.proof)
      await myDistributor2.claim(claim2.index, person, claim2.amount, claim2.proof)
      await myDistributor2.claim(claim3.index, person2, claim3.amount, claim3.proof)

      const balanceOwner = await myErc20.balanceOf(owner)
      const balancePerson = await myErc20.balanceOf(person)
      const balancePerson2 = await myErc20.balanceOf(person2)

      expect(etherToNumber(total)).to.eq(etherToNumber(balanceOwner) + etherToNumber(balancePerson) + etherToNumber(balancePerson2))
      
    })
    it('migrate after startingPerBlock', async () => {
      const initial = ether('50')
      const total = ether('100')
      const claim = teamTree.claims[owner]
      const claim2 = seedTree.claims[person]
      const claim3 = seedTree.claims[person2]
      const currentBlock = await time.latestBlock()

      const cliff = 5

      await myDistributionVault.createDistributor(solKeccak256("MY_VAULT"), nBlocks(currentBlock, 0) , nBlocks(currentBlock, 20), 5, initial, total, teamTree.merkleRoot, '')
      const distributor = await myDeployer.get(solKeccak256('MY_VAULT'))
      const myDistributor = await Distributor.at(distributor)

      const start = Number((await myDistributor.startBlock()).toString())
      await time.advanceBlockTo(start + cliff + 1)

      await myDistributionVault.migrateDistributor(solKeccak256("MY_VAULT"), solKeccak256("MY_VAULT2"), seedTree.merkleRoot, '')
      const distributor2 = await myDeployer.get(solKeccak256('MY_VAULT2'))
      const myDistributor2 = await Distributor.at(distributor2)

      const end = await myDistributor2.endBlock()

      await time.advanceBlockTo(Number(end.toString()))

      await myDistributor.claim(claim.index, owner, claim.amount, claim.proof)
      await myDistributor2.claim(claim2.index, person, claim2.amount, claim2.proof)
      await myDistributor2.claim(claim3.index, person2, claim3.amount, claim3.proof)

      const balanceOwner = await myErc20.balanceOf(owner)
      const balancePerson = await myErc20.balanceOf(person)
      const balancePerson2 = await myErc20.balanceOf(person2)

      expect(etherToNumber(balanceOwner) + etherToNumber(balancePerson) + etherToNumber(balancePerson2)).to.approximately(etherToNumber(total), 0.0000001)
      
    })
    it('cannot migrate after endblock', async () => {
      const initial = ether('50')
      const total = ether('100')
      const currentBlock = await time.latestBlock()
      await myDistributionVault.createDistributor(solKeccak256("MY_VAULT"), nBlocks(currentBlock, 0) , nBlocks(currentBlock, 20), 5, initial, total, teamTree.merkleRoot, '')
      const distributor = await myDeployer.get(solKeccak256('MY_VAULT'))
      const myDistributor = await Distributor.at(distributor)
      const end = await myDistributor.endBlock()
      await time.advanceBlockTo(Number(end.toString()))

      await expectRevert(myDistributionVault.migrateDistributor(solKeccak256("MY_VAULT"), solKeccak256("MY_VAULT2"), teamTree.merkleRoot, ''), "MonstropolyDistributionVault: cannot migrate a finished distributor")
      
    })
    it('all released at the end of rewards', async () => {
      const endBlock = Number((await myRewardsDist.endBlock()).toString())
      await time.advanceBlockTo(endBlock)
      const [seedReleased, privateReleased, marketingReleased, teamReleased, rewardsReleased,
        seedAllocated, privateAllocated, marketingAllocated, teamAllocated, rewardsAllocated
      ] = await Promise.all([
        mySeedDist.released(), 
        myPrivateDist.released(),
        myMarketingDist.released(),
        myTeamDist.released(),
        myRewardsDist.released(),
        myDistributionVault.allocated(mySeedDist.address),
        myDistributionVault.allocated(myPrivateDist.address),
        myDistributionVault.allocated(myMarketingDist.address),
        myDistributionVault.allocated(myTeamDist.address),
        myDistributionVault.allocated(myRewardsDist.address)
      ])

      expect(etherToNumber(seedReleased)).to.eq(etherToNumber(seedAllocated))
      expect(etherToNumber(privateReleased)).to.eq(etherToNumber(privateAllocated))
      expect(etherToNumber(marketingReleased)).to.eq(etherToNumber(marketingAllocated))
      expect(etherToNumber(teamReleased)).to.eq(etherToNumber(teamAllocated))
      expect(etherToNumber(rewardsReleased)).to.eq(etherToNumber(rewardsAllocated))
    })
    it('assignation exceeds cap', async () => {
      const assigned = await myDistributionVault.assigned()
      const cap = await myErc20.cap()
      const extra = etherToNumber(cap.sub(assigned)) + 1
      const currentBlock = await time.latestBlock()

      await expectRevert(
        myDistributionVault.createDistributor(solKeccak256("MY_VAULT"), nBlocks(currentBlock, 0) , nBlocks(currentBlock, 20), '5', 0, ether(extra.toString()), teamTree.merkleRoot, ''),
        'MonstropolyDistributionVault: assignation exceeds cap'
      )
    })
    it('cannot distribute if not available', async () => {
      await expectRevert(myDistributionVault.distribute(owner, ONE_ETHER), "MonstropolyDistributionVault: no tokens available")
    })
    it('cannot exceed cap on creation', async () => {
      const currentBlock = await time.latestBlock()
      await expectRevert(myDistributionVault.createRewards(RewardsDistributor.bytecode, nBlocks(currentBlock, 20) , nBlocks(currentBlock, 60), nBlocks(currentBlock, 30), ether('120000000'), ether('108000000')), "MonstropolyDistributionVault: assignation exceeds cap")
    })
  })

  describe('RewardsDistributor', () => {
    it('cannot create rewards distributor if already created', async () => {
      const currentBlock = await time.latestBlock()
      await expectRevert(
        myDistributionVault.createRewards(RewardsDistributor.bytecode, nBlocks(currentBlock, 20) , nBlocks(currentBlock, 60), nBlocks(currentBlock, 30), ether('0'), ether('0')),
        "MonstropolyDistributionVault: rewards distributor already created"
      )
    })
    it('cannot update rewards if distributor not created', async () => {
      await myDeployer.grantRole(id('REWARDS_UPDATER_ROLE'), owner)
      const distributionVaultFactory = await ethers.getContractFactory('MonstropolyDistributionVault')
      let calldataDistributionVault = distributionVaultFactory.interface.encodeFunctionData('initialize', []);
      await myDeployer.deploy(solKeccak256("NEW"), DistributionVault.bytecode, calldataDistributionVault)
      const vault = await myDeployer.get(id('NEW'))
      const newVault = await DistributionVault.at(vault)

      const expStaking = ether('10')
      const expStakingNFT = ether('40')
      const expFarming = ether('40')
      const expP2E = ether('10')

      await expectRevert(newVault.updateRewards([expStaking, expStakingNFT, expFarming, expP2E]), "MonstropolyDistributionVault: rewards distributor not created yet")
    })
    it('cannot update if aggregate != 100 ether', async () => {
      await myDeployer.grantRole(id('REWARDS_UPDATER_ROLE'), owner)
      const expStaking = ether('10')
      const expStakingNFT = ether('30')
      const expFarming = ether('40')
      const expP2E = ether('10')

      await expectRevert(
        myDistributionVault.updateRewards([expStaking, expStakingNFT, expFarming, expP2E]),
        'MonstropolyDistributionVault: rewards update failed'
      )
    })
    it('only vault can update allocations', async () => {
      const expStaking = ether('10')
      const expStakingNFT = ether('30')
      const expFarming = ether('40')
      const expP2E = ether('10')
      await expectRevert(
        myRewardsDist.updateAllocations([expStaking, expStakingNFT, expFarming, expP2E]),
        'MonstropolyRewardsDistributor: only vault can update allocations'
      )
    })
    it('can update rewards if REWARDS_UPDATER_ROLE from vault', async () => {
      await myDeployer.grantRole(id('REWARDS_UPDATER_ROLE'), owner)
      const expStaking = ether('10')
      const expStakingNFT = ether('40')
      const expFarming = ether('40')
      const expP2E = ether('10')

      await myDistributionVault.updateRewards([expStaking, expStakingNFT, expFarming, expP2E])
      const [stakingAlloc, stakingNFTAlloc, farmingAlloc, p2eAlloc] = await Promise.all([
        myRewardsDist.allocation(id('STAKING')),
        myRewardsDist.allocation(id('STAKING_NFT')),
        myRewardsDist.allocation(id('FARMING')),
        myRewardsDist.allocation(id('P2E'))
      ])
      expect(etherToNumber(expStaking)).to.eq(etherToNumber(stakingAlloc))
      expect(etherToNumber(expStakingNFT)).to.eq(etherToNumber(stakingNFTAlloc))
      expect(etherToNumber(expFarming)).to.eq(etherToNumber(farmingAlloc))
      expect(etherToNumber(expP2E)).to.eq(etherToNumber(p2eAlloc))
    }) 
    it('check values', async () => {
      const [rewardPerBlock, increment, start, end, change] = await Promise.all([
        myRewardsDist.rewardPerBlock(),
        myRewardsDist.increment(),
        myRewardsDist.startBlock(),
        myRewardsDist.endBlock(),
        myRewardsDist.changeBlock()
      ])

      await time.advanceBlockTo((Number(change.toString())))
      const constantExp = etherToNumber(rewardPerBlock) * ((Number(change.toString())) - (Number(start.toString())))
      const constantReleased = etherToNumber(await myRewardsDist.released())
      expect(constantExp).to.eq(constantReleased)

      await time.advanceBlockTo((Number(change.toString())) + 1)
      const incrementReleased = etherToNumber(await myRewardsDist.released())
      expect(incrementReleased - constantReleased - etherToNumber(rewardPerBlock)).to.eq(etherToNumber(increment) / 2)
    })
    it('sections values', async () => {
      const endBlock = Number((await myRewardsDist.endBlock()).toString())
      await time.advanceBlockTo(endBlock)

      const [stakingReleased, farmingReleased, stakingNFTReleased, p2eReleased, totalReleased] = await Promise.all([
        myRewardsDist.released(solKeccak256('STAKING')),
        myRewardsDist.released(solKeccak256('FARMING')),
        myRewardsDist.released(solKeccak256('STAKING_NFT')),
        myRewardsDist.released(solKeccak256('P2E')),
        myRewardsDist.released()
      ])
      expect(etherToNumber(stakingReleased) + etherToNumber(farmingReleased) + etherToNumber(stakingNFTReleased) + etherToNumber(p2eReleased)).to.eq(etherToNumber(totalReleased))
    })
    it('distribution', async () => {
      const endBlock = Number((await myRewardsDist.endBlock()).toString())
      await time.advanceBlockTo(endBlock - 10)

      const expectedBalance = ether('1')
      await myRewardsDist.distribute(player, expectedBalance, { from: p2e })
      const balance = await myErc20.balanceOf(player)
      expect(etherToNumber(expectedBalance)).to.eq(etherToNumber(balance))
    })
    it('check available amounts after distribution', async () => {

      const endBlock = Number((await myRewardsDist.endBlock()).toString())
      await time.advanceBlockTo(endBlock - 10)

      const [availableVaultBefore] = await Promise.all([
        myDistributionVault.available(myRewardsDist.address)
      ])

      const expectedBalance = ether('100000')
      await myRewardsDist.distribute(player, expectedBalance, { from: p2e })

      const [releasedRewards, availableRewardsAfter, availableVaultAfter, allocated] = await Promise.all([
        myRewardsDist.released(solKeccak256('P2E')),
        myRewardsDist.available(solKeccak256('P2E')),
        myDistributionVault.available(myRewardsDist.address),
        myDistributionVault.allocated(myRewardsDist.address)
      ])

      await time.advanceBlockTo(endBlock + 1)

      const totalReleased = await myRewardsDist.released()
      
      expect(etherToNumber(totalReleased)).to.eq(etherToNumber(allocated))
      expect(etherToNumber(availableVaultBefore) - etherToNumber(availableVaultAfter)).to.eq(etherToNumber(expectedBalance))
      expect(etherToNumber(releasedRewards) - etherToNumber(availableRewardsAfter)).to.eq(etherToNumber(expectedBalance))
    })
    it('check release zero before start', async () => {
      const released = await myRewardsDist.released()
      expect(etherToNumber(released)).to.eq(0)
    })
    it('cannot distribute if amount exceeds available', async () => {
      await expectRevert(myRewardsDist.distribute(owner, ONE_ETHER), "MonstropolyRewardsDistributor: amount exceeds available")
    })
  })
})