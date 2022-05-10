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

    uint256 public LAUNCH_MAX_SUPPLY;    // max launch supply
    uint256 public LAUNCH_SUPPLY;        // current launch supply
    address public LAUNCHPAD;

    modifier onlyLaunchpad() {
        require(LAUNCHPAD != address(0), "MonstropolyTickets: launchpad address must set");
        require(msg.sender == LAUNCHPAD, "MonstropolyTickets: must call by launchpad");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(uint256 launchpadMaxSupply, address launchpad) initializer public {
        __ERC721_init("Monstropoly Boxes", "MPB");
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        _setBaseURI("https://monstropoly.io/tickets/");
        _setContractURI("https://monstropoly.io/ticketsContractUri/");

        LAUNCH_MAX_SUPPLY = launchpadMaxSupply;
        LAUNCHPAD = launchpad;
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

    function getLastOwnedTokenIds(address owner, uint256 size, uint256 skip) public view returns(uint256[] memory) {
        uint256 total = balanceOf(owner);
        size = total < size ? total : size;
        uint256[] memory array = new uint256[](size);
        for(uint256 i = skip; i < size; i++) {
            array[i] = tokenOfOwnerByIndex(owner, i);
        }
        return array;
    }

    function getMaxLaunchpadSupply() view public returns (uint256) {
        return LAUNCH_MAX_SUPPLY;
    }

    function getLaunchpadSupply() view public returns (uint256) {
        return LAUNCH_SUPPLY;
    }

    function updateLaunchpadConfig(uint256 launchpadMaxSupply, address launchpad) public onlyRole(DEFAULT_ADMIN_ROLE) {
        LAUNCH_MAX_SUPPLY = launchpadMaxSupply;
        LAUNCHPAD = launchpad;
    }

    function setBaseURI(string memory newBaseTokenURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(newBaseTokenURI);
    }

    function setContractURI(string memory contractURI_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setContractURI(contractURI_);
    }

    function mintBatch(address to, uint256 amount) public {
        for (uint256 i = 0; i < amount; i++) {
            mint(to);
        }
    }

    function mint(address to) public onlyRole(MINTER_ROLE) returns(uint256) {
        return _mintIncrementingCounter(to);
    }

    function mintTo(address to, uint size) external onlyLaunchpad {
        require(to != address(0), "MonstropolyTickets: can't mint to empty address");
        require(size > 0, "MonstropolyTickets: size must greater than zero");
        require(LAUNCH_SUPPLY + size <= LAUNCH_MAX_SUPPLY, "MonstropolyTickets: max launchpad supply reached");

        for (uint256 i=1; i <= size; i++) {
            _mintIncrementingCounter(to);
            LAUNCH_SUPPLY++;
        }
    }

    function _mintIncrementingCounter(address to) internal returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        return tokenId;
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