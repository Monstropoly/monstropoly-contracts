// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../utils/AccessControlProxyPausable.sol";

contract UUPSNotUpgradeable is AccessControlProxyPausable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // function endUpgradeability() public onlyRole(UPGRADER_ROLE) {
    //     StorageSlot.getBooleanSlot(bytes32(uint256(keccak256("eip1967.proxy.upgradeabilityEnded")) - 1)).value = true;
    // }

    // function upgradeabilityEnded() public view returns(bool) {
    //     return StorageSlot.getBooleanSlot(bytes32(uint256(keccak256("eip1967.proxy.upgradeabilityEnded")) - 1)).value;
    // }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {
        // require(!upgradeabilityEnded(), "UUPSNotUpgradeable: not upgradeable anymore");
        require(StorageSlot.getBooleanSlot(bytes32(uint256(keccak256("eip1967.proxy.rollback")) - 1)).value, "UUPSNotUpgradeable: not upgradeable anymore");
    }

        function implementation () public view returns (address) {
        return _getImplementation();
    }
}