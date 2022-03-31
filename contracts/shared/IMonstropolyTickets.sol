// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title The interface for ERC721 Monstropoly
/// @notice Creates Monstropoly's NFTs
/// @dev Derived from ERC721 to represent assets in Monstropoly
interface IMonstropolyTickets {

  /// @notice Returns base to compute URI
  /// @return _baseURI
  function baseURI (  ) external view returns ( string calldata );

  /// @notice Returns boxId of tokenId
  /// @param tokenId Unique uint identificator of NFT
  /// @return boxId
  function boxIdOfToken ( uint256 tokenId ) external view returns ( uint256 );

  /// @notice Returns URI of the contract
  /// @return URI of the contract
  function contractURI (  ) external view returns ( string calldata );

  /// @notice Returns whether or not the tokenId exists
  /// @param tokenId Unique uint identificator of NFT
  /// @return True if exists, false inexistent
  function exists ( uint256 tokenId ) external view returns ( bool );

  /// @notice Returns the owner of the NFT
  /// @param tokenId Unique uint identificator of NFT
  /// @return Owner of the NFT
  function ownerOf(uint256 tokenId) external view returns (address);

  /// @notice Returns if to is approved or owner
  /// @dev calls to _isApprovedOrOwner
  /// @param to Address of spender
  /// @param tokenId Unique uint identificator of NFT
  /// @return True for approved false if not
  function isApproved ( address to, uint256 tokenId ) external view returns ( bool );

  /// @notice Mints NFTs with of some box ID
  /// @param to Receiver of the NFT
  /// @param boxId ID of the box
  function mint ( address to, uint256 boxId ) external;

  /// @notice Mints amount of NFTs with of some box ID
  /// @param to Receiver of the NFT
  /// @param boxId ID of the box
  function mintBatch ( address to, uint256 boxId, uint256 amount ) external;

  function burn(uint256 tokenId) external;

  /// @notice Sets base URI used in tokenURI
  /// @param newBaseTokenURI String with base URI
  function setBaseURI ( string calldata newBaseTokenURI ) external;

  /// @notice Sets contract URI 
  /// @dev Returns a JSON with contract metadata
  /// @param contractURI_ String with contract metadata
  function setContractURI ( string calldata contractURI_ ) external;
}