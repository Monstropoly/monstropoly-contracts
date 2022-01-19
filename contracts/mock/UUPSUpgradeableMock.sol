// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";

contract UUPSUpgradeableMock is AccessControlProxyPausable, UUPSUpgradeableByRole {
    string public version;

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        version = "UUPSUpgradeableMock";
    }
}