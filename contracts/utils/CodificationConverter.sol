// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.9;

contract CodificationConverter {
    //TBD: consider doing it always to randLength to save external calls to DATA
    function _padLeft(uint256 number_, uint256 requiredLen_)
        internal
        view
        returns (string memory)
    {
        string memory string_ = _uint2hexstr(number_);
        uint256 iter_ = requiredLen_ - bytes(string_).length;

        for (uint256 i = 0; i < iter_; i++) {
            string_ = _append("0", string_);
        }

        return string_;
    }

    function _uint2hexstr(uint256 i) internal pure returns (string memory) {
        if (i == 0) return "0";
        uint256 j = i;
        uint256 length;
        while (j != 0) {
            length++;
            j = j >> 4;
        }
        uint256 mask = 15;
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (i != 0) {
            uint256 curr = (i & mask);
            bstr[--k] = curr > 9
                ? bytes1(uint8(55 + curr))
                : bytes1(uint8(48 + curr)); // 55 = 65 - 10
            i = i >> 4;
        }
        return string(bstr);
    }

    function _hex2Dec(string memory _hex) internal pure returns (uint256) {
        bytes memory _bytes = bytes(_hex);
        uint256 duint = 0;
        for (uint256 i = 0; i < _bytes.length; i++) {
            if ((uint8(_bytes[i]) >= 48) && (uint8(_bytes[i]) <= 57)) {
                duint +=
                    16**(_bytes.length - 1 - i) *
                    (uint256(uint8(_bytes[i])) - 48);
            } else if ((uint8(_bytes[i]) >= 65) && (uint8(_bytes[i]) <= 70)) {
                duint +=
                    16**(_bytes.length - 1 - i) *
                    (uint256(uint8(_bytes[i])) - 55);
            } else if ((uint8(_bytes[i]) >= 97) && (uint8(_bytes[i]) <= 102)) {
                duint +=
                    16**(_bytes.length - 1 - i) *
                    (uint256(uint8(_bytes[i])) - 87);
            }
        }
        return duint;
    }

    function _append(string memory a, string memory b)
        internal
        pure
        returns (string memory)
    {
        return string(abi.encodePacked(a, b));
    }

    function _slice(
        bytes memory _bytes,
        uint256 _start,
        uint256 _length
    ) internal pure returns (string memory) {
        bytes memory tempBytes;
        assembly {
            switch iszero(_length)
            case 0 {
                // Get a location of some free memory and store it in tempBytes as
                // Solidity does for memory variables.
                tempBytes := mload(0x40)

                // The first word of the slice result is potentially a partial
                // word read from the original array. To read it, we calculate
                // the length of that partial word and start copying that many
                // bytes into the array. The first word we copy will start with
                // data we don't care about, but the last `lengthmod` bytes will
                // land at the beginning of the contents of the new array. When
                // we're done copying, we overwrite the full first word with
                // the actual length of the slice.
                let lengthmod := and(_length, 31)

                // The multiplication in the next line is necessary
                // because when slicing multiples of 32 bytes (lengthmod == 0)
                // the following copy loop was copying the origin's length
                // and then ending prematurely not copying everything it should.
                let mc := add(
                    add(tempBytes, lengthmod),
                    mul(0x20, iszero(lengthmod))
                )
                let end := add(mc, _length)

                for {
                    // The multiplication in the next line has the same exact purpose
                    // as the one above.
                    let cc := add(
                        add(
                            add(_bytes, lengthmod),
                            mul(0x20, iszero(lengthmod))
                        ),
                        _start
                    )
                } lt(mc, end) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } {
                    mstore(mc, mload(cc))
                }

                mstore(tempBytes, _length)

                //update free-memory pointer
                //allocating the array padded to 32 bytes like the compiler does now
                mstore(0x40, and(add(mc, 31), not(31)))
            }
            //if we want a zero-length slice let's just return a zero-length array
            default {
                tempBytes := mload(0x40)
                //zero out the 32 bytes slice we are about to return
                //we need to do it because Solidity does not garbage collect
                mstore(tempBytes, 0)

                mstore(0x40, add(tempBytes, 0x20))
            }
        }

        return string(tempBytes);
    }

    // TBD: check those and compare gas comsuption
    // import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
    // /**
    //  * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation.
    //  */
    // function toHexString(uint256 value) internal pure returns (string memory) {
    //     if (value == 0) {
    //         return "0x00";
    //     }
    //     uint256 temp = value;
    //     uint256 length = 0;
    //     while (temp != 0) {
    //         length++;
    //         temp >>= 8;
    //     }
    //     return toHexString(value, length);
    // }

    // /**
    //  * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length.
    //  */
    // function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
    //     bytes memory buffer = new bytes(2 * length + 2);
    //     buffer[0] = "0";
    //     buffer[1] = "x";
    //     for (uint256 i = 2 * length + 1; i > 1; --i) {
    //         buffer[i] = _HEX_SYMBOLS[value & 0xf];
    //         value >>= 4;
    //     }
    //     require(value == 0, "Strings: hex length insufficient");
    //     return string(buffer);
    // }
}
