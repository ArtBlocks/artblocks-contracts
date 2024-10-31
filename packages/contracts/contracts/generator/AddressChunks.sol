// Forked from https://github.com/intartnft/scripty.sol/blob/28cc612d7dc3a709f35c534c981bfc6bbfce4209/contracts/scripty/utils/AddressChunks.sol
// with adjustment to data offset for compatibility with Art Blocks BytecodeStorage.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library AddressChunks {
    /**
     * @notice Merge multiple chunks of contract code into a single bytes array.
     * Offloads details of reading contract code to UniversalBytecodeStorageReader contract, but efficiently
     * merges staticcall responses into a single bytes array using assembly.
     * @dev This could become more gas efficient by implementing logic in the bytecode storage reader contracts
     * here instead of moving large amounts of data through return data, but this implementation is much simpler
     * and maintainable.
     * @param chunks Array of contract addresses to merge
     * @param universalReaderContract Address of the UniversalBytecodeStorageReader contract to use for reading
     * stored bytecode (Art Blocks BytecodeStorage library)
     * @return o_code Merged contract code
     */
    function mergeChunks(
        address[] memory chunks,
        address universalReaderContract
    ) internal view returns (bytes memory o_code) {
        unchecked {
            assembly ("memory-safe") {
                // part 1: provision memory for calldata to universal reader's readFromBytecode function
                // 4 bytes for function selector, 32 bytes for address
                let readerCalldata := mload(0x40)
                mstore(readerCalldata, 0x75662f38) // function selector for readFromBytecode(address)
                // calldata in memory will look like:
                //  0000000000000000000000000000000000000000000000000000000075662f38
                //  000000000000000000000000<-------------chunk-address------------>
                // @dev do not populate address yet - do in call loop
                // update free memory pointer two words ahead, past end reserved for calldata
                mstore(0x40, add(readerCalldata, 0x40))
                // update calldata to point to the start of the function selector
                readerCalldata := add(readerCalldata, 28)

                // part 2: reserve space 0x20 bytes representing the returned string length data for each call in loop
                let returnDataStringLength := mload(0x40)
                // update free memory pointer one word ahead, past end of returnDataStringLength
                mstore(0x40, add(returnDataStringLength, 0x20))

                // part 3: build o_code while looping through chunks
                let len := mload(chunks)
                let totalSize := 0x20
                o_code := mload(0x40)

                // loop through all chunk addresses
                // - get address
                // - get data size
                // - get code and add to o_code
                // - update total size
                let targetChunk := 0
                for {
                    let i := 0
                } lt(i, len) {
                    i := add(i, 1)
                } {
                    targetChunk := mload(add(chunks, add(0x20, mul(i, 0x20))))
                    // update calldata with targetChunk address
                    mstore(add(readerCalldata, 0x04), targetChunk) // offset by 4-byte function selector
                    // call the readFromBytecode(address) function of contract targetChunk and don't store the result
                    if iszero(
                        staticcall(
                            gas(), // forward all gas
                            universalReaderContract, // target address with the data stored as bytecode
                            readerCalldata, // start of calldata
                            0x24, // calldata size is 0x04 (function selector) + 0x20 (abi-encoded address)
                            0x00, // 0x00 (do not store return data)
                            0x00 // 0x00 (do not store return data)
                        )
                    ) {
                        revert(0, 0) // call failed, revert
                    }

                    // store return data string length
                    returndatacopy(
                        returnDataStringLength,
                        0x20, // start of return data's string length (ABI spec)
                        0x20 // size of length data (ABI spec)
                    )

                    // store the return string data in memory starting at o_code + totalSize
                    // first 0x20 bytes of return data points to the location of the string data (ABI spec)
                    // second 0x20 bytes of return data is the length of the data (ABI spec)
                    // the actual string data contents begin at returndata + 0x40
                    let storedReturnSize := mload(returnDataStringLength)
                    returndatacopy(
                        add(o_code, totalSize), // offset by totalSize
                        0x40, // skip the 0x40 bytes of length data at the start of the expected return data
                        storedReturnSize // return data size, as gathered above
                    )
                    totalSize := add(totalSize, storedReturnSize) // update total size
                }

                // update o_code length in memory
                mstore(o_code, sub(totalSize, 0x20))
                // new "memory end" including padding
                mstore(
                    0x40,
                    add(o_code, and(add(add(totalSize, 0x20), 0x1f), not(0x1f)))
                )
            }
        }
    }
}
