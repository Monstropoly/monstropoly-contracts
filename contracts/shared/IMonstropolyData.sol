// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

/// @title The interface MonstropolyData
/// @notice Handles genetic data
/// @dev Other contracts use its methods to handle genetic strings
interface IMonstropolyData {
    /// @notice Returns N of hex characters per random value
    /// @return N of hex characters
    function genLength() external view returns (uint256);

    /// @notice Returns asset decoded from gen
    /// @param gen Genetic of NFT
    /// @return Asset
    function getValueFromGen(string calldata gen, uint256 index)
        external
        view
        returns (uint256);

    /// @notice Returns the hash of the genetic
    /// @dev Makes keccak256 of deconstructed and encodePacked gen
    /// @param gen Genetic of NFT
    /// @return Genetic's hash
    function hashGen(string calldata gen) external view returns (bytes32);

    /// @notice Updates genLength
    /// @param _genLength New length for gens
    function updateLength(uint256 _genLength) external;
}
