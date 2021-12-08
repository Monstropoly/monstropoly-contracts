// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

interface IMonstropolyDeployer {
    function addr(bytes32) external view returns (address);
    function get(bytes32) external view returns (address);
    function set(string memory , address) external;
}