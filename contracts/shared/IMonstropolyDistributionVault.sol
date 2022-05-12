// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMonstropolyDistributionVault {
    function distributed(address) external view returns (uint256);

    function allocated(address) external view returns (uint256);

    function available(address) external view returns (uint256);

    function assigned() external view returns (uint256);

    function distribute(address account, uint256 amount) external;

    function config() external returns (address);
}
