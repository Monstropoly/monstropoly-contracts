const { ethers } = require('hardhat');
const {
    ether,
    expectRevert,
    expectEvent,
    time
} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

function solve(a, b, c) {
    var result = (-1 * b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
    var result2 = (-1 * b - Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a);
    return [result, result2];
}

function getAmountIn(reserveOutBN, reserveInBN, ratioBN) {
    let reserveOut = parseInt(ethers.utils.formatEther(reserveOutBN))
    let reserveIn = parseInt(ethers.utils.formatEther(reserveInBN))
    let ratio = parseInt(ethers.utils.formatEther(ratioBN))
    let a = 997
    let b = 1997 * reserveIn
    let c = (1000 * (reserveIn) - 1000 * ratio * reserveOut) * reserveIn
    return solve(a, b, c)
}

describe('POOL', function () {
    let owner, team, bot
    let myMPOLY, myWBTC, myWETH, myUniswapFactory, myRouter, myUniswapPair

    const BTC_USD_RATE = ethers.utils.parseEther('50000')
    const MPOLY_USD_RATE = ethers.utils.parseEther('0.05')
    const ADD_AMOUNT_MPOLY_1 = ethers.utils.parseEther('5000000')
    const ADD_AMOUNT_MPOLY_2 = ethers.utils.parseEther('15000000')
    const ONE_ETHER = ethers.utils.parseEther('1')
    const RATIO_MPOLY_WBTC = BTC_USD_RATE.mul(ONE_ETHER).div(MPOLY_USD_RATE)
    const ADD_AMOUNT_USD_1 = ADD_AMOUNT_MPOLY_1.mul(MPOLY_USD_RATE).div(ONE_ETHER)
    const ADD_AMOUNT_WBTC_1 = ADD_AMOUNT_USD_1.mul(ONE_ETHER).div(BTC_USD_RATE)
    const ADD_AMOUNT_USD_2 = ADD_AMOUNT_MPOLY_2.mul(MPOLY_USD_RATE).div(ONE_ETHER)
    const ADD_AMOUNT_WBTC_2 = ADD_AMOUNT_USD_2.mul(ONE_ETHER).div(BTC_USD_RATE)

    before(async () => {
        [owner, team, bot] = await ethers.getSigners();
    })
    beforeEach(async () => {
        const UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory')
        const UniswapRouter = await ethers.getContractFactory('UniswapRouter')
        const Token = await ethers.getContractFactory('Token')
        const WETH = await ethers.getContractFactory('WETH')

        myUniswapFactory = await UniswapV2Factory.deploy(owner.address)
        myWETH = await WETH.deploy()
        myRouter = await UniswapRouter.deploy(myUniswapFactory.address, myWETH.address)
        myMPOLY = await Token.deploy("Monstropoly", "MPOLY")
        myWBTC = await Token.deploy("Wrapped BTC", "WBTC")

        await myMPOLY.transfer(team.address, ethers.utils.parseEther('200000000'))
        await myWBTC.transfer(team.address, ethers.utils.parseEther('100'))
        await myWBTC.transfer(bot.address, ethers.utils.parseEther('10'))

        await (await myMPOLY.connect(team)).approve(myRouter.address, ethers.constants.MaxUint256)
        await (await myWBTC.connect(team)).approve(myRouter.address, ethers.constants.MaxUint256)
        await (await myMPOLY.connect(bot)).approve(myRouter.address, ethers.constants.MaxUint256)
        await (await myWBTC.connect(bot)).approve(myRouter.address, ethers.constants.MaxUint256)
    })
    describe('Add liquidity slowly', () => {
        it('simulate initial rates', async () => {
            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                team.address,
                Date.now()
            )

            const pairAddress = await myUniswapFactory.getPair(myMPOLY.address, myWBTC.address)
            myUniswapPair = await ethers.getContractAt('IUniswapV2Pair', pairAddress, owner)
            const reserves = await myUniswapPair.getReserves()
            const reserveMPOLY = reserves.reserve0
            const reserveWBTC = reserves.reserve1
            let amountWBTC = ethers.utils.parseEther('0.01')
            console.log("-----------------------------------------------------------------------")
            console.log("Initial rates for bot")
            let quote = await myRouter.getAmountOut(amountWBTC, reserveWBTC, reserveMPOLY)
            console.log("BUY " + ethers.utils.formatEther(amountWBTC) + " WBTC receive " + ethers.utils.formatEther(quote) + " MPOLY")
            amountWBTC = ethers.utils.parseEther('0.1')
            quote = await myRouter.getAmountOut(amountWBTC, reserveWBTC, reserveMPOLY)
            console.log("BUY " + ethers.utils.formatEther(amountWBTC) + " WBTC receive " + ethers.utils.formatEther(quote) + " MPOLY")
            amountWBTC = ethers.utils.parseEther('1')
            quote = await myRouter.getAmountOut(amountWBTC, reserveWBTC, reserveMPOLY)
            console.log("BUY " + ethers.utils.formatEther(amountWBTC) + " WBTC receive " + ethers.utils.formatEther(quote) + " MPOLY")
            amountWBTC = ethers.utils.parseEther('4')
            quote = await myRouter.getAmountOut(amountWBTC, reserveWBTC, reserveMPOLY)
            console.log("BUY " + ethers.utils.formatEther(amountWBTC) + " WBTC receive " + ethers.utils.formatEther(quote) + " MPOLY")
            amountWBTC = ethers.utils.parseEther('4.99')
            quote = await myRouter.getAmountOut(amountWBTC, reserveWBTC, reserveMPOLY)
            console.log("BUY " + ethers.utils.formatEther(amountWBTC) + " WBTC receive " + ethers.utils.formatEther(quote) + " MPOLY")
            console.log("-----------------------------------------------------------------------")
        })

        it('can addLiquidity twice at the same ratio if price is the same', async () => {
            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                team.address,
                Date.now()
            )

            const pairAddress = await myUniswapFactory.getPair(myMPOLY.address, myWBTC.address)
            myUniswapPair = await ethers.getContractAt('IUniswapV2Pair', pairAddress, team)
            let lpBalancePre = await myUniswapPair.balanceOf(team.address)
            console.log("LP balance after 1st add", ethers.utils.formatEther(lpBalancePre))

            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                team.address,
                Date.now()
            )

            let lpBalancePost = await myUniswapPair.balanceOf(team.address)
            console.log("LP balance after 2nd add", ethers.utils.formatEther(lpBalancePost), "(+", ethers.utils.formatEther(lpBalancePost.sub(lpBalancePre)), ")")
        })

        it('simulate sniping bot 1', async () => {

            let botMpolyPre = await myMPOLY.balanceOf(bot.address)
            let botBtcPre = await myWBTC.balanceOf(bot.address)
            let teamMpolyPre = await myMPOLY.balanceOf(team.address)
            let teamBtcPre = await myWBTC.balanceOf(team.address)

            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                team.address,
                Date.now()
            )

            const pairAddress = await myUniswapFactory.getPair(myMPOLY.address, myWBTC.address)
            myUniswapPair = await ethers.getContractAt('IUniswapV2Pair', pairAddress, team)

            let reserves = await myUniswapPair.getReserves()
            let reserveMPOLY = reserves.reserve0
            let reserveWBTC = reserves.reserve1

            let swapAmountWBTCBot = ethers.utils.parseEther('0.5')
            let swapAmountMPOLYBot = await myRouter.getAmountOut(swapAmountWBTCBot, reserveWBTC, reserveMPOLY)
            let path = [myWBTC.address, myMPOLY.address]

            await (await myRouter.connect(bot)).swapExactTokensForTokens(
                swapAmountWBTCBot,
                swapAmountMPOLYBot,
                path,
                bot.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let results = getAmountIn(reserveWBTC, reserveMPOLY, RATIO_MPOLY_WBTC)

            let swapAmountMPOLY

            if (results[0] > 0) {
                swapAmountMPOLY = ethers.utils.parseEther(results[0].toString())
            } else if (results[1] > 0) {
                swapAmountMPOLY = ethers.utils.parseEther(results[1].toString())
            } else {
                swapAmountMPOLY = ethers.utils.parseEther('0')
            }

            let swapAmountWBTC = await myRouter.getAmountOut(swapAmountMPOLY, reserveMPOLY, reserveWBTC)

            let path2 = [myMPOLY.address, myWBTC.address]

            await (await myRouter.connect(team)).swapExactTokensForTokens(
                swapAmountMPOLY,
                '0', //swapAmountWBTC,
                path2,
                team.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let addAmountMPOLY = ADD_AMOUNT_MPOLY_2.sub(swapAmountMPOLY)

            let addAmountWBTC = await myRouter.quote(addAmountMPOLY, reserveMPOLY, reserveWBTC)

            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                addAmountMPOLY,
                addAmountWBTC,
                '0', //addAmountMPOLY,
                '0', //addAmountWBTC,
                team.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let quote2 = await myRouter.getAmountOut(swapAmountMPOLYBot, reserveMPOLY, reserveWBTC)

            let path3 = [myMPOLY.address, myWBTC.address]
            await (await myRouter.connect(bot)).swapExactTokensForTokens(
                swapAmountMPOLYBot,
                '0', //quote2,
                path3,
                bot.address,
                Date.now()
            )

            let botMpolyPost = await myMPOLY.balanceOf(bot.address)
            let botBtcPost = await myWBTC.balanceOf(bot.address)
            let teamMpolyPost = await myMPOLY.balanceOf(team.address)
            let teamBtcPost = await myWBTC.balanceOf(team.address)

            let botMpolyDif = botMpolyPost.sub(botMpolyPre)
            let botBtcDif = botBtcPost.sub(botBtcPre)
            let teamMpolyDif = teamMpolyPost.sub(teamMpolyPre)
            let teamBtcDif = teamBtcPre.sub(teamBtcPost)

            console.log("-----------------------------------------------------------------------")

            console.log("|\tCASE 1")
            console.log("|\tTeam adds liquidity", ethers.utils.formatEther(ADD_AMOUNT_WBTC_1), "WBTC and", ethers.utils.formatEther(ADD_AMOUNT_MPOLY_1), "MPOLY")
            console.log("|\tBot swaps", ethers.utils.formatEther(swapAmountWBTCBot), "WBTC for", ethers.utils.formatEther(swapAmountMPOLYBot), "MPOLY")
            console.log("|\tTeam swaps", ethers.utils.formatEther(swapAmountMPOLY), "MPOLY for", ethers.utils.formatEther(swapAmountWBTC), "WBTC to rebalance pool to 0.05 USD")
            console.log("|\tTeam adds liquidity", ethers.utils.formatEther(addAmountWBTC), "WBTC and", ethers.utils.formatEther(addAmountMPOLY), "MPOLY")
            console.log("|\tBot swaps", ethers.utils.formatEther(swapAmountMPOLYBot), "MPOLY for", ethers.utils.formatEther(quote2), "WBTC")
            console.log("|  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .")
            console.log("|\tBot profits/losses", ethers.utils.formatEther(botBtcDif), "WBTC")
            console.log("|\tTeam needs", ethers.utils.formatEther(teamBtcDif), "WBTC to add all liquidity")

            console.log("-----------------------------------------------------------------------")
        })

        it('simulate sniping bot 2', async () => {

            let botMpolyPre = await myMPOLY.balanceOf(bot.address)
            let botBtcPre = await myWBTC.balanceOf(bot.address)
            let teamMpolyPre = await myMPOLY.balanceOf(team.address)
            let teamBtcPre = await myWBTC.balanceOf(team.address)

            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                team.address,
                Date.now()
            )

            const pairAddress = await myUniswapFactory.getPair(myMPOLY.address, myWBTC.address)
            myUniswapPair = await ethers.getContractAt('IUniswapV2Pair', pairAddress, team)

            let reserves = await myUniswapPair.getReserves()
            let reserveMPOLY = reserves.reserve0
            let reserveWBTC = reserves.reserve1

            let swapAmountWBTCBot = ethers.utils.parseEther('2')
            let swapAmountMPOLYBot = await myRouter.getAmountOut(swapAmountWBTCBot, reserveWBTC, reserveMPOLY)
            let path = [myWBTC.address, myMPOLY.address]

            await (await myRouter.connect(bot)).swapExactTokensForTokens(
                swapAmountWBTCBot,
                swapAmountMPOLYBot,
                path,
                bot.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let results = getAmountIn(reserveWBTC, reserveMPOLY, RATIO_MPOLY_WBTC)

            let swapAmountMPOLY

            if (results[0] > 0) {
                swapAmountMPOLY = ethers.utils.parseEther(results[0].toString())
            } else if (results[1] > 0) {
                swapAmountMPOLY = ethers.utils.parseEther(results[1].toString())
            } else {
                swapAmountMPOLY = ethers.utils.parseEther('0')
            }

            let swapAmountWBTC = await myRouter.getAmountOut(swapAmountMPOLY, reserveMPOLY, reserveWBTC)

            let path2 = [myMPOLY.address, myWBTC.address]

            await (await myRouter.connect(team)).swapExactTokensForTokens(
                swapAmountMPOLY,
                '0', //swapAmountWBTC,
                path2,
                team.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let addAmountMPOLY = ADD_AMOUNT_MPOLY_2.sub(swapAmountMPOLY)

            let addAmountWBTC = await myRouter.quote(addAmountMPOLY, reserveMPOLY, reserveWBTC)

            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                addAmountMPOLY,
                addAmountWBTC,
                '0', //addAmountMPOLY,
                '0', //addAmountWBTC,
                team.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let quote2 = await myRouter.getAmountOut(swapAmountMPOLYBot, reserveMPOLY, reserveWBTC)

            let path3 = [myMPOLY.address, myWBTC.address]
            await (await myRouter.connect(bot)).swapExactTokensForTokens(
                swapAmountMPOLYBot,
                '0', //quote2,
                path3,
                bot.address,
                Date.now()
            )

            let botMpolyPost = await myMPOLY.balanceOf(bot.address)
            let botBtcPost = await myWBTC.balanceOf(bot.address)
            let teamMpolyPost = await myMPOLY.balanceOf(team.address)
            let teamBtcPost = await myWBTC.balanceOf(team.address)

            let botMpolyDif = botMpolyPost.sub(botMpolyPre)
            let botBtcDif = botBtcPost.sub(botBtcPre)
            let teamMpolyDif = teamMpolyPost.sub(teamMpolyPre)
            let teamBtcDif = teamBtcPre.sub(teamBtcPost)

            console.log("-----------------------------------------------------------------------")

            console.log("|\tCASE 2")
            console.log("|\tTeam adds liquidity", ethers.utils.formatEther(ADD_AMOUNT_WBTC_1), "WBTC and", ethers.utils.formatEther(ADD_AMOUNT_MPOLY_1), "MPOLY")
            console.log("|\tBot swaps", ethers.utils.formatEther(swapAmountWBTCBot), "WBTC for", ethers.utils.formatEther(swapAmountMPOLYBot), "MPOLY")
            console.log("|\tTeam swaps", ethers.utils.formatEther(swapAmountMPOLY), "MPOLY for", ethers.utils.formatEther(swapAmountWBTC), "WBTC to rebalance pool to 0.05 USD")
            console.log("|\tTeam adds liquidity", ethers.utils.formatEther(addAmountWBTC), "WBTC and", ethers.utils.formatEther(addAmountMPOLY), "MPOLY")
            console.log("|\tBot swaps", ethers.utils.formatEther(swapAmountMPOLYBot), "MPOLY for", ethers.utils.formatEther(quote2), "WBTC")
            console.log("|  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .")
            console.log("|\tBot profits/losses", ethers.utils.formatEther(botBtcDif), "WBTC")
            console.log("|\tTeam needs", ethers.utils.formatEther(teamBtcDif), "WBTC to add all liquidity")

            console.log("-----------------------------------------------------------------------")
        })

        it('simulate sniping bot 3', async () => {

            let botMpolyPre = await myMPOLY.balanceOf(bot.address)
            let botBtcPre = await myWBTC.balanceOf(bot.address)
            let teamMpolyPre = await myMPOLY.balanceOf(team.address)
            let teamBtcPre = await myWBTC.balanceOf(team.address)

            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                ADD_AMOUNT_MPOLY_1,
                ADD_AMOUNT_WBTC_1,
                team.address,
                Date.now()
            )

            const pairAddress = await myUniswapFactory.getPair(myMPOLY.address, myWBTC.address)
            myUniswapPair = await ethers.getContractAt('IUniswapV2Pair', pairAddress, team)

            let reserves = await myUniswapPair.getReserves()
            let reserveMPOLY = reserves.reserve0
            let reserveWBTC = reserves.reserve1

            let swapAmountWBTCBot = ethers.utils.parseEther('4.99')
            let swapAmountMPOLYBot = await myRouter.getAmountOut(swapAmountWBTCBot, reserveWBTC, reserveMPOLY)
            let path = [myWBTC.address, myMPOLY.address]

            await (await myRouter.connect(bot)).swapExactTokensForTokens(
                swapAmountWBTCBot,
                swapAmountMPOLYBot,
                path,
                bot.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let results = getAmountIn(reserveWBTC, reserveMPOLY, RATIO_MPOLY_WBTC)

            let swapAmountMPOLY

            if (results[0] > 0) {
                swapAmountMPOLY = ethers.utils.parseEther(results[0].toString())
            } else if (results[1] > 0) {
                swapAmountMPOLY = ethers.utils.parseEther(results[1].toString())
            } else {
                swapAmountMPOLY = ethers.utils.parseEther('0')
            }

            let swapAmountWBTC = await myRouter.getAmountOut(swapAmountMPOLY, reserveMPOLY, reserveWBTC)

            let path2 = [myMPOLY.address, myWBTC.address]

            await (await myRouter.connect(team)).swapExactTokensForTokens(
                swapAmountMPOLY,
                '0', //swapAmountWBTC,
                path2,
                team.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let addAmountMPOLY = ADD_AMOUNT_MPOLY_2.sub(swapAmountMPOLY)

            let addAmountWBTC = await myRouter.quote(addAmountMPOLY, reserveMPOLY, reserveWBTC)

            await (await myRouter.connect(team)).addLiquidity(
                myMPOLY.address,
                myWBTC.address,
                addAmountMPOLY,
                addAmountWBTC,
                '0', //addAmountMPOLY,
                '0', //addAmountWBTC,
                team.address,
                Date.now()
            )

            reserves = await myUniswapPair.getReserves()
            reserveMPOLY = reserves.reserve0
            reserveWBTC = reserves.reserve1

            let quote2 = await myRouter.getAmountOut(swapAmountMPOLYBot, reserveMPOLY, reserveWBTC)

            let path3 = [myMPOLY.address, myWBTC.address]
            await (await myRouter.connect(bot)).swapExactTokensForTokens(
                swapAmountMPOLYBot,
                '0', //quote2,
                path3,
                bot.address,
                Date.now()
            )

            let botMpolyPost = await myMPOLY.balanceOf(bot.address)
            let botBtcPost = await myWBTC.balanceOf(bot.address)
            let teamMpolyPost = await myMPOLY.balanceOf(team.address)
            let teamBtcPost = await myWBTC.balanceOf(team.address)

            let botMpolyDif = botMpolyPost.sub(botMpolyPre)
            let botBtcDif = botBtcPost.sub(botBtcPre)
            let teamMpolyDif = teamMpolyPost.sub(teamMpolyPre)
            let teamBtcDif = teamBtcPre.sub(teamBtcPost)

            console.log("-----------------------------------------------------------------------")

            console.log("|\tCASE 3")
            console.log("|\tTeam adds liquidity", ethers.utils.formatEther(ADD_AMOUNT_WBTC_1), "WBTC and", ethers.utils.formatEther(ADD_AMOUNT_MPOLY_1), "MPOLY")
            console.log("|\tBot swaps", ethers.utils.formatEther(swapAmountWBTCBot), "WBTC for", ethers.utils.formatEther(swapAmountMPOLYBot), "MPOLY")
            console.log("|\tTeam swaps", ethers.utils.formatEther(swapAmountMPOLY), "MPOLY for", ethers.utils.formatEther(swapAmountWBTC), "WBTC to rebalance pool to 0.05 USD")
            console.log("|\tTeam adds liquidity", ethers.utils.formatEther(addAmountWBTC), "WBTC and", ethers.utils.formatEther(addAmountMPOLY), "MPOLY")
            console.log("|\tBot swaps", ethers.utils.formatEther(swapAmountMPOLYBot), "MPOLY for", ethers.utils.formatEther(quote2), "WBTC")
            console.log("|  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .")
            console.log("|\tBot profits/losses", ethers.utils.formatEther(botBtcDif), "WBTC")
            console.log("|\tTeam needs", ethers.utils.formatEther(teamBtcDif), "WBTC to add all liquidity")

            console.log("-----------------------------------------------------------------------")
        })

    })
})
