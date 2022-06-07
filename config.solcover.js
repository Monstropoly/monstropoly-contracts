module.exports = {
    configureYulOptimizer: true,
    solcOptimizerDetails: {
        yul: true,
        yulDetails: {
            stackAllocation: true,
        },
    }, skipFiles: [
        'mock/AggregatorMock.sol',
        'mock/UniswapRouter.sol',
        'mock/UniswapFactory.sol',
        'mock/WETH.sol',
        'mock/UniswapMock.sol',
        'mock/MyGSNContract.sol',
        'mock/MyRelayer.sol',
        'utils/Token.sol',
        'utils/ERC20Recovery.sol',
        'utils/ERC721Recovery.sol',
        'utils/ETHRecovery.sol',
        'shops/utils/PancakeswapNFTMarketplace.sol',
        'shops/utils/WBNB.sol',
        'shops/galler/LaunchpadV1.sol',
        'shops/galler/Launchpad.sol',
        'shops/galler/ILaunchpadNFT.sol',
        'gsn/MonstropolyPaymaster.sol',
        'gsn/MonstropolyRelayer.sol',
        'gsn/MonstropolyRelayerFree.sol'
    ]
};