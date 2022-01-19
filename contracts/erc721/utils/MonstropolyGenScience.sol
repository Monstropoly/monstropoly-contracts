pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "../../shared/IMonstropolyData.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "../../shared/IMonstropolyFactory.sol";
import "../../utils/AccessControlProxyPausable.sol";
import "../../utils/UUPSUpgradeableByRole.sol";

contract MonstropolyGenScience is AccessControlProxyPausable, UUPSUpgradeableByRole {

    string public random;
    uint public randomBlock; //TBD: what if multiple in same Block?

    

    modifier newRandom() {
        require((randomBlock == block.number && bytes(random).length != 0), "GenScience: wrong random");
        _;
    }

    function initialize() public /** TBD: initializer */ {
        __AccessControlProxyPausable_init(msg.sender);
    }

    function generateAsset(uint asset_, bool vip_) public newRandom() returns(string memory gen_) {
        gen_ = _generateAssetView(asset_, random, vip_, false);
    }

    function generateAssetView(uint asset_, string memory random_, bool vip_) public view returns(string memory gen_, bool free_) {
        gen_ = _generateAssetView(asset_, random_, vip_, false);
        free_ = _isGenFree(gen_);
    }

    function _generateAssetView(uint asset_, string memory random_, bool vip_, bool preFixedRarity_) internal view returns(string memory gen_) {
        gen_ = _generateGenRaw(random_, asset_);
        if (!preFixedRarity_) gen_ = _setGenRarity(gen_, _getGenRarity(gen_, vip_));
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        gen_ = _setGenAsset(gen_, _padLeft(asset_, data_.randLength()));
    }

    function generateType(uint asset_, uint type_, bool vip_) public returns(string memory gen_) {
        (gen_,) = generateTypeView(asset_, type_, random, vip_);
        return _setGenType(gen_, type_);
    }

    //TBD: what if type_ > module (p.e type_ = 7 and moduleType = 6)
    function generateTypeView(uint asset_, uint type_, string memory random_, bool vip_) public view returns(string memory gen_, bool free_) {
        (gen_,) = generateAssetView(asset_, random_, vip_);
        gen_ = _setGenType(gen_, type_);
        free_ = _isGenFree(gen_);
    }

    function generateRarity(uint asset_, uint rarity_) public returns(string memory gen_) {
        (gen_,) = generateRarityView(asset_, rarity_, random);
        return _setGenRarity(gen_, rarity_);
    }

    function generateRarityView(uint asset_, uint rarity_, string memory random_) public view returns(string memory gen_, bool free_) {
        gen_ = _generateAssetView(asset_, random_, false, true);
        gen_ = _setGenRarity(gen_, rarity_);
        free_ = _isGenFree(gen_);
    }

    function generateFromRoot(uint[3] memory rootValues_, bool[3] memory preFixed_, bool vip_) public newRandom() returns(string memory gen_) {
        gen_ = _generateFromRootView(rootValues_, preFixed_, random, vip_);
    }

    function generateFromRootView(uint[3] memory rootValues_, bool[3] memory preFixed_, string memory random_, bool vip_) public view returns(string memory gen_, bool free_) {
        gen_ = _generateFromRootView(rootValues_, preFixed_, random_, vip_);
        free_ = _isGenFree(gen_); 
    }

    function _generateFromRootView(uint[3] memory rootValues_, bool[3] memory preFixed_, string memory random_, bool vip_) public view returns(string memory gen_) {
        (gen_,) = generateAssetView(rootValues_[0], random_, vip_);
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

    function setRandom(string calldata random_) public /* TBD: onlyRole */ {
        uint len_ = _getStringsLength();
        require(bytes(random_).length == len_, "MonstropolyGenScience: invalid random length");
        random = random_;
        randomBlock = block.number;
    }

    function _getStringsLength() internal view returns(uint) {
        (uint randLength_, uint nStats_, uint nAttributes_) = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA"))).getLengths();
        return (nStats_ + nAttributes_ + 3) * randLength_;
        // TBD: check if its cheaper storing or doing the maths
        // return IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA"))).genHalfLength()*2;
    }

    //TBD: consider doing it always to randLength to save external calls to DATA
    function _padLeft(uint number_, uint requiredLen_) internal view returns(string memory) {
        string memory string_ = uint2hexstr(number_);
        uint iter_ = requiredLen_ - bytes(string_).length;

        for(uint i = 0; i < iter_; i++) {
            string_ = _append("0", string_);
        }

        return string_;
    }

    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function uint2hexstr(uint i) public pure returns (string memory) {
        if (i == 0) return "0";
        uint j = i;
        uint length;
        while (j != 0) {
            length++;
            j = j >> 4;
        }
        uint mask = 15;
        bytes memory bstr = new bytes(length);
        uint k = length;
        while (i != 0) {
            uint curr = (i & mask);
            bstr[--k] = curr > 9 ?
                bytes1(uint8(55 + curr)) :
                bytes1(uint8(48 + curr)); // 55 = 65 - 10
            i = i >> 4;
        }
        return string(bstr);
    }

    function _append(string memory a, string memory b) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b));
    }
}