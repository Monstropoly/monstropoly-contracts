// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyDeployer.sol";

contract AccessControlProxyPausableMock is
    AccessControlProxyPausable,
    UUPSUpgradeableByRole
{
    string public x;

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        x = "empty";
    }

    function set(string calldata x_) public whenNotPaused {
        x = x_;
    }

    function reset() public whenPaused {
        x = "reset";
    }

    function getFromConfig(bytes32 id_) public view returns (address) {
        return IMonstropolyDeployer(config).get(id_);
    }
}
