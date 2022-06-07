// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../shared/IMonstropolyTickets.sol";
import "../shared/IMonstropolyDeployer.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../utils/ETHManager.sol";

contract MonstropolyTickets is
    IMonstropolyTickets,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeableByRole
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    bytes32 public constant TICKETS_MINTER_ROLE =
        keccak256("TICKETS_MINTER_ROLE");
    bytes32 public constant TICKETS_ADMIN_ROLE =
        keccak256("TICKETS_ADMIN_ROLE");
    CountersUpgradeable.Counter private _tokenIdCounter;

    string private _baseTokenURI;
    string private _contractUri;

    // solhint-disable-next-line
    uint256 public LAUNCH_MAX_SUPPLY; // max launch supply

    // solhint-disable-next-line
    uint256 public LAUNCH_SUPPLY; // current launch supply

    // solhint-disable-next-line
    address public LAUNCHPAD;

    uint256 private _discountAmount;
    uint256 private _discountAmount2;
    address public ethManager;

    mapping(address => uint8) private _discountTypeByAccounts;

    modifier onlyLaunchpad() {
        require(
            LAUNCHPAD != address(0),
            "MonstropolyTickets: launchpad address must set"
        );
        require(
            msg.sender == LAUNCHPAD,
            "MonstropolyTickets: must call by launchpad"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata name_,
        string calldata symbol_,
        string calldata baseURI_,
        uint256 launchpadMaxSupply,
        address launchpad
    ) public initializer {
        __ERC721_init(name_, symbol_);
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __AccessControlProxyPausable_init(msg.sender);

        _setBaseURI(baseURI_);

        LAUNCH_MAX_SUPPLY = launchpadMaxSupply;
        LAUNCHPAD = launchpad;
        ethManager = address(new ETHManager());
    }

    /// @inheritdoc IMonstropolyTickets
    function baseURI() public view returns (string memory) {
        return _baseURI();
    }

    /// @inheritdoc IMonstropolyTickets
    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    /// @inheritdoc IMonstropolyTickets
    function isApproved(address ownerOrApproved, uint256 tokenId)
        public
        view
        returns (bool)
    {
        return _isApprovedOrOwner(ownerOrApproved, tokenId);
    }

    /// @inheritdoc IMonstropolyTickets
    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function getDiscount(address account)
        public
        view
        returns (uint256 discountType)
    {
        if (_discountTypeByAccounts[account] == 1) return _discountAmount;
        if (_discountTypeByAccounts[account] == 2) return _discountAmount2;
    }

    /// @inheritdoc IMonstropolyTickets
    function getLastOwnedTokenIds(
        address owner,
        uint256 size,
        uint256 skip
    ) public view returns (uint256[] memory) {
        uint256 total = balanceOf(owner);
        size = total < size ? total : size;
        uint256[] memory array = new uint256[](size);
        for (uint256 i = skip; i < size; i++) {
            array[i] = tokenOfOwnerByIndex(owner, i);
        }
        return array;
    }

    /// @inheritdoc IMonstropolyTickets
    function getMaxLaunchpadSupply() public view returns (uint256) {
        return LAUNCH_MAX_SUPPLY;
    }

    /// @inheritdoc IMonstropolyTickets
    function getLaunchpadSupply() public view returns (uint256) {
        return LAUNCH_SUPPLY;
    }

    /// @inheritdoc IMonstropolyTickets
    function updateLaunchpadConfig(
        uint256 launchpadMaxSupply,
        address launchpad
    ) public onlyRole(TICKETS_ADMIN_ROLE) {
        LAUNCH_MAX_SUPPLY = launchpadMaxSupply;
        LAUNCHPAD = launchpad;
        emit UpdateLaunchpadConfig(launchpadMaxSupply, launchpad);
    }

    /// @inheritdoc IMonstropolyTickets
    function setDiscountAmounts(uint256 amount1, uint256 amount2)
        public
        onlyRole(TICKETS_ADMIN_ROLE)
    {
        _discountAmount = amount1;
        _discountAmount2 = amount2;

        emit SetDiscountAmounts(amount1, amount2);
    }

    /// @inheritdoc IMonstropolyTickets
    function setDiscountAccounts(
        address[] calldata accounts,
        uint8 discountType
    ) public onlyRole(TICKETS_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _discountTypeByAccounts[accounts[i]] = discountType;
        }

        emit SetDiscounts(accounts, discountType);
    }

    /// @inheritdoc IMonstropolyTickets
    function setBaseURI(string memory newBaseTokenURI)
        public
        onlyRole(TICKETS_ADMIN_ROLE)
    {
        _setBaseURI(newBaseTokenURI);
    }

    /// @inheritdoc IMonstropolyTickets
    function setContractURI(string memory contractURI_)
        public
        onlyRole(TICKETS_ADMIN_ROLE)
    {
        _setContractURI(contractURI_);
    }

    /// @inheritdoc IMonstropolyTickets
    function mintBatch(address to, uint256 amount) public {
        for (uint256 i = 0; i < amount; i++) {
            mint(to);
        }
    }

    /// @inheritdoc IMonstropolyTickets
    function safeTransferFromBatch(
        address[] calldata from,
        address[] calldata to,
        uint256[] calldata tokenId
    ) public {
        require(
            (from.length == to.length) && (from.length == tokenId.length),
            "MonstropolyTickets: wrong lengths"
        );
        for (uint256 i = 0; i < from.length; i++) {
            safeTransferFrom(from[i], to[i], tokenId[i]);
        }
    }

    /// @inheritdoc IMonstropolyTickets
    function mint(address to)
        public
        onlyRole(TICKETS_MINTER_ROLE)
        whenNotPaused
        returns (uint256)
    {
        return _mintIncrementingCounter(to);
    }

    /// @inheritdoc IMonstropolyTickets
    function mintTo(address to, uint256 size) external onlyLaunchpad {
        require(
            to != address(0),
            "MonstropolyTickets: can't mint to empty address"
        );
        require(size > 0, "MonstropolyTickets: size must greater than zero");
        require(
            LAUNCH_SUPPLY + size <= LAUNCH_MAX_SUPPLY,
            "MonstropolyTickets: max launchpad supply reached"
        );
        LAUNCH_SUPPLY += size;

        for (uint256 i = 1; i <= size; i++) {
            _mintIncrementingCounter(to);
        }

        uint256 discountAmount_;
        if (_discountTypeByAccounts[to] == 1) {
            discountAmount_ = _discountAmount * size;
        } else if (_discountTypeByAccounts[to] == 2) {
            discountAmount_ = _discountAmount2 * size;
        }

        if (discountAmount_ > 0)
            ETHManager(payable(ethManager)).safeTransferETH(
                to,
                discountAmount_
            );
        address treasury = IMonstropolyDeployer(config).get(
            keccak256("TREASURY_WALLET")
        );
        payable(treasury).transfer(address(this).balance);
        ETHManager(payable(ethManager)).safeTransferETH(
            treasury,
            address(ethManager).balance
        );
    }

    function _mintIncrementingCounter(address to) internal returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        return tokenId;
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

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
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

    /// @inheritdoc IMonstropolyTickets
    function ownerOf(uint256 tokenId)
        public
        view
        virtual
        override(ERC721Upgradeable, IMonstropolyTickets)
        returns (address)
    {
        return super.ownerOf(tokenId);
    }

    /// @inheritdoc ERC721BurnableUpgradeable
    function burn(uint256 tokenId)
        public
        virtual
        override(ERC721BurnableUpgradeable, IMonstropolyTickets)
    {
        super.burn(tokenId);
    }
}
