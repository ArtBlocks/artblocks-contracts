// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Script Storage Library
 * @notice Utilize contract bytecode as persistant storage for large chunks of script string data.
 *         This library is intended to have an external deployed copy that is released in the future,
 *         and, as such, has been designed to support both updated V1 (versioned, with purging removed)
 *         reads as well as backwards-compatible reads for the unversioned "V0" storage contracts
 *         which were deployed by the original version of this libary.
 *         For these pre-V1 storage contracts (which themselves did not have any explict versioning semantics)
 *         backwards-compatible reads are optimistic, and only expected to work for contracts actually
 *         deployed by the original version of this library – and may fail ungracefully if attempted to be
 *         used to read from other contracts.
 *
 * @author Art Blocks Inc.
 * @author Modified from 0xSequence (https://github.com/0xsequence/sstore2/blob/master/contracts/SSTORE2.sol)
 * @author Modified from Solmate (https://github.com/transmissions11/solmate/blob/main/src/utils/SSTORE2.sol)
 *
 * @dev Compared to the above two rerferenced libraries, this contracts-as-storage implementation makes a few
 *      notably different design decisions:
 *      - uses the `string` data type for input/output on reads, rather than speaking in bytes directly
 *      - stores the "writer" address (library user) in the deployed contract bytes, which is useful for
 *        on-chain introspection and provenance purposes
 *      - stores a very simple versioning string in the deployed contract bytes, which captures the version
 *        of the library that was used to deploy the storage contract and useful for supporting future
 *        compatibility management as this library evolves (e.g. in response to EOF v1 migration plans)
 *      Also, given that much of this library is written in assembly, this library makes use of a slightly
 *      different convention (when compared to the rest of the Art Blocks smart contract repo) around
 *      pre-defining return values in some cases in order to simplify need to directly memory manage these
 *      return values.
 */
library BytecodeStorage {
    //---------------------------------------------------------------------------------------------------------------//
    // Starting Index | Size | Ending Index | Description                                                            //
    //---------------------------------------------------------------------------------------------------------------//
    // 0              | N/A  | 0            |                                                                        //
    // 0              | 1    | 1            | single byte opcode for making the storage contract non-executable      //
    // 1              | 32   | 33           | the 32 byte slot used for storing a basic versioning string            //
    // 33             | 32   | 65           | the 32 bytes for storing the deploying contract's (0-padded) address   //
    //---------------------------------------------------------------------------------------------------------------//
    // Define the offset for where the "meta bytes" end, and the "data bytes" begin. Note that this is a manually
    // calculated value, and must be updated if the above table is changed. It is expected that tests will fail
    // loudly if these values are not updated in-step with eachother.
    uint256 internal constant VERSION_OFFSET = 1;
    uint256 internal constant ADDRESS_OFFSET = 33;
    uint256 internal constant DATA_OFFSET = 65;

    // Define the set of known *historic* offset values for where the "meta bytes" end, and the "data bytes" begin.
    uint256 internal constant V0_ADDRESS_OFFSET = 72;
    uint256 internal constant V0_DATA_OFFSET = 104;
    uint256 internal constant V1_ADDRESS_OFFSET = ADDRESS_OFFSET;
    uint256 internal constant V1_DATA_OFFSET = DATA_OFFSET;

    // Define the set of known valid version strings that may be stored in the deployed storage contract bytecode
    // note: These are all intentionally exactly 32-bytes and are null-terminated
    // Used for storage contracts that were deployed by an unknown source
    bytes32 internal constant UNKNOWN_VERSION_STRING =
        "UNKNOWN_VERSION_STRING_________ ";
    // Pre-dates versioning string, so this doesn't actually exist in any deployed contracts,
    // but is useful for backwards-compatible semantics with original version of this library
    bytes32 internal constant V0_VERSION_STRING =
        "BytecodeStorage_V0.0.0_________ ";
    // The first versioned storage contract, deployed by an updated version of this library
    bytes32 internal constant V1_VERSION_STRING =
        "BytecodeStorage_V1.0.0_________ ";

    // Provide a public getter for the version of this library.
    bytes32 public constant CURRENT_VERSION = V1_VERSION_STRING;

    /*//////////////////////////////////////////////////////////////
                           WRITE LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Write a string to contract bytecode
     * @param _data string to be written to contract. No input validation is performed on this parameter.
     * @return address_ address of deployed contract with bytecode containing concat(invalid opcode, version, deployer-address, data)
     */
    function writeToBytecode(
        string memory _data
    ) internal returns (address address_) {
        // prefix bytecode with
        bytes memory creationCode = abi.encodePacked(
            //---------------------------------------------------------------------------------------------------------------//
            // Opcode  | Opcode + Arguments  | Description  | Stack View                                                     //
            //---------------------------------------------------------------------------------------------------------------//
            // a.) creation code returns all code in the contract except for the first 11 (0B in hex) bytes, as these 11
            //     bytes are the creation code itself which we do not want to store in the deployed storage contract result
            //---------------------------------------------------------------------------------------------------------------//
            // 0x60    |  0x60_0B            | PUSH1 11     | codeOffset                                                     //
            // 0x59    |  0x59               | MSIZE        | 0 codeOffset                                                   //
            // 0x81    |  0x81               | DUP2         | codeOffset 0 codeOffset                                        //
            // 0x38    |  0x38               | CODESIZE     | codeSize codeOffset 0 codeOffset                               //
            // 0x03    |  0x03               | SUB          | (codeSize - codeOffset) 0 codeOffset                           //
            // 0x80    |  0x80               | DUP          | (codeSize - codeOffset) (codeSize - codeOffset) 0 codeOffset   //
            // 0x92    |  0x92               | SWAP3        | codeOffset (codeSize - codeOffset) 0 (codeSize - codeOffset)   //
            // 0x59    |  0x59               | MSIZE        | 0 codeOffset (codeSize - codeOffset) 0 (codeSize - codeOffset) //
            // 0x39    |  0x39               | CODECOPY     | 0 (codeSize - codeOffset)                                      //
            // 0xF3    |  0xF3               | RETURN       |                                                                //
            //---------------------------------------------------------------------------------------------------------------//
            // (11 bytes)
            hex"60_0B_59_81_38_03_80_92_59_39_F3",
            //---------------------------------------------------------------------------------------------------------------//
            // b.) ensure that the deployed storage contract is non-executeable (first opcode is the `invalid` opcode)
            //---------------------------------------------------------------------------------------------------------------//
            //---------------------------------------------------------------------------------------------------------------//
            // 0xFE    |  0xFE               | INVALID      |                                                                //
            //---------------------------------------------------------------------------------------------------------------//
            // (1 byte)
            hex"FE",
            //---------------------------------------------------------------------------------------------------------------//
            // c.) store the version string, which is already represented as a 32-byte value
            //---------------------------------------------------------------------------------------------------------------//
            // (32 bytes)
            CURRENT_VERSION,
            //---------------------------------------------------------------------------------------------------------------//
            // d.) store the deploying-contract's address with 0-padding to fit a 20-byte address into a 32-byte slot
            //---------------------------------------------------------------------------------------------------------------//
            // (12 bytes)
            hex"00_00_00_00_00_00_00_00_00_00_00_00",
            // (20 bytes)
            address(this),
            // uploaded data (stored as bytecode) comes last
            _data
        );

        assembly {
            // deploy a new contract with the generated creation code.
            // start 32 bytes into creationCode to avoid copying the byte length.
            address_ := create(0, add(creationCode, 0x20), mload(creationCode))
        }

        // address must be non-zero if contract was deployed successfully
        require(address_ != address(0), "ContractAsStorage: Write Error");
    }

    /*//////////////////////////////////////////////////////////////
                               READ LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Read a string from contract bytecode
     * @param _address address of deployed contract with bytecode containing concat(invalid opcode, version, deployer-address, data)
     * @return data string read from contract bytecode
     */
    function readFromBytecode(
        address _address
    ) internal view returns (string memory data) {
        // get the size of the bytecode
        uint256 bytecodeSize = _bytecodeSizeAt(_address);
        // the dataOffset for the bytecode
        uint256 dataOffset = _bytecodeDataOffsetAt(_address);
        // handle case where address contains code < dataOffset
        // note: the first check here also captures the case where
        //       (bytecodeSize == 0) implicitly, but we add the second check of
        //       (bytecodeSize == 0) as a fall-through that will never execute
        //       unless `dataOffset` is set to 0 at some point.
        if ((bytecodeSize < dataOffset) || (bytecodeSize == 0)) {
            revert("ContractAsStorage: Read Error");
        }

        // handle case where address contains code >= dataOffset
        // decrement by dataOffset to account for header info
        uint256 size;
        unchecked {
            size = bytecodeSize - dataOffset;
        }

        assembly {
            // allocate free memory
            data := mload(0x40)
            // update free memory pointer
            // use and(x, not(0x1f) as cheaper equivalent to sub(x, mod(x, 0x20)).
            // adding 0x1f to size + logic above ensures the free memory pointer
            // remains word-aligned, following the Solidity convention.
            mstore(0x40, add(data, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            // store length of data in first 32 bytes
            mstore(data, size)
            // copy code to memory, excluding the deployer-address
            extcodecopy(_address, add(data, 0x20), dataOffset, size)
        }
    }

    /**
     * @notice Get address for deployer for given contract bytecode
     * @param _address address of deployed contract with bytecode containing concat(invalid opcode, version, deployer-address, data)
     * @return writerAddress address read from contract bytecode
     */
    function getWriterAddressForBytecode(
        address _address
    ) internal view returns (address) {
        // get the size of the data
        uint256 bytecodeSize = _bytecodeSizeAt(_address);
        // the dataOffset for the bytecode
        uint256 addressOffset = _bytecodeAddressOffsetAt(_address);
        // handle case where address contains code < addressOffset
        // note: the first check here also captures the case where
        //       (bytecodeSize == 0) implicitly, but we add the second check of
        //       (bytecodeSize == 0) as a fall-through that will never execute
        //       unless `addressOffset` is set to 0 at some point.
        if ((bytecodeSize < addressOffset) || (bytecodeSize == 0)) {
            revert("ContractAsStorage: Read Error");
        }

        assembly {
            // allocate free memory
            let writerAddress := mload(0x40)
            // shift free memory pointer by one slot
            mstore(0x40, add(mload(0x40), 0x20))
            // copy the 32-byte address of the data contract writer to memory
            // note: this relies on the assumption noted at the top-level of
            //       this file that the storage layout for the deployed
            //       contracts-as-storage contract looks like::
            //       | invalid opcode | version-string (unless v0) | deployer-address (padded) | data |
            extcodecopy(
                _address,
                writerAddress,
                addressOffset,
                0x20 // full 32-bytes, as address is expected to be zero-padded
            )
            return(
                writerAddress,
                0x20 // return size is entire slot, as it is zero-padded
            )
        }
    }

    /**
     * @notice Get version for given contract bytecode
     * @param _address address of deployed contract with bytecode containing concat(invalid opcode, version, deployer-address, data)
     * @return version version read from contract bytecode
     */
    function getLibraryVersionForBytecode(
        address _address
    ) internal view returns (bytes32) {
        return _bytecodeVersionAt(_address);
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL HELPER LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the size of the bytecode at address `_address`
     * @param _address address that may or may not contain bytecode
     * @return size size of the bytecode code at `_address`
     */
    function _bytecodeSizeAt(
        address _address
    ) private view returns (uint256 size) {
        assembly {
            size := extcodesize(_address)
        }
    }

    /**
     * @notice Returns the offset of the data in the bytecode at address `_address`
     * @param _address address that may or may not contain bytecode
     * @return dataOffset offset of data in bytecode if a known version, otherwise 0
     */
    function _bytecodeDataOffsetAt(
        address _address
    ) private view returns (uint256 dataOffset) {
        bytes32 version = _bytecodeVersionAt(_address);
        if (version == V1_VERSION_STRING) {
            dataOffset = V1_DATA_OFFSET;
        } else if (version == V0_VERSION_STRING) {
            dataOffset = V0_DATA_OFFSET;
        } else {
            dataOffset = 0;
        }
    }

    /**
     * @notice Returns the offset of the address in the bytecode at address `_address`
     * @param _address address that may or may not contain bytecode
     * @return addressOffset offset of address in bytecode if a known version, otherwise 0
     */
    function _bytecodeAddressOffsetAt(
        address _address
    ) private view returns (uint256 addressOffset) {
        bytes32 version = _bytecodeVersionAt(_address);
        if (version == V1_VERSION_STRING) {
            addressOffset = V1_ADDRESS_OFFSET;
        } else if (version == V0_VERSION_STRING) {
            addressOffset = V0_ADDRESS_OFFSET;
        } else {
            addressOffset = 0;
        }
    }

    /**
     * @notice Get version string for given contract bytecode
     * @param _address address of deployed contract with bytecode containing concat(version, deployer-address, data)
     * @return version version string read from contract bytecode
     */
    function _bytecodeVersionAt(
        address _address
    ) private view returns (bytes32 version) {
        // get the size of the data
        uint256 bytecodeSize = _bytecodeSizeAt(_address);
        // handle case where address contains code < VERSION_OFFSET
        // note: the first check here also captures the case where
        //       (bytecodeSize == 0) implicitly, but we add the second check of
        //       (bytecodeSize == 0) as a fall-through that will never execute
        //       unless `VERSION_OFFSET` is set to 0 at some point.
        if ((bytecodeSize < VERSION_OFFSET) || (bytecodeSize == 0)) {
            revert("ContractAsStorage: Read Error");
        }

        assembly {
            // allocate free memory
            let versionString := mload(0x40)
            // shift free memory pointer by one slot
            mstore(0x40, add(mload(0x40), 0x20))
            // copy the 32-byte version string of the bytecode library to memory
            // note: this relies on the assumption noted at the top-level of
            //       this file that the storage layout for the deployed
            //       contracts-as-storage contract looks like:
            //       | invalid opcode | version-string (unless v0) | deployer-address (padded) | data |
            extcodecopy(
                _address,
                versionString,
                VERSION_OFFSET,
                0x20 // 32-byte version string
            )
            // note: must check against literal strings, as Yul does not allow for
            //       dynamic strings in switch statements.
            switch mload(versionString)
            case 0x2060486000396000513314601057fe5b60013614601957fe5b6000357fff0000 {
                version := V0_VERSION_STRING // pre-dates actual versioning w/ version strings
            }
            case "BytecodeStorage_V1.0.0_________ " {
                version := V1_VERSION_STRING
            }
            default {
                version := UNKNOWN_VERSION_STRING
            }
        }
    }
}
