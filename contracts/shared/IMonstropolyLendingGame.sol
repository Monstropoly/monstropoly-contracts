// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

interface IMonstropolyLendingGame {
    struct Lend {
        address lender;
        address borrower;
        uint256 borrowerPercentage;
        uint256 startDate;
        uint256 duration;
        uint256 price;
        address payToken;
    }

    event LendOffer(
        uint256 indexed tokenId,
        address indexed lender,
        address indexed borrower,
        uint256 borrowerPercentage,
        uint256 startDate,
        uint256 duration,
        uint256 price,
        address payToken
    );

    event LendTake(uint256 indexed tokenId, address indexed borrower);
    event LendEnd(uint256 indexed tokenId);

    function cancelLend(uint256 tokenId) external;

    function claimGamer(uint256 tokenId) external;

    function getGamer(uint256 tokenId) external view returns (address);

    function getLend(uint256 tokenId) external view returns (Lend memory);

    function offerLend(
        uint256 tokenId,
        address borrower,
        uint256 borrowerPercentage,
        uint256 duration,
        uint256 price,
        address payToken
    ) external;

    function takeLend(uint256 tokenId) external payable;
}
