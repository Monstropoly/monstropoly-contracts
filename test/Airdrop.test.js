// const { getWhitelistTree, solKeccak256 } = require('../utils/whitelistTree')
// const hre = require('hardhat')
// const { ethers } = require('hardhat');
// const {
//   ether, expectRevert, time
// } = require('@openzeppelin/test-helpers')
// const { web3 } = require('@openzeppelin/test-helpers/src/setup')
// const { artifacts } = require('hardhat')
// const { BigNumber } = require('@ethersproject/bignumber')
// const { expect, assert } = require('chai')
// const { formatEther } = require('@ethersproject/units')
// const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');
// const { advanceBlock } = require('@openzeppelin/test-helpers/src/time');
// const Deployer = artifacts.require('MonstropolyDeployer')
// const Whitelist = artifacts.require('MonstropolyWhitelist')
// const Airdrop = artifacts.require('MonstropolyAirdrop')
// const AggregatorMock = artifacts.require('AggregatorMock')
// const ERC20 = artifacts.require('MonstropolyERC20')
// const DistributionVault = artifacts.require('MonstropolyDistributionVault')
// const MonstropolyProxy = artifacts.require('MonstropolyProxy')

// const _IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

// const etherToNumber = (bn) => {
//   return Number(formatEther(bn.toString()))
// }

// let myWhitelist
// let myDeployer
// let myAirdrop
// let myDistributionVault
// let myErc20
// let myBnbUsdFeed
// let whitelistTree

// let accounts

// const BNB_PRICE = "50000000000"

// describe('MonstropolyAirdrop', function () {
//   let owner, person, person2

//   before(async () => {
//     await hre.run('compile')
//     accounts = await web3.eth.getAccounts()
//     owner = accounts[0]
//     person = accounts[1]
//     person2 = accounts[2]

//     const whitelistArray = [
//         owner,
//         person
//     ]

//     whitelistTree = getWhitelistTree(whitelistArray).toJSON()
//   })
//   beforeEach(async () => {
//     myBnbUsdFeed = await AggregatorMock.new()
//     await myBnbUsdFeed.initialize(8, BNB_PRICE)

//     myDeployer = await Deployer.new()

//     const airdropFactory = await ethers.getContractFactory('MonstropolyAirdrop')
//     let calldataAirdrop = await airdropFactory.interface.encodeFunctionData('initialize', []);

//     const whitelistFactory = await ethers.getContractFactory('MonstropolyAirdrop')
//     let calldataWhitelist = await whitelistFactory.interface.encodeFunctionData('initialize', []);

//     const erc20Factory = await ethers.getContractFactory('MonstropolyAirdrop')
//     let calldataErc20 = await erc20Factory.interface.encodeFunctionData('initialize', []);

//     const distributionVaultFactory = await ethers.getContractFactory('MonstropolyDistributionVault')
//     let calldataDistributionVault = await distributionVaultFactory.interface.encodeFunctionData('initialize', []);

//     await myDeployer.deploy(solKeccak256("AIRDROP"), Airdrop.bytecode, calldataAirdrop)
//     await myDeployer.deploy(solKeccak256("WHITELIST"), Whitelist.bytecode, calldataWhitelist)
//     await myDeployer.deploy(solKeccak256("DISTRIBUTION_VAULT"), DistributionVault.bytecode, calldataDistributionVault)
//     await myDeployer.deploy(solKeccak256("ERC20"), ERC20.bytecode, calldataErc20)

//     const [airdrop, whitelist, erc20, distributionVault] = await Promise.all([
//         myDeployer.get(solKeccak256("AIRDROP")),
//         myDeployer.get(solKeccak256("WHITELIST")),
//         myDeployer.get(solKeccak256("ERC20")),
//         myDeployer.get(solKeccak256("DISTRIBUTION_VAULT"))
//     ])

//     myAirdrop = await Airdrop.at(airdrop)
//     myWhitelist= await Whitelist.at(whitelist)
//     myErc20 = await ERC20.at(erc20)
//     myDistributionVault = await DistributionVault.at(distributionVault)

//     await myAirdrop.setFeed(myBnbUsdFeed.address)
//     await myWhitelist.updateWhitelist(whitelistTree.merkleRoot, 'uri')

//     const currentBlock = await time.latestBlock()

//     await myDistributionVault.add(myAirdrop.address, ether('2000000'), ether('2000000'), currentBlock, currentBlock, 0) // AIRDROP

//     await time.advanceBlock()

//     await myDistributionVault.distribute(myAirdrop.address)
//   })

//   describe('Whitelist', () => {
//     it('can be added to whitelist', async () => {
//         const claim = whitelistTree.claims[person]
//         await myWhitelist.add(claim.index, claim.account, claim.proof)
//         const result = await myWhitelist.whitelisted(person)
//         expect(result).to.eq(true)
//     })
//     it('can not be added to whitelist if not in the array', async () => {
//       const claim = whitelistTree.claims[person]
//       await expectRevert(myWhitelist.add(claim.index, person2, claim.proof), "MonstropolyWhitelist: invalid proof")
//       const result = await myWhitelist.whitelisted(person2)
//       expect(result).to.eq(false)
//     })
//     it('always true if whitelist disabled', async () => {
//       await myWhitelist.toggleEnabled()
//       const result = await myWhitelist.whitelisted(person)
//       expect(result).to.eq(true)
//     })
//   })
//   describe('Airdrop', () => {
//     it('can contribute if whitelisted', async () => {
//         const claim = whitelistTree.claims[person]
//         await myWhitelist.add(claim.index, claim.account, claim.proof)

