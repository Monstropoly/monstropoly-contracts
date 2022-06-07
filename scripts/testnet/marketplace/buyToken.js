const { ethers } = require('hardhat');

const MARKETPLACE_ADDR = '0x2876a0872D9121eA4B6D68dB8ec121eFa9ABfB07'
const FACTORY_ADDR = '0xA97b63EEb5a25E650C67838DA62d1D186AFa868A'
const TOKEN_ID = 158

async function main() {
    await hre.run('compile');

    const accounts = await ethers.getSigners()
    const buyer = accounts[1]

    const marketplaceContract = await ethers.getContractAt('MonstropolyMarketplace', MARKETPLACE_ADDR)

    const askInfo = await marketplaceContract.viewAsksByCollectionAndTokenIds(FACTORY_ADDR, [TOKEN_ID])

    if (askInfo.statuses[0]) {
        const price = askInfo.askInfo[0].price
        let response
        if (askInfo.askInfo[0].token === ethers.constants.AddressZero) {
            response = await marketplaceContract.connect(buyer).buyTokenUsingBNB(
                FACTORY_ADDR,
                TOKEN_ID,
                { value: price }
            )
            await response.wait()
            console.log('Token bought...')
        } else {
            const tokenContract = await ethers.getContractAt('IERC20', askInfo.askInfo[0].token)
            const allowance = await tokenContract.allowance(buyer.address, MARKETPLACE_ADDR)

            if (price.gt(allowance)) {
                response = await tokenContract.approve(MARKETPLACE_ADDR, ethers.constants.MaxUint256)
                await response.wait()
            }

            response = await marketplaceContract.connect(buyer).buyTokenUsingToken(
                FACTORY_ADDR,
                TOKEN_ID,
                price
            )
            await response.wait()
            console.log('Token bought...')
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});