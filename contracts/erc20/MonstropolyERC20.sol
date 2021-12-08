// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyDeployer.sol";
 
contract MonstropolyERC20 is ERC20Upgradeable, ERC20SnapshotUpgradeable, AccessControlProxyPausable, UUPSUpgradeableByRole, BaseRelayRecipient {
    string public override versionRecipient = "2.4.0";
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ANTIBOT_ROLE = keccak256("ANTIBOT_ROLE");

    uint256 public burned;
    uint256 public cap;
    uint256 private _maxBalanceWhenAntiBot;
    bool private _isAntibot;
    bool private _isAntiBotInitialized;

    mapping(address => bool) public whitelisted;
    mapping(address => bool) public blacklisted;

    function initialize() public initializer {
        cap = 500000000 ether;
        __ERC20_init("MPOLY Token", "MPOLY");
        __ERC20Snapshot_init();
        __AccessControlProxyPausable_init(msg.sender);
        _mint(IMonstropolyDeployer(config).get(keccak256("DISTRIBUTION_VAULT")), cap);
    }

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

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
        require(ERC20Upgradeable.totalSupply() + amount + burned <= cap, "MonstropolyERC20: cap exceeded");
        super._mint(account, amount);
    }

    function _burn(address account, uint256 amount) internal override {
        burned += amount;
        super._burn(account, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        require(_msgSender() == account || allowance(account, _msgSender()) >= amount, "MonstropolyERC20: amount exceeds allowance");
        _burn(account, amount);
    }

    function snapshot() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _snapshot();
    }

    function stopAntiBot() external onlyRole(ANTIBOT_ROLE) {
        _isAntibot = false;
    }

    function startAntiBot() external onlyRole(ANTIBOT_ROLE) {
        require(!_isAntiBotInitialized, "MonstropolyERC20: antibot not startable anymore");
        _isAntiBotInitialized = true;
        _isAntibot = true;
    }

    function setAntiBotMaxBalance(uint256 _max) external onlyRole(ANTIBOT_ROLE) {
        _maxBalanceWhenAntiBot = _max;
    }

    function whitelist(address[] calldata _list) external onlyRole(ANTIBOT_ROLE) {
        for(uint256 i; i <_list.length; i++) {
            whitelisted[_list[i]] = true;
        }
    }

    function unwhitelist(address[] calldata _list) external onlyRole(ANTIBOT_ROLE) {
        for(uint256 i; i <_list.length; i++) {
            whitelisted[_list[i]] = false;
        }
    }

    function blacklist(address[] calldata _list) external onlyRole(ANTIBOT_ROLE) {
        for(uint256 i; i <_list.length; i++) {
            blacklisted[_list[i]] = true;
        }
    }

    function unblacklist(address[] calldata _list) external onlyRole(ANTIBOT_ROLE) {
        for(uint256 i; i <_list.length; i++) {
            blacklisted[_list[i]] = false;
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override(ERC20Upgradeable, ERC20SnapshotUpgradeable)
    {
        _checkBlacklist(to);
        _antiBotMaxBalance(to, amount);
        super._beforeTokenTransfer(from, to, amount);
    }

    function _checkBlacklist(address _addr) internal view {
        if (_isAntibot) {
            require(!blacklisted[_addr], "MonstropolyERC20: Blacklist for antibot");
        }
    }

    function _antiBotMaxBalance(address _addr, uint256 _amount) internal view {
        if((_isAntibot) && (!whitelisted[_addr])){
            uint256 _balance = balanceOf(_addr);
            uint256 _nextBalance = _balance + _amount;
            require(_nextBalance <= _maxBalanceWhenAntiBot, "MonstropolyERC20: Maxbalance for antibot");
        }
    }
}
