// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

/// @title The interface for the Monstropoly Deployer
/// @notice Deploys contracts and handle addresses and roles
/// @dev Contracts are deployed and handled using UUPS OZ proxy pattern
interface IMonstropolyDeployer {
    /// @notice Emitted when address of an id is updated
    /// @param id The hash of the string identifier for the address
    /// @param addr The address where the id points to
    event NewId(bytes32 indexed id, address addr);

    /// @notice Emitted when a new proxy is deployed
    /// @param id The hash of the string identifier for the address
    /// @param proxy The address of the deployed proxy
    /// @param implementation The address of the proxy's implementation
    /// @param upgrade False when deployment and true if is a proxy upgrade
    event Deployment(
        bytes32 indexed id,
        address indexed proxy,
        address implementation,
        bool upgrade
    );

    /// @notice Returns the address of an ID
    /// @param id The hash of the string identifier
    /// @return The address where id points to
    function get(bytes32 id) external view returns (address);

    /// @notice Returns the ID of an address
    /// @param addr The address linked to an ID
    /// @return The ID of the address linked to it
    function name(address addr) external view returns (bytes32);

    /// @notice Returns wether or not the ID can be updated
    /// @param id The hash of the string identifier
    function locked(bytes32 id) external view returns (bool);

    /// @notice Locks an ID so it can't be updated anymore
    /// @param id The hash of the string identifier
    function lock(bytes32 id) external;

    /// @notice Sets the address for an ID
    /// @param id The hash of the string identifier
    /// @param addr The address where the ID points to
    function setId(bytes32 id, address addr) external;

    /// @notice Deploys a proxy pointing to an implementation linked to an ID
    /// @param id The hash of the string identifier
    /// @param implementation The address of the proxy's implementation
    /// @param initializeCalldata Calldata to initialize the proxy
    function deployProxyWithImplementation(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) external;

    /// @notice Deploys a proxy and its implementation
    /// @param id The hash of the string identifier
    /// @param bytecode Bytecode of the implementation to be deployed
    /// @param initializeCalldata Calldata to initialize the proxy
    function deploy(
        bytes32 id,
        bytes memory bytecode,
        bytes memory initializeCalldata
    ) external returns (address implementation);
}
