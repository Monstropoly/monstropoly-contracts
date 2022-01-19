// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@opengsn/contracts/src/interfaces/IRelayHub.sol";
import "@opengsn/contracts/src/utils/GsnTypes.sol";
import "./MyGSNContract.sol";

contract MyRelayer {
    IRelayHub public hub;

    constructor(address _relayHub) {
        hub = IRelayHub(_relayHub);
    }

    function relayCall(
        uint _salt,
        address _myContract,
        uint maxAcceptanceBudget,
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint externalGasLimit
    )
    external
    returns (bool paymasterAccepted, bytes memory returnValue){
        MyGSNContract(_myContract).setSalt(_salt);
        (paymasterAccepted, returnValue) = hub.relayCall(
            maxAcceptanceBudget,
            relayRequest,
            signature,
            approvalData,
            externalGasLimit
        );
    }
}