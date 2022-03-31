// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../shared/IMonstropolyTickets.sol";

contract MonstropolyTickets is IMonstropolyTickets, Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721BurnableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    CountersUpgradeable.Counter private _tokenIdCounter;

    string private _baseTokenURI;
    string private _contractUri;

    mapping(uint256 => uint256) private _idToBox; // tokenId => boxId

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __ERC721_init("MyToken", "MTK");
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        _setBaseURI("https://monstropoly.io/tickets/");
        _setContractURI("https://monstropoly.io/ticketsContractUri/");
    }

    function baseURI() public view returns (string memory) {
        return _baseURI();
    }

    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    function isApproved(address to, uint256 tokenId) public view returns (bool){
        return _isApprovedOrOwner(to, tokenId);
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function boxIdOfToken(uint256 tokenId) public view returns(uint256) {
        require(_exists(tokenId), "MonstropolyTickets: inexistent");
        return _idToBox[tokenId];
    }

    function setBaseURI(string memory newBaseTokenURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(newBaseTokenURI);
    }

    function setContractURI(string memory contractURI_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setContractURI(contractURI_);
    }

    function mintBatch(address to, uint256 boxId, uint256 amount) public {
        for (uint256 i = 0; i < amount; i++) {
            mint(to, boxId);
        }
    }

    function mint(address to, uint256 boxId) public onlyRole(MINTER_ROLE) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _idToBox[tokenId] = boxId;
        _safeMint(to, tokenId);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

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

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /// @inheritdoc ERC721Upgradeable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function ownerOf(uint256 tokenId) public view virtual override(ERC721Upgradeable, IMonstropolyTickets) returns (address) {
        return super.ownerOf(tokenId);
    }

    function burn(uint256 tokenId) public virtual override(ERC721BurnableUpgradeable, IMonstropolyTickets) {
        super.burn(tokenId);
    }
}