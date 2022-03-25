pragma solidity 0.8.9;

/// @title The interface for MonstropolyMagicBoxesShop
/// @notice Sells Magic Boxes and opens them
/// @dev Has role to mint NFTs
interface IMonstropolyMagicBoxesShop {

    struct MagicBox {
        // Price of the magic box
        uint256 price;
        // Address of the token to buy (address(0) for ETH)
        address token;
        // Percentage of the price to burn (in ether units)
        uint256 burnPercentage;
        // Percentage of the price to send to treasury (in ether units)
        uint256 treasuryPercentage;
        // Assets inside the box
        uint256 amount;
        // specie
        uint8 specie;
    }

    /// @notice Emitted when a Magic Box is bought
    /// @param account Address of the buyer
    /// @param id Identificator of the box 
    /// @param amount Amount of boxes bought
    event MagicBoxPurchased(address account, uint256 id, uint256 amount);

    /// @notice Emitted when an asset is opened
    /// @dev Assets are opened individually (not full box)
    /// @param account Address of the sender
    /// @param asset Asset to spend
    /// @param vip VIP to spend
    /// @param tokenId Identificator of the minted NFT
    event MagicBoxOpened(address account, uint256 asset, bool vip, uint256 tokenId);

    /// @notice Emitted when a Magic Box is updated
    /// @param id Identificator of the Magic Box
    /// @param amount Amount of NFTs minted
    /// @param price Price of the Magic Box
    /// @param token Address of the token to buy the box (address(0) to ETH)
    /// @param burnPercentage Percentage of the price to burn (in ether units)
    /// @param treasuryPercentage Percentage of the price to send to treasury (in ether units)
    /// @param specie Specie of the NFT
    event MagicBoxUpdated(uint256 id, uint256 amount, uint256 price, address token, uint256 burnPercentage, uint256 treasuryPercentage, uint8 specie);

    /// @notice Emitted when a Magic Box's supply is updated
    /// @param id Identificator of the Magic Box
    /// @param supply Updated supply
    event UpdateBoxSupply(uint256 id, uint256 supply);

    /// @notice Sets address for trusted MonstropolyRelayer
    /// @param _forwarder MonstropolyRelayer address
    function setTrustedForwarder(address _forwarder) external;

    /// @notice Updates a Magic Box
    /// @param id Identificator of the Magic Box
    /// @param supply New supply
    function updateBoxSupply(uint256 id, uint256 supply) external;

    /// @notice Updates a Magic Box
    /// @param id Identificator of the Magic Box
    /// @param amount Amount of NFTs to mint
    /// @param price Price of the Magic Box
    /// @param token Address of the token to buy the box (address(0) to ETH)
    /// @param burnPercentage_ Percentage of the price to burn (in ether units)
    /// @param treasuryPercentage_ Percentage of the price to send to treasury (in ether units)
    /// @param specie Specie of the NFT
    function updateMagicBox(uint256 id, uint256 amount, uint256 price, address token, uint256 burnPercentage_, uint256 treasuryPercentage_, uint8 specie) external;

    /// @notice Purchases Magic Boxes
    /// @param id Identificator of the Magic Box
    function purchase(uint256 id) external payable;
}