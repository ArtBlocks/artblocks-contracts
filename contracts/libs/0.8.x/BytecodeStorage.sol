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
    // 27            | 27               | allow contract to be `selfdestruct`-able via gated-cleanup-logic           //
    // 20            | 47               | reserve 20 bytes for storing deploying-contract's address                  //
    //---------------------------------------------------------------------------------------------------------------//
    uint256 internal constant DATA_OFFSET = 47;

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
            // 0x60    |  0x60_0B            | PUSH1 11     | codeOffset                                                     //
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
            // returns all code in the contract except for the first 11 (0B in hex) bytes
            hex"60_0B_59_81_38_03_80_92_59_39_F3",
            //---------------------------------------------------------------------------------------------------------------//
            // Opcode  | Opcode + Arguments  | Description  | Stack View                                                     //
            //---------------------------------------------------------------------------------------------------------------//
            // (1) conditional logic for determing purge-gate
            //---------------------------------------------------------------------------------------------------------------//
            // 0x60    |  0x60_14            | PUSH1 20     | 20                                                             //
            // 0x60    |  0x60_1B            | PUSH1 27 (*) | contractOffset 20                                              //
            // 0x60    |  0x60_0C            | PUSH1 12     | 12 contractOffset 20                                            //
            // 0x39    |  0x39               | CODECOPY     |                                                                //
            // 0x33    |  0x33               | CALLER       | msg.sender                                                     //
            // 0x60    |  0x60_20            | PUSH1 32     | 32 msg.sender                                                  //
            // 0x52    |  0x52               | MSTORE       |                                                                //
            // 0x60    |  0x60_00            | PUSH1 0      | 0                                                              //
            // 0x51    |  0x51               | MLOAD        | byteDeployerAddress                                            //
            // 0x60    |  0x60_20            | PUSH1 32     | 32 byteDeployerAddress                                         //
            // 0x51    |  0x51               | MLOAD        | msg.sender byteDeployerAddress                                 //
            // 0x14    |  0x14               | EQ           | (msg.sender == byteDeployerAddress)                            //
            //---------------------------------------------------------------------------------------------------------------//
            // (2) load up destination jump address for `selfdestruct` logic
            //---------------------------------------------------------------------------------------------------------------//
            // 0x60    |  0x60_16            | PUSH1 22 (^) | jumpDestination (msg.sender == byteDeployerAddress)            //
            //---------------------------------------------------------------------------------------------------------------//
            // (3) jump if conditional logic above succeeds, otherwise revert with invalid op-code
            //---------------------------------------------------------------------------------------------------------------//
            // 0x57    |  0x57               | JUMPI        |                                                                //
            // 0xFE    |  0xFE               | INVALID      |                                                                //
            //---------------------------------------------------------------------------------------------------------------//
            // (4) perform actual purging
            //---------------------------------------------------------------------------------------------------------------//
            // 0x5B    |  0x5B               | JUMPDEST     |                                                                //
            // 0x60    |  0x60_00            | PUSH1 0      | 0                                                              //
            // 0x51    |  0x51               | MLOAD        | byteDeployerAddress                                            //
            // 0xFF    |  0xFF               | SELFDESTRUCT |                                                                //
            //---------------------------------------------------------------------------------------------------------------//
            // (*) Note: this value must be adjusted if selfdestruct purge logic is adjusted, to refer to the correct start  //
            //           offset for where the `msg.sender` address was stored in deplyed bytecode.                           //
            //                                                                                                               //
            // (^) Note: this value must be adjusted if selfdestruct purge logic is adjusted, to refer to the purge logic    //
            //           entry point jump desination.                                                                        //
            //---------------------------------------------------------------------------------------------------------------//
            // allow contract to be `selfdestruct`-able for cleanup purposes, gated to deploying-contract's address
            // (1) conditional logic for determing purge-gate
            hex"60_14_60_1B_60_0C_39_33_60_20_52_60_00_51_60_20_51_14",
            // (2) load up destination jump address for `selfdestruct` logic
            hex"60_16",
            // (3) jump if conditional logic above succeeds, otherwise revert with invalid op-code
            hex"57_FE",
            // (4) perform actual purging
            hex"5B_60_00_51_FF",
            // store the deploying-contract's address (to be used to gate and call `selfdestruct`)
            // note: abi.encodePacked will not pad the address, making the address 20 bytes
            address(this),
            // data comes last
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
        // decrement by DATA_OFFSET to account for purge logic
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
