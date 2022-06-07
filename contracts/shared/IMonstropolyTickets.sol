// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

/// @title The interface for ERC721 Monstropoly
/// @notice Creates Monstropoly's Ticket NFTs
/// @dev Derived from ERC721 to represent assets in Monstropoly
interface IMonstropolyTickets {
    /// @notice Emitted when discount is updated
    /// @param accounts Array of accounts to update
    /// @param discountType Type of discount for accounts
    event SetDiscounts(address[] accounts, uint8 discountType);

    /// @notice Emitted when discount amounts are updated
    /// @param discountAmount1 Discount amount for OG
    /// @param discountAmount2 Discount amount for VIP
    event SetDiscountAmounts(uint256 discountAmount1, uint256 discountAmount2);

    /// @notice Emitted when launhpad configuration is updated
    /// @param newSupply New max launchpad supply
    /// @param newAddress New launchpad contract
    event UpdateLaunchpadConfig(uint256 newSupply, address newAddress);

    /// @notice Returns base to compute URI
    /// @return _baseURI
    function baseURI() external view returns (string calldata);

    /// @notice Returns URI of the contract
    /// @return URI of the contract
    function contractURI() external view returns (string calldata);

    /// @notice Returns whether or not the tokenId exists
    /// @param tokenId Unique uint identificator of NFT
    /// @return True if exists, false inexistent
    function exists(uint256 tokenId) external view returns (bool);

    /// @notice Returns paginated array of tokenIds owned by owner
    /// @dev Use size and skip for pagination
    /// @param owner Address of the owner
    /// @param size Length of the desired array
    /// @param skip Jump those N tokens
    /// @return Array of tokenIds
    function getLastOwnedTokenIds(
        address owner,
        uint256 size,
        uint256 skip
    ) external view returns (uint256[] memory);

    /// @notice Returns max amount of tokens mintable by launchpad
    /// @return LAUNCH_MAX_SUPPLY
    function getMaxLaunchpadSupply() external view returns (uint256);

    /// @notice Returns current amount of tokens minted by launchpad
    /// @return LAUNCH_SUPPLY
    function getLaunchpadSupply() external view returns (uint256);

    /// @notice Returns the owner of the NFT
    /// @param tokenId Unique uint identificator of NFT
    /// @return Owner of the NFT
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Returns if to is approved or owner
    /// @dev calls to _isApprovedOrOwner
    /// @param ownerOrApproved Address of spender
    /// @param tokenId Unique uint identificator of NFT
    /// @return True for approved false if not
    function isApproved(address ownerOrApproved, uint256 tokenId)
        external
        view
        returns (bool);

    /// @notice Mints NFTs
    /// @param to Receiver of the NFT
    function mint(address to) external returns (uint256);

    /// @notice Mints amount of NFTs
    /// @param to Receiver of the NFT
    /// @param amount Number of NFTs to be minted
    function mintBatch(address to, uint256 amount) external;

    /// @notice Transfer multiple tokenIds in one TX
    /// @dev Batched safeTransferFrom. Arrays length must be equal
    /// @param from Senders of the NFT
    /// @param to Receivers of the NFT
    /// @param tokenId Unique uint identificators of NFTs
    function safeTransferFromBatch(
        address[] calldata from,
        address[] calldata to,
        uint256[] calldata tokenId
    ) external;

    /// @notice Mints amount of NFTs
    /// @dev Reserved for launchpad address
    /// @param to Receiver of the NFT
    function mintTo(address to, uint256 size) external;

    /// @notice Burns tokenId
    /// @param tokenId Unique uint identificator of NFT
    function burn(uint256 tokenId) external;

    /// @notice Sets launchpad configuration
    /// @param launchpadMaxSupply Max amount of tokens mintable by launchpad
    /// @param launchpad Address of the launchpad
    function updateLaunchpadConfig(
        uint256 launchpadMaxSupply,
        address launchpad
    ) external;

    /// @notice Sets discount amounts for each type
    /// @param amount1 Discount for OG
    /// @param amount2 Discount for VIP
    function setDiscountAmounts(uint256 amount1, uint256 amount2) external;

    /// @notice Sets discount type for an array of accounts
    /// @param accounts Accounts to set discount type
    /// @param discountType Discount type for accounts
    function setDiscountAccounts(
        address[] calldata accounts,
        uint8 discountType
    ) external;

    /// @notice Sets base URI used in tokenURI
    /// @param newBaseTokenURI String with base URI
    function setBaseURI(string calldata newBaseTokenURI) external;

    /// @notice Sets contract URI
    /// @dev Returns a JSON with contract metadata
    /// @param contractURI_ String with contract metadata
    function setContractURI(string calldata contractURI_) external;
}
