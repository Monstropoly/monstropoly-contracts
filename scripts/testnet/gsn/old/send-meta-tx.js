const Gsn = require("@opengsn/provider")
const bre = require("hardhat");
const fs = require('fs')
const json = require('./addresses.json')
const scanners = require('../../../../scanners.json')
const { networks } = require('../../../../hardhat.config')

const conf = { paymasterAddress: json.paymaster }

const scannerSet = () => {
    const chainId = networks[bre.network.name].chainId
    scanners.current = chainId.toString()

    fs.writeFileSync('./scanners.json', JSON.stringify(scanners, null, 4))
}

async function main() {
    scannerSet()
    const gsnProvider = await Gsn.RelayProvider.newProvider({ provider: bre.network.provider, config: conf }).init()
    const provider = new bre.ethers.providers.Web3Provider(gsnProvider)
    const acct = provider.provider.newAccount()
    const signer = provider.getSigner(acct.address, acct.privateKey)
    const MyGSNContract = await bre.ethers.getContractFactory('MyGSNContract')
    let contract = await MyGSNContract.attach(json.contract)
    contract = contract.connect(signer)
    const transaction = await contract.set()
    const receipt = await provider.waitForTransaction(transaction.hash)
    console.log(receipt)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});