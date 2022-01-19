// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMonstropolyDistributor {
    
    function startBlock() external view returns(uint);
    function endBlock() external view returns(uint);
    function cliff() external view returns(uint);

    function initial() external view returns(uint256);
    function perBlock() external view returns(uint256);
    function distributed() external view returns(uint256);
    function claimed(address account) external view returns(uint256);

    function merkleRoot() external view returns(bytes32);
    function uri() external view returns(string memory);

    function released() external view returns(uint256);

    function pending(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external view returns (uint256);

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external;

    function initialize(uint startBlock_, uint endBlock_, uint cliff_, uint256 initial_, uint256 total_, bytes32 merkleRoot_, string memory uri_) external;

    function updateMerkleRoot(bytes32 merkleRoot_, string memory uri_) external;
}