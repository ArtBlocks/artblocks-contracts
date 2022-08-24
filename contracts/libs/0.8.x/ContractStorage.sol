// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
// Forked from: https://github.com/0xsequence/sstore2

pragma solidity ^0.8.0;

/**
 * @dev Utilize contracts as storage for large chunks of data.
 */
library ContractStorage {
    /**
        @notice Generate a creation code that results on a contract with `_code` as bytecode
        @param _code The returning value of the resulting `creationCode`
        @return creationCode (constructor) for new contract
    */
    function creationCodeFor(bytes memory _code)
        internal
        pure
        returns (bytes memory)
    {
        return
            abi.encodePacked(
                hex"63",
                uint32(_code.length),
                hex"80_60_0E_60_00_39_60_00_F3",
                _code
            );
    }

    /**
    @notice Returns the size of the code on a given address
    @param _addr Address that may or may not contain code
    @return size of the code on the given `_addr`
  */
    function codeSize(address _addr) internal view returns (uint256 size) {
        assembly {
            size := extcodesize(_addr)
        }
    }

    /**
    @notice Returns the code of a given address
    @dev It will fail if `_end < _start`
    @param _addr Address that may or may not contain code
    @param _start number of bytes of code to skip on read
    @param _end index before which to end extraction
    @return oCode read from `_addr` deployed bytecode
    Forked from: https://gist.github.com/KardanovIR/fe98661df9338c842b4a30306d507fbd
  */
    function codeAt(
        address _addr,
        uint256 _start,
        uint256 _end
    ) internal view returns (bytes memory oCode) {
        uint256 csize = codeSize(_addr);
        if (csize == 0) return bytes("");

        if (_start > csize) return bytes("");
        require(_end >= _start, "ContractStorage: end < start");

        unchecked {
            uint256 reqSize = _end - _start;
            uint256 maxSize = csize - _start;

            uint256 size = maxSize < reqSize ? maxSize : reqSize;

            assembly {
                // allocate output byte array - this could also be done without assembly
                // by using o_code = new bytes(size)
                oCode := mload(0x40)
                // new "memory end" including padding
                mstore(
                    0x40,
                    add(oCode, and(add(add(size, 0x20), 0x1f), not(0x1f)))
                )
                // store length in memory
                mstore(oCode, size)
                // actually retrieve the code, this needs assembly
                extcodecopy(_addr, add(oCode, 0x20), _start, size)
            }
        }
    }

    /**
     * @dev
     */
    function write(bytes memory _data) internal returns (address pointer) {
        // append 00 to _data so contract can't be called
        bytes memory code = creationCodeFor(abi.encodePacked(hex"00", _data));
        // deploy
        assembly {
            pointer := create(0, add(code, 0x20), mload(code))
        }
        // address must be non-zero
        require(pointer != address(0), "ContractStorage: failed to deploy");
    }

    function read(address _pointer) internal view returns (bytes memory) {
        return codeAt(_pointer, 1, type(uint256).max);
    }
}
