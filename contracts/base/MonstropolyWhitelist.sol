// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "../utils/AccessControlProxyPausable.sol";
import "../utils/UUPSUpgradeableByRole.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract MonstropolyWhitelist is AccessControlProxyPausable, UUPSUpgradeableByRole {

    bytes32 public merkleRoot;
    string public uri;
    bool public enabled;

    mapping(address=>bool) private _whitelist;

    function initialize () public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        enabled = true;
    }

    function updateWhitelist(bytes32 newMerkleRoot, string calldata newUri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        merkleRoot = newMerkleRoot;
        uri = newUri;
    }

    function toggleEnabled() public onlyRole(DEFAULT_ADMIN_ROLE) {
        enabled = !enabled;
    }

    function add(uint256 index, address account, bytes32[] memory merkleProof) public {
        bytes32 node = keccak256(abi.encodePacked(index, account));
        require(MerkleProofUpgradeable.verify(merkleProof, merkleRoot, node), "MonstropolyWhitelist: invalid proof");
        _whitelist[account] = true;
    }

    function remove(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _whitelist[account] = false;
    }

    function whitelisted (address account) public view returns(bool) {
        return enabled ? _whitelist[account] : true;
    }
}