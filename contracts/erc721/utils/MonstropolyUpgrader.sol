// // SPDX-License-Identifier: Unlicensed
// pragma solidity 0.8.9;

// import "../../shared/IMonstropolyData.sol";
// import "../../shared/IMonstropolyFactory.sol";
// import "../../shared/IMonstropolyERC20.sol";
// import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@opengsn/contracts/src/BaseRelayRecipient.sol";
// import "../../utils/AccessControlProxyPausable.sol";
// import "../../utils/UUPSUpgradeableByRole.sol";
// import "../../utils/CoinCharger.sol";
// import "../../shared/IMonstropolyDeployer.sol";
// import "../../shared/IMonstropolyUpgrader.sol";

// /// @title The contract for MonstropolyUpgrader
// /// @notice Upgrades Monstropoly's NFTs rarity
// /// @dev Burns and mints a new NFT with upgraded rarity
// contract MonstropolyUpgrader is IMonstropolyUpgrader, AccessControlProxyPausable, UUPSUpgradeableByRole, BaseRelayRecipient, CoinCharger {

//     string public override versionRecipient = "2.4.0";

//     mapping(uint => uint256) public upgradePrices;

//     function initialize() public /** TBD: initializer */ { 
//         __AccessControlProxyPausable_init(msg.sender);

//         _updatePrice(50 ether, 0);
//         _updatePrice(100 ether, 1);
//         _updatePrice(500 ether, 2);
//         _updatePrice(1000 ether, 3);
//         _updatePrice(5000 ether, 4);
//     }

//     /// @inheritdoc IMonstropolyUpgrader
//     function price(uint256 tokenId) public view returns(uint256){
//         IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
//         IMonstropolyData data = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
//         IMonstropolyFactory.Token memory _token = factory.tokenOfId(tokenId);
//         uint _rarity = data.getRarityByGen(_token.genetic);
//         return upgradePrices[_rarity];        
//     }

//     /// @inheritdoc IMonstropolyUpgrader
//     function setTrustedForwarder(address _forwarder) public /*onlyRole(DEPLOYER)*/ {
//         _setTrustedForwarder(_forwarder);
//     }

//     /// @inheritdoc IMonstropolyUpgrader
//     function updatePrices(uint256[] memory prices) public onlyRole(DEFAULT_ADMIN_ROLE) {
//         _updatePrices(prices);
//     }

//     /// @inheritdoc IMonstropolyUpgrader
//     function upgrade(
//         uint256[5] memory _tokens,
//         uint _clone
//     ) public {

//         IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
//         IMonstropolyData data = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));

//         uint256[5] memory _rarities;
//         uint256[5] memory _assets;

//         for(uint256 i; i < _tokens.length; i++) {
//             IMonstropolyFactory.Token memory _token = factory.tokenOfId(_tokens[i]);
//             _rarities[i] = data.getRarityByGen(_token.genetic);   
//             _assets[i] = data.getAssetByGen(_token.genetic);
//         }

//         _preUpgrade(_assets, _rarities);
//         uint256 _tokenId = _processUpgrade(_assets[0], _rarities[0], factory.tokenOfId(_tokens[uint(_clone)]).genetic);

//         factory.burn(_tokens[0]);
//         factory.burn(_tokens[1]);
//         factory.burn(_tokens[2]);
//         factory.burn(_tokens[3]);
//         factory.burn(_tokens[4]);

//         emit TokenUpgraded(_msgSender(), _tokenId, _tokens);
//     }

//     function _processUpgrade(
//         uint256 _asset,
//         uint256 _rarity,
//         string memory _cloneGen
//     ) internal returns(uint256) {
//         uint256 _upgradePrice = upgradePrices[_rarity];
//         require(_upgradePrice > 0, "MonstropolyUpgrader: You reach max rarity");

//         IMonstropolyData data = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));

//         string memory _gen = data.incrementRarityInGen(_cloneGen, 1);

//         // if (bytes(_cloneGen).length > 0) {
//         //     _gen = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA"))).cloneAttributesFrom(_gen, _cloneGen);
//         // }

//         uint256 _tokenId = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY"))).mint(_msgSender(), _gen);
//         _transferFrom(
//             IMonstropolyDeployer(config).get(keccak256("ERC20")),
//             _msgSender(),
//             IMonstropolyDeployer(config).get(keccak256("UPGRADER_WALLET")), //TBD: ask right wallet/burn
//             _upgradePrice
//         );
//         return _tokenId;
//     }
    
//     function _preUpgrade(
//         uint256[5] memory _assetTypes,
//         uint256[5] memory _rarities
//     ) internal pure{
//         for (uint i = 1; i < _assetTypes.length; i++) {
//             require(_assetTypes[i] == _assetTypes[0], "MonstropolyUpgrader: inconsistent asset");
//             require(_rarities[i] == _rarities[0], "MonstropolyUpgrader: inconsistent rarity");    
//         }
//     }

//     function _updatePrices(uint256[] memory prices) private {
//         for (uint i = 0; i < prices.length; i++) {
//             _updatePrice(prices[i], i);
//         }
//     }

//     function _updatePrice(uint price_, uint index_) private {
//         upgradePrices[index_] = price_;
//         emit UpdatePrice(price_, index_);
//     }

//     function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
//         return BaseRelayRecipient._msgSender();
//     }

//     function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes memory _bytes) {}
// }