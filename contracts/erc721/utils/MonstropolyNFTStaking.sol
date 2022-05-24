// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "../../utils/UUPSUpgradeableByRole.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "../../shared/IMonstropolyFactory.sol";
import "../../shared/IMonstropolyNFTStaking.sol";

contract MonstropolyNFTStaking is
    IMonstropolyNFTStaking,
    UUPSUpgradeableByRole,
    BaseRelayRecipient
{
    string public override versionRecipient = "2.4.0";
    bytes32 public constant FACTORY_ID = keccak256("FACTORY");

    mapping (uint256 => uint256) private _lastUnstake;

    modifier checkStaker(uint256 tokenId, address staker) {
        require(
            _checkStaker(tokenId, staker),
            "MonstropolyNFTStaking: checkStaker or inexistent"
        );
        _;
    }

    modifier checkLastUnstake(uint256 tokenId) {
        require(
            _checkLastUnstake(tokenId),
            "MonstropolyNFTStaking: checkLastUnstake"
        );
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        _init();
    }

    function setTrustedForwarder(address _forwarder)
        public
    /* TBD: onlyRole(DEPLOYER)*/
    {
        _setTrustedForwarder(_forwarder);
    }

    function getLastUnstake(uint256 tokenId) public view returns(uint256) {
        return _lastUnstake[tokenId];
    }

    function stake(uint256 tokenId)
        external
        checkStaker(tokenId, _msgSender())
        checkLastUnstake(tokenId)
    {
        _lockToken(tokenId);
        emit StakeNFT(tokenId, _msgSender());
    }

    function unstake(uint256 tokenId)
        external
        checkStaker(tokenId, _msgSender())
    {
        _unlockToken(tokenId);
        _lastUnstake[tokenId] = block.timestamp;
        emit UnstakeNFT(tokenId);
    }

    function _checkStaker(uint256 tokenId, address staker)
        internal
        view
        returns (bool)
    {
        IMonstropolyFactory factory = IMonstropolyFactory(
            IMonstropolyDeployer(config).get(FACTORY_ID)
        );
        return staker == factory.ownerOf(tokenId);
    }

    function _checkLastUnstake(uint256 tokenId) internal view returns(bool) {
        return (_lastUnstake[tokenId] + 1 weeks) < block.timestamp;
    }

    function _lockToken(uint256 tokenId) internal {
        IMonstropolyFactory factory = IMonstropolyFactory(
            IMonstropolyDeployer(config).get(FACTORY_ID)
        );
        require(
            !factory.isLocked(tokenId),
            "MonstropolyLendingGame: already locked"
        );
        factory.lockToken(tokenId);
    }

    function _unlockToken(uint256 tokenId) internal {
        IMonstropolyFactory factory = IMonstropolyFactory(
            IMonstropolyDeployer(config).get(FACTORY_ID)
        );
        require(
            factory.isLocked(tokenId),
            "MonstropolyLendingGame: already unlocked"
        );
        factory.unlockToken(tokenId);
    }

    function _msgSender()
        internal
        view
        override(BaseRelayRecipient, ContextUpgradeable)
        returns (address)
    {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData()
        internal
        view
        override(BaseRelayRecipient, ContextUpgradeable)
        returns (bytes memory _bytes)
    {}

    function _init() internal initializer {
        __AccessControlProxyPausable_init(msg.sender);
    }
}
