// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const FACTORY_ADDR = '0x39C296E7046c27B3cfEF8514D368bA1aE8558399'
const DATA_ADDR = '0xeD521Cd6905238b605Ee1c06d440BFc49Ec1E810'

const ASSET = 0 // 0-Character 1-Weapon. The asset you want to open
const VIP = false // Is your asset from a VIP box?

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    await hre.run('compile');

    const signers = await ethers.getSigners()
    const user = signers[0]

    const factoryContract = await ethers.getContractAt('MonstropolyFactory', FACTORY_ADDR)
    const dataContract = await ethers.getContractAt('MonstropolyData', DATA_ADDR)

    // Transfer Event
    // let filter = factoryContract.filters.Transfer()
    // let filterFrom = factoryContract.filters.Transfer(ethers.constants.AddressZero)
    // let filterTo = factoryContract.filters.Transfer(null, user.address)
    // let filterTokenId = factoryContract.filters.Transfer(null, null, 7)
    // let logs = await factoryContract.queryFilter(filterTokenId, -4000, "latest")

    // logs.forEach(async(log) => {
    //     console.log('Transfer event')
    //     console.log('    From: ', log.args.from)
    //     console.log('    To: ', log.args.to)
    //     console.log('    TokenID: ', log.args.tokenId.toString())

    //     let nft = await factoryContract.heroeOfId(log.args.tokenId)
    //     console.log('    Genetic: ', nft.genetic)

    //     console.log("Deconstructed gen:")
    //     let dec = await dataContract.deconstructGen(nft.genetic)
    //     console.log("Asset: ", dec._asset.random % dec._asset.module)
    //     console.log("    Asset_random: ", dec._asset.random.toString())
    //     console.log("    Asset_module: ", dec._asset.module.toString())
    //     console.log("Type: ", dec._type.random % dec._type.module)
    //     console.log("    Type_random: ", dec._type.random.toString())
    //     console.log("    Type_module: ", dec._type.module.toString())
    //     console.log("Rarity: ", dec._rarity.random % dec._rarity.module)
    //     console.log("    Rarity_random: ", dec._rarity.random.toString())
    //     console.log("    Rarity_module: ", dec._rarity.module.toString())

    //     for (let i = 0; i < dec._stats.length; i++) {
    //         console.log("Stat" + i + ": ", dec._stats[i].random % dec._stats[i].module)
    //         console.log("    Stat_random" + i + ": ", dec._stats[i].random.toString())
    //         console.log("    Stat_module" + i + ": ", dec._stats[i].module.toString())
    //     }

    //     for (let j = 0; j < dec._attributes.length; j++) {
    //         console.log("Attributes" + j + ": ", dec._attributes[j].random % dec._attributes[j].module)
    //         console.log("    Attributes_random" + j + ": ", dec._attributes[j].random.toString())
    //         console.log("    Attributes_module" + j + ": ", dec._attributes[j].module.toString())
    //     }
    // })

    // Mint Event
    let filter = factoryContract.filters.Mint()
    let filterFrom = factoryContract.filters.Mint(ethers.constants.AddressZero)
    let filterTo = factoryContract.filters.Mint(null, user.address)
    let filterTokenId = factoryContract.filters.Mint(null, null, 1)
    let logs = await factoryContract.queryFilter(filterTokenId, -4000, "latest")

    logs.forEach(async(log) => {
        console.log('Mint event')
        console.log('    From: ', log.args.from)
        console.log('    To: ', log.args.to)
        console.log('    TokenID: ', log.args.tokenId.toString())
        console.log('    Genetic: ', log.args.genetic)

        console.log("Deconstructed gen:")
        let dec = await dataContract.deconstructGen(log.args.genetic)
        console.log("Asset: ", dec._asset.random % dec._asset.module)
        console.log("    Asset_random: ", dec._asset.random.toString())
        console.log("    Asset_module: ", dec._asset.module.toString())
        console.log("Type: ", dec._type.random % dec._type.module)
        console.log("    Type_random: ", dec._type.random.toString())
        console.log("    Type_module: ", dec._type.module.toString())
        console.log("Rarity: ", dec._rarity.random % dec._rarity.module)
        console.log("    Rarity_random: ", dec._rarity.random.toString())
        console.log("    Rarity_module: ", dec._rarity.module.toString())

        for (let i = 0; i < dec._stats.length; i++) {
            console.log("Stat" + i + ": ", dec._stats[i].random % dec._stats[i].module)
            console.log("    Stat_random" + i + ": ", dec._stats[i].random.toString())
            console.log("    Stat_module" + i + ": ", dec._stats[i].module.toString())
        }

        for (let j = 0; j < dec._attributes.length; j++) {
            console.log("Attributes" + j + ": ", dec._attributes[j].random % dec._attributes[j].module)
            console.log("    Attributes_random" + j + ": ", dec._attributes[j].random.toString())
            console.log("    Attributes_module" + j + ": ", dec._attributes[j].module.toString())
        }
    })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});