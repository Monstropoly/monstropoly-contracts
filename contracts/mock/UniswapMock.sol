// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@opengsn/paymasters/contracts/interfaces/IUniswap.sol";

contract UniswapMock is IUniswap {

    address private _token;

    constructor(address token) {
        _token = token;
    }
    function tokenAddress() external view returns (address) {
        return _token;
    }

    function tokenToEthSwapOutput(uint256 ethBought, uint256 maxTokens, uint256 deadline) external returns (uint256 out){}

    function tokenToEthTransferOutput(uint256 ethBought, uint256 maxTokens, uint256 deadline, address payable recipient) external returns (uint256 out){}

    function getTokenToEthOutputPrice(uint256 ethBought) external view returns (uint256 out) {
        return ethBought * 20;
    }

    function getTokenToEthInputPrice(uint256 tokensSold) external view returns (uint256 out){}
}