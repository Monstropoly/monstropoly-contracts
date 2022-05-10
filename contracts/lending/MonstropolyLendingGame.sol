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

    mapping(uint256 => Lend) private _lends;
    mapping(uint256 => address) private _gamers;

    modifier checkLender(uint256 tokenId, address lender) {
        require(_checkLender(tokenId, lender), "MonstropolyLendingGame: checkLender or inexistent");
        _;
    }

    modifier checkBorrower(uint256 tokenId, address borrower) {
        require(_checkBorrower(tokenId, borrower), "MonstropolyLendingGame: checkBorrower");
        _;
    }

    function initialize() public initializer {
        _init();
    }

    function setTrustedForwarder(address _forwarder) public /* TBD: onlyRole(DEPLOYER)*/ {
        _setTrustedForwarder(_forwarder);
    }

    function getLend(uint256 tokenId) public view returns(Lend memory) {
        return _lends[tokenId];
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
        require(_lends[tokenId].lender == address(0), "MonstropolyLendingGame: token already offered");

        _lockToken(tokenId);
        _lends[tokenId] = Lend(
            _msgSender(),
            borrower,
            borrowerPercentage,
            0,
            duration,
            price,
            payToken
        );

        emit LendOffer(
            tokenId,
            _msgSender(),
            borrower,
            borrowerPercentage,
            0,
            duration,
            price,
            payToken
        );
    }

    function cancelLend(uint256 tokenId) external {
        require(_msgSender() == _lends[tokenId].lender, "MonstropolyLendingGame: only lender can cancel");
        require(_lends[tokenId].startDate == 0, "MonstropolyLendingGame: lend already taken");
        _unlockToken(tokenId);
        delete _lends[tokenId];
    }

    function takeLend(uint256 tokenId) external payable checkBorrower(tokenId, _msgSender()) checkLender(tokenId, _lends[tokenId].lender) {
        if (_lends[tokenId].price > 0) {
            _transferFrom(
                _lends[tokenId].payToken,
                _lends[tokenId].borrower,
                _lends[tokenId].lender,
                _lends[tokenId].price
            );
        }
        
        _lends[tokenId].startDate = block.timestamp;
        _lends[tokenId].borrower = _msgSender();
        _gamers[tokenId] = _msgSender();

        emit LendTake(tokenId, _msgSender());
    }

    function claimGamer(uint256 tokenId) external {
        require(_checkLendEnd(tokenId), "MonstropolyLendingGame: lend not ended");
        // _gamers[_lends[tokenId].tokenId] = address(0);
        _gamers[tokenId] = _lends[tokenId].lender; //TBD: check if cheaper address0
        _unlockToken(tokenId);
        delete _lends[tokenId];
        emit LendEnd(tokenId);
    }

    function _checkLender(uint256 tokenId, address lender) internal view returns (bool) {
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(FACTORY_ID));
        return lender == factory.ownerOf(tokenId);
    }

    function _checkBorrower(uint256 tokenId, address borrower) internal view returns (bool) {
        return (_lends[tokenId].borrower == address(0) || _lends[tokenId].borrower == borrower);
    }

    function _checkLendEnd(uint256 tokenId) internal view returns (bool) {
        return (_lends[tokenId].startDate + _lends[tokenId].duration) < block.timestamp;
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