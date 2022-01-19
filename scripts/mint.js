// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');

const DATA_ID = ethers.utils.id("DATA");
const FACTORY_ID = ethers.utils.id("FACTORY");
const SCIENCE_ID = ethers.utils.id("SCIENCE");
const DEPLOYER_ADDR = '0xa5D0A86fBd67166251d33A950c4Beb2683836C24'
const length = 'asset-type--raritystat0-stat1-stat2-stat3-attr0-attr1-attr2-attr3-attr4-attr5-attr6-attr7-attr8-colorRcolorGcolorBcolorA' // not used
const RANDOM = '748398223409878271829384132948734346321498890831874398135738578741832983748398134791348010684586001613748386163847501638' //modify manually !!!

async function main() {
    const DeployerFactory = await ethers.getContractFactory("MonstropolyDeployer");
    const dataFactory = await ethers.getContractFactory('MonstropolyData')
    const erc721Factory = await ethers.getContractFactory('MonstropolyFactory')
    const scienceFactory = await ethers.getContractFactory('MonstropolyGenScience')

    const deployer = await DeployerFactory.attach(DEPLOYER_ADDR);

    const [data, erc721, science] = await Promise.all([
        deployer.get(DATA_ID),
        deployer.get(FACTORY_ID),
        deployer.get(SCIENCE_ID)
    ])

    const myData = await dataFactory.attach(data)
    const myERC721 = await erc721Factory.attach(erc721)
    const myScience = await scienceFactory.attach(science)

    await myScience.setRandom(RANDOM)

    // Use this function to generate a gen with fixed asset/type/rarity
    const gen = await myScience.generateFromRootView(
        [0, 3, 2], //asset, type, rarity
        [true, true, true], //true-fixed, false-take from random
        RANDOM,
        false
    )
    // Other possibilities
    // const gen = await myScience.generateAssetView(0, RANDOM, false)
    // const gen = await myScience.generateTypeView(0, RANDOM, false)
    // const gen = await myScience.generateRarityView(0, RANDOM, false)

    if (gen.free_) {
        const accounts = await ethers.getSigners() //set MNEMONIC in .env
        const receiver = accounts[0].address
        // When mintint to a third address (not signer)
        // const receiver = '0xAa98cA5101852Cd4B6E602d8d58590D659a67C84'
        const response = await myERC721.mint(receiver, gen.gen_)
        const receipt = await response.wait()

        console.log("NFT minted with gen:", gen.gen_)
        console.log("Deconstructed gen:")
        let dec = await myData.deconstructGen(gen.gen_)
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
    } else {
        console.log("Gen not free, set new random")
    }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});