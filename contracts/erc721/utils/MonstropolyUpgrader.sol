// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../../shared/IMonstropolyData.sol";
import "../../shared/IMonstropolyFactory.sol";
import "../../shared/IMonstropolyGenScience.sol";
import "../../shared/IMonstropolyERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "../../utils/AccessControlProxyPausable.sol";
import "../../utils/UUPSUpgradeableByRole.sol";
import "../../shared/IMonstropolyDeployer.sol";

contract MonstropolyUpgrader is AccessControlProxyPausable, UUPSUpgradeableByRole, BaseRelayRecipient {

    string public override versionRecipient = "2.4.0";

    mapping(IMonstropolyData.Rare => uint256) _upgradePrices;

    event HeroUpgraded(address indexed who, uint256 heroId, uint256[5] oldHeroes);
    event UpdatePrices(uint256[5] prices);

    function initialize() public /** TBD: initializer */ { 
        __AccessControlProxyPausable_init(msg.sender);

        uint256[5] memory _prices = [
            uint256(50 ether),
            uint256(100 ether),
            uint256(500 ether),
            uint256(1000 ether),
            uint256(5000 ether)
        ];

        _updatePrices(_prices);
    }

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

    function setTrustedForwarder(address _forwarder) public /*onlyRole(DEPLOYER)*/ {
        _setTrustedForwarder(_forwarder);
    }

    function price(uint256 heroId) public view returns(uint256){
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        IMonstropolyData data = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        IMonstropolyFactory.Hero memory _hero = factory.heroeOfId(heroId);
        uint _rare = data.getRarityByGen(_hero.genetic);
        IMonstropolyData.Rare _upgradedRarity = _uintToRarity(_rare + 1);
        return _upgradePrices[_upgradedRarity];        
    }

    function updatePrices(uint256[5] memory prices) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updatePrices(prices);
    }

    function _updatePrices(uint256[5] memory prices) private {
        _upgradePrices[IMonstropolyData.Rare.UNCOMMON]  = prices[0];
        _upgradePrices[IMonstropolyData.Rare.PREMIUM]   = prices[1];
        _upgradePrices[IMonstropolyData.Rare.RARE]      = prices[2];
        _upgradePrices[IMonstropolyData.Rare.EXOTIC]    = prices[3];
        _upgradePrices[IMonstropolyData.Rare.LEGENDARY] = prices[4];

        emit UpdatePrices(prices);
    }

    function upgrade(
        uint256[5] memory _tokens,
        int _clone // -1 to do it randomly
    ) public {

        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        IMonstropolyData data = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));

        uint256[5] memory _rarities;
        uint256[5] memory _assets;

        for(uint256 i; i < _tokens.length; i++) {
            IMonstropolyFactory.Hero memory _hero = factory.heroeOfId(_tokens[i]);
            _rarities[i] = data.getRarityByGen(_hero.genetic);   
            _assets[i] = data.getAssetTypeByGen(_hero.genetic);
        }

        _preUpgrade(_assets, _rarities);
        uint256 _heroId = _clone == -1 ? _processUpgrade(_assets[0], _rarities[0], "") : _processUpgrade(_assets[0], _rarities[0], factory.heroeOfId(_tokens[uint(_clone)]).genetic);

        //TBD: consider a burnFrom
        factory.transferFrom(_msgSender(), address(0x000000000000000000000000000000000000dEaD), _tokens[0]);
        factory.transferFrom(_msgSender(), address(0x000000000000000000000000000000000000dEaD), _tokens[1]);
        factory.transferFrom(_msgSender(), address(0x000000000000000000000000000000000000dEaD), _tokens[2]);
        factory.transferFrom(_msgSender(), address(0x000000000000000000000000000000000000dEaD), _tokens[3]);
        factory.transferFrom(_msgSender(), address(0x000000000000000000000000000000000000dEaD), _tokens[4]);

        emit HeroUpgraded(_msgSender(), _heroId, _tokens);
    }

    function _processUpgrade(
        uint256 _asset,
        uint256 _rare,
        string memory _cloneGen
    ) internal returns(uint256) {
        uint _maxRare      = uint(IMonstropolyData.Rare.LEGENDARY);        
        IMonstropolyData.Rare _upgradedRarity = _uintToRarity(_rare + 1);
        uint256 _upgradePrice = _upgradePrices[_upgradedRarity];

        IMonstropolyERC20 erc20 = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
        IMonstropolyGenScience genScience = IMonstropolyGenScience(IMonstropolyDeployer(config).get(keccak256("SCIENCE")));

        require(_rare < _maxRare, "MonstropolyUpgrader: You reach max rarity");
        require(erc20.balanceOf(_msgSender()) >= _upgradePrice, "MonstropolyUpgrader: Insufficient MPOLY");
        require(erc20.allowance(_msgSender(), address(this)) >= _upgradePrice, "MonstropolyUpgrader: Insufficient allowance");
        
        string memory _gen = genScience.generateFromRoot(
            [_asset, 0, _rare + 1],
            [true, false, true],
            false
        );

        if (bytes(_cloneGen).length > 0) {
            _gen = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA"))).cloneAttributesFrom(_gen, _cloneGen);
        }

        uint256 _heroId = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY"))).mint(_msgSender(), _gen);
        erc20.transferFrom(_msgSender(), IMonstropolyDeployer(config).get(keccak256("UPGRADER_WALLET")), _upgradePrice);
        return _heroId;
    }
    
    function _preUpgrade(
        uint256[5] memory _assetTypes,
        uint256[5] memory _rarities
    ) internal pure{
        for (uint i = 1; i < _assetTypes.length; i++) {
            require(_assetTypes[i] == _assetTypes[0], "MonstropolyUpgrader: inconsistent asset");
            require(_rarities[i] == _rarities[0], "MonstropolyUpgrader: inconsistent rarity");    
        }
    }

    function _uintToRarity(uint _rarity) public pure returns(IMonstropolyData.Rare){
        if(_rarity == 0){
            return IMonstropolyData.Rare.COMMON;
        }
        if(_rarity == 1){
            return IMonstropolyData.Rare.UNCOMMON;
        }
        if(_rarity == 2){
            return IMonstropolyData.Rare.PREMIUM;
        }
        if(_rarity == 3){
            return IMonstropolyData.Rare.RARE;
        }
        if(_rarity == 4){
            return IMonstropolyData.Rare.EXOTIC;
        }
        if(_rarity == 5){
            return IMonstropolyData.Rare.LEGENDARY;
        }
        return IMonstropolyData.Rare.COMMON;
    }
}