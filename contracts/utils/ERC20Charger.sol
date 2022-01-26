// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../shared/IMonstropolyERC20.sol";

contract ERC20Charger {
    function _transferFrom(address token_, address from_, address to_, uint amount_) internal {
        if (token_ == address(0)) {
            _transferETH(from_, to_, amount_);
        } else {
            _transferFromERC20(token_, from_, to_, amount_);
        }
    }

    function _transferETH(address from_, address to_, uint amount_) internal {
        require(msg.value == amount_, "ERC20Charger: wrong msg.value");
        _safeTransferETH(to_, amount_);
    }

    // TBD: recheck...this is from https://github.com/Rari-Capital/solmate/blob/main/src/utils/SafeTransferLib.sol
    function _safeTransferETH(address to_, uint256 amount_) internal {
        bool callStatus;

        assembly {
            // Transfer the ETH and store if it succeeded or not.
            callStatus := call(gas(), to_, amount_, 0, 0, 0, 0)
        }

        require(callStatus, "ERC20Charger: ETH_TRANSFER_FAILED");
    }

    function _transferERC20(address token_, address to_, uint amount_) internal {
        IMonstropolyERC20(token_).transfer(to_, amount_);
    }

    function _transferFromERC20(address token_, address sender_, address recipient_, uint amount_) internal {
        IMonstropolyERC20(token_).transferFrom(sender_, recipient_, amount_);
    }

    function _burnFromERC20(address token_, address from_, uint amount_) internal {
        IMonstropolyERC20(token_).burnFrom(from_, amount_);
    }
}