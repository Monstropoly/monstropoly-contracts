// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../utils/AccessControlProxyPausable.sol";

contract UUPSUpgradeableByRole is AccessControlProxyPausable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    /// @notice Returns the address of the proxy's implementation
    /// @return Address of current implementation
    function implementation () public view returns (address) {
        return _getImplementation();
    }
}