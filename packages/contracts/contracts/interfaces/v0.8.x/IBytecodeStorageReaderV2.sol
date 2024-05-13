// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IBytecodeStorageReader} from "./IBytecodeStorageReader.sol";

/**
 * @title Art Blocks Script Storage Library (Reader)
 * @notice This interface defines the expected read functions for the Art Blocks Script Storage Library (Reader).
 * @dev This interface extends the V1 interface to add a function to get if data are stored in compressed format,
 * which is functionality added in the V2 format of the bytecode storage.
 */
interface IBytecodeStorageReaderV2 is IBytecodeStorageReader {
    /**
     * @notice Get if data are stored in compressed format for given contract bytecode
     * @param _address address of deployed contract with bytecode stored in the V0, V1, or V2 format
     * @return isCompressed boolean indicating if the stored data are compressed
     */
    function getIsCompressedForBytecode(
        address _address
    ) external view returns (bool);
}
