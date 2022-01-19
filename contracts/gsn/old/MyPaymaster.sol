// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@opengsn/paymasters/contracts/TokenPaymaster.sol";
import "@opengsn/paymasters/contracts/AcceptEverythingPaymaster.sol";

contract MyPaymaster is AcceptEverythingPaymaster {

    address public ourTarget;

    // Rinkeby Testnet
    // RelayHub: 0x6650d69225CA31049DB7Bd210aE4671c0B1ca132
    // Forwarder: 0x83A54884bE4657706785D7309cf46B58FE5f6e8a
    // VersionRegistry: 0xedD8C4103acAd42F7478021143E29e1B05aD85C6
    // Accept-Everything Paymaster: 0xA6e10aA9B038c9Cddea24D2ae77eC3cE38a0c016

    constructor (address _target, IRelayHub _relayHub, address _forwarder) public {
        ourTarget = _target;
        setRelayHub(_relayHub);
        setTrustedForwarder(_forwarder);
    }

    function preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    )
    external
    override
    virtual
    returns (bytes memory context, bool revertOnRecipientRevert) {
        require(relayRequest.request.to == ourTarget, "MyPaymaster: wrong target");
        (relayRequest, signature, approvalData, maxPossibleGas);
        return ("", false);
    }
}