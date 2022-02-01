pragma solidity 0.8.9;

/// @title The interface for AccessControlProxyPausable
/// @notice Handles roles and pausability of proxies
/// @dev Roles and addresses are centralized in Deployer
interface IAccessControlProxyPausable {

    /// @dev Returns `true` if `account` has been granted `role`
    function hasRole(bytes32 role, address account) external view returns (bool);

    /// @notice Returns address of contract storing roles and addresses
    /// @dev Address of MonstropolyDeployer
    /// @return Address of config contract
    function config() external returns(address);

    /// @notice Pauses functions using modifier
    /// @dev Only functions with whenNotPaused modifier are paused
    function pause() external;

    /// @notice Unpauses functions using modifier
    /// @dev Only functions with whenPaused modifier are paused
    function unpause() external;

    /// @notice Updates config address
    /// @dev Redirects roles and addresses to new contract
    /// @param config_ New config contract
    function updateManager(address config_) external;
}