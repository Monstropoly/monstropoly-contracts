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
    uint public nStats;
    uint public nAttributes;
    uint public genLength;

    Rarity[] public rarities;
    Rarity[] public raritiesVIP;

    mapping(uint => string) public moduleStrings;
    mapping(uint => GenVersion) public versions;
    
    function initialize() public /** TBD: initializer */{
        __AccessControlProxyPausable_init(msg.sender);    

        randLength = 2; //TBD: its suppossed to be cte?
        _updateLengths(4, 5);
    }

    /// @inheritdoc IMonstropolyData
    function getLengths() public view returns(uint, uint, uint) {
        return (randLength, nStats, nAttributes);
    }

    function getGenLength() public view returns(uint) {
        return _getGenLength();
    }

    /// @inheritdoc IMonstropolyData
    function getAssetByGen(string calldata gen) public view returns(uint256) {
        string memory _string;
        bytes memory _bytes = bytes(gen);
        _string   = _slice(_bytes, 0, randLength);
        return _hex2Dec(_string);
    }
    
    /// @inheritdoc IMonstropolyData
    function getRarityByGen(string calldata gen) public view returns(uint256) {
        string memory _string;
        bytes memory _bytes = bytes(gen);
        _string   = _slice(_bytes, randLength*2, randLength);
        return _hex2Dec(_string);
    }

    /// @inheritdoc IMonstropolyData
    function hashGen(DeconstructedGen memory gen) public view returns(bytes32) {
        bytes memory _bytes = abi.encodePacked(
            gen._asset,
            gen._rarity
        );

        for (uint i = 0; i < gen._stats.length; i++) {
            _bytes = abi.encodePacked(_bytes, gen._stats[i]);
        }

        for (uint j = 0; j < gen._attributes.length; j++) {
            _bytes = abi.encodePacked(_bytes, gen._attributes[j]);
        }

        return keccak256(_bytes);
    }

    /// @inheritdoc IMonstropolyData
    function hashGen(string calldata gen) public view returns(bytes32) {
        return keccak256(abi.encodePacked(gen));
    }

    /// @inheritdoc IMonstropolyData
    function setAssetInGen(string calldata gen, string calldata asset_) public view returns(string memory) {
        return _replaceInString(gen, asset_, 0);
    }

    /// @inheritdoc IMonstropolyData
    function setRarityInGen(string calldata gen, string memory rarity_) public view returns(string memory) {
        return _replaceInString(gen, rarity_, randLength);
    }

    /// @inheritdoc IMonstropolyData
    function setStatInGen(string calldata gen, string memory stat_, uint statIndex_) public view returns(string memory) {
        return _replaceInString(gen, stat_, randLength*(2+statIndex_));
    }

    /// @inheritdoc IMonstropolyData
    function cloneAttributesFrom(string calldata gen_, string calldata from_) public view returns(string memory) {
        bytes memory bytes_ = bytes(gen_);
        bytes memory cloneBytes_ = bytes(from_);
        GenVersion memory version_ = versions[_hex2Dec(_slice(bytes_, (bytes_.length - randLength), randLength))];
        GenVersion memory cloneVersion_ = versions[_hex2Dec(_slice(cloneBytes_, (cloneBytes_.length - randLength), randLength))];
        string memory keep_ = _slice(bytes_, 0, randLength * (2 + version_.nStats));
        string memory clone_ = _slice(cloneBytes_, randLength * (2 + cloneVersion_.nStats), randLength * cloneVersion_.nAttributes);
        string memory keepM_ = _slice(bytes_, version_.genHalfLength, randLength * (2 + version_.nStats));
        string memory cloneM_ = _slice(cloneBytes_, (randLength * (2 + cloneVersion_.nStats) + cloneVersion_.genHalfLength), randLength * cloneVersion_.nAttributes);
        string memory finalVersion_ = _slice(cloneBytes_, (cloneBytes_.length - randLength), randLength);
        return string(abi.encodePacked(keep_, clone_, keepM_, cloneM_, finalVersion_));
    }

    /// @inheritdoc IMonstropolyData
    function incrementRarityInGen(string calldata gen, uint increment) public view returns(string memory) {
        bytes memory bytes_ = bytes(gen);
        uint rarity_ = _hex2Dec(_slice(bytes_, (randLength), randLength));
        return setRarityInGen(gen, _padLeft(rarity_ + increment, randLength));
    }

    /// @inheritdoc IMonstropolyData
    function incrementStatInGen(string calldata gen, uint increment, uint statIndex_) public view returns(string memory) {
        bytes memory bytes_ = bytes(gen);
        uint stat_ = _hex2Dec(_slice(bytes_, (randLength*(2+statIndex_)), randLength));
        require((stat_ + increment) < 256, "MonstropolyData: random is max"); 
        return setStatInGen(gen, _padLeft(stat_ + increment, randLength), statIndex_);
    }
    
    /// @inheritdoc IMonstropolyData
    function deconstructGen(string calldata gen) public view returns(DeconstructedGen memory){
        uint256 len = bytes(gen).length;
        require(len >= _getGenLength(), "MonstropolyData: wrong gen length");
        string memory _string;
        bytes memory _bytes = bytes(gen);
        DeconstructedGen memory decGen;
        decGen._stats = new uint[](nStats);
        decGen._attributes = new uint[](nAttributes);

        // Root
        {
            _string   = _slice(_bytes, 0, randLength);
            decGen._asset = _hex2Dec(_string);
        }

        {
            _string   = _slice(_bytes, randLength*2, randLength);
            decGen._rarity = _hex2Dec(_string);
        }
        
        // Stats
        {
            for(uint i = 0; i < nStats; i++) {
                _string = _slice(_bytes, (randLength * (2 + i)), randLength);
                decGen._stats[i] = _hex2Dec(_string);
            }
        }

        // Attributes
        {
            for(uint i = 0; i < nAttributes; i++) {
                _string = _slice(_bytes, (randLength*(2 + nStats + i)), randLength);
                decGen._attributes[i] = _hex2Dec(_string);
            }
        }

        return decGen;
    }

    /// @inheritdoc IMonstropolyData
    function updateLengths(uint256 _nStats, uint256 _nAttributes) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateLengths(_nStats, _nAttributes);
    }

    function _getGenLength() internal view returns(uint) {
        return (nStats + nAttributes + 2) * randLength;
    }

    function _updateLengths(uint256 _nStats, uint256 _nAttributes) public onlyRole(DEFAULT_ADMIN_ROLE) {
        nStats = _nStats;
        nAttributes = _nAttributes;
        genLength = (nStats + nAttributes + 2) * randLength;
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