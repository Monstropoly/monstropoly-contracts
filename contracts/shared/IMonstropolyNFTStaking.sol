// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

interface IMonstropolyNFTStaking {
    /// @notice Emitted when a NFT is staked
    /// @param tokenId Unique uint identificator of NFT
    /// @param staker Address of the staker
    event StakeNFT(uint256 indexed tokenId, address indexed staker);

    /// @notice Emitted when a NFT is unstaked
    /// @param tokenId Unique uint identificator of NFT
    event UnstakeNFT(uint256 indexed tokenId);

    /// @notice Returns last stake timestamp
    /// @param tokenId Unique uint identificator of NFT
    /// @return Address of the owner
    function getLastStake(uint256 tokenId) external view returns (uint256);

    /// @notice Returns last unstake timestamp
    /// @param tokenId Unique uint identificator of NFT
    /// @return Address of the owner
    function getLastUnstake(uint256 tokenId) external view returns (uint256);

    /// @notice Stake NFT
    /// @param tokenId Unique uint identificator of NFT
    function stake(uint256 tokenId) external;

    /// @notice Unstake NFT
    /// @param tokenId Unique uint identificator of NFT
    function unstake(uint256 tokenId) external;
}
