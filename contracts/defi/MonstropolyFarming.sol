// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../utils/UUPSUpgradeableByRole.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../shared/IMonstropolyRewardsDistributor.sol";
import "../shared/IMonstropolyDeployer.sol";

contract MonstropolyFarming is UUPSUpgradeableByRole {
    bool public autoreward;

    uint256 public balance;
    uint256 public accRewardsPerShare;
    uint256 private _released;

    uint256 public lastUpdate;
    uint256 public stakers;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 notClaimed;
    }

    mapping(address => UserInfo) private _userInfo;

    event Claim(address account);
    event Deposit(address account, uint256 amount);
    event Withdraw(address account, uint256 amount);
    event Rewards(address account, uint256 amount);
    event SyncBalance(address account, uint256 amount);
    event ToggleAutoreward(bool autoreward);
    event Update(
        uint256 balance,
        uint256 accRewardsPerShare,
        uint256 lastUpdate,
        uint256 stakers
    );
    event UpdateUserInfo(
        address account,
        uint256 amount,
        uint256 rewardDebt,
        uint256 notClaimed
    );
    event Migrate(
        address from,
        address to,
        address account,
        uint256 amount,
        bytes response
    );

    function _update() internal {
        IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(
                IMonstropolyDeployer(config).get(keccak256("REWARDS"))
            );
        uint256 released = rewardsInterface.released(
            IMonstropolyDeployer(config).name(address(this))
        ) - _released;
        _released += released;
        if (balance > 0) {
            accRewardsPerShare += ((released * 1e18) / balance);
        }
        lastUpdate = block.number;
    }

    // Updates rewards for an account
    function _updateRewards(address account) internal {
        UserInfo storage user = _userInfo[account];
        uint256 diff = accRewardsPerShare - user.rewardDebt;
        user.notClaimed += (diff * user.amount) / 1e18;
        user.rewardDebt = accRewardsPerShare;
    }

    // Deposits tokens for staking
    function depositFrom(address account, uint256 amount) public whenNotPaused {
        require(amount > 0, "MonstropolyFarming: amount must be over zero");

        UserInfo storage user = _userInfo[account];

        _update();
        _updateRewards(account);

        if (user.amount == 0) {
            stakers += 1;
        }

        user.amount += amount;
        balance += amount;

        IERC20Upgradeable tokenInterface = IERC20Upgradeable(
            IMonstropolyDeployer(config).get(keccak256("LP_TOKEN"))
        );

        // require(tokenInterface.balanceOf(account) >= amount, "MonstropolyFarming: user has not enough balance");
        // require(tokenInterface.allowance(account, address(this)) >= amount, "MonstropolyFarming: amount exceeds allowance");

        if (autoreward) {
            _reward(account);
        }

        require(
            tokenInterface.transferFrom(account, address(this), amount),
            "MonstropolyFarming: deposit transfer failed"
        );

        emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
        emit UpdateUserInfo(
            account,
            user.amount,
            user.rewardDebt,
            user.notClaimed
        );
        emit Deposit(account, amount);
    }

    // Withdraws tokens from staking
    function withdraw(uint256 amount) public whenNotPaused returns (uint256) {
        require(amount > 0, "MonstropolyFarming: amount must be over zero");

        address account = msg.sender;
        UserInfo storage user = _userInfo[account];

        require(
            amount <= user.amount,
            "MonstropolyFarming: user has not enough staking balance"
        );

        _update();
        _updateRewards(account);

        user.rewardDebt = accRewardsPerShare;
        user.amount -= amount;
        balance -= amount;

        if (user.amount == 0) {
            stakers -= 1;
        }

        IERC20Upgradeable tokenInterface = IERC20Upgradeable(
            IMonstropolyDeployer(config).get(keccak256("LP_TOKEN"))
        );

        if (autoreward) {
            _reward(account);
        }

        tokenInterface.transfer(account, amount);

        emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
        emit UpdateUserInfo(
            account,
            user.amount,
            user.rewardDebt,
            user.notClaimed
        );
        emit Withdraw(account, amount);
        return amount;
    }

    function withdrawAll() public whenNotPaused returns (uint256) {
        uint256 amount = getUserBalance(msg.sender);
        return withdraw(amount);
    }

    // Claims rewards
    function claim() public whenNotPaused {
        address account = msg.sender;
        UserInfo storage user = _userInfo[account];

        _update();
        _updateRewards(account);

        require(user.notClaimed > 0, "MonstropolyFarming: nothing to claim");

        _reward(account);

        emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
        emit UpdateUserInfo(
            account,
            user.amount,
            user.rewardDebt,
            user.notClaimed
        );
        emit Claim(account);
    }

    // Toggles autoreward
    function toggleAutoreward() public onlyRole(DEFAULT_ADMIN_ROLE) {
        autoreward = !autoreward;
        emit ToggleAutoreward(autoreward);
    }

    function _reward(address account) internal {
        IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(
                IMonstropolyDeployer(config).get(keccak256("REWARDS"))
            );
        uint256 amount = _userInfo[account].notClaimed;
        if (amount > 0) {
            _userInfo[account].notClaimed = 0;
            rewardsInterface.distribute(account, amount);
            emit Rewards(account, amount);
        }
    }

    // Gets user pending rewards
    function pendingRewards(address user_) public view returns (uint256) {
        UserInfo memory user = _userInfo[user_];
        uint256 rewards = user.notClaimed;
        if (balance > 0) {
            IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(
                    IMonstropolyDeployer(config).get(keccak256("REWARDS"))
                );
            uint256 released = rewardsInterface.released(
                IMonstropolyDeployer(config).name(address(this))
            ) - _released;
            uint256 total = ((released * 1e18) / balance);
            rewards +=
                ((accRewardsPerShare - user.rewardDebt + total) * user.amount) /
                1e18;
        }
        return rewards;
    }

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        autoreward = true;
        lastUpdate = block.number;
    }

    // Gets token gap
    function getTokenGap() public view returns (uint256) {
        IERC20Upgradeable tokenInterface = IERC20Upgradeable(
            IMonstropolyDeployer(config).get(keccak256("LP_TOKEN"))
        );
        uint256 tokenBalance = tokenInterface.balanceOf(address(this));
        if (tokenBalance > balance) {
            return tokenBalance - balance;
        } else {
            return 0;
        }
    }

    // Synchronizes balance, transfering the gap to an external account
    function syncBalance(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20Upgradeable tokenInterface = IERC20Upgradeable(
            IMonstropolyDeployer(config).get(keccak256("LP_TOKEN"))
        );
        uint256 gap = getTokenGap();
        require(gap > 0, "MonstropolyFarming: there is no gap");
        tokenInterface.transfer(account, gap);
        emit SyncBalance(account, gap);
    }

    // Gets user staking balance
    function getUserBalance(address user_) public view returns (uint256) {
        UserInfo memory user = _userInfo[user_];
        return user.amount;
    }

    function migrate(address to) public returns (bytes memory) {
        address account = msg.sender;
        uint256 amount = withdraw(_userInfo[account].amount);
        (bool success, bytes memory response) = to.call(
            abi.encodeWithSignature(
                "depositFrom(address,uint256)",
                account,
                amount
            )
        );
        require(success, "MonstropolyFarming: migration failed");
        emit Migrate(address(this), to, account, amount, response);
        return response;
    }

    function emergencyWithdraw() public whenPaused returns (uint256) {
        uint256 amount = getUserBalance(msg.sender);
        require(amount > 0, "MonstropolyFarming: no tokens to withdraw");
        IERC20Upgradeable tokenInterface = IERC20Upgradeable(
            IMonstropolyDeployer(config).get(keccak256("LP_TOKEN"))
        );
        _userInfo[msg.sender].amount -= amount;
        balance -= amount;
        tokenInterface.transfer(msg.sender, amount);
        return amount;
    }

    function depositAll(address account) public {
        IERC20Upgradeable tokenInterface = IERC20Upgradeable(
            IMonstropolyDeployer(config).get(keccak256("LP_TOKEN"))
        );
        uint256 amount = tokenInterface.balanceOf(account);
        depositFrom(account, amount);
    }

    function lastReward() public view returns (uint256) {
        IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(
                IMonstropolyDeployer(config).get(keccak256("REWARDS"))
            );

        if (
            block.number > rewardsInterface.startBlock() &&
            block.number < rewardsInterface.endBlock()
        ) {
            uint256 reward = rewardsInterface.rewardPerBlock();
            if (block.number > rewardsInterface.changeBlock()) {
                uint256 comp0 = (rewardsInterface.increment() *
                    ((block.number - rewardsInterface.changeBlock())**2)) / 2;
                uint256 comp1 = (rewardsInterface.increment() *
                    ((block.number - rewardsInterface.changeBlock() - 1)**2)) /
                    2;
                reward += (comp0 - comp1);
            }
            return
                (reward *
                    rewardsInterface.allocation(
                        IMonstropolyDeployer(config).name(address(this))
                    )) / 100 ether;
        } else {
            return 0;
        }
    }
}
