pragma solidity 0.8.9;

interface IMonstropolyERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function transfer(address account, uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function burnFrom(address account, uint256 amount) external;

    function mint(address to, uint256 amount) external;

    function cap() external view returns (uint256);
}
