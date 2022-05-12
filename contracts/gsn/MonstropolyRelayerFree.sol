// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

contract MonstropolyRelayerFree is EIP712 {
    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
        uint256 validUntil;
    }

    // string public constant EIP712_DOMAIN_TYPE = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
    bytes32 private immutable _Monstropoly_RELAYER_TYPEHASH =
        keccak256(
            "Execute(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil)"
        );

    // Nonces of senders, used to prevent replay attacks
    mapping(address => uint256) private nonces;

    constructor() EIP712("MonstropolyRelayerFree", "1") {}

    function verify(ForwardRequest calldata req, bytes calldata signature)
        external
        view
        returns (bool)
    {
        _verifyNonce(req);
        _verifySign(req, signature);
        _verifyValidUntil(req);
        return true;
    }

    function getNonce(address from) public view returns (uint256) {
        return nonces[from];
    }

    function relay(ForwardRequest calldata req, bytes calldata signature)
        external
        payable
        returns (bool success, bytes memory ret)
    {
        //TBD: include AccessControl
        (success, ret) = _execute(req, signature);

        if (!success) {
            string memory _msg = _getRevertMsg(ret);
            require(success, _msg);
        }
    }

    function callAndRelay(
        bytes calldata data,
        address target,
        ForwardRequest calldata req,
        bytes calldata signature
    ) external payable returns (bool success, bytes memory ret) {
        //TBD: include AccessControl
        (success, ret) = _callAndExecute(data, target, req, signature);

        if (!success) {
            string memory _msg = _getRevertMsg(ret);
            require(success, _msg);
        }
    }

    function _callAndExecute(
        bytes calldata data,
        address target,
        ForwardRequest calldata req,
        bytes calldata signature
    ) internal returns (bool success, bytes memory ret) {
        (bool _success, ) = target.call(data);
        require(_success, "MonstropolyRelayerFree: call failed cannot execute");
        (success, ret) = _execute(req, signature);
    }

    function _execute(ForwardRequest calldata req, bytes calldata signature)
        internal
        returns (bool success, bytes memory ret)
    {
        _verifySign(req, signature);
        _verifyAndUpdateNonce(req);
        _verifyValidUntil(req);

        uint256 gasForTransfer = 0;
        if (req.value != 0) {
            gasForTransfer = 40000; //buffer in case we need to move eth after the transaction.
        }
        bytes memory callData = abi.encodePacked(req.data, req.from);
        require(
            (gasleft() * 63) / 64 >= req.gas + gasForTransfer,
            "MonstropolyRelayerFree: insufficient gas"
        );
        // solhint-disable-next-line avoid-low-level-calls
        (success, ret) = req.to.call{gas: req.gas, value: req.value}(callData);
        if (req.value != 0 && address(this).balance > 0) {
            // can't fail: req.from signed (off-chain) the request, so it must be an EOA...
            payable(req.from).transfer(address(this).balance);
        }

        return (success, ret);
    }

    function _verifySign(ForwardRequest calldata req, bytes calldata signature)
        internal
        view
    {
        address signer = req.from;
        bytes32 structHash = keccak256(_getEncoded(req));
        bytes32 hash = _hashTypedDataV4(structHash);
        bool validation = SignatureChecker.isValidSignatureNow(
            signer,
            hash,
            signature
        );
        require(validation, "MonstropolyRelayerFree: invalid signature");
    }

    function _verifyValidUntil(ForwardRequest calldata req) internal view {
        require(
            req.validUntil == 0 || req.validUntil > block.number,
            "MonstropolyRelayerFree: request expired"
        );
    }

    function _verifyNonce(ForwardRequest calldata req) internal view {
        require(
            nonces[req.from] == req.nonce,
            "MonstropolyRelayerFree: nonce mismatch"
        );
    }

    function _verifyAndUpdateNonce(ForwardRequest calldata req) internal {
        require(
            nonces[req.from]++ == req.nonce,
            "MonstropolyRelayerFree: nonce mismatch"
        );
    }

    function _getEncoded(ForwardRequest calldata req)
        public
        view
        returns (bytes memory)
    {
        // we use encodePacked since we append suffixData as-is, not as dynamic param.
        // still, we must make sure all first params are encoded as abi.encode()
        // would encode them - as 256-bit-wide params.
        return
            abi.encodePacked(
                _Monstropoly_RELAYER_TYPEHASH,
                uint256(uint160(req.from)),
                uint256(uint160(req.to)),
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data),
                req.validUntil
            );
    }

    function _getRevertMsg(bytes memory _returnData)
        public
        pure
        returns (string memory)
    {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "Transaction reverted silently";

        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }
}
