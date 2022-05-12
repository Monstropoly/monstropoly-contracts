pragma solidity 0.8.9;

import "../../shared/IMonstropolyFactory.sol";
import "../../shared/IMonstropolyDeployer.sol";
import "../../shared/IMonstropolyData.sol";
import "../../utils/AccessControlProxyPausable.sol";
import "../../utils/UUPSUpgradeableByRole.sol";
import "../../utils/CodificationConverter.sol";

/// @title The contract MonstropolyData
/// @notice Handles genetic data
/// @dev Other contracts use its methods to handle genetic strings
contract MonstropolyData is
    IMonstropolyData,
    AccessControlProxyPausable,
    UUPSUpgradeableByRole,
    CodificationConverter
{
    uint256 public genLength;

    function initialize() public /** TBD: initializer */
    {
        __AccessControlProxyPausable_init(msg.sender);

        genLength = 18; //TBD: its suppossed to be cte?
    }

    /// @inheritdoc IMonstropolyData
    function getValueFromGen(string calldata gen, uint256 index)
        public
        view
        returns (uint256)
    {
        string memory _string;
        bytes memory _bytes = bytes(gen);
        _string = _slice(_bytes, 0, 2);
        return _hex2Dec(_string);
    }

    /// @inheritdoc IMonstropolyData
    function hashGen(string calldata gen) public view returns (bytes32) {
        return keccak256(abi.encodePacked(gen));
    }

    /// @inheritdoc IMonstropolyData
    function updateLength(uint256 _genLength)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        genLength = _genLength;
    }
}
