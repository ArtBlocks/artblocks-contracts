// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Script Storage Library
 * @author Art Blocks Inc.
 * @author Modified from 0xSequence (https://github.com/0xsequence/sstore2/blob/master/contracts/SSTORE2.sol)
 * @author Modified from Solmate (https://github.com/transmissions11/solmate/blob/main/src/utils/SSTORE2.sol)
 * @notice Utilize contract bytecode as persistant storage for large chunks of script string data.
 */
library BytecodeStorage {
    /// always set first byte to 0x00 (STOP) to ensure created contracts cannot be called
    //---------------------------------------------------------------------------------------------------------------//
    // Offset Amount | Offset Aggregate | Description                                                                //
    //---------------------------------------------------------------------------------------------------------------//
    // TODO: gated-cleanup-logic is incomplete                                                                       //
    // 11            | 11               | allow contract to be `selfdestruct`-able via gated-cleanup-logic           //
    // 1             | 12               | set first byte to 0x00 (STOP) to ensure created contracts cannot be called //
    // 20            | 32               | reserve 20 bytes for storing deploying-contract's address                  //
    //---------------------------------------------------------------------------------------------------------------//
    uint256 internal constant DATA_OFFSET = 32;

    /**
     * @notice Write a string to contract bytecode
     * @param _data string to be written to contract
     * @return address_ address of deployed contract with bytecode containing concat(gated-cleanup-logic, 0x00, data)
     */
    function writeToBytecode(string memory _data)
        internal
        returns (address address_)
    {
        // prefix bytecode with
        bytes memory creationCode = abi.encodePacked(
            //---------------------------------------------------------------------------------------------------------------//
            // Opcode  | Opcode + Arguments  | Description  | Stack View                                                     //
            //---------------------------------------------------------------------------------------------------------------//
            // 0x60    |  0x600B             | PUSH1 11     | codeOffset                                                     //
            // 0x59    |  0x59               | MSIZE        | 0 codeOffset                                                   //
            // 0x81    |  0x81               | DUP2         | codeOffset 0 codeOffset                                        //
            // 0x38    |  0x38               | CODESIZE     | codeSize codeOffset 0 codeOffset                               //
            // 0x03    |  0x03               | SUB          | (codeSize - codeOffset) 0 codeOffset                           //
            // 0x80    |  0x80               | DUP          | (codeSize - codeOffset) (codeSize - codeOffset) 0 codeOffset   //
            // 0x92    |  0x92               | SWAP3        | codeOffset (codeSize - codeOffset) 0 (codeSize - codeOffset)   //
            // 0x59    |  0x59               | MSIZE        | 0 codeOffset (codeSize - codeOffset) 0 (codeSize - codeOffset) //
            // 0x39    |  0x39               | CODECOPY     | 0 (codeSize - codeOffset)                                      //
            // 0xf3    |  0xf3               | RETURN       |                                                                //
            //---------------------------------------------------------------------------------------------------------------//
            hex"60_0B_59_81_38_03_80_92_59_39_F3", // returns all code in the contract except for the first 11 (0B in hex) bytes
            //---------------------------------------------------------------------------------------------------------------//
            // Opcode  | Opcode + Arguments  | Description  | Stack View                                                     //
            //---------------------------------------------------------------------------------------------------------------//
            // 0x60    |  0x6000             | PUSH1 0      | destinationOffset                                              //
            // 0x60    |  0x600B             | PUSH1 11 (*) | destinationOffset contractOffset                               //
            // 0x60    |  0x6014             | PUSH1 20     | destinationOffset contractOffset 20                            //
            // 0x39    |  0x39               | CODECOPY     |                                                                //
            // 0x60    |  0x6000             | PUSH1 0      | destinationOffset                                              //
            // 0x51    |  0x51               | MLOAD        | creatorAddress                                                 //
            // 0xFF    |  0xFF               | SELFDESTRUCT |                                                                //
            //---------------------------------------------------------------------------------------------------------------//
            // (*) Note: this value must be adjusted if selfdestruct purge logic is adjusted, to refer to the correct start  //
            //           offset for where the `msg.sender` address was stored in deplyed bytecode.                           //
            //---------------------------------------------------------------------------------------------------------------//
            hex"60_00_60_0B_60_14_39_60_00_51_FF", // allow contract to be `selfdestruct`-able for cleanup purposes
            msg.sender, // store the deploying-contract's address (to be used to gate and call `selfdestruct`)
            hex"00", // prefix bytecode with 0x00 to ensure contract cannot be called
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

    /**
     * @notice Read a string from contract bytecode
     * @param _address address of deployed contract with bytecode containing concat(gated-cleanup-logic, 0x00, data)
     * @return data string read from contract bytecode
     */
    function readFromBytecode(address _address)
        internal
        view
        returns (string memory data)
    {
        // get the size of the data
        uint256 codeSize = _codeSizeAt(_address);
        // handle case where address does not contain code
        if (codeSize == 0) {
            return "";
        }
        // handle case where address contains code < DATA_OFFSET
        if (codeSize < DATA_OFFSET) {
            revert("ContractAsStorage: Read Error");
        }
        // handle case where address contains code >= DATA_OFFSET
        // decrement by DATA_OFFSET to account for 0x00 prefix
        uint256 size;
        unchecked {
            size = codeSize - DATA_OFFSET;
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
            // copy code to memory, excluding the first byte of contract code (0x00)
            extcodecopy(_address, add(data, 0x20), DATA_OFFSET, size)
        }
    }

    /**
        @notice Returns the size of the code at address `_address`
        @param _address address that may or may not contain code
        @return size size of code at `_address`
    */
    function _codeSizeAt(address _address) private view returns (uint256 size) {
        assembly {
            size := extcodesize(_address)
        }
    }

    /**
     * @notice Purge contract bytecode for cleanup purposes
     * @param _address address of deployed contract with bytecode containing concat(gated-cleanup-logic, 0x00, data)
     */
    function purgeBytecode(address _address) internal {
        // deployed bytecode (above) handles all logic for purging state, so no
        // call data is expected to be passed along to purge
        _address.call("");
    }
}
