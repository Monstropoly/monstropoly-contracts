// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyDeployer.sol";
import "../shared/IMonstropolyFactory.sol";

/// @title The contract for ERC721 Monstropoly
/// @notice Creates Monstropoly's NFTs
/// @dev Derived from ERC721 to represent assets in Monstropoly
contract MonstropolyFactory is
    IMonstropolyFactory,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeableByRole
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant LOCKER_ROLE = keccak256("LOCKER_ROLE");
    bytes32 public constant BREED_USES_SPENDER_ROLE = keccak256("BREED_USES_SPENDER_ROLE");
    bytes32 public constant GAMER_UPDATER_ROLE = keccak256("GAMER_UPDATER_ROLE");
    bytes32 public constant BREEDER_UPDATER_ROLE = keccak256("BREEDER_UPDATER_ROLE");

    string private _baseTokenURI;
    string private _contractUri;

    mapping(uint256 => Token) private _tokensById;
    mapping(uint256 => bool) private _usedTokenIds;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("Monstropoly Monsters", "MPM");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __AccessControlProxyPausable_init(msg.sender);
        __ERC721Burnable_init();
        _setBaseURI("https://monstropoly.io/nfts/");
        _setContractURI("https://monstropoly.io/contractUri/");
    }

    /// @inheritdoc ERC721Upgradeable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @inheritdoc IMonstropolyFactory
    function tokenOfId(uint256 tokenId) public view returns (Token memory) {
        return _tokensById[tokenId];
    }

    /// @inheritdoc IMonstropolyFactory
    function isApproved(address to, uint256 tokenId)
        public
        view
        returns (bool)
    {
        return _isApprovedOrOwner(to, tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function isTokenIdUsed(uint256 tokenId) public view returns (bool) {
        return _usedTokenIds[tokenId];
    }

    /// @inheritdoc IMonstropolyFactory
    function baseURI() public view returns (string memory) {
        return _baseURI();
    }

    /// @inheritdoc IMonstropolyFactory
    function tokenURI(uint256 tokenId)
        public
        view
        override(
            ERC721Upgradeable,
            ERC721URIStorageUpgradeable,
            IMonstropolyFactory
        )
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    /// @inheritdoc IMonstropolyFactory
    function isLocked(uint256 tokenId) public view returns (bool) {
        return _tokensById[tokenId].locked;
    }

    /// @inheritdoc IMonstropolyFactory
    function setBaseURI(string memory newBaseTokenURI)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setBaseURI(newBaseTokenURI);
    }

    /// @inheritdoc IMonstropolyFactory
    function setTokenURI(uint256 tokenId, string memory _tokenURI)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setTokenURI(tokenId, _tokenURI);
    }

    /// @inheritdoc IMonstropolyFactory
    function setContractURI(string memory contractURI_)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setContractURI(contractURI_);
    }

    /// @inheritdoc IMonstropolyFactory
    function lockToken(uint256 tokenId) public onlyRole(LOCKER_ROLE) {
        _tokensById[tokenId].locked = true;
        emit LockToken(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function unlockToken(uint256 tokenId) public onlyRole(LOCKER_ROLE) {
        _tokensById[tokenId].locked = false;
        emit UnlockToken(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function setBreedUses(uint256 tokenId, uint8 usesLeft) public onlyRole(BREED_USES_SPENDER_ROLE) {
        _tokensById[tokenId].breedUses = usesLeft;
        emit SetBreedUses(tokenId, usesLeft);
    }

    /// @inheritdoc IMonstropolyFactory
    function setGamer(uint256 tokenId, address newGamer) public onlyRole(GAMER_UPDATER_ROLE) {
        _tokensById[tokenId].gamer = newGamer;
        emit SetGamer(tokenId, newGamer);
    }

    /// @inheritdoc IMonstropolyFactory
    function setBreeder(uint256 tokenId, address newBreeder) public onlyRole(BREEDER_UPDATER_ROLE) {
        _tokensById[tokenId].breeder = newBreeder;
        emit SetBreeder(tokenId, newBreeder);
    }

    /// @inheritdoc IMonstropolyFactory
    function mint(
        address to_,
        uint256 tokenId_,
        uint8 rarity_,
        uint8 breedUses_,
        uint8 generation_
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        require(!_usedTokenIds[tokenId_], "MonstropolyFactory: tokenId used");
        _usedTokenIds[tokenId_] = true;

        Token memory token_ = Token(
            rarity_,
            breedUses_,
            generation_,
            false,
            block.timestamp,
            to_,
            to_
        );
        _tokensById[tokenId_] = token_;
        _safeMint(to_, tokenId_);

        emit Mint(to_, tokenId_, rarity_, breedUses_, generation_);

        return tokenId_;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function _setBaseURI(string memory newBaseTokenURI) internal {
        _baseTokenURI = newBaseTokenURI;
    }

    function _setContractURI(string memory contractURI_) internal {
        _contractUri = contractURI_;
    }

    // The following functions are overrides required by Solidity.

    /// @inheritdoc IMonstropolyFactory
    function burn(uint256 tokenId)
        public
        override(ERC721BurnableUpgradeable, IMonstropolyFactory)
    {
        super.burn(tokenId);
    }

    function ownerOf(uint256 tokenId)
        public
        view
        virtual
        override(ERC721Upgradeable, IMonstropolyFactory)
        returns (address)
    {
        return super.ownerOf(tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        require(!_tokensById[tokenId].locked, "MonstropolyFactory: locked token");
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
