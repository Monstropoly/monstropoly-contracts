// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../shared/IMonstropolyDeployer.sol";

/// @title The contract for the Monstropoly Deployer
/// @notice Deploys contracts and handle addresses and roles
/// @dev Contracts are deployed and handled using UUPS OZ proxy pattern
contract MonstropolyDeployer is IMonstropolyDeployer, AccessControlUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @inheritdoc IMonstropolyDeployer
    mapping(bytes32 => address) public get;

    /// @inheritdoc IMonstropolyDeployer
    mapping(address => bytes32) public name;

    /// @inheritdoc IMonstropolyDeployer
    mapping(bytes32 => bool) public locked;

    constructor() initializer {
        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, address(this));
        _setupRole(UPGRADER_ROLE, address(this));
    }

    /// @inheritdoc IMonstropolyDeployer
    function lock(bytes32 id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        locked[id] = true;
    }

    /// @inheritdoc IMonstropolyDeployer
    function setId(bytes32 id, address addr)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setId(id, addr);
    }

    /// @inheritdoc IMonstropolyDeployer
    function deployProxyWithImplementation(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!locked[id], "MonstropolyDeployer: id locked");
        _deployProxy(id, implementation, initializeCalldata);

        emit Deployment(id, get[id], implementation, false);
    }

    /// @inheritdoc IMonstropolyDeployer
    function deploy(
        bytes32 id,
        bytes memory bytecode,
        bytes memory initializeCalldata
    ) public onlyRole(DEFAULT_ADMIN_ROLE) returns (address implementation) {
        bool upgrade;
        assembly {
            implementation := create(0, add(bytecode, 32), mload(bytecode))
        }

        address proxyAddress = get[id];

        if (proxyAddress != address(0)) {
            UUPSUpgradeable proxy = UUPSUpgradeable(payable(proxyAddress));
            if (initializeCalldata.length > 0) {
                proxy.upgradeToAndCall(implementation, initializeCalldata);
            } else {
                proxy.upgradeTo(implementation);
            }

            upgrade = true;
        } else {
            _deployProxy(id, implementation, initializeCalldata);
        }

        emit Deployment(id, get[id], implementation, upgrade);
    }

    /// @dev Deploys the ERC1967Proxy pointing to an implementation and sets ID
    function _deployProxy(
        bytes32 id,
        address implementation,
        bytes memory initializeCalldata
    ) private {
        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation,
            initializeCalldata
        );
        _setId(id, address(proxy));
    }

    /// @dev Sets the address where an ID points to
    function _setId(bytes32 id, address addr) private {
        require(!locked[id], "MonstropolyDeployer: id locked");
        get[id] = addr;
        name[addr] = id;

        emit NewId(id, addr);
    }
}
