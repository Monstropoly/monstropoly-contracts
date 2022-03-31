// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IMonstropolyData.sol";

/// @title The interface for ERC721 Monstropoly
/// @notice Creates Monstropoly's NFTs
/// @dev Derived from ERC721 to represent assets in Monstropoly
interface IMonstropolyFactory {

    struct Token {
        uint8 rarity;
        uint8 breedUses;
        // NFT creation timestamp
        uint bornAt; //TBD: use smaller uint and try to organize to save gas
        address gamer;
        address breeder;
        // string defining NFT random and module values
        string genetic;
    }

    /// @notice Emitted when a NFT is minted
    /// @param from TBD remove this as always is addr0
    /// @param to Address of the receiver
    /// @param tokenId Unique uint identificator of NFT
    /// @param genetic String defining NFT random and module values
    event Mint(address indexed from, address indexed to, uint256 indexed tokenId, uint8 rarity, uint8 breedUses, string genetic);

    /// @notice Returns if to is approved or owner
    /// @dev calls to _isApprovedOrOwner
    /// @param to Address of spender
    /// @param tokenId Unique uint identificator of NFT
    /// @return True for approved false if not
    function isApproved(address to, uint256 tokenId) external view returns (bool);

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

    /// @notice Returns wether or not the tokenId is locked
    /// @param tokenId Unique uint identificator of NFT
    /// @return True for locked false for unlocked
    function isLocked(uint256 tokenId) external view returns(bool);

    /// @notice Returns whether or not the tokenId exists
    /// @param tokenId Unique uint identificator of NFT
    /// @return True if exists, false inexistent
    function exists(uint256 tokenId) external view returns (bool);

    /// @notice Returns Token struct of tokenId
    /// @param tokenId Unique uint identificator of NFT
    /// @return Token struct
    function tokenOfId(uint256 tokenId) external view returns(Token memory);

    /// @notice Returns wether or not gen is free
    /// @param gen String defining NFT random and module values
    /// @return True for free false for not free
    function freeGen(string memory gen) external view returns(bool); 

    /// @notice Burns tokenId
    /// @dev Sets token.genetic to free
    /// @param tokenId Unique uint identificator of NFT
    function burn(uint256 tokenId) external;

    /// @notice Mints tokenId with genes in its struct
    /// @param to Receiver of the NFT
    /// @param genes String defining NFT random and module values
    /// @return tokenId
    function mint(address to, string memory genes, uint8 rarity, uint8 breedUses) external returns(uint);

    /// @notice Sets base URI used in tokenURI
    /// @param newBaseTokenURI String with base URI
    function setBaseURI(string memory newBaseTokenURI) external;

    /// @notice Sets URI corresponding to a tokenId used to in tokenURI
    /// @param tokenId Unique uint identificator of NFT
    /// @param _tokenURI String with tokenId's URI
    function setTokenURI(uint256 tokenId, string memory _tokenURI) external;

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
}