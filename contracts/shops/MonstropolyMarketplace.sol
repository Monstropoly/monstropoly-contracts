// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";

import "../shared/IMonstropolyData.sol";
import "../shared/IMonstropolyFactory.sol";
import "../shared/IMonstropolyERC20.sol";
import "../shared/IMonstropolyDeployer.sol";

contract MonstropolyMarketplace is
    ContextUpgradeable,
    AccessControlProxyPausable, 
    UUPSUpgradeableByRole 
{
    
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeMathUpgradeable for uint256;

    struct Auction{
        uint256 heroId;
        uint256 price;
        uint256 auctionId;
        address auctioner;
    }

    mapping(uint256 => Auction) _auctions;
    mapping(uint256 => bool) _heroesInAuction;
    mapping(uint256 => uint256) _heroesAuctionId;      

    CountersUpgradeable.Counter private _auctionTracker;

    address _owner;   
    address _MonstropolyBurnWallet; 
    uint256 FEE; 
    
    event AuctionCreated(address seller, uint256 heroId, uint256 price);
    event AuctionFinished(address buyer, address seller, uint256 heroId, uint256 price);

    address _MonstropolyReserve;

    constructor () {
        __AccessControlProxyPausable_init(msg.sender);
        FEE = 5;
    }

    function createAuction(
        uint256 _heroId, 
        uint256 _price
    ) public {
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        require(!_heroesInAuction[_heroId], "Hero currently in auction");
        require(!factory.isLocked(_heroId), "Herro currently locked");
        require(factory.isApproved(address(this), _heroId), "Unnapproved hero");     
        require(factory.ownerOf(_heroId) == msg.sender, "You are not owner");
        require(_price > 0, "Invalid price");
        uint256 _currentAuction    = _auctionTracker.current();
        _auctions[_currentAuction] = Auction(_heroId, _price, _currentAuction , msg.sender);
        _heroesAuctionId[_heroId]  = _currentAuction;
        _heroesInAuction[_heroId]  = true;        
        _auctionTracker.increment();
        factory.lockToken(_heroId);
        emit AuctionCreated(msg.sender, _heroId, _price);
    }

    function purchase(uint256 _auctionId) public {
        Auction memory _auction = getAuction(_auctionId);
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        address heroOwner = factory.ownerOf(_auction.heroId);
        IMonstropolyERC20 erc20 = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
        require(erc20.allowance(msg.sender, address(this)) >= _auction.price, "Insufficient allowance");
        require(erc20.balanceOf(msg.sender) >= _auction.price, "Insufficient balance");
        require(factory.isApproved(address(this), _auction.heroId), "Unnapproved hero");
        require(factory.isLocked(_auction.heroId), "Herro currently not locked");
        require(_heroesInAuction[_auction.heroId], "Hero currently not in auction");    
        require(heroOwner != msg.sender, "Owner can not buy his NFT");
        _processPurchase(_auction);
        _removeAuction(_auctionId);
        emit AuctionFinished(msg.sender, heroOwner, _auction.heroId, _auction.price);
    }

    function isSelling(uint256 erc20Id) public view returns(bool){
        return _heroesInAuction[erc20Id];
    }

    function getAuction(uint256 _auctionId) public view returns(Auction memory){
        return _auctions[_auctionId];
    }

    function totalAuctions() public view returns(uint256){
        return _auctionTracker.current();
    }

    function auctionIdOfHero(uint256 _heroId) public view returns(uint256){
        return _heroesAuctionId[_heroId];
    }

    function cancelAuction(uint256 _auctionId) public  {
        Auction memory _auction = getAuction(_auctionId);
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        require(factory.ownerOf(_auction.heroId) == msg.sender, "You are not owner");   
        require(factory.isLocked(_auction.heroId), "Herro currently not locked");
        require(_heroesInAuction[_auction.heroId], "Hero currently not in auction");            
        _removeAuction(_auctionId);
    }

    function _processPurchase(Auction memory _auction) private { 
        uint256 _calculatedFee = _auction.price.mul(FEE).div(100);
        uint256 _reserveFee = _calculatedFee.mul(20).div(100);
        uint256 _burnFee    = _calculatedFee.mul(80).div(100);
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        IMonstropolyERC20 erc20 = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
        factory.unlockToken(_auction.heroId);
        require(!factory.isLocked(_auction.heroId));
        factory.transferFrom(_auction.auctioner, msg.sender, _auction.heroId);
        erc20.transferFrom(msg.sender, _MonstropolyBurnWallet, _burnFee);        
        erc20.transferFrom(msg.sender, _MonstropolyReserve, _reserveFee);
        erc20.transferFrom(msg.sender, _auction.auctioner, (_auction.price) - _calculatedFee);
    }

    function _removeAuction(uint256 _auctionId) private {
        // To prevent a gap in from's erc20s array, we store the last erc20 in the index of the erc20 to delete, and
        // then delete the last slot (swap and pop).
        Auction memory _auction = _auctions[_auctionId];
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        uint256 lastAuctionId   = totalAuctions() - 1;
        factory.unlockToken(_auction.heroId);   
        // Si el ultimoID es igual al que queremos eliminar no hace falta el swap
        if(_auctionId != lastAuctionId){
            Auction memory _gapAuction           = _auctions[lastAuctionId];
            _gapAuction.auctionId                = _auctionId;
            _auctions[_auction.auctionId]        = _gapAuction;
            _heroesAuctionId[_gapAuction.heroId] = _auction.auctionId;
            _auctions[lastAuctionId]             = _auction;
        }
        
        delete _heroesAuctionId[_auction.heroId];
        delete _heroesInAuction[_auction.heroId];
        delete _auctions[lastAuctionId];             
        _auctionTracker.decrement();
    }
}