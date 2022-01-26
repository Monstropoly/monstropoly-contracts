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


contract MonstropolyFactory is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, PausableUpgradeable, AccessControlProxyPausable, ERC721BurnableUpgradeable, UUPSUpgradeableByRole {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    struct Token {
        string genetic;
        uint bornAt;
    }

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant LOCKER_ROLE = keccak256("LOCKER_ROLE");

    CountersUpgradeable.Counter private _tokenIdCounter;

    string private _baseTokenURI;
    string private _contractUri;

    mapping(bytes32 => bool) private _genetics;
    mapping(uint256 => bool) private _lockedTokens;
    mapping(uint256 => Token) private _tokensById;

    event Mint(address indexed from, address indexed to, uint256 indexed tokenId, string genetic);

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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function isApproved(address to, uint256 tokenId) public view returns (bool){
        return _isApprovedOrOwner(to, tokenId);
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function freeGen(string calldata gen) public view returns(bool) {
        bytes32 _genId = _hashGen(gen);
        return !_genetics[_genId];
    }

    function baseURI() public view returns (string memory) {
        return _baseURI();
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    // TBD: decide if concat with tokenId or set URI for each id and reuse the OZ function
    // function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    //     require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    //     string memory baseURI = _baseURI();
    //     return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId)) : "";
    // }

    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    function isLocked(uint256 tokenId) public view returns(bool) {
        return _lockedTokens[tokenId];
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory newBaseTokenURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(newBaseTokenURI);
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokenURI(tokenId, _tokenURI);
    }

    function setContractURI(string memory contractURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setContractURI(contractURI);
    }

    function lockToken(uint256 tokenId) public onlyRole(LOCKER_ROLE) {
        _lockedTokens[tokenId] = true;
    }

    function unlockToken(uint256 tokenId) public onlyRole(LOCKER_ROLE) {
        _lockedTokens[tokenId] = false;
    }

    function tokenOfId(uint256 tokenId) public view returns(Token memory) {
        return _tokensById[tokenId];
    }

    function mint(address to, string calldata genetic_) public onlyRole(MINTER_ROLE) returns(uint) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        bytes32 genId_ = _hashGen(genetic_);
        require(!_genetics[genId_], "MonstropolyFactory: gen already exists");
        _genetics[genId_] = true;
        Token memory token_ = Token(genetic_, block.timestamp);
        _tokensById[tokenId] = token_;
        _safeMint(to, tokenId);
        // _setTokenURI(tokenId, uri);

        emit Mint(address(0), to, tokenId, genetic_);

        return tokenId;
    }

    // function safeMint(address to, string memory uri) public onlyRole(MINTER_ROLE) {
    //     uint256 tokenId = _tokenIdCounter.current();
    //     _tokenIdCounter.increment();
    //     _safeMint(to, tokenId);
    //     _setTokenURI(tokenId, uri);
    // }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        whenNotPaused
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        require(!_lockedTokens[tokenId] , "MonstropolyFactory: locked token");
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function _setBaseURI(string memory newBaseTokenURI) internal {
        _baseTokenURI = newBaseTokenURI;
    }

    function _setContractURI(string memory contractURI) internal {
        _contractUri = contractURI;
    }

    function _hashGen(string calldata gen) public view returns(bytes32) {
        return IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA"))).hashGen(gen);
    }
}
