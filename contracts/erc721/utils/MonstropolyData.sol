pragma solidity 0.8.9;

import "../../shared/IMonstropolyFactory.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "../../utils/AccessControlProxyPausable.sol";
import "../../utils/UUPSUpgradeableByRole.sol";

contract MonstropolyData is AccessControlProxyPausable, UUPSUpgradeableByRole { 

    enum Asset{
        CHARACTER, 
        WEAPON
    }

    enum Rare{
        COMMON,
        UNCOMMON,
        PREMIUM,
        RARE,
        EXOTIC,
        LEGENDARY      
    }

    struct Rarity{
        uint256 min;
        uint256 max;
        string rarity;
        Rare rare;
    }

    struct AssetType{
        string assetType;
        Asset asset;
    }

    struct Value {
        uint256 random;
        uint256 module;
    }

    struct Stats {
        Value stat0;
        Value stat1;
        Value stat2;
        Value stat3;
    }

    //TBD: docs ask for strings but better uints(?)
    struct Attributes {
        Value attribute0;
        Value attribute1;
        Value attribute2;
        Value attribute3;
        Value attribute4;
        Value attribute5;
    }
  
    struct DeconstructedGen{
        Value _asset;
        Value _type;
        Value _rarity;
        Value[] _stats;
        Value[] _attributes;
    }

    struct GenVersion {
        uint nStats;
        uint nAttributes;
        uint genHalfLength;
    }

    uint public nStats;
    uint public nAttributes;
    uint256 public randModule;
    uint256 public randLength;
    uint256 public genHalfLength;
    uint public version;

    Rarity[] rarities;
    Rarity[] raritiesVIP;
    AssetType[] assetTypes;

    mapping(bytes32 => bool) public gens;
    mapping(uint => string) public moduleStrings;
    mapping(uint => GenVersion) public versions;
    
    function initialize() public /** TBD: initializer */{
        __AccessControlProxyPausable_init(msg.sender);    

        randLength = 6; //TBD: its suppossed to be cte?
        _updateLengths(4, 13);
        
        rarities.push(Rarity(0   , 701256, "COMMON", Rare.COMMON));
        rarities.push(Rarity(701257, 935008, "UNCOMMON", Rare.UNCOMMON));
        rarities.push(Rarity(935009, 993446, "PREMIUM", Rare.PREMIUM));
        rarities.push(Rarity(993447, 999291, "RARE", Rare.RARE));
        rarities.push(Rarity(999291, 999992, "EXOTIC", Rare.EXOTIC)); //TBD: bad %
        rarities.push(Rarity(999993, 999999, "LEGENDARY", Rare.LEGENDARY)); //TBD: bad %

        raritiesVIP.push(Rarity(0   , 0, "COMMON", Rare.COMMON)); //TBD
        raritiesVIP.push(Rarity(0   , 782453, "UNCOMMON", Rare.UNCOMMON));
        raritiesVIP.push(Rarity(782454, 978067, "PREMIUM", Rare.PREMIUM));
        raritiesVIP.push(Rarity(978068, 997629, "RARE", Rare.RARE));
        raritiesVIP.push(Rarity(997630, 999976, "EXOTIC", Rare.EXOTIC)); //TBD: bad %
        raritiesVIP.push(Rarity(999977, 999999, "LEGENDARY", Rare.LEGENDARY)); //TBD: bad %

        assetTypes.push(AssetType("CHARACTER", Asset.CHARACTER));
        assetTypes.push(AssetType("WEAPON", Asset.WEAPON));

        _setModulesByAsset(0, '00000200000600000600006400006400006400006400000F00000A00000500000F00000F00000E00001500000D00000800FDE800FDE800FDE800FDE8');
        _setModulesByAsset(1, '00000200000600000600006400006400006400006400000F00000A00000000000000000000000000000000000000000800FDE800FDE800FDE800FDE8');
    }

    function getLengths() public view returns(uint, uint, uint) {
        return (randLength, nStats, nAttributes);
    }

    function updateLengths(uint256 _nStats, uint256 _nAttributes) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateLengths(_nStats, _nAttributes);
    }

    function _updateLengths(uint256 _nStats, uint256 _nAttributes) public onlyRole(DEFAULT_ADMIN_ROLE) {
        nStats = _nStats;
        nAttributes = _nAttributes;
        // TBD: check if its cheaper storing or doing the maths
        genHalfLength = (nStats + nAttributes + 3) * randLength;
        version++;
        versions[version] = GenVersion(nStats, nAttributes, genHalfLength);
    }

    function setModules(uint[] calldata assets_, string[] memory modules_) public /* TBD: onlyRole */ {
        require(assets_.length == modules_.length, "MonstropolyData: lengths doesnt match");
        
        for(uint i = 0; i < assets_.length; i++) {
            _setModulesByAsset(assets_[i], modules_[i]);
        }
    } 

    function setModulesByAsset(uint asset_, string memory modules_) public /* TBD: onlyRole */ {
        _setModulesByAsset(asset_, modules_);
    } 

    function _setModulesByAsset(uint asset_, string memory modules_) internal {
        require(bytes(modules_).length == _getStringsLength(), "MonstropolyData: invalid length");
        moduleStrings[asset_] = modules_;
    }

    function getRarity(Value memory gen) public view returns(Rarity memory){        
        return rarities[getValue(gen)];
    }

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

    function getRarityByRange(string calldata gen) public view returns(uint) {
        bytes memory _bytes = bytes(gen);
        return getRarityByRange(hex2Dec(slice(_bytes, randLength*2, randLength)));
    }

    function getRarityByRangeVIP(string calldata gen) public view returns(uint) {
        bytes memory _bytes = bytes(gen);
        return getRarityByRangeVIP(hex2Dec(slice(_bytes, randLength*2, randLength)));
    }

    //TBD: unused
    function getRarityByGen(string calldata gen) public view returns(uint256) {
        string memory _string;
        string memory _stringM;
        bytes memory _bytes = bytes(gen);

        _string   = slice(_bytes, randLength*2, randLength);
        _stringM   = slice(_bytes, randLength*15, randLength);
        return getValue(Value(hex2Dec(_string), hex2Dec(_stringM)));
    }

    function setAssetInGen(string calldata gen, string calldata asset_) public view returns(string memory) {
        return _replaceInString(gen, asset_, 0);
    }

    function setRarityInGen(string calldata gen, string calldata rarity_) public view returns(string memory) {
        return _replaceInString(gen, rarity_, randLength*2);
    }

    function setTypeInGen(string calldata gen, string calldata type_) public view returns(string memory) {
        return _replaceInString(gen, type_, randLength);
    }

    function setStatInGen(string calldata gen, string memory stat_, uint statIndex_) public view returns(string memory) {
        return _replaceInString(gen, stat_, randLength*(3+statIndex_));
    }

    function cloneAttributesFrom(string calldata gen_, string calldata from_) public view returns(string memory) {
        bytes memory bytes_ = bytes(gen_);
        bytes memory cloneBytes_ = bytes(from_);
        GenVersion memory version_ = versions[hex2Dec(slice(bytes_, (bytes_.length - randLength), randLength))];
        GenVersion memory cloneVersion_ = versions[hex2Dec(slice(cloneBytes_, (cloneBytes_.length - randLength), randLength))];
        string memory keep_ = slice(bytes_, 0, randLength * (3 + version_.nStats));
        string memory clone_ = slice(cloneBytes_, randLength * (3 + cloneVersion_.nStats), randLength * cloneVersion_.nAttributes);
        string memory keepM_ = slice(bytes_, version_.genHalfLength, randLength * (3 + version_.nStats));
        string memory cloneM_ = slice(cloneBytes_, (randLength * (3 + cloneVersion_.nStats) + cloneVersion_.genHalfLength), randLength * cloneVersion_.nAttributes);
        string memory finalVersion_ = slice(cloneBytes_, (cloneBytes_.length - randLength), randLength);
        return string(abi.encodePacked(keep_, clone_, keepM_, cloneM_, finalVersion_));
    }

    function incrementStatInGen(string calldata gen, uint increment, uint statIndex_) public view returns(string memory) {
        bytes memory bytes_ = bytes(gen);
        uint stat_ = hex2Dec(slice(bytes_, (randLength*(3+statIndex_)), randLength));
        require((stat_ + increment) < 16777215, "MonstropolyData: random is max"); //TBD: change to 1048576 if randLength is 5
        uint statModule_ = hex2Dec(slice(bytes_, (randLength * (3 + statIndex_) + genHalfLength), randLength));
        require((stat_ % statModule_) < ((stat_ + increment) % statModule_), "MonstropolyData: stat overflow");
        return setStatInGen(gen, _padLeft(stat_ + increment, randLength), statIndex_);
    }

    function _replaceInString(string calldata original_, string memory insert_, uint index_) internal view returns(string memory) {
        bytes memory _bytes = bytes(original_);
        bytes memory _insertBytes = bytes(insert_);
        uint _insertLen = _insertBytes.length;
        //TBD: require(_insertLen == randLength); ??
        string memory _start = slice(_bytes, 0, index_);
        string memory _end = slice(_bytes, (index_+_insertLen), (_bytes.length - (index_+_insertLen)));
        return string(abi.encodePacked(_start, insert_, _end));
    }
    
    function getAssetType(Value memory gen) public view returns(AssetType memory){
        return assetTypes[getValue(gen)];
    }

    function getAssetTypeByGen(string calldata gen) public view returns(uint256) {
        string memory _string;
        string memory _stringM;
        bytes memory _bytes = bytes(gen);

        _string   = slice(_bytes, 0, randLength);
        _stringM   = slice(_bytes, randLength*3, randLength);
        return getValue(Value(hex2Dec(_string), hex2Dec(_stringM)));
    }
    
    function deconstructGen(string calldata gen) public view returns(DeconstructedGen memory){
        uint256 len = bytes(gen).length;
        require(len >= _getStringsLength(), "Gen length is not correctly"); //TBD: not 12
        string memory _string;
        string memory _stringM;
        bytes memory _bytes = bytes(gen);
        DeconstructedGen memory decGen;
        decGen._stats = new Value[](nStats);
        decGen._attributes = new Value[](nAttributes);

        // Weapon or Character RAND
        {
            _string   = slice(_bytes, 0, randLength);
            _stringM   = slice(_bytes, genHalfLength, randLength);
            decGen._asset = Value(hex2Dec(_string), hex2Dec(_stringM));
        }

        {
            _string   = slice(_bytes, randLength, randLength);
            _stringM   = slice(_bytes, (genHalfLength + randLength), randLength);
            decGen._type = Value(hex2Dec(_string), hex2Dec(_stringM));
        }

        {
            _string   = slice(_bytes, randLength*2, randLength);
            _stringM   = slice(_bytes, (genHalfLength + randLength*2), randLength);
            decGen._rarity = Value(hex2Dec(_string), hex2Dec(_stringM));
        }
        
        // Stats  RAND
        {
            for(uint i = 0; i < nStats; i++) {
                _string = slice(_bytes, (randLength * (3 + i)), randLength);
                _stringM = slice(_bytes, (genHalfLength + randLength*(3 + i)), randLength);
                decGen._stats[i] = Value(hex2Dec(_string), hex2Dec(_stringM));
            }
        }

        // Attributes  RAND
        {
            for(uint i = 0; i < nAttributes; i++) {
                _string = slice(_bytes, (randLength*(3 + nStats + i)), randLength);
                _stringM = slice(_bytes, (genHalfLength + randLength*(3 + nStats + i)), randLength);
                decGen._attributes[i] = Value(hex2Dec(_string), hex2Dec(_stringM));
            }
        }

        return decGen;
    }

    function _getStringsLength() internal view returns(uint) {
        return (nStats + nAttributes + 3) * randLength;
    }
 
    function parseInt(string memory _a)
        public
        pure
        returns (uint) {
        bytes memory bresult = bytes(_a);
        uint mint = 0;
        bool decimals = false;
        for (uint i=0; i<bresult.length; i++){
            if ((uint8(bresult[i]) >= 48)&&(uint8(bresult[i]) <= 57)){                
                mint *= 10;
                mint += uint(uint8(bresult[i])) - 48;
            } else if (uint8(bresult[i]) == 46) decimals = true;
        }
        return mint;
    }

    function hex2Dec(string memory _hex) public pure returns(uint) {
        bytes memory _bytes = bytes(_hex);
        uint duint = 0;
        for(uint i=0; i<_bytes.length; i++) {
            if ((uint8(_bytes[i]) >= 48)&&(uint8(_bytes[i]) <= 57)){                
                duint += 16**(_bytes.length - 1 - i) * (uint(uint8(_bytes[i])) - 48);
            } else if ((uint8(_bytes[i]) >= 65)&&(uint8(_bytes[i]) <= 70)) {
                duint += 16**(_bytes.length - 1 - i) * (uint(uint8(_bytes[i])) - 55);
            } else if ((uint8(_bytes[i]) >= 97)&&(uint8(_bytes[i]) <= 102)) {
                duint += 16**(_bytes.length - 1 - i) * (uint(uint8(_bytes[i])) - 87);
            }
        }
        return duint;
    }
    
    function slice(
        bytes memory _bytes,
        uint256 _start,
        uint256 _length
        ) public pure returns (string memory){
        bytes memory tempBytes;
        assembly {
            switch iszero(_length)
            case 0 {
                // Get a location of some free memory and store it in tempBytes as
                // Solidity does for memory variables.
                tempBytes := mload(0x40)

                // The first word of the slice result is potentially a partial
                // word read from the original array. To read it, we calculate
                // the length of that partial word and start copying that many
                // bytes into the array. The first word we copy will start with
                // data we don't care about, but the last `lengthmod` bytes will
                // land at the beginning of the contents of the new array. When
                // we're done copying, we overwrite the full first word with
                // the actual length of the slice.
                let lengthmod := and(_length, 31)

                // The multiplication in the next line is necessary
                // because when slicing multiples of 32 bytes (lengthmod == 0)
                // the following copy loop was copying the origin's length
                // and then ending prematurely not copying everything it should.
                let mc := add(add(tempBytes, lengthmod), mul(0x20, iszero(lengthmod)))
                let end := add(mc, _length)

                for {
                    // The multiplication in the next line has the same exact purpose
                    // as the one above.
                    let cc := add(add(add(_bytes, lengthmod), mul(0x20, iszero(lengthmod))), _start)
                } lt(mc, end) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } {
                    mstore(mc, mload(cc))
                }

                mstore(tempBytes, _length)

                //update free-memory pointer
                //allocating the array padded to 32 bytes like the compiler does now
                mstore(0x40, and(add(mc, 31), not(31)))
            }
            //if we want a zero-length slice let's just return a zero-length array
            default {
                tempBytes := mload(0x40)
                //zero out the 32 bytes slice we are about to return
                //we need to do it because Solidity does not garbage collect
                mstore(tempBytes, 0)

                mstore(0x40, add(tempBytes, 0x20))
            }
        }

        return string(tempBytes);
    }

    function _padLeft(uint number_, uint requiredLen_) internal view returns(string memory) {
        string memory string_ = uint2hexstr(number_);
        
        if (requiredLen_ > bytes(string_).length) {
            uint iter_ = requiredLen_ - bytes(string_).length;

            for(uint i = 0; i < iter_; i++) {
                string_ = _append("0", string_);
            }
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

    function getValue(Value memory value) public pure returns(uint) {
        return value.module == 0 ? 0 : value.random % value.module;
    }

    function genExists(DeconstructedGen memory gen) public view returns (bool) {
        IMonstropolyFactory _factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        return _factory.gens(hashGen(gen));
    }

    function genExists(string calldata gen) public view returns(bool) {
        IMonstropolyFactory _factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        return _factory.gens(hashGen(gen));
    }

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

    function hashGen(string calldata gen) public view returns(bytes32) {
        return hashGen(deconstructGen(gen));
    }
}