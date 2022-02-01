// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyDeployer.sol";

contract MonstropolyGLD is ERC20Upgradeable, AccessControlProxyPausable, UUPSUpgradeableByRole, BaseRelayRecipient {
    
    string public override versionRecipient = "2.4.0";
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public burned;

    function initialize() public initializer {
        __ERC20_init("GOLD Token", "MPGLD");
        __AccessControlProxyPausable_init(msg.sender);
    }

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes memory _bytes) {}

    function setTrustedForwarder(address _forwarder) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTrustedForwarder(_forwarder);
    }

    function approveAll(address to) public {
        uint256 total = balanceOf(_msgSender());
        _approve(_msgSender(), to, total);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function _mint(address account, uint256 amount) internal override {
        super._mint(account, amount);
    }

    function _burn(address account, uint256 amount) internal override {
        burned += amount;
        super._burn(account, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        require(_msgSender() == account || allowance(account, _msgSender()) >= amount, "MonstropolyGLD: amount exceeds allowance");
        _burn(account, amount);
    }
}