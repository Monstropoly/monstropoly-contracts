// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

interface IMonstropolyData {

    struct Rarity{
        uint256 min;
        uint256 max;
    }

    struct Value {
        uint256 random;
        uint256 module;
    }
  
    struct DeconstructedGen{
        Value _asset;
        Value _type;
        Value _rarity;
        Value[] _stats;
        Value[] _attributes;
    }

    function gens(bytes32 _hash) external view returns(bool);
    function getRarity(Value memory gen) external view returns(Rarity memory);
    function getRarityByRange(uint256 gen) external view returns(uint256);
    function getRarityByRangeVIP(uint256 gen) external view returns(uint256);
    function getRarityByRange(string calldata gen) external view returns(uint256);
    function getRarityByRangeVIP(string calldata gen) external view returns(uint256);
    function getRarityByGen(string calldata gen) external view returns(uint256);
    function setRarityInGen(string calldata gen, string calldata rarity_) external view returns(string memory);
    function setAssetInGen(string calldata gen, string calldata asset_) external view returns(string memory);
    function setTypeInGen(string calldata gen, string calldata type_) external view returns(string memory);
    function setStatInGen(string calldata gen, string memory stat_, uint statIndex_) external view returns(string memory);
    function cloneAttributesFrom(string calldata gen_, string calldata from_) external view returns(string memory);
    function incrementStatInGen(string calldata gen, uint increment, uint statIndex_) external view returns(string memory);
    function getAssetByGen(string calldata gen) external view returns(uint256);
    function deconstructGen(string calldata gen) external view returns(DeconstructedGen memory);
    function getValue(Value memory value) external pure returns(uint);
    function getLengths() external view returns(uint, uint, uint);
    function getCurrentStringsLength() external view returns(uint);
    function version() external view returns(uint);
    function moduleStrings(uint asset) external view returns(string memory);
    function randLength() external pure returns(uint);
    function nStats() external pure returns(uint);
    function nAttributes() external pure returns(uint);
    function genHalfLength() external pure returns(uint);
    function genExists(DeconstructedGen memory gen) external view returns (bool);
    function genExists(string calldata gen) external view returns (bool);
    function hashGen(string calldata gen) external view returns(bytes32);
}