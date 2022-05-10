// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "../../utils/UUPSUpgradeableByRole.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "../../shared/IMonstropolyFactory.sol";
import "../../shared/IMonstropolyNFTStaking.sol";

contract MonstropolyNFTStaking is IMonstropolyNFTStaking, UUPSUpgradeableByRole, BaseRelayRecipient {

    string public override versionRecipient = "2.4.0";
    bytes32 public constant FACTORY_ID = keccak256("FACTORY");

    modifier checkStaker(uint256 tokenId, address staker) {
        require(_checkStaker(tokenId, staker), "MonstropolyNFTStaking: checkStaker or inexistent");
        _;
    }

    function initialize() public initializer {
        _init();
    }

    function setTrustedForwarder(address _forwarder) public /* TBD: onlyRole(DEPLOYER)*/ {
        _setTrustedForwarder(_forwarder);
    }

    function stake(uint256 tokenId) external checkStaker(tokenId, _msgSender()) {
        _lockToken(tokenId);
        emit StakeNFT(tokenId, _msgSender());
    }

    function unstake(uint256 tokenId) external checkStaker(tokenId, _msgSender()) {
        _unlockToken(tokenId);
        emit UnstakeNFT(tokenId);
    }

    function _checkStaker(uint256 tokenId, address staker) internal view returns (bool) {
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(FACTORY_ID));
        return staker == factory.ownerOf(tokenId);
    }

    function _lockToken(uint256 tokenId) internal {
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(FACTORY_ID));
        require(!factory.isLocked(tokenId), "MonstropolyLendingGame: already locked");
        factory.lockToken(tokenId);
    }

    function _unlockToken(uint256 tokenId) internal {
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(FACTORY_ID));
        require(factory.isLocked(tokenId), "MonstropolyLendingGame: already unlocked");
        factory.unlockToken(tokenId);
    }

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes memory _bytes) {}

    function _init() internal initializer {
        __AccessControlProxyPausable_init(msg.sender);
    }
}