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
        // Used to calculate rarity
        bool vip;
        // Assets inside the box
        uint256[] assets;
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
    /// @param assets Array containing the assets of the box
    /// @param price Price of the Magic Box
    /// @param token Address of the token to buy the box (address(0) to ETH)
    /// @param burnPercentage Percentage of the price to burn (in ether units)
    /// @param treasuryPercentage Percentage of the price to send to treasury (in ether units)
    /// @param vip Used to calculate rarity
    event MagicBoxUpdated(uint256 id, uint256[] assets, uint256 price, address token, uint256 burnPercentage, uint256 treasuryPercentage, bool vip);

    /// @notice Sets address for trusted MonstropolyRelayer
    /// @param _forwarder MonstropolyRelayer address
    function setTrustedForwarder(address _forwarder) external;

    /// @notice Updates a Magic Box
    /// @param id Identificator of the Magic Box
    /// @param assets Array containing the assets of the box
    /// @param price Price of the Magic Box
    /// @param token Address of the token to buy the box (address(0) to ETH)
    /// @param burnPercentage_ Percentage of the price to burn (in ether units)
    /// @param treasuryPercentage_ Percentage of the price to send to treasury (in ether units)
    /// @param vip Used to calculate rarity
    function updateMagicBox(uint256 id, uint256[] memory assets, uint256 price, address token, uint256 burnPercentage_, uint256 treasuryPercentage_, bool vip) external;

    /// @notice Purchases Magic Boxes
    /// @param id Identificator of the Magic Box
    /// @param amount Units of Magic boxes
    function purchase(uint256 id, uint256 amount) external payable;

    /// @notice Opens an asset of a Magic Box
    /// @dev Assets of the box are opened/spent individually
    /// @param asset Asset to open/spend
    /// @param vip VIP to open/spend
    function open(uint asset, bool vip) external returns(uint);
}