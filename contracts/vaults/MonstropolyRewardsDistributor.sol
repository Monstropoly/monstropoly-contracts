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
    event UpdateAllocations(uint72[4] allocations);

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

    function updateAllocations(uint72[4] memory allocations) public {
        require(msg.sender == vault, "MonstropolyRewardsDistributor: only vault can update allocations");
        
        uint72 total = 0;

        for(uint i = 0; i < allocations.length; i++) {
            total += allocations[i];
        }

        require(total == 100 ether, "MonstropolyRewardsDistributor: allocations aggregate must be 100 ether");

        allocation[keccak256("STAKING")] = allocations[0];
        allocation[keccak256("STAKING_NFT")] = allocations[1];
        allocation[keccak256("FARMING")] = allocations[2];
        allocation[keccak256("P2E")] = allocations[3];

        emit UpdateAllocations(allocations);
    }

    constructor (uint startBlock_, uint endBlock_, uint changeBlock_, uint256 amountA, uint256 amountB) {

        vault = msg.sender;
        startBlock = startBlock_;
        endBlock = endBlock_;
        changeBlock = changeBlock_;

        rewardPerBlock = amountA / (endBlock - startBlock);
        increment = (2 * amountB) / ((endBlock - changeBlock) ** 2);

        uint72[4] memory allocations = [
            20 ether,
            20 ether,
            30 ether,
            30 ether
        ];

        updateAllocations(allocations);
        
        emit Init(startBlock, endBlock, changeBlock, rewardPerBlock, increment);
    }
}
