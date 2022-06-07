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
    bytes32 public constant NFT_STAKING_ADMIN_ROLE =
        keccak256("NFT_STAKING_ADMIN_ROLE");

    mapping(uint256 => uint256) private _lastStakeTime;
    mapping(uint256 => uint256) private _lastUnstakeTime;

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
        onlyRole(NFT_STAKING_ADMIN_ROLE)
    {
        _setTrustedForwarder(_forwarder);
    }

    function getLastStake(uint256 tokenId) public view returns (uint256) {
        return _lastStakeTime[tokenId];
    }

    function getLastUnstake(uint256 tokenId) public view returns (uint256) {
        return _lastUnstakeTime[tokenId];
    }

    function stake(uint256 tokenId)
        external
        checkStaker(tokenId, _msgSender())
        checkLastUnstake(tokenId)
        whenNotPaused
    {
        _lockToken(tokenId);
        _lastStakeTime[tokenId] = block.timestamp;
        _lastUnstakeTime[tokenId] = 0;
        emit StakeNFT(tokenId, _msgSender());
    }

    function unstake(uint256 tokenId)
        external
        checkStaker(tokenId, _msgSender())
        whenNotPaused
    {
        _unlockToken(tokenId);
        _lastUnstakeTime[tokenId] = block.timestamp;
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

    function _checkLastUnstake(uint256 tokenId) internal view returns (bool) {
        return (_lastUnstakeTime[tokenId] + 1 weeks) < block.timestamp;
    }

    function _lockToken(uint256 tokenId) internal {
        IMonstropolyFactory factory = IMonstropolyFactory(
            IMonstropolyDeployer(config).get(FACTORY_ID)
        );
        factory.lockToken(tokenId);
    }

    function _unlockToken(uint256 tokenId) internal {
        IMonstropolyFactory factory = IMonstropolyFactory(
            IMonstropolyDeployer(config).get(FACTORY_ID)
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
