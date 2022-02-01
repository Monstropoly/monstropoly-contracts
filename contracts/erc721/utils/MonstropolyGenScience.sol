pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "../../shared/IMonstropolyData.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "../../shared/IMonstropolyGenScience.sol";
import "../../shared/IMonstropolyFactory.sol";
import "../../utils/AccessControlProxyPausable.sol";
import "../../utils/UUPSUpgradeableByRole.sol";
import "../../utils/CodificationConverter.sol";

/// @title The contract for MonstropolyGenScience
/// @notice Creates NFT's genetics
/// @dev Creates genetics from a random base
contract MonstropolyGenScience is IMonstropolyGenScience, AccessControlProxyPausable, UUPSUpgradeableByRole, CodificationConverter {

    string public random;
    uint public randomBlock;

    modifier newRandom() {
        require(randomBlock == block.number, "GenScience: wrong randomBlock");
        _;
    }

    function initialize() public /** TBD: initializer */ {
        __AccessControlProxyPausable_init(msg.sender);
    }

    /// @inheritdoc IMonstropolyGenScience
    function generateAssetView(uint asset_, string memory random_, bool vip_) public view returns(string memory gen_, bool free_) {
        gen_ = _generateAssetView(asset_, random_, vip_, false);
        free_ = _isGenFree(gen_);
    }

    /// @inheritdoc IMonstropolyGenScience
    function generateFromRootView(uint[3] memory rootValues_, bool[3] memory preFixed_, string memory random_, bool vip_) public view returns(string memory gen_, bool free_) {
        gen_ = _generateFromRootView(rootValues_, preFixed_, random_, vip_);
        free_ = _isGenFree(gen_); 
    }

    /// @inheritdoc IMonstropolyGenScience
    function generateAsset(uint asset_, bool vip_) public newRandom() returns(string memory gen_) {
        gen_ = _generateAssetView(asset_, random, vip_, false);
        _resetRandom();
    }

    /// @inheritdoc IMonstropolyGenScience
    function generateFromRoot(uint[3] memory rootValues_, bool[3] memory preFixed_, bool vip_) public newRandom() returns(string memory gen_) {
        gen_ = _generateFromRootView(rootValues_, preFixed_, random, vip_);
        _resetRandom();
    }

    /// @inheritdoc IMonstropolyGenScience
    function setRandom(string calldata random_) public /* TBD: onlyRole */ {
        uint len_ = _getStringsLength();
        require(bytes(random_).length == len_, "MonstropolyGenScience: invalid random length");
        random = random_;
        randomBlock = block.number;
    }

    function _generateAssetView(uint asset_, string memory random_, bool vip_, bool preFixedRarity_) internal view returns(string memory gen_) {
        gen_ = _generateGenRaw(random_, asset_);
        if (!preFixedRarity_) gen_ = _setGenRarity(gen_, _getGenRarity(gen_, vip_));
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        gen_ = _setGenAsset(gen_, _padLeft(asset_, data_.randLength()));
    }

    function _generateFromRootView(uint[3] memory rootValues_, bool[3] memory preFixed_, string memory random_, bool vip_) public view returns(string memory gen_) {
        gen_ = _generateAssetView(rootValues_[0], random_, vip_, preFixed_[2]);
        if (preFixed_[1]) gen_ = _setGenType(gen_, rootValues_[1]);
        if (preFixed_[2]) gen_ = _setGenRarity(gen_, rootValues_[2]);
    }

    function _isGenFree(string memory gen_) internal view returns(bool) {
        return IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY"))).freeGen(gen_);
    }

    function _setGenAsset(string memory rawGen_, string memory paddedAsset_) internal view returns(string memory) {
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        return data_.setAssetInGen(rawGen_, paddedAsset_);
    }

    function _setGenRarity(string memory rawGen_, uint rarity_) internal view returns(string memory) {
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        return data_.setRarityInGen(rawGen_, _padLeft(rarity_, data_.randLength()));
    }

    function _getGenRarity(string memory rawGen_, bool _vip) internal view returns(uint) {
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        uint rarity_ = _vip ? data_.getRarityByRangeVIP(rawGen_) : data_.getRarityByRange(rawGen_);
        return rarity_;
    }

    function _setGenType(string memory rawGen_, uint type_) internal view returns(string memory){
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        return data_.setTypeInGen(rawGen_, _padLeft(type_, data_.randLength()));
    }

    function _generateGenRaw(string memory random_, uint asset_) internal view returns(string memory gen_) {
        uint len_ = _getStringsLength();
        require(bytes(random_).length == len_, "MonstropolyGenScience: invalid random length");
        gen_ = _buildGen(random_, asset_);
    }

    function _buildGen(string memory genRandom_, uint asset_) internal view returns(string memory gen_) {
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        uint _randLength = data_.randLength();
        uint _version = data_.version();
        gen_ = string(abi.encodePacked(genRandom_, data_.moduleStrings(asset_), _padLeft(_version, _randLength)));
    }

    function _getStringsLength() internal view returns(uint) {
        return IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA"))).getCurrentStringsLength();
    }

    function _resetRandom() internal {
        random = string("");
        randomBlock = 0;
    }
}