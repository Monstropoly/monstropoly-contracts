// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;
import "../shared/IMonstropolyERC20.sol";
import "../shared/IMonstropolyGenScience.sol";
import "../shared/IMonstropolyFactory.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyDeployer.sol";
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

contract MonstropolyMagicBoxesShop is UUPSUpgradeableByRole, BaseRelayRecipient {

    struct MagicBox {
        uint256 price;
        bool vip;
        uint256[] assets;
    }

    string public override versionRecipient = "2.4.0";
    address public priceFeed;
    address public pool;

    mapping(uint256 => MagicBox) public box;
    mapping(address => mapping(bool => mapping(uint => uint))) public balances;

    event MagicBoxPurchased(address account, uint256 id, uint256 amount);
    event MagicBoxOpened(address account, uint256 asset, bool vip, uint256 tokenId);
    event MagicBoxUpdated(uint256 id, uint256[] assets, uint256 price, bool vip);

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

    function getTokens(uint256 value) public view returns (uint256) {
        AggregatorV3Interface aggregatorInterface = AggregatorV3Interface(priceFeed);
        IUniswapV2Pair pair = IUniswapV2Pair(pool);

        // 1. PAIR TOKEN vs USD
        (,int256 answer,,,)= aggregatorInterface.latestRoundData(); // 500e8
        uint8 decimals = aggregatorInterface.decimals();

        // 2. ERC20 vs PAIR TOKEN
        (uint256 reserves0, uint256 reserves1,) = pair.getReserves(); // 12500e18, 1e18
        address token0 = pair.token0();
        uint256 poolPrice = (token0 == IMonstropolyDeployer(config).get(keccak256("ERC20"))) ? ((reserves0 * 1e18) / reserves1) : ((reserves1 * 1e18) / reserves0); // 12500e18 * 1e18 / 1e18

        // 3. ERC20 vs USD
        uint256 price = poolPrice * 10**decimals / uint256(answer); // 500e8 * 12500e18 / e8 = 1250MPOLIS

        // 4. TOKENS FOR VALUE
        return (value * price) / 1e18;
    } 

    function initialize() public initializer {
        _init();
    }

    function _init() internal initializer {
        __AccessControlProxyPausable_init(msg.sender);

        priceFeed = 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf;
        pool = 0x0000000000000000000000000000000000000001;
    }

    function setTrustedForwarder(address _forwarder) public /* TBD: onlyRole(DEPLOYER)*/ {
        _setTrustedForwarder(_forwarder);
    }

    function _updateMagicBox(uint256 id, uint256[] memory assets, uint256 price, bool vip) internal {
        box[id] = MagicBox(price, vip, assets);
        emit MagicBoxUpdated(id, assets, price, vip);
    }

    function updateMagicBox(uint256 id, uint256[] memory assets, uint256 price, bool vip) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateMagicBox(id, assets, price, vip);
    }

    function updateFeeds(address newPriceFeed, address newPool) public onlyRole(DEFAULT_ADMIN_ROLE) {
        priceFeed = newPriceFeed;
        pool = newPool;
    } 

    function purchase(uint256 id, uint256 amount) public virtual {
        address account = msg.sender;
        uint256 price = box[id].price * amount;
        
        require(price > 0, "MonstropolyMagicBoxesShop: box not created");

        IMonstropolyERC20 erc20 = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
        erc20.burnFrom(account, price);

        for(uint i = 0; i < box[id].assets.length; i++) {
            balances[account][box[id].vip][box[id].assets[i]] += amount;
        }

        emit MagicBoxPurchased(account, id, amount);
    }

    function open(uint asset, bool vip) public virtual {  
        address account = _msgSender();      
        require(balances[account][vip][asset] >= 1, "MonstropolyMagicBoxesShop: amount exceeds balance");        
        balances[account][vip][asset]--;
        IMonstropolyGenScience genScience = IMonstropolyGenScience(IMonstropolyDeployer(config).get(keccak256("SCIENCE")));
        IMonstropolyFactory factory = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        string memory gen = genScience.generateAsset(asset, vip);
        uint256 tokenId = factory.mint(account, gen);
        emit MagicBoxOpened(account, asset, vip, tokenId);
    }
}
