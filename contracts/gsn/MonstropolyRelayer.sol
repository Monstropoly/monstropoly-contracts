// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

import "@opengsn/paymasters/contracts/interfaces/IUniswap.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MonstropolyPaymaster.sol";

contract MonstropolyRelayer is EIP712 {
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

    IERC20 public token;
    IUniswap public uniswap;
    MonstropolyPaymaster public paymaster;

    // Nonces of senders, used to prevent replay attacks
    mapping(address => uint256) private nonces;

    constructor(IUniswap _uniswap) EIP712("MonstropolyRelayer", "1") {
        uniswap = _uniswap;
        token = IERC20(uniswap.tokenAddress());
        paymaster = new MonstropolyPaymaster();
    }

    function updateAddresses(
        IERC20 token_,
        IUniswap uniswap_,
        MonstropolyPaymaster paymaster_ /**TBD: include role */
    ) external {
        token = token_;
        uniswap = uniswap_;
        paymaster = paymaster_;
    }

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
        uint256 initialGasLeft = gasleft();
        uint256 tokenPrecharge = _preRelayedCall(req, initialGasLeft);

        (success, ret) = _execute(req, signature);

        uint256 gasUsed = initialGasLeft - gasleft();

        _postRelayedCall(req, tokenPrecharge, gasUsed);
    }

    function callAndRelay(
        bytes calldata data,
        address target,
        ForwardRequest calldata req,
        bytes calldata signature
    ) external payable returns (bool success, bytes memory ret) {
        //TBD: include AccessControl
        uint256 initialGasLeft = gasleft();
        uint256 tokenPrecharge = _preRelayedCall(req, initialGasLeft);

        (success, ret) = _callAndExecute(data, target, req, signature);

        if (!success) {
            string memory _msg = _getRevertMsg(ret);
            require(success, _msg);
        }

        uint256 gasUsed = initialGasLeft - gasleft();

        _postRelayedCall(req, tokenPrecharge, gasUsed);
    }

    function _callAndExecute(
        bytes calldata data,
        address target,
        ForwardRequest calldata req,
        bytes calldata signature
    ) internal returns (bool success, bytes memory ret) {
        (bool _success, ) = target.call(data);
        require(_success, "MonstropolyRelayer: call failed cannot execute");
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
            "MonstropolyRelayer: insufficient gas"
        );
        // solhint-disable-next-line avoid-low-level-calls
        (success, ret) = req.to.call{gas: req.gas, value: req.value}(callData);
        if (req.value != 0 && address(this).balance > 0) {
            // can't fail: req.from signed (off-chain) the request, so it must be an EOA...
            payable(req.from).transfer(address(this).balance);
        }

        return (success, ret);
    }

    function _preRelayedCall(
        ForwardRequest calldata req,
        uint256 maxPossibleGas
    ) internal returns (uint256 tokenPrecharge) {
        tokenPrecharge = _preChargeToken(req, maxPossibleGas);
    }

    function _postRelayedCall(
        ForwardRequest calldata req,
        uint256 _tokenPrecharge,
        uint256 _gasUsed
    ) internal {
        uint256 ethUsed = _gasUsed * tx.gasprice;
        uint256 tokenUsed = _getTokenToEthPrice(ethUsed);
        if (tokenUsed < _tokenPrecharge)
            _refundPayer(req.from, (_tokenPrecharge - tokenUsed));
    }

    function _preChargeToken(
        ForwardRequest calldata req,
        uint256 maxPossibleGas
    ) internal returns (uint256 tokenPrecharge) {
        // require(approvalData.length == 0, "approvalData: invalid length");
        // // solhint-disable-next-line reason-string
        // require(relayRequest.relayData.paymasterData.length == 32, "paymasterData: invalid length for Uniswap v1 exchange address");

        tokenPrecharge = _calculatePreCharge(maxPossibleGas);
        require(
            paymaster.tokenTransferFrom(token, req.from, tokenPrecharge),
            "MonstropolyRelayer: failed precharge"
        );
    }

    function _refundPayer(address payer, uint256 tokenRefund) private {
        require(
            paymaster.tokenTransfer(token, payer, tokenRefund),
            "MonstropolyRelayer: failed refund"
        );
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
        require(validation, "MonstropolyRelayer: invalid signature");
    }

    function _verifyValidUntil(ForwardRequest calldata req) internal view {
        require(
            req.validUntil == 0 || req.validUntil > block.number,
            "MonstropolyRelayer: request expired"
        );
    }

    function _verifyNonce(ForwardRequest calldata req) internal view {
        require(
            nonces[req.from] == req.nonce,
            "MonstropolyRelayer: nonce mismatch"
        );
    }

    function _verifyAndUpdateNonce(ForwardRequest calldata req) internal {
        require(
            nonces[req.from]++ == req.nonce,
            "MonstropolyRelayer: nonce mismatch"
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

    function _getTokenToEthPrice(uint256 _ethAmount)
        internal
        view
        returns (uint256)
    {
        return uniswap.getTokenToEthOutputPrice(_ethAmount);
    }

    function _calculatePreCharge(uint256 maxPossibleGas)
        internal
        view
        returns (uint256 tokenPrecharge)
    {
        uint256 ethMaxCharge = _calculateCharge(maxPossibleGas);
        tokenPrecharge = _getTokenToEthPrice(ethMaxCharge);
    }

    function _calculateCharge(uint256 gasUsed) public view returns (uint256) {
        return gasUsed * tx.gasprice;
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
