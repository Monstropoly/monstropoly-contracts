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

/**
    Why stop using ERC1155?
    - Trying to solve the loop of open, cannot mint multiple NFTs in same TX
    - To open/mint NFTs 1/TX I need to have separate balances (1 per asset)
    - It would fit in ERC1155, but I also need to handle vip assets so is a mess with ERC1155
    TBD: discuss this with victor and sokar
 */

contract MonstropolyMagicBoxesShop is IMonstropolyMagicBoxesShop, UUPSUpgradeableByRole, BaseRelayRecipient, CoinCharger {

    string public override versionRecipient = "2.4.0";
    string[] private _genetics;
    uint8[] private _rarities;
    uint8[] private _breedUses;

    mapping(uint256 => MagicBox) public box;
    mapping(uint256 => uint256) public boxSupply;

    bytes32 public constant DATA_ID = keccak256("DATA");
    bytes32 public constant TREASURY_WALLET_ID = keccak256("TREASURY_WALLET");
    bytes32 public constant FACTORY_ID = keccak256("FACTORY");
    bytes32 public constant TICKETS_ID = keccak256("TICKETS");

    function initialize() public initializer {
        _init();
    }

    function _init() internal initializer {
        __AccessControlProxyPausable_init(msg.sender);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function setTrustedForwarder(address _forwarder) public /* TBD: onlyRole(DEPLOYER)*/ {
        _setTrustedForwarder(_forwarder);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function updateMagicBox(uint256 id, uint256 amount, uint256 price, address token, uint256 burnPercentage, uint256 treasuryPercentage, uint8 specie) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateMagicBox(id, amount, price, token, burnPercentage, treasuryPercentage, specie);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function updateBoxSupply(uint256 id, uint256 supply) public onlyRole(DEFAULT_ADMIN_ROLE) {
        boxSupply[id] = supply;
        emit UpdateBoxSupply(id, supply);
    }

    function setMintParams(string[] calldata genetics_, uint8[] calldata rarities_, uint8[] calldata breedUses_) public /* TBD: onlyRole(FACTORY_GENETICS_SETTER)*/ {
        delete _genetics;
        delete _rarities;
        delete _breedUses;
        for(uint i = 0; i < genetics_.length; i++) {
            _genetics.push(genetics_[i]);
            _rarities.push(rarities_[i]);
            _breedUses.push(breedUses_[i]);
        }
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function purchase(uint id) public payable virtual {
        _spendBoxSupply(id);
        address account = _msgSender();
        uint256 price = box[id].price;
        
        require(price > 0, "MonstropolyMagicBoxesShop: wrong 0 price");

        if (box[id].treasuryPercentage > 0) {
            uint treasuryAmount_ = price * box[id].treasuryPercentage / 100 ether;
            _transferFrom(box[id].token, account, IMonstropolyDeployer(config).get(TREASURY_WALLET_ID), treasuryAmount_);
        }

        if (box[id].burnPercentage > 0) {
            uint burnAmount_ = price * box[id].burnPercentage / 100 ether;
            _burnFromERC20(box[id].token, account, burnAmount_);
        }

        _mintNFT(id, account);
    }

    function purchaseWithTicket(uint tokenId) public {
        address account = _msgSender();
        IMonstropolyTickets tickets = IMonstropolyTickets(IMonstropolyDeployer(config).get(TICKETS_ID));
        uint id = tickets.boxIdOfToken(tokenId);
        require(account == tickets.ownerOf(tokenId));
        _spendBoxSupply(id);
        tickets.burn(tokenId);
        _mintNFT(id, account);
    }

    function _mintNFT(uint id, address account) internal {
        require(_genetics.length == box[id].amount, "MonstropolyMagicBoxesShop: not enough genetics");

        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(FACTORY_ID));

        uint[] memory tokenIds_ = new uint[](box[id].amount);

        for(uint i = 0; i < box[id].amount; i++) {
            if (box[id].specie != 0) _checkSpecie(_genetics[i], box[id].specie);
            tokenIds_[i] = factory.mint(account, _genetics[i], _rarities[i], _breedUses[i]);
        }

        delete _genetics;
        delete _rarities;
        delete _breedUses;
    }

    function _spendBoxSupply(uint id) internal {
        require(boxSupply[id] > 0, "MonstropolyMagicBoxesShop: no box supply");
        boxSupply[id]--;
    }

    function _checkSpecie(string memory gen, uint8 specie) internal view returns(bool) {
        IMonstropolyData data = IMonstropolyData(IMonstropolyDeployer(config).get(DATA_ID));
        uint8 decodedSpecie = uint8(data.getValueFromGen(gen, 2));
        return specie == decodedSpecie;
    }

    function _updateMagicBox(uint256 id, uint256 amount, uint256 price, address token, uint256 burnPercentage_, uint256 treasuryPercentage_, uint8 specie) internal {
        require((burnPercentage_ + treasuryPercentage_) == 100 ether, "MonstropolyMagicBoxesShop: wrong percentages");
        box[id] = MagicBox(price, token, burnPercentage_, treasuryPercentage_, amount, specie);
        emit MagicBoxUpdated(id, amount, price, token, burnPercentage_, treasuryPercentage_, specie);
    }

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes memory _bytes) {}
}
