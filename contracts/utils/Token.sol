// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract Token is ERC20Upgradeable {

    address public owner;

    constructor (string memory name_, string memory symbol_) initializer {
        __ERC20_init(name_, symbol_);
        owner = msg.sender;
        _mint(owner, 1e28);
    }

    function mint(address account, uint256 amount) public {
        require(msg.sender == owner, "Token: only owner can mint");
        _mint(account, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
