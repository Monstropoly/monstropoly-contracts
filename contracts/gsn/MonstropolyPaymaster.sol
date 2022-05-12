// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MonstropolyPaymaster is Ownable {
    function tokenTransferFrom(
        IERC20 token,
        address sender,
        uint256 amount
    ) external onlyOwner returns (bool) {
        return token.transferFrom(sender, address(this), amount);
    }

    function tokenTransfer(
        IERC20 token,
        address recipient,
        uint256 amount
    ) external onlyOwner returns (bool) {
        return token.transfer(recipient, amount);
    }
}
