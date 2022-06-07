// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../shared/IMonstropolyFactory.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../utils/CoinCharger.sol";
import "../shared/IMonstropolyDeployer.sol";
import "../shared/IMonstropolyTickets.sol";
import "../shared/IMonstropolyMagicBoxesShop.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

contract MonstropolyMagicBoxesShop is
    IMonstropolyMagicBoxesShop,
    UUPSUpgradeableByRole,
    BaseRelayRecipient,
    CoinCharger,
    EIP712Upgradeable
{
    string public override versionRecipient = "2.4.0";
    // solhint-disable-next-line
    bytes32 private immutable _Monstropoly_MAGIC_BOXES_SHOP_TYPEHASH =
        keccak256(
            "Mint(address receiver,bytes32 tokenId,bytes32 rarity,uint8 breedUses,uint8 generation,uint256 validUntil)"
        );

    bytes32 public constant MAGIC_BOXES_ADMIN_ROLE =
        keccak256("MAGIC_BOXES_ADMIN_ROLE");
    bytes32 public constant MAGIC_BOXES_SIGNER_ROLE =
        keccak256("MAGIC_BOXES_SIGNER_ROLE");
    bytes32 public constant TREASURY_WALLET_ID = keccak256("TREASURY_WALLET");
    bytes32 public constant FACTORY_ID = keccak256("FACTORY");

    mapping(uint256 => MagicBox) public box;
    mapping(uint256 => uint256) public boxSupply;
    mapping(address => mapping(uint256 => bool)) private _ticketsToBoxId;

    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        _init();
    }

    function _init() internal initializer {
        __AccessControlProxyPausable_init(msg.sender);
        __EIP712_init("MonstropolyMagicBoxesShop", "1");
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function setTrustedForwarder(address _forwarder)
        public
        onlyRole(MAGIC_BOXES_ADMIN_ROLE)
    {
        _setTrustedForwarder(_forwarder);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function updateMagicBox(
        uint256 id,
        uint256 amount,
        uint256 price,
        address token,
        uint256 burnPercentage,
        uint256 treasuryPercentage
    ) public onlyRole(MAGIC_BOXES_ADMIN_ROLE) {
        _updateMagicBox(
            id,
            amount,
            price,
            token,
            burnPercentage,
            treasuryPercentage
        );
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function updateBoxSupply(uint256 id, uint256 supply)
        public
        onlyRole(MAGIC_BOXES_ADMIN_ROLE)
    {
        boxSupply[id] = supply;
        emit UpdateBoxSupply(id, supply);
    }

    function updateTicketToBoxId(
        address ticketAddress,
        uint256 boxId,
        bool isValid
    ) public onlyRole(MAGIC_BOXES_ADMIN_ROLE) {
        _ticketsToBoxId[ticketAddress][boxId] = isValid;
        emit UpdateTicketBoxId(ticketAddress, boxId, isValid);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function purchase(
        uint256 boxId,
        uint256[] calldata tokenId,
        uint8[] calldata rarity,
        uint8 breedUses,
        uint8 generation,
        uint256 validUntil,
        bytes memory signature,
        address signer
    ) external payable whenNotPaused {
        address account = _msgSender();
        MagicBox memory box_ = box[boxId];

        {
            uint256 price = box_.price;
            require(price > 0, "MonstropolyMagicBoxesShop: wrong 0 price");
            uint256 treasuryAmount_ = price;

            if (box_.burnPercentage > 0) {
                uint256 burnAmount_ = (price * box_.burnPercentage) / 100 ether;
                treasuryAmount_ = price - burnAmount_;
                _burnFromERC20(box_.token, account, burnAmount_);
            }

            _transferFrom(
                box_.token,
                account,
                IMonstropolyDeployer(config).get(TREASURY_WALLET_ID),
                treasuryAmount_
            );
        }

        {
            _verifySignature(
                account,
                tokenId,
                rarity,
                breedUses,
                generation,
                validUntil,
                signature,
                signer
            );
            _spendBoxSupply(boxId);
            _mintNFT(boxId, account, tokenId, rarity, breedUses, generation);
        }

        emit Purchase(boxId, tokenId);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function purchaseWithTicket(
        uint256 ticketTokenId,
        address ticketAddress,
        uint256 boxId,
        uint256[] calldata tokenId,
        uint8[] calldata rarity,
        uint8 breedUses,
        uint8 generation,
        uint256 validUntil,
        bytes memory signature,
        address signer
    ) external whenNotPaused {
        address account = _msgSender();
        IMonstropolyTickets tickets = IMonstropolyTickets(ticketAddress);

        require(
            _ticketsToBoxId[ticketAddress][boxId],
            "MonstropolyMagicBoxesShop: Invalid ticket"
        );
        require(
            account == tickets.ownerOf(ticketTokenId),
            "MonstropolyMagicBoxesShop: wrong ticketTokenId or sender"
        );

        {
            _verifySignature(
                account,
                tokenId,
                rarity,
                breedUses,
                generation,
                validUntil,
                signature,
                signer
            );
            _spendBoxSupply(boxId);
            tickets.burn(ticketTokenId);
            _mintNFT(boxId, account, tokenId, rarity, breedUses, generation);
        }

        emit PurchaseWithTicket(ticketTokenId, ticketAddress, boxId, tokenId);
    }

    function _mintNFT(
        uint256 id,
        address account,
        uint256[] calldata tokenId,
        uint8[] calldata rarity,
        uint8 breedUses,
        uint8 generation
    ) internal {
        IMonstropolyFactory factory = IMonstropolyFactory(
            IMonstropolyDeployer(config).get(FACTORY_ID)
        );

        uint256 boxAmount = box[id].amount;
        require(
            boxAmount == tokenId.length,
            "MonstropolyMagicBoxesShop: wrong tokenId array len"
        );

        require(
            boxAmount == rarity.length,
            "MonstropolyMagicBoxesShop: wrong rarity array len"
        );

        for (uint256 i = 0; i < boxAmount; i++) {
            factory.mint(account, tokenId[i], rarity[i], breedUses, generation);
        }
    }

    function _spendBoxSupply(uint256 id) internal {
        require(boxSupply[id] > 0, "MonstropolyMagicBoxesShop: no box supply");
        boxSupply[id]--;
    }

    function _updateMagicBox(
        uint256 id,
        uint256 amount,
        uint256 price,
        address token,
        uint256 burnPercentage_,
        uint256 treasuryPercentage_
    ) internal {
        require(
            (burnPercentage_ + treasuryPercentage_) == 100 ether,
            "MonstropolyMagicBoxesShop: wrong percentages"
        );
        box[id] = MagicBox(
            price,
            token,
            burnPercentage_,
            treasuryPercentage_,
            amount
        );
        emit MagicBoxUpdated(
            id,
            amount,
            price,
            token,
            burnPercentage_,
            treasuryPercentage_
        );
    }

    function _verifySignature(
        address receiver,
        uint256[] calldata tokenId,
        uint8[] calldata rarity,
        uint8 breedUses,
        uint8 generation,
        uint256 validUntil,
        bytes memory signature,
        address signer
    ) internal view {
        require(
            validUntil > block.timestamp || validUntil == 0,
            "MonstropolyMagicBoxesShop: Expired signature"
        );
        require(
            hasRole(MAGIC_BOXES_SIGNER_ROLE, signer),
            "MonstropolyMagicBoxesShop: Wrong signer"
        );

        bytes32 structHash = keccak256(
            abi.encode(
                _Monstropoly_MAGIC_BOXES_SHOP_TYPEHASH,
                receiver,
                _computeHashOfUintArray(tokenId),
                _computeHashOfUint8Array(rarity),
                breedUses,
                generation,
                validUntil
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);

        bool validation = SignatureCheckerUpgradeable.isValidSignatureNow(
            signer,
            hash,
            signature
        );
        require(validation, "MonstropolyMagicBoxesShop: Wrong signature");
    }

    function _computeHashOfUintArray(uint256[] calldata array)
        internal
        pure
        returns (bytes32)
    {
        bytes memory concatenatedHashes;
        for (uint256 i = 0; i < array.length; i++) {
            bytes32 itemHash = keccak256(abi.encode(array[i]));
            concatenatedHashes = abi.encode(concatenatedHashes, itemHash);
        }
        return keccak256(concatenatedHashes);
    }

    function _computeHashOfUint8Array(uint8[] calldata array)
        internal
        pure
        returns (bytes32)
    {
        bytes memory concatenatedHashes;
        for (uint256 i = 0; i < array.length; i++) {
            bytes32 itemHash = keccak256(abi.encode(array[i]));
            concatenatedHashes = abi.encode(concatenatedHashes, itemHash);
        }
        return keccak256(concatenatedHashes);
    }

    function _msgSender()
        internal
        view
        override(BaseRelayRecipient, ContextUpgradeable)
        returns (address)
    {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData()
        internal
        view
        override(BaseRelayRecipient, ContextUpgradeable)
        returns (bytes memory _bytes)
    {}
}
