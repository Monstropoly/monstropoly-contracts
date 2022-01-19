// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

interface IMonstropolyDeployer {
    function addr(bytes32) external view returns (address);
    function get(bytes32) external view returns (address);
    function name(address) external view returns (bytes32);
    function setId(bytes32, address) external;
}