// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

/// @title The interface for ERC721 Monstropoly
/// @notice Creates Monstropoly's NFTs
/// @dev Derived from ERC721 to represent assets in Monstropoly
interface IMonstropolyFactory {
    struct Token {
        uint8 rarity;
        uint8 breedUses;
        uint8 generation;
        bool locked;
        uint256 bornAt;
        address gamer;
        address breeder;
    }

    /// @notice Emitted when a NFT is minted
    /// @param to Address of the receiver
    /// @param tokenId Unique uint identificator of NFT
    event Mint(
        address indexed to,
        uint256 indexed tokenId,
        uint8 rarity,
        uint8 breedUses,
        uint8 generation
    );

    /// @notice Emitted when a NFT is locked
    /// @param tokenId Unique uint identificator of NFT
    event LockToken(uint256 indexed tokenId);

    /// @notice Emitted when a NFT is unlocked
    /// @param tokenId Unique uint identificator of NFT
    event UnlockToken(uint256 indexed tokenId);

    /// @notice Emitted when breed uses of NFT is modified
    /// @param tokenId Unique uint identificator of NFT
    /// @param usesLeft Breed uses left
    event SetBreedUses(uint256 indexed tokenId, uint8 indexed usesLeft);

    /// @notice Emitted when address with gaming rights is modified
    /// @param tokenId Unique uint identificator of NFT
    /// @param newGamer New gamer
    event SetGamer(uint256 indexed tokenId, address indexed newGamer);

    /// @notice Emitted when address with breeding rights is modified
    /// @param tokenId Unique uint identificator of NFT
    /// @param newBreeder New breeder
    event SetBreeder(uint256 indexed tokenId, address indexed newBreeder);

    /// @notice Returns if to is approved or owner
    /// @dev calls to _isApprovedOrOwner
    /// @param ownerOrApproved Address of spender
    /// @param tokenId Unique uint identificator of NFT
    /// @return True for approved false if not
    function isApproved(address ownerOrApproved, uint256 tokenId)
        external
        view
        returns (bool);

    /// @notice Returns base to compute URI
    /// @return _baseURI
    function baseURI() external view returns (string memory);

    /// @notice Returns URI of a tokenId
    /// @dev If baseURI is empty returns _tokenURIs[tokenId]
    /// @dev If baseURI isn't empty returns _baseURI + _tokenURIs[tokenId]
    /// @dev If _tokenURIs is empty concats tokenId
    /// @param tokenId Unique uint identificator of NFT
    function tokenURI(uint256 tokenId) external view returns (string memory);

    /// @notice Returns URI of the contract
    /// @return URI of the contract
    function contractURI() external view returns (string memory);

    /// @notice Returns owner of tokenId
    /// @param tokenId Unique uint identificator of NFT
    /// @return Address of the owner
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Returns wether or not the tokenId is locked
    /// @param tokenId Unique uint identificator of NFT
    /// @return True for locked false for unlocked
    function isLocked(uint256 tokenId) external view returns (bool);

    /// @notice Returns whether or not the tokenId exists
    /// @param tokenId Unique uint identificator of NFT
    /// @return True if exists, false inexistent
    function exists(uint256 tokenId) external view returns (bool);

    /// @notice Returns whether or not the tokenId is used
    /// @param tokenId Unique uint identificator of NFT
    /// @return True if used, false unused
    function isTokenIdUsed(uint256 tokenId) external view returns (bool);

    /// @notice Returns Token struct of tokenId
    /// @param tokenId Unique uint identificator of NFT
    /// @return Token struct
    function tokenOfId(uint256 tokenId) external view returns (Token memory);

    /// @notice Burns tokenId
    /// @param tokenId Unique uint identificator of NFT
    function burn(uint256 tokenId) external;

    /// @notice Mints tokenId with genes in its struct
    /// @param to Receiver of the NFT
    /// @param tokenId Token identificator of NFT
    /// @param rarity Rarity of NFT
    /// @param breedUses Initial breed uses left of NFT
    /// @param generation Generation of NFT
    function mint(
        address to,
        uint256 tokenId,
        uint8 rarity,
        uint8 breedUses,
        uint8 generation
    ) external;

    /// @notice Sets base URI used in tokenURI
    /// @param newBaseTokenURI String with base URI
    function setBaseURI(string memory newBaseTokenURI) external;

    /// @notice Sets URI corresponding to a tokenId used to in tokenURI
    /// @param tokenId Unique uint identificator of NFT
    /// @param tokenURI String with tokenId's URI
    function setTokenURI(uint256 tokenId, string memory tokenURI) external;

    /// @notice Sets contract URI
    /// @dev Returns a JSON with contract metadata
    /// @param contractURI String with contract metadata
    function setContractURI(string memory contractURI) external;

    /// @notice Locks tokenId
    /// @param tokenId Unique uint identificator of NFT
    function lockToken(uint256 tokenId) external;

    /// @notice Unlocks tokenId
    /// @param tokenId Unique uint identificator of NFT
    function unlockToken(uint256 tokenId) external;

    /// @notice Sets breed uses left
    /// @param tokenId Unique uint identificator of NFT
    /// @param usesLeft Breed uses left of NFT
    function setBreedUses(uint256 tokenId, uint8 usesLeft) external;

    /// @notice Sets address with game rights
    /// @param tokenId Unique uint identificator of NFT
    /// @param newGamer Address with game rights
    function setGamer(uint256 tokenId, address newGamer) external;

    /// @notice Sets address with breed rights
    /// @param tokenId Unique uint identificator of NFT
    /// @param newBreeder Address with breed rights
    function setBreeder(uint256 tokenId, address newBreeder) external;
}