//         const { 0: tokens } = await myAirdrop.getTokens(ether('1'))

//         const prevBalance = await myErc20.balanceOf(person)
//         await myAirdrop.contribute({ from: person, value: ether('1') })
//         const postBalance = await myErc20.balanceOf(person)

//         expect(formatEther(tokens.toString())).to.eq('12500.0')
//         expect(postBalance.sub(prevBalance).toString()).to.eq(tokens.toString())
//     })
//     it('can not contribute if not whitelisted', async () => {
//       await expectRevert(myAirdrop.contribute({ from: person2, value: ether('1') }), "MonstropolyAirdrop: address not whitelisted")
//     })
//     it('can contribute if not whitelisted but whitelist is disabled', async () => {
//       await myWhitelist.toggleEnabled()

//       const { 0: tokens } = await myAirdrop.getTokens(ether('1'))

//       const prevBalance = await myErc20.balanceOf(person2)
//       await myAirdrop.contribute({ from: person2, value: ether('1') })
//       const postBalance = await myErc20.balanceOf(person2)

//       expect(formatEther(tokens.toString())).to.eq('12500.0')
//       expect(postBalance.sub(prevBalance).toString()).to.eq(tokens.toString())
//     })
//     it('can contribute if value bigger than token balance (payback)', async () => {
//       await myWhitelist.toggleEnabled()

//       const { 0: tokens, 1: payback } = await myAirdrop.getTokens(ether('200')) // 2M tokens

//       const prevBalance = await myErc20.balanceOf(person2)
//       await myAirdrop.contribute({ from: person2, value: ether('200') })
//       const postBalance = await myErc20.balanceOf(person2)

//       expect(formatEther(tokens.toString())).to.eq('2000000.0')
//       expect(postBalance.sub(prevBalance).toString()).to.eq(tokens.toString())
//     })
//     it('can not contribute if no tokens available', async () => {
//       await myWhitelist.toggleEnabled()
//       myAirdrop.contribute({ from: person, value: ether('200') })
//       await expectRevert(myAirdrop.contribute({ from: person2, value: ether('1') }), "MonstropolyAirdrop: no tokens available")
//     })
//     it('can extract funds if owner', async () => {
//       await myWhitelist.toggleEnabled()
//       myAirdrop.contribute({ from: person, value: ether('1') })

//       const response = await myAirdrop.extractFunds(person, { from: owner })
//       expectEvent(response, "Extraction", {
//         account: person,
//         amount: ether('1')
//       })
//     })
//     it('can not extract funds if not owner', async () => {
//       await myWhitelist.toggleEnabled()
//       myAirdrop.contribute({ from: person, value: ether('1') })

//       await expectRevert(myAirdrop.extractFunds(person, { from: person2 }), `AccessControlProxyPausable: account ${person2.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`)
//     })
//   })
//   describe('Deployer', () => {
//     it('can upgrade a proxy and contribute', async () => {
//       const claim = whitelistTree.claims[person]
//       await myWhitelist.add(claim.index, claim.account, claim.proof)

//       const initialBalance = await myErc20.balanceOf(myAirdrop.address)

//       await myAirdrop.contribute({ from: person, value: ether('1') })

//       const firstBalance = await myErc20.balanceOf(myAirdrop.address)

//       let myProxy = await MonstropolyProxy.at(myAirdrop.address)
//       let implementationEncoded = await ethers.provider.getStorageAt(myProxy.address, _IMPLEMENTATION_SLOT)
//       const prevImplementation = ethers.utils.defaultAbiCoder.decode(['address'], implementationEncoded)

//       const airdropFactory = await ethers.getContractFactory('MonstropolyAirdrop')
//       let calldataAirdrop = await airdropFactory.interface.encodeFunctionData('initialize', []);
//       const tx = await myDeployer.deploy(solKeccak256("AIRDROP"), Airdrop.bytecode, '0x')

//       myProxy = await MonstropolyProxy.at(myAirdrop.address)
//       implementationEncoded = await ethers.provider.getStorageAt(myProxy.address, _IMPLEMENTATION_SLOT)
//       const postImplementation = ethers.utils.defaultAbiCoder.decode(['address'], implementationEncoded)

//       expectEvent(tx, 'Deployment', {
//         proxy: myAirdrop.address,
//         implementation: postImplementation[0],
//         upgrade: true
//       })

//       await myAirdrop.contribute({ from: person, value: ether('1') })

//       const secondBalance = await myErc20.balanceOf(myAirdrop.address)

//       const firstDiff = initialBalance.sub(firstBalance)
//       const secondDiff = firstBalance.sub(secondBalance)

//       expect(etherToNumber(secondBalance)).to.eq(etherToNumber(initialBalance.sub(firstDiff).sub(secondDiff)))
//       expect(prevImplementation[0]).to.not.eq(postImplementation[0])
//     })
//   })
// })
