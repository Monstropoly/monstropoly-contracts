// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title The interface for MonstropolyStaking
/// @notice Manages users staking balances and rewards
/// @dev Designed for erc20 tokens with automatic rewards
interface IMonstropolyStaking {
    /// @notice Emitted when an account claims rewards
    /// @param account Account claiming rewards
    event Claim(address account);

    /// @notice Emitted when an account deposits tokens
    /// @param account Account depositing tokens
    /// @param amount Amount deposited
    event Deposit(address account, uint256 amount);

    /// @notice Emitted when an account withdraws tokens
    /// @param account Account withdrawing tokens
    /// @param amount Amount withdrawn
    /// @param burned Amount burned
    event Withdraw(address account, uint256 amount, uint256 burned);

    /// @notice Emitted when an account is rewarded
    /// @param account Account receiving rewards
    /// @param amount Amount of rewards received
    event Rewards(address account, uint256 amount);

    /// @notice Emitted when contract token balance is synced
    /// @param account Recipient where tokens are transferred
    /// @param amount Amount transfered
    event SyncBalance(address account, uint256 amount);

    /// @notice Emitted when the autoreward feature changes
    /// @param autoreward State of autoreward
    event ToggleAutoreward(bool autoreward);

    /// @notice Emitted when the state of the contract is updated
    /// @param balance Contract balance of tokens
    /// @param accRewardsPerShare Accumulated rewards per share of balance
    /// @param lastUpdate Block when the update is processed
    /// @param stakers Number of stakers of tokens in this contract
    event Update(
        uint256 balance,
        uint256 accRewardsPerShare,
        uint256 lastUpdate,
        uint256 stakers
    );

    /// @notice Emitted when a user performs an action and account state changes
    /// @param account Account being updated
    /// @param amount Balance of tokens of the account in this contract
    /// @param rewardDebt Debt compared agaist accumulated to calculate rewards
    /// @param notClaimed Rewards not claimed yet, accumulated when autoreward is disabled
    /// @param endInterval End of fees interval for this account
    event UpdateUserInfo(
        address account,
        uint256 amount,
        uint256 rewardDebt,
        uint256 notClaimed,
        uint256 endInterval
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

    /// @notice Emitted when fees are updated
    /// @param minFee Current minimum burning fee
    /// @param minFee Current maximum burning fee
    event SetFees(uint256 minFee, uint256 maxFee);

    /// @notice Emitted when fee interval is updated
    /// @param feeInterval Current burning fee interval
    event SetFeeInterval(uint256 feeInterval);

    /// @notice Returns accumulated rewards per each share of balance
    /// @return Accumulated rewards per share
    function accRewardsPerShare() external view returns (uint256);

    /// @notice Returns autoreward which generates user rewards at any action
    /// @return Autoreward boolean variable
    function autoreward() external view returns (bool);

    /// @notice Returns contract balance of tokens
    /// @return Contract balance of tokens
    function balance() external view returns (uint256);

    /// @notice Rewards sender if there is pending rewards
    function claim() external;

    /// @notice Deposits tokens full balance of account
    /// @param account Account of depositor
    function depositAll(address account) external;

    /// @notice Deposits tokens amount of account
    /// @param account Account of depositor
    /// @param amount Amount to deposit
    function depositFrom(address account, uint256 amount) external;

    /// @notice Withdraws sender tokens without updating and rewarding
    /// @return Sender withdrawn balance
    function emergencyWithdraw() external returns (uint256);

    /// @notice Returns interval when fees vary
    /// @return Fee interval
    function feeInterval() external returns (uint256);

    /// @notice Returns number of blocks left until end of fee interval
    /// @param account Account referred
    /// @return Number of blocks until end of fee interval
    function getBlocksLeft(address account) external view returns (uint256);

    /// @notice Returns burning fee for this account
    /// @param account Account referred
    /// @return Burning fee in ether
    function getFee(address account) external view returns (uint256);

    /// @notice Returns token gap between real balance and deposited
    /// @return token gap
    function getTokenGap() external view returns (uint256);

    /// @notice Returns user balance in contract
    /// @param user_ Address of user
    /// @return User balance in contract
    function getUserBalance(address user_) external view returns (uint256);

    /// @notice Initializes the contract
    function initialize() external;

    /// @notice Returns last reward per block assigned to this contract
    /// @return Last reward per block
    function lastReward() external view returns (uint256);

    /// @notice Returns last block when the contract was updated (rewards update)
    /// @return Last block when the contract was updated
    function lastUpdate() external view returns (uint256);

    /// @notice Returns maximum fee for unstaking
    /// @return Maximum burning fee
    function maxFee() external view returns (uint256);

    /// @notice Migrates sender contract balance from this contract to another contract
    /// @param to Address of the new contract
    /// @return Response from depositFrom next contract transaction
    function migrate(address to) external returns (bytes calldata);

    /// @notice Returns minimum fee for unstaking
    /// @return Minimum burning fee
    function minFee() external view returns (uint256);

    /// @notice Returns pending rewards for a user
    /// @param user_ Address of user
    /// @return Pending rewards
    function pendingRewards(address user_) external view returns (uint256);

    /// @notice Sets new burning fees
    /// @param minFee_ New minimum burning fee
    /// @param maxFee_ New maximum burning fee
    function setFees(uint256 minFee_, uint256 maxFee_) external;

    /// @notice Sets new burning interval fee
    /// @param feeInterval_ New burning fee interval (in blocks)
    function setFeeInterval(uint256 feeInterval_) external;

    /// @notice Returns number of users with tokens in this contract
    /// @return Number of stakers of tokens
    function stakers() external view returns (uint256);

    /// @notice Syncs tokens balance, sending gap to account (callable only by admin)
    /// @param account Recipient account to send gap
    function syncBalance(address account) external;

    /// @notice Toggles/switches the autoreward variable
    function toggleAutoreward() external;

    /// @notice Withdraws tokens amount of sender balance from this contract
    /// @param amount Amount to withdraw
    /// @return Amount finally withdrawn
    function withdraw(uint256 amount) external returns (uint256);

    /// @notice Withdraws sender balance completely from this contract (calls withdraw(uint256))
    /// @return Amount finally withdrawn
    function withdrawAll() external returns (uint256);
}
