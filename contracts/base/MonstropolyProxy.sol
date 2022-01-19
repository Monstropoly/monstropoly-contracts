// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../utils/AccessControlProxyPausable.sol";

contract MonstropolyProxy is ERC1967Proxy, AccessControlProxyPausable {

    event Upgrade(address prevImplementation, address newImplementation);
    
    constructor (address _logic, bytes memory _data) ERC1967Proxy(_logic, _data) payable {}

    function implementation() public view returns (address) {
        return _implementation();
    }

    function upgrade(address newImplementation) public onlyRole(DEFAULT_ADMIN_ROLE) {
        address prevImplementation = _getImplementation();
        _upgradeTo(newImplementation);
        emit Upgrade(prevImplementation, newImplementation);
    }
} 