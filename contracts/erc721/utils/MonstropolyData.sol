pragma solidity 0.8.9;

import "../../shared/IMonstropolyFactory.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "../../shared/IMonstropolyData.sol";
import "../../utils/AccessControlProxyPausable.sol";
import "../../utils/UUPSUpgradeableByRole.sol";
import "../../utils/CodificationConverter.sol";

/// @title The contract MonstropolyData
/// @notice Handles genetic data
/// @dev Other contracts use its methods to handle genetic strings
contract MonstropolyData is IMonstropolyData, AccessControlProxyPausable, UUPSUpgradeableByRole, CodificationConverter { 

    uint256 public randLength;
    uint public version;

    Rarity[] public rarities;
    Rarity[] public raritiesVIP;

    mapping(uint => string) public moduleStrings;
    mapping(uint => GenVersion) public versions;
    
    function initialize() public /** TBD: initializer */{
        __AccessControlProxyPausable_init(msg.sender);    

        randLength = 5; //TBD: its suppossed to be cte?
        _updateLengths(4, 13);
        
        rarities.push(Rarity(0   , 701256));
        rarities.push(Rarity(701257, 935008));
        rarities.push(Rarity(935009, 993446));
        rarities.push(Rarity(993447, 999291));
        rarities.push(Rarity(999291, 999992));
        rarities.push(Rarity(999993, 999999));

        raritiesVIP.push(Rarity(0   , 0));
        raritiesVIP.push(Rarity(0   , 782453));
        raritiesVIP.push(Rarity(782454, 978067));
        raritiesVIP.push(Rarity(978068, 997629));
        raritiesVIP.push(Rarity(997630, 999976));
        raritiesVIP.push(Rarity(999977, 999999));

        _setModulesByAsset(0, '000020000600006000640006400064000640000F0000A000050000F0000F0000E000150000D000080FDE80FDE80FDE80FDE8');
        _setModulesByAsset(1, '000020000600006000640006400064000640000F0000A000000000000000000000000000000000080FDE80FDE80FDE80FDE8');
    }

    /// @inheritdoc IMonstropolyData
    function getLengths() public view returns(uint, uint, uint) {
        return (randLength, versions[version].nStats, versions[version].nAttributes);
    }

    /// @inheritdoc IMonstropolyData
    function decodeLengths(string calldata gen_) public view returns(GenVersion memory lengths_) {
        bytes memory _bytes = bytes(gen_);
        string memory version_ = _slice(_bytes, (_bytes.length - randLength), randLength);
        lengths_ = versions[_hex2Dec(version_)];
    }

    /// @inheritdoc IMonstropolyData
    function getCurrentStringsLength() public view returns(uint) {
        return (versions[version].nStats + versions[version].nAttributes + 3) * randLength;
    }

    /// @inheritdoc IMonstropolyData
    function getAssetByGen(string calldata gen) public view returns(uint256) {
        string memory _string;
        string memory _stringM;
        bytes memory _bytes = bytes(gen);

        _string   = _slice(_bytes, 0, randLength);
        _stringM   = _slice(_bytes, randLength*3, randLength);
        return getValue(Value(_hex2Dec(_string), _hex2Dec(_stringM)));
    }

    /// @inheritdoc IMonstropolyData
    function getRarityByRange(uint256 gen) public view returns(uint256){
        require(gen < 1000000, "MonstropolyData: rarity too high");  
        uint256 pos;    
        for(uint256 i = 0; i <= rarities.length - 1; i++){            
            Rarity memory _rarity = rarities[i];
            if(gen >= _rarity.min && gen <= _rarity.max){
                pos = i;
            }
        }
        return pos;
    }

    /// @inheritdoc IMonstropolyData
    function getRarityByRangeVIP(uint256 gen) public view returns(uint256){
        require(gen < 1000000, "MonstropolyData: rarity too high");  
        uint256 pos;      
        for(uint256 i = 0; i <= raritiesVIP.length - 1; i++){            
            Rarity memory _rarity = raritiesVIP[i];
            if(gen >= _rarity.min && gen <= _rarity.max){
                pos = i;
            }
        }
        return pos;
    }

    /// @inheritdoc IMonstropolyData
    function getRarityByRange(string calldata gen) public view returns(uint) {
        bytes memory _bytes = bytes(gen);
        return getRarityByRange(_hex2Dec(_slice(_bytes, randLength*2, randLength)));
    }

    /// @inheritdoc IMonstropolyData
    function getRarityByRangeVIP(string calldata gen) public view returns(uint) {
        bytes memory _bytes = bytes(gen);
        return getRarityByRangeVIP(_hex2Dec(_slice(_bytes, randLength*2, randLength)));
    }

    /// @inheritdoc IMonstropolyData
    function getRarityByGen(string calldata gen) public view returns(uint256) {
        string memory _string;
        string memory _stringM;
        bytes memory _bytes = bytes(gen);

        _string   = _slice(_bytes, randLength*2, randLength);
        _stringM   = _slice(_bytes, randLength*15, randLength);
        return getValue(Value(_hex2Dec(_string), _hex2Dec(_stringM)));
    }

    /// @inheritdoc IMonstropolyData
    function getValue(Value memory value) public pure returns(uint) {
        return value.module == 0 ? 0 : value.random % value.module;
    }

    /// @inheritdoc IMonstropolyData
    function hashGen(DeconstructedGen memory gen) public view returns(bytes32) {
        bytes memory _bytes = abi.encodePacked(
            getValue(gen._asset),
            getValue(gen._type),
            getValue(gen._rarity)
        );

        for (uint i = 0; i < gen._stats.length; i++) {
            _bytes = abi.encodePacked(_bytes, getValue(gen._stats[i]));
        }

        for (uint j = 0; j < gen._attributes.length; j++) {
            _bytes = abi.encodePacked(_bytes, getValue(gen._attributes[j]));
        }

        return keccak256(_bytes);
    }

    /// @inheritdoc IMonstropolyData
    function hashGen(string calldata gen) public view returns(bytes32) {
        return hashGen(deconstructGen(gen));
    }

    /// @inheritdoc IMonstropolyData
    function setAssetInGen(string calldata gen, string calldata asset_) public view returns(string memory) {
        return _replaceInString(gen, asset_, 0);
    }

    /// @inheritdoc IMonstropolyData
    function setRarityInGen(string calldata gen, string calldata rarity_) public view returns(string memory) {
        return _replaceInString(gen, rarity_, randLength*2);
    }

    /// @inheritdoc IMonstropolyData
    function setTypeInGen(string calldata gen, string calldata type_) public view returns(string memory) {
        return _replaceInString(gen, type_, randLength);
    }

    /// @inheritdoc IMonstropolyData
    function setStatInGen(string calldata gen, string memory stat_, uint statIndex_) public view returns(string memory) {
        return _replaceInString(gen, stat_, randLength*(3+statIndex_));
    }

    /// @inheritdoc IMonstropolyData
    function cloneAttributesFrom(string calldata gen_, string calldata from_) public view returns(string memory) {
        bytes memory bytes_ = bytes(gen_);
        bytes memory cloneBytes_ = bytes(from_);
        GenVersion memory version_ = versions[_hex2Dec(_slice(bytes_, (bytes_.length - randLength), randLength))];
        GenVersion memory cloneVersion_ = versions[_hex2Dec(_slice(cloneBytes_, (cloneBytes_.length - randLength), randLength))];
        string memory keep_ = _slice(bytes_, 0, randLength * (3 + version_.nStats));
        string memory clone_ = _slice(cloneBytes_, randLength * (3 + cloneVersion_.nStats), randLength * cloneVersion_.nAttributes);
        string memory keepM_ = _slice(bytes_, version_.genHalfLength, randLength * (3 + version_.nStats));
        string memory cloneM_ = _slice(cloneBytes_, (randLength * (3 + cloneVersion_.nStats) + cloneVersion_.genHalfLength), randLength * cloneVersion_.nAttributes);
        string memory finalVersion_ = _slice(cloneBytes_, (cloneBytes_.length - randLength), randLength);
        return string(abi.encodePacked(keep_, clone_, keepM_, cloneM_, finalVersion_));
    }

    /// @inheritdoc IMonstropolyData
    function incrementStatInGen(string calldata gen, uint increment, uint statIndex_) public view returns(string memory) {
        bytes memory bytes_ = bytes(gen);
        GenVersion memory version_ = decodeLengths(gen);
        uint stat_ = _hex2Dec(_slice(bytes_, (randLength*(3+statIndex_)), randLength));
        require((stat_ + increment) < 1048576, "MonstropolyData: random is max"); 
        uint statModule_ = _hex2Dec(_slice(bytes_, (randLength * (3 + statIndex_) + version_.genHalfLength), randLength));
        require((stat_ % statModule_) < ((stat_ + increment) % statModule_), "MonstropolyData: stat overflow");
        return setStatInGen(gen, _padLeft(stat_ + increment, randLength), statIndex_);
    }
    
    /// @inheritdoc IMonstropolyData
    function deconstructGen(string calldata gen) public view returns(DeconstructedGen memory){
        uint256 len = bytes(gen).length;
        require(len >= _getStringsLength(gen), "MonstropolyData: wrong gen length");
        string memory _string;
        string memory _stringM;
        bytes memory _bytes = bytes(gen);
        DeconstructedGen memory decGen;
        GenVersion memory version_ = decodeLengths(gen);
        decGen._stats = new Value[](version_.nStats);
        decGen._attributes = new Value[](version_.nAttributes);

        // Root
        {
            _string   = _slice(_bytes, 0, randLength);
            _stringM   = _slice(_bytes, version_.genHalfLength, randLength);
            decGen._asset = Value(_hex2Dec(_string), _hex2Dec(_stringM));
        }

        {
            _string   = _slice(_bytes, randLength, randLength);
            _stringM   = _slice(_bytes, (version_.genHalfLength + randLength), randLength);
            decGen._type = Value(_hex2Dec(_string), _hex2Dec(_stringM));
        }

        {
            _string   = _slice(_bytes, randLength*2, randLength);
            _stringM   = _slice(_bytes, (version_.genHalfLength + randLength*2), randLength);
            decGen._rarity = Value(_hex2Dec(_string), _hex2Dec(_stringM));
        }
        
        // Stats
        {
            for(uint i = 0; i < version_.nStats; i++) {
                _string = _slice(_bytes, (randLength * (3 + i)), randLength);
                _stringM = _slice(_bytes, (version_.genHalfLength + randLength*(3 + i)), randLength);
                decGen._stats[i] = Value(_hex2Dec(_string), _hex2Dec(_stringM));
            }
        }

        // Attributes
        {
            for(uint i = 0; i < version_.nAttributes; i++) {
                _string = _slice(_bytes, (randLength*(3 + version_.nStats + i)), randLength);
                _stringM = _slice(_bytes, (version_.genHalfLength + randLength*(3 + version_.nStats + i)), randLength);
                decGen._attributes[i] = Value(_hex2Dec(_string), _hex2Dec(_stringM));
            }
        }

        return decGen;
    }

    /// @inheritdoc IMonstropolyData
    function updateLengths(uint256 _nStats, uint256 _nAttributes) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateLengths(_nStats, _nAttributes);
    }

    /// @inheritdoc IMonstropolyData
    function setModules(uint[] calldata assets_, string[] memory modules_) public /* TBD: onlyRole */ {
        require(assets_.length == modules_.length, "MonstropolyData: lengths doesnt match");
        
        for(uint i = 0; i < assets_.length; i++) {
            _setModulesByAsset(assets_[i], modules_[i]);
        }
    } 

    /// @inheritdoc IMonstropolyData
    function setModulesByAsset(uint asset_, string memory modules_) public /* TBD: onlyRole */ {
        _setModulesByAsset(asset_, modules_);
    } 

    function _getStringsLength(string calldata gen_) internal view returns(uint) {
        GenVersion memory version_ = decodeLengths(gen_);
        return (version_.nStats + version_.nAttributes + 3) * randLength;
    }

    function _updateLengths(uint256 _nStats, uint256 _nAttributes) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint _genHalfLength = (_nStats + _nAttributes + 3) * randLength;
        version++;
        versions[version] = GenVersion(_nStats, _nAttributes, _genHalfLength);
    }

    function _setModulesByAsset(uint asset_, string memory modules_) internal {
        require(bytes(modules_).length == getCurrentStringsLength(), "MonstropolyData: invalid length");
        moduleStrings[asset_] = modules_;
    }

    function _replaceInString(string calldata original_, string memory insert_, uint index_) internal view returns(string memory) {
        bytes memory _bytes = bytes(original_);
        bytes memory _insertBytes = bytes(insert_);
        uint _insertLen = _insertBytes.length;
        //TBD: require(_insertLen == randLength); ??
        string memory _start = _slice(_bytes, 0, index_);
        string memory _end = _slice(_bytes, (index_+_insertLen), (_bytes.length - (index_+_insertLen)));
        return string(abi.encodePacked(_start, insert_, _end));
    }
}