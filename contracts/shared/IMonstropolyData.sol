// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

/// @title The interface MonstropolyData
/// @notice Handles genetic data
/// @dev Other contracts use its methods to handle genetic strings
interface IMonstropolyData {

    struct Rarity {
        // Minimum value of certain rarity
        uint256 min;
        // Maximum value of certain rarity
        uint256 max;
    }

    struct Value {
        // Random number
        uint256 random;
        // Module to compute final value
        uint256 module;
    }
  
    struct DeconstructedGen {
        // Asset: 0-Character, 1-Weapon
        uint _asset;
        // Rarity: COMMON, UNCOMMON, PREMIUM, RARE, EXOTIC and LEGENDARY
        uint _rarity;
        // Array with stats of the asset
        uint[] _stats;
        // Array with attributes to create image
        uint[] _attributes;
    }

    struct GenVersion {
        // Max amount of assets
        uint nStats;
        // Max amount of attributes
        uint nAttributes;
        // Length of the random part of the string
        uint genHalfLength;
    }

    /// @notice Returns N of hex characters per random value
    /// @return N of hex characters
    function randLength() external view returns(uint256);

    /// @notice Returns GenVersion by index
    /// @param version Index for versions
    /// @return GenVersion struct
    // function versions(uint version) external view returns(GenVersion memory);

    /// @notice Returns current string with module values by asset
    /// @param asset Kind of asset
    /// @return Modules for asset
    function moduleStrings(uint256 asset) external view returns(string memory);

    /// @notice Returns current lengths variables
    /// @return Current randLength
    /// @return Current nStats
    /// @return Current nAttributes
    function getLengths() external view returns(uint, uint, uint);

    /// @notice Returns length of genetic
    /// @return Gen length
    function getGenLength() external view returns(uint256);

    /// @notice Returns asset decoded from gen
    /// @param gen Genetic of NFT
    /// @return Asset
    function getAssetByGen(string calldata gen) external view returns(uint256);

    /// @notice Returns deconstructed and modularized rarity
    /// @param gen Genetic of NFT
    /// @return Modularized rarity value
    function getRarityByGen(string calldata gen) external view returns(uint256);

    /// @notice Returns the hash of the genetic
    /// @dev Makes keccak256 of deconstructed and encodePacked gen
    /// @param gen Genetic of NFT
    /// @return Genetic's hash
    function hashGen(string calldata gen) external view returns(bytes32);

    /// @notice Returns the hash of the genetic
    /// @param gen Deconstructed genetic of NFT
    /// @return Genetic's hash
    function hashGen(DeconstructedGen memory gen) external view returns(bytes32);

    /// @notice Returns genetic with the indicated asset
    /// @param gen Raw genetic of NFT
    /// @param asset_ Desired asset
    /// @return Modified genetic
    function setAssetInGen(string calldata gen, string calldata asset_) external view returns(string memory);

    /// @notice Returns genetic with the indicated rarity
    /// @param gen Raw genetic of NFT
    /// @param rarity_ Desired rarity
    /// @return Modified genetic
    function setRarityInGen(string calldata gen, string calldata rarity_) external view returns(string memory);
    
    /// @notice Returns genetic with the indicated stat
    /// @param gen Raw genetic of NFT
    /// @param stat_ Desired stat
    /// @param statIndex_ Stat to modify
    /// @return Modified genetic
    function setStatInGen(string calldata gen, string memory stat_, uint statIndex_) external view returns(string memory);
    
    /// @notice Returns genetic clonning attributes from another genetic
    /// @param gen_ Raw genetic of NFT
    /// @param from_ Genetic of NFT to clone attributes from
    /// @return Modified genetic
    function cloneAttributesFrom(string calldata gen_, string calldata from_) external view returns(string memory);
    
    /// @notice Returns genetic incrementing rarity
    /// @param gen Genetic of NFT
    /// @param increment Units to increment rarity
    /// @return Modified genetic
    function incrementRarityInGen(string calldata gen, uint increment) external view returns(string memory);

    /// @notice Returns genetic incrementing any stat
    /// @param gen Genetic of NFT
    /// @param increment Units to increment stat
    /// @param statIndex_ Index of stat to increment
    /// @return Modified genetic
    function incrementStatInGen(string calldata gen, uint increment, uint statIndex_) external view returns(string memory);

    /// @notice Returns the deconstructed object of some genetic
    /// @dev Decodes version from genetic
    /// @param gen Genetic of NFT
    /// @return DeconstructedGen object
    function deconstructGen(string calldata gen) external view returns(DeconstructedGen memory);

    /// @notice Updates nStats and nAttributes and creates a new version
    /// @param _nStats New length for stats array
    /// @param _nAttributes New length for attributes array
    function updateLengths(uint256 _nStats, uint256 _nAttributes) external;
}