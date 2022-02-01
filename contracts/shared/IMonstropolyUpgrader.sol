pragma solidity 0.8.9;

/// @title The interface for MonstropolyUpgrader
/// @notice Upgrades Monstropoly's NFTs rarity
/// @dev Burns and mints a new NFT with upgraded rarity
interface IMonstropolyUpgrader {

    /// @notice Emitted when NFT is upgraded
    /// @param who Address of the sender
    /// @param tokenId Unique uint identificator of upgraded NFT
    /// @param oldTokens Array with burned NFTs
    event TokenUpgraded(address indexed who, uint256 tokenId, uint256[5] oldTokens);

    /// @notice Emitted when prices is updated
    /// @param price New price
    /// @param index Rarity for merged NFTs
    event UpdatePrice(uint256 price, uint index);

    /// @notice Returns price to upgrade a NFT
    /// @param tokenId Unique uint identificator of NFT
    /// @return Price to upgrade
    function price(uint256 tokenId) external view returns(uint256);

    /// @notice Sets address for trusted MonstropolyRelayer
    /// @param _forwarder MonstropolyRelayer address
    function setTrustedForwarder(address _forwarder) external;

    /// @notice Updates prices to upgrade
    /// @dev Array must contain all rarity slots upgrade
    /// @param prices Array with prices
    function updatePrices(uint256[] memory prices) external;

    /// @notice Upgrades a NFT from old ones
    /// @dev Burns old ones and mints a new upgraded one
    /// @dev Set _clone to -1 to random attributes
    /// @param _tokens Array with tokenIds of old NFTs to burn
    /// @param _clone Index of NFT to clone attributes from
    function upgrade(uint256[5] memory _tokens, int _clone) external;
}