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
    bytes32 public constant MONSTER_ADMIN_ROLE =
        keccak256("MONSTER_ADMIN_ROLE");
    bytes32 public constant MONSTER_MINTER_ROLE =
        keccak256("MONSTER_MINTER_ROLE");
    bytes32 public constant MONSTER_LOCKER_ROLE =
        keccak256("MONSTER_LOCKER_ROLE");
    bytes32 public constant MONSTER_BREED_USES_ROLE =
        keccak256("MONSTER_BREED_USES_ROLE");
    bytes32 public constant MONSTER_GAMER_UPDATER_ROLE =
        keccak256("MONSTER_GAMER_UPDATER_ROLE");
    bytes32 public constant MONSTER_BREEDER_UPDATER_ROLE =
        keccak256("MONSTER_BREEDER_UPDATER_ROLE");

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
        __ERC721Burnable_init();
        __AccessControlProxyPausable_init(msg.sender);
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
    function isApproved(address ownerOrApproved, uint256 tokenId)
        public
        view
        returns (bool)
    {
        return _isApprovedOrOwner(ownerOrApproved, tokenId);
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
        onlyRole(MONSTER_ADMIN_ROLE)
    {
        _setBaseURI(newBaseTokenURI);
    }

    /// @inheritdoc IMonstropolyFactory
    function setTokenURI(uint256 tokenId, string memory tokenURI_)
        public
        onlyRole(MONSTER_ADMIN_ROLE)
    {
        _setTokenURI(tokenId, tokenURI_);
    }

    /// @inheritdoc IMonstropolyFactory
    function setContractURI(string memory contractURI_)
        public
        onlyRole(MONSTER_ADMIN_ROLE)
    {
        _setContractURI(contractURI_);
    }

    /// @inheritdoc IMonstropolyFactory
    function lockToken(uint256 tokenId) public onlyRole(MONSTER_LOCKER_ROLE) {
        require(
            !_tokensById[tokenId].locked,
            "MonstropolyFactory: already locked"
        );
        _tokensById[tokenId].locked = true;
        emit LockToken(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function unlockToken(uint256 tokenId) public onlyRole(MONSTER_LOCKER_ROLE) {
        require(
            _tokensById[tokenId].locked,
            "MonstropolyFactory: already unlocked"
        );
        _tokensById[tokenId].locked = false;
        emit UnlockToken(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function setBreedUses(uint256 tokenId, uint8 usesLeft)
        public
        onlyRole(MONSTER_BREED_USES_ROLE)
    {
        _tokensById[tokenId].breedUses = usesLeft;
        emit SetBreedUses(tokenId, usesLeft);
    }

    /// @inheritdoc IMonstropolyFactory
    function setGamer(uint256 tokenId, address newGamer)
        public
        onlyRole(MONSTER_GAMER_UPDATER_ROLE)
    {
        _tokensById[tokenId].gamer = newGamer;
        emit SetGamer(tokenId, newGamer);
    }

    /// @inheritdoc IMonstropolyFactory
    function setBreeder(uint256 tokenId, address newBreeder)
        public
        onlyRole(MONSTER_BREEDER_UPDATER_ROLE)
    {
        _tokensById[tokenId].breeder = newBreeder;
        emit SetBreeder(tokenId, newBreeder);
    }

    /// @inheritdoc IMonstropolyFactory
    function mint(
        address to,
        uint256 tokenId,
        uint8 rarity,
        uint8 breedUses,
        uint8 generation
    ) public onlyRole(MONSTER_MINTER_ROLE) whenNotPaused {
        require(!_usedTokenIds[tokenId], "MonstropolyFactory: tokenId used");
        _usedTokenIds[tokenId] = true;

        Token memory token_ = Token(
            rarity,
            breedUses,
            generation,
            false,
            block.timestamp,
            to,
            to
        );
        _tokensById[tokenId] = token_;
        _safeMint(to, tokenId);

        emit Mint(to, tokenId, rarity, breedUses, generation);
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
        require(
            !_tokensById[tokenId].locked,
            "MonstropolyFactory: locked token"
        );
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
