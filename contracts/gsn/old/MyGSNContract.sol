// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";

contract MyGSNContract is BaseRelayRecipient {
    string public override versionRecipient = "2.4.0";

    address public last;
    uint public salt;

    // Get the forwarder address for the network
    // you are using from
    // https://docs.opengsn.org/networks.html

    // Rinkeby Testnet
    // RelayHub: 0x6650d69225CA31049DB7Bd210aE4671c0B1ca132
    // Forwarder: 0x83A54884bE4657706785D7309cf46B58FE5f6e8a
    // VersionRegistry: 0xedD8C4103acAd42F7478021143E29e1B05aD85C6
    // Accept-Everything Paymaster: 0xA6e10aA9B038c9Cddea24D2ae77eC3cE38a0c016

	constructor(address _forwarder) public {
        _setTrustedForwarder(_forwarder);
	}

    function set() public {
        last = _msgSender();
    }

    function setSalt(uint _salt) public {
        salt = _salt;
    }
}