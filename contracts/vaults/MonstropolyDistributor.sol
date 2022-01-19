// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../shared/IMonstropolyDistributionVault.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract MonstropolyDistributor {

    address public vault;

    uint public startBlock;
    uint public endBlock;
    uint public cliff;

    uint256 public initial;
    uint256 public perBlock;

    uint256 public distributed;

    mapping(address=>uint256) public claimed;

    bytes32 public merkleRoot;
    string public uri;

    event Claim(address account, uint256 amount);
    event Init(uint startBlock, uint endBlock, uint cliff, uint256 initial, uint256 perBlock, bytes32 merkleRoot, string uri);

    function released() public view returns(uint256) {
        uint256 amount = 0;
        uint current = block.number;

        if (current > startBlock) {
            amount += initial;
        }

        if (current > startBlock + cliff) {
            if (current > endBlock) {
                amount += perBlock * (endBlock - startBlock - cliff);
            } else {
                amount += perBlock * (current - startBlock - cliff);
            }
        }
        
        return amount;
    }

    function pending(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) public view returns (uint256) {
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProofUpgradeable.verify(merkleProof, merkleRoot, node), "MonstropolyDistributor: invalid proof.");

        return (released() * amount / 100 ether) - claimed[account];
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external {
        uint256 claiming = pending(index, account, amount, merkleProof);
        require(claiming > 0,"MonstropolyDistributor: nothing to claim.");
        claimed[account] += claiming;
        distributed += claiming;
        IMonstropolyDistributionVault(vault).distribute(account, claiming);
        emit Claim(account, claiming);
    }

    function finish() public {
        require(msg.sender == vault);
        initial = released();
        endBlock = startBlock;
        cliff = 0;
    }

    constructor(uint startBlock_, uint endBlock_, uint cliff_, uint256 initial_, uint256 total_, bytes32 merkleRoot_, string memory uri_) {

        vault = msg.sender;

        require(endBlock_ > startBlock_, "MonstropolyDistributor: endBlock must exceed startBlock");
        startBlock = startBlock_;
        endBlock = endBlock_;
        cliff = cliff_;

        initial = initial_;
        perBlock = (total_ - initial_) / (endBlock - startBlock - cliff); 

        merkleRoot = merkleRoot_;
        uri = uri_;

        emit Init(startBlock, endBlock, cliff, initial, perBlock, merkleRoot, uri);
    }
}