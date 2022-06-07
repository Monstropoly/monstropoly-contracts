// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "../shared/IAccessControlProxyPausable.sol";

/// @title The contract for AccessControlProxyPausable
/// @notice Handles roles and pausability of proxies
/// @dev Roles and addresses are centralized in Deployer
contract AccessControlProxyPausable is
    IAccessControlProxyPausable,
    PausableUpgradeable
{
    address public config;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    modifier onlyRole(bytes32 role) {
        address account = msg.sender;
        require(
            hasRole(role, account),
            string(
                abi.encodePacked(
                    "AccessControlProxyPausable: account ",
                    StringsUpgradeable.toHexString(uint160(account), 20),
                    " is missing role ",
                    StringsUpgradeable.toHexString(uint256(role), 32)
                )
            )
        );
        _;
    }

    /// @inheritdoc IAccessControlProxyPausable
    function hasRole(bytes32 role, address account) public view returns (bool) {
        IAccessControlUpgradeable manager = IAccessControlUpgradeable(config);
        return manager.hasRole(role, account);
    }

    // solhint-disable-next-line
    function __AccessControlProxyPausable_init(address config_)
        internal
        initializer
    {
        __Pausable_init();
        __AccessControlProxyPausable_init_unchained(config_);
    }

    // solhint-disable-next-line
    function __AccessControlProxyPausable_init_unchained(address config_)
        internal
        initializer
    {
        config = config_;
    }

    /// @inheritdoc IAccessControlProxyPausable
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @inheritdoc IAccessControlProxyPausable
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @inheritdoc IAccessControlProxyPausable
    function updateManager(address config_)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        config = config_;
    }
}
