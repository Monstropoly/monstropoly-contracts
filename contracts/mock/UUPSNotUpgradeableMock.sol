// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSNotUpgradeable.sol";

contract UUPSNotUpgradeableMock is
    AccessControlProxyPausable,
    UUPSNotUpgradeable
{
    string public version;

    function setVersion(string memory _version)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        version = _version;
    }
}
