interface IMonstropolyLendingGame {
    struct Lend {
        uint256 tokenId;
        address lender;
        address borrower;
        uint256 borrowerPercentage;
        uint256 startDate;
        uint256 duration;
        uint256 price;
        address payToken;
        bool executed;
    }

	event LendOffer(
        uint256 indexed tokenId, 
        uint256 indexed lendId, 
        address indexed lender, 
        address borrower, 
        uint256 borrowerPercentage, 
        uint256 startDate,
        uint256 duration,
        uint256 price,
        address payToken
    );

    event LendTake(uint256 indexed lendId, address indexed borrower);
    event LendEnd(uint256 indexed lendId);

    function cancelLend(uint256 lendId) external;

    function claimGamer(uint256 lendId) external;

    function getGamer(uint256 tokenId) external view returns (address);

    function getLend(uint256 lendId) external view returns (Lend memory);

    function offerLend(
        uint256 tokenId,
        address borrower,
        uint256 borrowerPercentage,
        uint256 duration,
        uint256 price,
        address payToken
    ) external;

    function takeLend(uint256 lendId) external payable;
}
