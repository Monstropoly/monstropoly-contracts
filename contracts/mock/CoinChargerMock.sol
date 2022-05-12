// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../utils/CoinCharger.sol";

contract CoinChargerMock is
    AccessControlProxyPausable,
    UUPSUpgradeableByRole,
    CoinCharger
{
    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
    }

    function transferFrom(
        address token_,
        address from_,
        address to_,
        uint256 amount_
    ) public payable {
        _transferFrom(token_, from_, to_, amount_);
    }

    function burnFromERC20(
        address token_,
        address from_,
        uint256 amount_
    ) public {
        _burnFromERC20(token_, from_, amount_);
    }
}
