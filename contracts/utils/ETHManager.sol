// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ETHManager is Ownable {
    address private _master;

    modifier onlyMaster() {
        require(_master == msg.sender, "ETHManager: caller is not the _master");
        _;
    }

    constructor() {
        _master = msg.sender;
        _transferOwnership(tx.origin);
    }

    function master() public view returns (address) {
        return _master;
    }

    function setMaster(address newMaster) external onlyOwner {
        _master = newMaster;
    }

    receive() external payable {}

    function safeTransferETH(address to, uint256 amount) external onlyMaster {
        _safeTransferETH(to, amount);
    }

    // This is from https://github.com/Rari-Capital/solmate/blob/main/src/utils/SafeTransferLib.sol
    function _safeTransferETH(address to_, uint256 amount_) internal {
        bool callStatus;

        assembly {
            // Transfer the ETH and store if it succeeded or not.
            callStatus := call(gas(), to_, amount_, 0, 0, 0, 0)
        }

        require(callStatus, "ETHManager: ETH_TRANSFER_FAILED");
    }
}
