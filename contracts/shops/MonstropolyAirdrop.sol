// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyDeployer.sol";
import "../shared/IMonstropolyWhitelist.sol";
import "../shared/IMonstropolyDistributionVault.sol";

contract MonstropolyAirdrop is AccessControlProxyPausable, UUPSUpgradeableByRole {

  // uint256 public price;
  // address public bnbUsdFeed;

  // event Contribution(address account, uint256 value, uint256 amount, uint256 payback);
  // event Extraction(address account, uint256 amount);

  // function initialize () public initializer {
  //   __AccessControlProxyPausable_init(msg.sender);
  //   price = 4e16; // 0.04 USD
  //   bnbUsdFeed = 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526;
  // }

  // function setFeed(address newFeed) public onlyRole(DEFAULT_ADMIN_ROLE) {
  //     bnbUsdFeed = newFeed;
  // }

  // function setPrice(uint256 newPrice) public onlyRole(DEFAULT_ADMIN_ROLE) {
  //     price = newPrice;
  // }

  // function getTokens(uint256 amount) public view returns (uint256, uint256) {
  //   AggregatorV3Interface aggregatorInterface = AggregatorV3Interface(bnbUsdFeed);
  //   (,int256 answer,,,)= aggregatorInterface.latestRoundData();
  //   uint8 decimals = aggregatorInterface.decimals(); // 8
  //   uint256 expected =  (amount * uint256(answer) / 10**decimals) * 1e18 / price;
  //   IERC20Upgradeable erc20 = IERC20Upgradeable(IMonstropolyDeployer(config).get(keccak256("ERC20")));
  //   uint256 balance = erc20.balanceOf(address(this));

  //   if (expected > balance) {
  //     uint256 tokens = balance;
  //     uint256 payback = amount - (amount * balance / expected);
  //     return (tokens, payback);
  //   } else {
  //     return (expected, 0);
  //   }
  // }

  // function contribute() public payable returns (uint256) {
  //     address account = msg.sender;
  //     uint256 value = msg.value;
  //     address whitelist = IMonstropolyDeployer(config).get(keccak256("WHITELIST"));
  //     require(IMonstropolyWhitelist(whitelist).whitelisted(account), "MonstropolyAirdrop: address not whitelisted");

  //     IMonstropolyDistributionVault vault = IMonstropolyDistributionVault(IMonstropolyDeployer(config).get(keccak256("DISTRIBUTION_VAULT")));

  //     if (vault.available(address(this)) > 0) {
  //       vault.claim();
  //     }

  //     (uint256 amount, uint256 payback) = getTokens(value);

  //     require(amount > 0, "MonstropolyAirdrop: no tokens available");

  //     IERC20Upgradeable erc20 = IERC20Upgradeable(IMonstropolyDeployer(config).get(keccak256("ERC20")));
  //     erc20.transfer(account, amount);

  //     if (payback > 0) {
  //       payable(msg.sender).transfer(payback);
  //     }
      
  //     emit Contribution(account, value, amount, payback);
  //     return amount;
  // }

  // function extractFunds(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
  //   uint256 amount = address(this).balance;
  //   payable(account).transfer(amount);
  //   emit Extraction(account, amount);
  // }
}
