// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../../shared/IMonstropolyData.sol";
import "../../shared/IMonstropolyFactory.sol";
import "../../shared/IMonstropolyGenScience.sol";
import "../../shared/IMonstropolyERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "../../utils/AccessControlProxyPausable.sol";
import "../../utils/UUPSUpgradeableByRole.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "hardhat/console.sol";

contract MonstropolyTrainer is AccessControlProxyPausable, UUPSUpgradeableByRole, BaseRelayRecipient {

    string public override versionRecipient = "2.4.0";

    mapping(uint => mapping(uint => mapping(uint => uint))) public prices; //asset:stat:increment:price

    event UpdatePrice(uint asset, uint statIndex, uint increment, uint price);
    event TrainStat(uint tokenId, uint statIndex, uint increment, uint price);

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);

        _updatePrice(0, 0, 1, 100 ether);
        _updatePrice(0, 0, 5, 350 ether);
        _updatePrice(0, 1, 1, 150 ether);
        _updatePrice(0, 1, 5, 400 ether);
        _updatePrice(1, 0, 1, 200 ether);
        _updatePrice(1, 0, 5, 500 ether);
        _updatePrice(1, 1, 1, 100 ether);
        _updatePrice(1, 1, 5, 350 ether);
        _updatePrice(0, 3, 5, 600 ether);
    }

    function _msgSender() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, ContextUpgradeable) view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

    function setTrustedForwarder(address _forwarder) public /*onlyRole(DEPLOYER)*/ {
        _setTrustedForwarder(_forwarder);
    }

    function updatePrice(uint[] calldata asset_, uint[] calldata statIndex_, uint[] calldata increment_, uint[] calldata price_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        for(uint i = 0; i < asset_.length; i++) {
            _updatePrice(asset_[i], statIndex_[i], increment_[i], price_[i]);
        }
    }

    function _updatePrice(uint asset_, uint statIndex_, uint increment_, uint price_) private {
        prices[asset_][statIndex_][increment_] = price_;
        emit UpdatePrice(asset_, statIndex_, increment_, price_);
    }

    // TBD consider allow train to thirds
    function trainStat(uint tokenId_, uint statIndex_, uint increment_) public returns(uint) {
        address account_ = _msgSender();

        IMonstropolyFactory factory_ = IMonstropolyFactory(IMonstropolyDeployer(config).get(keccak256("FACTORY")));
        IMonstropolyFactory.Hero memory hero_ = factory_.heroeOfId(tokenId_);
        string memory gen_ = hero_.genetic;
        IMonstropolyData data_ = IMonstropolyData(IMonstropolyDeployer(config).get(keccak256("DATA")));
        gen_ = data_.incrementStatInGen(gen_, increment_, statIndex_);
        uint asset_ = data_.getAssetTypeByGen(gen_);

        //TBD: consider a burnFrom
        factory_.transferFrom(account_, address(0x000000000000000000000000000000000000dEaD), tokenId_);
        uint price_ = prices[asset_][statIndex_][increment_];
        require(price_ > 0, "MonstropolyTrainer: train not allowed");
        IMonstropolyERC20 erc20_ = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("GLD")));
        erc20_.transferFrom(account_, IMonstropolyDeployer(config).get(keccak256("TREASURY_WALLET")), price_);
        uint newTokenId_ = factory_.mint(account_, gen_);

        emit TrainStat(tokenId_, statIndex_, increment_, price_);
        return newTokenId_;
    }
}