// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMonstropolyRewardsDistributor {
    
    function startBlock() external view returns(uint);
    function endBlock() external view returns(uint);
    function changeBlock() external view returns(uint);

    function rewardPerBlock() external view returns(uint256);
    function increment() external view returns(uint256);
    function distributed(bytes32 account) external view returns(uint256);
    function allocation(bytes32 account) external view returns(uint256);

    function released(bytes32 account) external view returns(uint256);
    function available(bytes32 account) external view returns(uint256);

    function distribute(address account, uint256 amount) external;
}