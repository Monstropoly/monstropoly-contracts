// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyDeployer.sol";
import "../shared/IMonstropolyFactory.sol";
import "../shared/IMonstropolyLendingGame.sol";
import "../utils/CoinCharger.sol";

contract MonstropolyLendingGame is IMonstropolyLendingGame, UUPSUpgradeableByRole, BaseRelayRecipient, CoinCharger {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    string public override versionRecipient = "2.4.0";
    bytes32 public constant FACTORY_ID = keccak256("FACTORY");

    CountersUpgradeable.Counter private _lendIdCounter;

    mapping(uint256 => Lend) private _lends;
    mapping(uint256 => address) private _gamers;

    modifier checkLender(uint256 tokenId, address lender) {
        require(_checkLender(tokenId, lender), "MonstropolyLendingGame: checkLender or inexistent");
        _;
    }

    modifier checkBorrower(uint256 lendId, address borrower) {
        require(_checkBorrower(lendId, borrower), "MonstropolyLendingGame: checkBorrower");
        _;
    }

    function initialize() public initializer {
        _init();
    }

    function setTrustedForwarder(address _forwarder) public /* TBD: onlyRole(DEPLOYER)*/ {
        _setTrustedForwarder(_forwarder);
    }

    function getLend(uint256 lendId) public view returns(Lend memory) {
        return _lends[lendId];
    }

    function getGamer(uint256 tokenId) public view returns(address) {
        address gamer = _gamers[tokenId];
        if (gamer == address(0)) {
            IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(FACTORY_ID));
            gamer = factory.ownerOf(tokenId);
        }

        return gamer;
    }

    function offerLend(
        uint256 tokenId,
        address borrower,
        uint256 borrowerPercentage,
        uint256 duration,
        uint256 price,
        address payToken
    ) 
        external 
        checkLender(tokenId, _msgSender()) 
    {
        _lockToken(tokenId);
        uint256 lendId = _lendIdCounter.current();
        _lendIdCounter.increment();
        _lends[lendId] = Lend(
            tokenId,
            _msgSender(),
            borrower,
            borrowerPercentage,
            block.timestamp,
            duration,
            price,
            payToken,
            false
        );

        emit LendOffer(
            tokenId,
            lendId,
            _msgSender(),
            borrower,
            borrowerPercentage,
            block.timestamp,
            duration,
            price,
            payToken
        );
    }

    function cancelLend(uint256 lendId) external {
        require(_msgSender() == _lends[lendId].lender, "MonstropolyLendingGame: only lender can cancel");
        _unlockToken(_lends[lendId].tokenId);
        delete _lends[lendId];
    }

    function takeLend(uint256 lendId) external payable checkBorrower(lendId, _msgSender()) checkLender(_lends[lendId].tokenId, _lends[lendId].lender) {
        if (_lends[lendId].price > 0) {
            _transferFrom(
                _lends[lendId].payToken,
                _lends[lendId].borrower,
                _lends[lendId].lender,
                _lends[lendId].price
            );
        }
        
        _lends[lendId].executed = true;
        _lends[lendId].borrower = _msgSender();
        _gamers[_lends[lendId].tokenId] = _msgSender();

        emit LendTake(lendId, _msgSender());
    }

    function claimGamer(uint256 lendId) external {
        require(_checkLendEnd(lendId), "MonstropolyLendingGame: lend not ended");
        // _gamers[_lends[lendId].tokenId] = address(0);
        _gamers[_lends[lendId].tokenId] = _lends[lendId].lender; //TBD: check if cheaper address0
        _unlockToken(_lends[lendId].tokenId);
        delete _lends[lendId];
        emit LendEnd(lendId);
    }

    function _checkLender(uint256 tokenId, address lender) internal view returns (bool) {
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(FACTORY_ID));
        return lender == factory.ownerOf(tokenId);
    }

    function _checkBorrower(uint256 lendId, address borrower) internal view returns (bool) {
        return (_lends[lendId].borrower == address(0) || _lends[lendId].borrower == borrower);
    }

    function _checkLendEnd(uint256 lendId) internal view returns (bool) {
        return (_lends[lendId].startDate + _lends[lendId].duration) < block.timestamp;
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