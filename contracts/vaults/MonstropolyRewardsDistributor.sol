// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../shared/IMonstropolyDeployer.sol";
import "../shared/IMonstropolyDistributionVault.sol";

contract MonstropolyRewardsDistributor {

    mapping(bytes32=>uint256) public allocation;
    mapping(bytes32=>uint256) public distributed;
    
    uint public startBlock;
    uint public endBlock;
    uint public changeBlock;
    uint256 public increment;
    uint256 public rewardPerBlock;

    address public vault;

    event Init(uint startBlock, uint endBlock, uint changeBlock, uint256 rewardPerBlock, uint256 increment);
    event DistributeTokens(address sender, address account, uint256 amount);

    function _released() internal view returns (uint256) {

        uint256 amount = 0;

        if(block.number > startBlock) {
            if(block.number > endBlock) {
                amount += rewardPerBlock * (endBlock - startBlock);
                amount += (increment * ((endBlock - changeBlock) ** 2)) / 2;
            } else {
                amount += rewardPerBlock * (block.number - startBlock);
                if (block.number > changeBlock) {
                    amount += (increment * ((block.number - changeBlock) ** 2)) / 2;
                }
            }
        } else {
            return 0;
        }

        return amount;
    }

    function released() public view returns (uint256) {
        return _released();
    }

    function released(bytes32 id) public view returns (uint256) {
        return ((_released() * allocation[id]) / 100 ether);
    }

    function available(bytes32 id) public view returns (uint256) {
      return released(id) - distributed[id];
    }

    function distribute(address account, uint256 amount) public {
        bytes32 id = IMonstropolyDeployer(IMonstropolyDistributionVault(vault).config()).name(msg.sender);
        require(amount <= available(id), "MonstropolyRewardsDistributor: amount exceeds available");
        distributed[id] += amount;
        IMonstropolyDistributionVault(IMonstropolyDeployer(IMonstropolyDistributionVault(vault).config()).get(keccak256("DISTRIBUTION_VAULT"))).distribute(account, amount); 
        emit DistributeTokens(msg.sender, account, amount);
    }

    constructor (uint startBlock_, uint endBlock_, uint changeBlock_, uint256 amountA, uint256 amountB) {

        vault = msg.sender;
        startBlock = startBlock_;
        endBlock = endBlock_;
        changeBlock = changeBlock_;

        rewardPerBlock = amountA / (endBlock - startBlock);
        increment = (2 * amountB) / ((endBlock - changeBlock) ** 2);
    
        allocation[keccak256("STAKING")] = 20 ether;
        allocation[keccak256("FARMING")] = 30 ether;
        allocation[keccak256("STAKING_NFT")] = 20 ether;
        allocation[keccak256("P2E")] = 30 ether;

        emit Init(startBlock, endBlock, changeBlock, rewardPerBlock, increment);
    }
}
