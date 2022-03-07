// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyData.sol";
import "../shared/IMonstropolyDeployer.sol";
import "../shared/IMonstropolyFactory.sol";

/// @title The contract for ERC721 Monstropoly
/// @notice Creates Monstropoly's NFTs
/// @dev Derived from ERC721 to represent assets in Monstropoly
contract MonstropolyFactory is IMonstropolyFactory, Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, PausableUpgradeable, AccessControlProxyPausable, ERC721BurnableUpgradeable, UUPSUpgradeableByRole {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant LOCKER_ROLE = keccak256("LOCKER_ROLE");

    CountersUpgradeable.Counter private _tokenIdCounter;

    string private _baseTokenURI;
    string private _contractUri;

    mapping(bytes32 => bool) private _genetics;
    mapping(uint256 => bool) private _lockedTokens;
    mapping(uint256 => Token) private _tokensById;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {}

    function initialize() initializer public {
        __ERC721_init("Heroes And Weapons", "HAW");
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
    function tokenOfId(uint256 tokenId) public view returns(Token memory) {
        return _tokensById[tokenId];
    }

    /// @inheritdoc IMonstropolyFactory
    function isApproved(address to, uint256 tokenId) public view returns (bool){
        return _isApprovedOrOwner(to, tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function freeGen(string calldata gen) public view returns(bool) {
        bytes32 _genId = _hashGen(gen);
        return !_genetics[_genId];
    }

    /// @inheritdoc IMonstropolyFactory
    function baseURI() public view returns (string memory) {
        return _baseURI();
    }

    /// @inheritdoc IMonstropolyFactory
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable, IMonstropolyFactory)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /// @inheritdoc IMonstropolyFactory
    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    /// @inheritdoc IMonstropolyFactory
    function isLocked(uint256 tokenId) public view returns(bool) {
        return _lockedTokens[tokenId];
    }

    /// @inheritdoc IMonstropolyFactory
    function setBaseURI(string memory newBaseTokenURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(newBaseTokenURI);
    }

    /// @inheritdoc IMonstropolyFactory
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokenURI(tokenId, _tokenURI);
    }

    /// @inheritdoc IMonstropolyFactory
    function setContractURI(string memory contractURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setContractURI(contractURI);
    }

    /// @inheritdoc IMonstropolyFactory
    function lockToken(uint256 tokenId) public onlyRole(LOCKER_ROLE) {
        _lockedTokens[tokenId] = true;
    }

    /// @inheritdoc IMonstropolyFactory
    function unlockToken(uint256 tokenId) public onlyRole(LOCKER_ROLE) {
        _lockedTokens[tokenId] = false;
    }

    /// @inheritdoc IMonstropolyFactory
    function mint(address to_, string calldata genetic_, uint8 rarity_, uint8 breedUses_) public onlyRole(MINTER_ROLE) returns(uint) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        bytes32 genId_ = _hashGen(genetic_);
        require(!_genetics[genId_], "MonstropolyFactory: gen already exists");
        _genetics[genId_] = true;
        Token memory token_ = Token(rarity_, breedUses_, block.timestamp, to_, to_, genetic_);
        _tokensById[tokenId] = token_;
        _safeMint(to_, tokenId);

        emit Mint(address(0), to_, tokenId, rarity_, breedUses_, genetic_);

        return tokenId;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function _setBaseURI(string memory newBaseTokenURI) internal {
        _baseTokenURI = newBaseTokenURI;
    }

    function _setContractURI(string memory contractURI) internal {
        _contractUri = contractURI;
    }

    /// @dev Deconstructs gen and computes its hash
    function _hashGen(string memory gen) public view returns(bytes32) {
        return keccak256(abi.encodePacked(gen));
        // return IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA"))).hashGen(gen);
    }

    // The following functions are overrides required by Solidity.

    /// @inheritdoc IMonstropolyFactory
    function burn(uint256 tokenId)
        public
        override(ERC721BurnableUpgradeable, IMonstropolyFactory)
    {
        super.burn(tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        bytes32 genId_ = _hashGen(_tokensById[tokenId].genetic);
        _genetics[genId_] = false;
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        whenNotPaused
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        require(!_lockedTokens[tokenId] , "MonstropolyFactory: locked token");
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
