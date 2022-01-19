// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

interface IMonstropolyWhitelist {
    function whitelisted(address account) external view returns (bool);
    function merkleRoot(address account) external view returns (bytes32);
    function uri(address account) external view returns (string memory);
    function updateWhitelist(bytes32 newMerkleRoot, string calldata newUri) external;
}
