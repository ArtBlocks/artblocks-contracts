// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc. to support the 0xSplits V2 integration
// Sourced from:
//  - https://github.com/0xSplits/splits-contracts-monorepo/blob/main/packages/splits-v2/src/splitters/SplitWalletV2.sol

pragma solidity 0.8.22;

import {ISplitFactoryV2} from "./ISplitFactoryV2.sol";

interface ISplitWalletV2 {
    /**
     * @notice Updates the split.
     * @dev Only the owner can call this function.
     * @param _split The new split struct.
     */
    function updateSplit(ISplitFactoryV2.Split calldata _split) external;
}
