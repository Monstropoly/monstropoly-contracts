// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title The interface for MonstropolyFarming
/// @notice Manages users farming balances and rewards
/// @dev Designed for erc20 tokens with automatic rewards
interface IMonstropolyFarming {
    /// @notice Emitted when an account claims rewards
    /// @param account Account claiming rewards
    event Claim(address account);

    /// @notice Emitted when an account deposits LP tokens
    /// @param account Account depositing LP tokens
    /// @param amount Amount deposited
    event Deposit(address account, uint256 amount);

    /// @notice Emitted when an account withdraws LP tokens
    /// @param account Account withdrawing LP tokens
    /// @param amount Amount withdrawn
    event Withdraw(address account, uint256 amount);

    /// @notice Emitted when an account is rewarded
    /// @param account Account receiving rewards
    /// @param amount Amount of rewards received
    event Rewards(address account, uint256 amount);

    /// @notice Emitted when contract LP token balance is synced
    /// @param account Recipient where tokens are transferred
    /// @param amount Amount transfered
    event SyncBalance(address account, uint256 amount);

    /// @notice Emitted when the autoreward feature changes
    /// @param autoreward State of autoreward
    event ToggleAutoreward(bool autoreward);

    /// @notice Emitted when the state of the contract is updated
    /// @param balance Contract balance of LP tokens
    /// @param accRewardsPerShare Accumulated rewards per share of balance
    /// @param lastUpdate Block when the update is processed
    /// @param stakers Number of stakers of LP tokens in this contract
    event Update(
        uint256 balance,
        uint256 accRewardsPerShare,
        uint256 lastUpdate,
        uint256 stakers
    );

    /// @notice Emitted when a user performs an action and account state changes
    /// @param account Account being updated
    /// @param amount Balance of LP tokens of the account in this contract
    /// @param rewardDebt Debt compared agaist accumulated to calculate rewards
    /// @param notClaimed Rewards not claimed yet, accumulated when autoreward is disabled
    event UpdateUserInfo(
        address account,
        uint256 amount,
        uint256 rewardDebt,
        uint256 notClaimed
    );

    /// @notice Emitted when an account migrates funds from this contract
    /// @param from Address of this contract
    /// @param to Address of the contract where funds are deposited
    /// @param account Account which migrates funds
    /// @param amount Funds migrated
    /// @param response Response for the deposit transaction
    event Migrate(
        address from,
        address to,
        address account,
        uint256 amount,
        bytes response
    );

    /// @notice Returns accumulated rewards per each share of balance
    /// @return Accumulated rewards per share
    function accRewardsPerShare() external view returns (uint256);

    /// @notice Returns autoreward which generates user rewards at any action
    /// @return Autoreward boolean variable
    function autoreward() external view returns (bool);

    /// @notice Returns contract balance of LP tokens
    /// @return Contract balance of LP tokens
    function balance() external view returns (uint256);

    /// @notice Rewards sender if there is pending rewards
    function claim() external;

    /// @notice Deposits LP tokens full balance of account
    /// @param account Account of depositor
    function depositAll(address account) external;

    /// @notice Deposits LP tokens amount of account
    /// @param account Account of depositor
    /// @param amount Amount to deposit
    function depositFrom(address account, uint256 amount) external;

    /// @notice Withdraws sender tokens without updating and rewarding
    /// @return Sender withdrawn balance
    function emergencyWithdraw() external returns (uint256);

    /// @notice Returns LP token gap between real balance and deposited
    /// @return LP token gap
    function getTokenGap() external view returns (uint256);

    /// @notice Returns user LP balance in contract
    /// @param user_ Address of user
    /// @return User LP balance in contract
    function getUserBalance(address user_) external view returns (uint256);

    /// @notice Initializes the contract
    function initialize() external;

    /// @notice Returns last reward per block assigned to this contract
    /// @return Last reward per block
    function lastReward() external view returns (uint256);

    /// @notice Returns last block when the contract was updated (rewards update)
    /// @return Last block when the contract was updated
    function lastUpdate() external view returns (uint256);

    /// @notice Migrates sender contract balance from this contract to another contract
    /// @param to Address of the new contract
    /// @return Response from depositFrom next contract transaction
    function migrate(address to) external returns (bytes calldata);

    /// @notice Returns pending rewards for a user
    /// @param user_ Address of user
    /// @return Pending rewards
    function pendingRewards(address user_) external view returns (uint256);

    /// @notice Returns number of users with LP tokens in this contract
    /// @return Number of stakers of LP tokens
    function stakers() external view returns (uint256);

    /// @notice Syncs LP tokens balance, sending gap to account (callable only by admin)
    /// @param account Recipient account to send gap
    function syncBalance(address account) external;

    /// @notice Toggles/switches the autoreward variable
    function toggleAutoreward() external;

    /// @notice Withdraws LP tokens amount of sender balance from this contract
    /// @param amount Amount to withdraw
    /// @return Amount finally withdrawn
    function withdraw(uint256 amount) external returns (uint256);

    /// @notice Withdraws sender balance completely from this contract (calls withdraw(uint256))
    /// @return Amount finally withdrawn
    function withdrawAll() external returns (uint256);
}
