// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;
import "../shared/IMonstropolyERC20.sol";
import "../shared/IMonstropolyFactory.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../utils/CoinCharger.sol";
import "../shared/IMonstropolyDeployer.sol";
import "../shared/IMonstropolyTickets.sol";
import "../shared/IMonstropolyMagicBoxesShop.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

/**
    Why stop using ERC1155?
    - Trying to solve the loop of open, cannot mint multiple NFTs in same TX
    - To open/mint NFTs 1/TX I need to have separate balances (1 per asset)
    - It would fit in ERC1155, but I also need to handle vip assets so is a mess with ERC1155
    TBD: discuss this with victor and sokar
 */

contract MonstropolyMagicBoxesShop is
    IMonstropolyMagicBoxesShop,
    UUPSUpgradeableByRole,
    BaseRelayRecipient,
    CoinCharger,
    EIP712Upgradeable
{
    string public override versionRecipient = "2.4.0";
    bytes32 private immutable _Monstropoly_MAGIC_BOXES_SHOP_TYPEHASH =
        keccak256(
            "Mint(address receiver,bytes32 tokenId,uint8 rarity,uint8 breedUses,uint8 generation,uint256 validUntil)"
        );

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
        onlyRole(DEFAULT_ADMIN_ROLE) 
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
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
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
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        boxSupply[id] = supply;
        emit UpdateBoxSupply(id, supply);
    }

    function updateTicketToBoxId(
        address ticketAddress,
        uint256 boxId,
        bool isValid
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _ticketsToBoxId[ticketAddress][boxId] = isValid;
        emit UpdateTicketBoxId(ticketAddress, boxId, isValid);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function purchase(
        uint256 boxId,
        uint256[] calldata tokenId,
        uint8 rarity,
        uint8 breedUses,
        uint8 generation,
        uint256 validUntil,
        bytes memory signature, 
        address signer
    ) external payable {
        address account = _msgSender();
        {
            uint256 price = box[boxId].price;

            require(price > 0, "MonstropolyMagicBoxesShop: wrong 0 price");

            if (box[boxId].treasuryPercentage > 0) {
                uint256 treasuryAmount_ = (price * box[boxId].treasuryPercentage) /
                    100 ether;
                _transferFrom(
                    box[boxId].token,
                    account,
                    IMonstropolyDeployer(config).get(TREASURY_WALLET_ID),
                    treasuryAmount_
                );
            }

            if (box[boxId].burnPercentage > 0) {
                uint256 burnAmount_ = (price * box[boxId].burnPercentage) / 100 ether;
                _burnFromERC20(box[boxId].token, account, burnAmount_);
            }
        }
        
        {
            _verifySignature(account, tokenId, rarity, breedUses, generation, validUntil, signature, signer);
            _spendBoxSupply(boxId);
            _mintNFT(boxId, account, tokenId, rarity, breedUses, generation);
        }
    }

    function purchaseWithTicket(
        uint256 ticketTokenId,
        address ticketAddress,
        uint256 boxId,
        uint256[] calldata tokenId,
        uint8 rarity,
        uint8 breedUses,
        uint8 generation,
        uint256 validUntil,
        bytes memory signature, 
        address signer
    ) external {
        address account = _msgSender();
        IMonstropolyTickets tickets = IMonstropolyTickets(ticketAddress);

        require(_ticketsToBoxId[ticketAddress][boxId], "Invalid ticket");
        require(account == tickets.ownerOf(ticketTokenId));
        
        {
            _verifySignature(account, tokenId, rarity, breedUses, generation, validUntil, signature, signer);
            _spendBoxSupply(boxId);
            tickets.burn(ticketTokenId);
            _mintNFT(boxId, account, tokenId, rarity, breedUses, generation);
        }
    }

    function _mintNFT(
        uint256 id, 
        address account,
        uint256[] calldata tokenId,
        uint8 rarity,
        uint8 breedUses,
        uint8 generation
    ) internal {

        IMonstropolyFactory factory = IMonstropolyFactory(
            IMonstropolyDeployer(config).get(FACTORY_ID)
        );

        uint256 boxAmount = box[id].amount;
        require(boxAmount == tokenId.length, "MonstropolyMagicBoxesShop: wrong tokenId array len");

        for (uint256 i = 0; i < boxAmount; i++) {
            factory.mint(
                account,
                tokenId[i],
                rarity,
                breedUses,
                generation
            );
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
        uint8 rarity,
        uint8 breedUses,
        uint8 generation,
        uint256 validUntil,
        bytes memory signature, 
        address signer
    ) internal {
        require(validUntil > block.timestamp || validUntil == 0, "Expired signature");
        require(hasRole(DEFAULT_ADMIN_ROLE, signer), "Wrong signer"); //TBD: change role

        bytes32 structHash = keccak256(
            abi.encode(
                _Monstropoly_MAGIC_BOXES_SHOP_TYPEHASH,
                receiver,
                _computeHashOfUintArray(tokenId),
                rarity,
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
        require(validation, "Wrong signature");
    }

    function _computeHashOfUintArray(uint256[] calldata array) public view returns(bytes32) {
        bytes memory concatenatedHashes;
        for(uint i = 0; i < array.length; i++) {
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
