// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ISplitFactoryV2} from "./integration-refs/splits-0x-v2/ISplitFactoryV2.sol";

interface ISplitProviderV0 {
    /**
     * @notice SplitInputs struct defines the inputs for requested splitters.
     * It is defined in a way easily communicated from the Art Blocks GenArt721V3 contract,
     * to allow for easy integration and minimal additional bytecode in the GenArt721V3 contract.
     */
    struct SplitInputs {
        address platformProviderSecondarySalesAddress;
        uint16 platformProviderSecondarySalesBPS;
        address renderProviderSecondarySalesAddress;
        uint16 renderProviderSecondarySalesBPS;
        uint8 artistTotalRoyaltyPercentage;
        address artist;
        address additionalPayee;
        uint8 additionalPayeePercentage;
    }

    /**
     * @notice Emitted when a new splitter contract is created.
     * @param splitter address of the splitter contract
     * @param splitParams The split parameters
     */
    event SplitterCreated(
        address indexed splitter,
        ISplitFactoryV2.Split splitParams
    );

    /**
     * @notice Emitted when an existing splitter contract is updated.
     * @param splitter address of the splitter contract
     * @param splitParams The split parameters
     */
    event SplitterUpdated(
        address indexed splitter,
        ISplitFactoryV2.Split splitParams
    );

    /**
     * @notice Creates a new splitter contract owned by this contract at a new address.
     * Sets msg.sender as the only authorized address to modify the splitter via future
     * calls to `modifySplitter` on this contract.
     * @dev Uses the 0xSplits v2 implementation to create an owned splitter contract,
     * with owner as this SplitProvider contract.
     * @param splitInputs The split input parameters.
     * @return splitter The newly created splitter contract address.
     */
    function createSplitter(
        SplitInputs calldata splitInputs
    ) external returns (address);

    /**
     * @notice Modifies the split parameters of an existing splitter contract.
     * Only the original caller of the `createSplitter` function may call this function.
     * @dev Uses the 0xSplits v2 implementation to modify the split parameters of an existing splitter contract.
     * @param splitter The splitter contract address to modify. Must be owned by this contract.
     * @param splitInputs The split input parameters.
     */
    function updateSplitter(
        address splitter,
        SplitInputs calldata splitInputs
    ) external;

    /**
     * @notice Indicates the type of the contract, e.g. `ISplitProviderV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32);
}
