// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;
import "../shared/IMonstropolyERC20.sol";
import "../shared/IMonstropolyGenScience.sol";
import "../shared/IMonstropolyFactory.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../utils/CoinCharger.sol";
import "../shared/IMonstropolyDeployer.sol";
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

    mapping(uint256 => MagicBox) public box;
    mapping(address => mapping(bool => mapping(uint => uint))) public balances;

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
    function updateMagicBox(uint256 id, uint256[] memory assets, uint256 price, address token, uint256 burnPercentage_, uint256 treasuryPercentage_, bool vip) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateMagicBox(id, assets, price, token, burnPercentage_, treasuryPercentage_, vip);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function purchase(uint256 id, uint256 amount) public payable virtual {
        address account = msg.sender;
        uint256 price = box[id].price * amount;
        
        require(price > 0, "MonstropolyMagicBoxesShop: wrong 0 price");

        if (box[id].treasuryPercentage > 0) {
            uint treasuryAmount_ = price * box[id].treasuryPercentage /  100 ether;
            _transferFrom(box[id].token, account, IMonstropolyDeployer(config).get(keccak256("TREASURY_WALLET")), treasuryAmount_);
        }

        if (box[id].burnPercentage > 0) {
            uint burnAmount_ = price * box[id].burnPercentage /  100 ether;
            _burnFromERC20(box[id].token, account, burnAmount_);
        }

        for(uint i = 0; i < box[id].assets.length; i++) {
            balances[account][box[id].vip][box[id].assets[i]] += amount;
        }

        emit MagicBoxPurchased(account, id, amount);
    }

    /// @inheritdoc IMonstropolyMagicBoxesShop
    function open(uint asset, bool vip) public virtual returns(uint) {  
        address account = _msgSender();      
        require(balances[account][vip][asset] >= 1, "MonstropolyMagicBoxesShop: amount exceeds balance");        
        balances[account][vip][asset]--;
        IMonstropolyGenScience genScience = IMonstropolyGenScience(IMonstropolyDeployer(config).get(keccak256("SCIENCE")));
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        string memory gen = genScience.generateAsset(asset, vip);
        uint256 tokenId = factory.mint(account, gen);
        emit MagicBoxOpened(account, asset, vip, tokenId);
        return tokenId;
    }

    function _updateMagicBox(uint256 id, uint256[] memory assets, uint256 price, address token, uint256 burnPercentage_, uint256 treasuryPercentage_, bool vip) internal {
        require((burnPercentage_ + treasuryPercentage_) == 100 ether, "MonstropolyMagicBoxesShop: wrong percentages");
        box[id] = MagicBox(price, token, burnPercentage_, treasuryPercentage_, vip, assets);
        emit MagicBoxUpdated(id, assets, price, token, burnPercentage_, treasuryPercentage_, vip);
    }

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes memory _bytes) {}
}
