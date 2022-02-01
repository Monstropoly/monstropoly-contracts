// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyERC20.sol";
import "../shared/IMonstropolyRewardsDistributor.sol";
import "../shared/IMonstropolyDeployer.sol";

contract MonstropolyStaking is UUPSUpgradeableByRole {

    bool public autoreward;

    uint256 public balance;
    uint256 public minFee;
    uint256 public maxFee;
    uint256 public accRewardsPerShare;
    uint256 private _released;

    uint public lastUpdate;
    uint public feeInterval;
    uint public stakers;

    struct UserInfo {
      uint256 amount;
      uint256 rewardDebt;
      uint256 notClaimed;
      uint endInterval;
      uint256 minFee;
      uint256 maxFee;
      uint256 feeInterval;
    }

    mapping(address=>UserInfo) private _userInfo;

    event Claim(address account);
    event Deposit(address account, uint256 amount);
    event Withdraw(address account, uint256 amount, uint256 burned);
    event Rewards(address account, uint256 amount);

    event SyncBalance(address account, uint256 amount);
    event ToggleAutoreward(bool autoreward);
    event Update(uint256 balance, uint256 accRewardsPerShare, uint lastUpdate, uint stakers);
    event UpdateUserInfo(address account, uint256 amount, uint256 rewardDebt, uint256 notClaimed, uint endInterval);
    event SetFees(uint256 minFee, uint256 maxFee);
    event SetFeeInterval(uint feeInterval);
    event Migrate(address from, address to, address account, uint256 amount, bytes response);

    function _update() internal {
      IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(IMonstropolyDeployer(config).get(keccak256("REWARDS")));
      uint256 released = rewardsInterface.released(IMonstropolyDeployer(config).name(address(this))) - _released;
      _released += released;
      if(balance > 0) {
        accRewardsPerShare += (released * 1e18 / balance);
      }
      lastUpdate = block.number;
    }

    // Sets maximum and minimum fees
    function setFees(uint256 minFee_, uint256 maxFee_) public onlyRole(DEFAULT_ADMIN_ROLE) {
      require(minFee_ <= maxFee_, "MonstropolyStaking: mininum fee must be greater or equal than maximum fee");
      require(minFee_ <= 1e20, "MonstropolyStaking: minFee cannot exceed 100 ether");
      require(maxFee_ <= 1e20, "MonstropolyStaking: maxFee cannot exceed 100 ether");
      minFee = minFee_;
      maxFee = maxFee_;
      emit SetFees(minFee, maxFee);
    }

    // Sets fee interval (blocks) for staking
    function setFeeInterval(uint feeInterval_) public onlyRole(DEFAULT_ADMIN_ROLE) {
      feeInterval = feeInterval_;
      emit SetFeeInterval(feeInterval);
    }

    // Updates rewards for an account
    function _updateRewards(address account) internal {
      UserInfo storage user = _userInfo[account];
      uint256 diff = accRewardsPerShare - user.rewardDebt;
      user.notClaimed += diff * user.amount / 1e18;
      user.rewardDebt = accRewardsPerShare;
    }

    // Deposits tokens for staking
    function depositFrom(address account, uint256 amount) public whenNotPaused {
      require(amount > 0, "MonstropolyStaking: amount must be over zero");

      UserInfo storage user = _userInfo[account];

      _update();
      _updateRewards(account);

      if(user.amount == 0) {
        stakers += 1;
      }

      user.endInterval = block.number + feeInterval;
      user.minFee = minFee;
      user.maxFee = maxFee;
      user.feeInterval = feeInterval;
      user.amount += amount;
      balance += amount;

      IMonstropolyERC20 tokenInterface = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));

      // require(tokenInterface.balanceOf(account) >= amount, "MonstropolyStaking: user has not enough balance");
      // require(tokenInterface.allowance(account, address(this)) >= amount, "MonstropolyStaking: amount exceeds allowance");

      if(autoreward) {
        _reward(account);
      }

      require(tokenInterface.transferFrom(account, address(this), amount), "MonstropolyStaking: deposit transfer failed");

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
      emit Deposit(account, amount);
    }

    // Withdraws tokens from staking
    function withdraw(uint256 amount) public whenNotPaused returns (uint256) {
      require(amount > 0, "MonstropolyStaking: amount must be over zero");

      address account = msg.sender;
      UserInfo storage user = _userInfo[account];

      require(amount <= user.amount, "MonstropolyStaking: user has not enough staking balance");

      _update();
      _updateRewards(account);

      user.rewardDebt = accRewardsPerShare;
      user.amount -= amount;
      balance -= amount;

      if(user.amount == 0) {
        stakers -= 1;
      }

      IMonstropolyERC20 tokenInterface = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));

      uint256 burned = amount * getFee(account) / 1e20;
      amount -= burned;

      if(autoreward) {
        _reward(account);
      }
      if(burned > 0){
        tokenInterface.burnFrom(address(this), burned);
      }
      
      tokenInterface.transfer(account, amount);

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
      emit Withdraw(account, amount, burned);
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

      require(user.notClaimed > 0, "MonstropolyStaking: nothing to claim");

      _reward(account);

      emit Update(balance, accRewardsPerShare, lastUpdate, stakers);
      emit UpdateUserInfo(account, user.amount, user.rewardDebt, user.notClaimed, user.endInterval);
      emit Claim(account);
    }

    // Toggles autoreward
    function toggleAutoreward() public onlyRole(DEFAULT_ADMIN_ROLE) {
      autoreward = !autoreward;
      emit ToggleAutoreward(autoreward);
    }

    function _reward(address account) internal {
      IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(IMonstropolyDeployer(config).get(keccak256("REWARDS")));
      uint256 amount = _userInfo[account].notClaimed;
      if(amount > 0) {
        _userInfo[account].notClaimed = 0;
        rewardsInterface.distribute(account, amount);
        emit Rewards(account, amount);
      }
    }

    // Gets current fee for a user
    function getFee(address account) public view returns(uint256) {
      UserInfo memory user = _userInfo[account];
      uint256 fee = block.number < user.endInterval ? user.feeInterval > 0 ? user.maxFee * (user.endInterval - block.number) / user.feeInterval : user.minFee : user.minFee;
      return fee > user.minFee ? fee : user.minFee;
    }

    // Gets blocks until endInverval
    function getBlocksLeft(address account) public view returns (uint) {
      if(block.number > _userInfo[account].endInterval) {
        return 0;
      } else {
        return _userInfo[account].endInterval - block.number;
      }
    }

    // Gets user pending rewards
    function pendingRewards(address user_) public view returns(uint256) {
        UserInfo memory user = _userInfo[user_];
        uint256 rewards = user.notClaimed;
        if(balance > 0){
          IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(IMonstropolyDeployer(config).get(keccak256("REWARDS")));
          uint256 released = rewardsInterface.released(IMonstropolyDeployer(config).name(address(this))) - _released;
          uint256 total = (released * 1e18 / balance);
          rewards += (accRewardsPerShare - user.rewardDebt + total) * user.amount / 1e18;
        }
        return rewards;
    }

    function initialize() public initializer {
      __AccessControlProxyPausable_init(msg.sender);
      minFee = 1e17;
      maxFee = 1e19;
      feeInterval = 1296000;
      autoreward = true;
      lastUpdate = block.number;
    }

    // Gets token gap
    function getTokenGap() public view returns (uint256) {
      IMonstropolyERC20 tokenInterface = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
      uint256 tokenBalance = tokenInterface.balanceOf(address(this));
      return tokenBalance - balance;
    }

        // Synchronizes balance, transfering the gap to an external account
    function syncBalance(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
      IMonstropolyERC20 tokenInterface = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
      uint256 gap = getTokenGap();
      require(gap > 0, "MonstropolyStaking: there is no gap");
      tokenInterface.transfer(account, gap);
      emit SyncBalance(account, gap);
    }

        // Gets user staking balance
    function getUserBalance(address user_) public view returns(uint256) {
      UserInfo memory user = _userInfo[user_];
      return user.amount;
    }

    function migrate(address to) public returns (bytes memory){
      address account = msg.sender;
      uint256 amount = withdraw(_userInfo[account].amount);
      (bool success, bytes memory response) = to.call(
            abi.encodeWithSignature("depositFrom(address,uint256)", account, amount)
        );
      require(success, 'MonstropolyStaking: migration failed');
      emit Migrate(address(this), to, account, amount, response);
      return response;
    }

    function emergencyWithdraw() whenPaused public returns (uint256) {
      uint256 amount = getUserBalance(msg.sender);
      require(amount > 0, "MonstropolyStaking: no tokens to withdraw");
      IMonstropolyERC20 tokenInterface = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
      _userInfo[msg.sender].amount -= amount;
      balance -= amount;
      tokenInterface.transfer(msg.sender, amount);
      return amount;
    }

    function depositAll(address account) public {
      IMonstropolyERC20 tokenInterface = IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")));
      uint256 amount = tokenInterface.balanceOf(account);
      depositFrom(account, amount);
    }

    function lastReward() public view returns (uint256) {

      IMonstropolyRewardsDistributor rewardsInterface = IMonstropolyRewardsDistributor(IMonstropolyDeployer(config).get(keccak256("REWARDS")));

      if(block.number > rewardsInterface.startBlock() && block.number < rewardsInterface.endBlock()) {
          uint256 reward = rewardsInterface.rewardPerBlock();
          if (block.number > rewardsInterface.changeBlock()) {
              uint256 comp0 = (rewardsInterface.increment() * ((block.number - rewardsInterface.changeBlock()) ** 2)) / 2;
              uint256 comp1 = (rewardsInterface.increment() * ((block.number - rewardsInterface.changeBlock() - 1) ** 2)) / 2;
              reward += (comp0 - comp1);
          }
          return reward * rewardsInterface.allocation(IMonstropolyDeployer(config).name(address(this))) / 100 ether;
      } else {
        return 0;
      }
    }
}
