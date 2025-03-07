// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import "../interfaces/v0.8.x/IPMPAugmentHook.sol";
import "../interfaces/v0.8.x/IWeb3Call.sol";
import "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";

/**
 * @title Mock PMP Augment Hook
 * @notice Mock implementation of IPMPAugmentHook for testing purposes
 */
contract MockPMPAugmentHook is IPMPAugmentHook, ERC165 {
    // Event to track when the hook is called
    event TokenPMPAugmented(
        address indexed coreContract,
        uint256 indexed tokenId,
        uint256 paramCount
    );

    // Return behavior settings
    bool public shouldAddParam = false;
    bool public shouldModifyParams = false;
    bool public shouldRevert = false;

    // Parameters for augmentation
    string public augmentKey = "augmentedParam";
    string public augmentValue = "augmentedValue";

    /**
     * @notice Configure the hook behavior
     * @param _shouldAddParam Whether the hook should add a parameter
     * @param _shouldModifyParams Whether the hook should modify existing parameters
     * @param _shouldRevert Whether the hook should revert
     */
    function setHookBehavior(
        bool _shouldAddParam,
        bool _shouldModifyParams,
        bool _shouldRevert
    ) external {
        shouldAddParam = _shouldAddParam;
        shouldModifyParams = _shouldModifyParams;
        shouldRevert = _shouldRevert;
    }

    /**
     * @notice Set the augmentation values
     * @param _augmentKey The key for the augmented parameter
     * @param _augmentValue The value for the augmented parameter
     */
    function setAugmentValues(
        string memory _augmentKey,
        string memory _augmentValue
    ) external {
        augmentKey = _augmentKey;
        augmentValue = _augmentValue;
    }

    /**
     * @notice Implement the hook method that gets called during token PMP reads
     * @param tokenParams The original token parameters
     * @return The augmented token parameters
     */
    function onTokenPMPReadAugmentation(
        address /* coreContract */,
        uint256 /* tokenId */,
        IWeb3Call.TokenParam[] calldata tokenParams
    ) external view override returns (IWeb3Call.TokenParam[] memory) {
        // Since this is a view function, we can't emit events or modify state
        // Tests will need to call the hook and then separately call simulateCall

        // Optionally revert to test error handling
        if (shouldRevert) {
            revert("MockPMPAugmentHook: Intentional revert");
        }

        // If we shouldn't modify, just return the original
        if (!shouldAddParam && !shouldModifyParams) {
            IWeb3Call.TokenParam[] memory result_ = new IWeb3Call.TokenParam[](
                tokenParams.length
            );
            for (uint256 i = 0; i < tokenParams.length; i++) {
                result_[i] = tokenParams[i];
            }
            return result_;
        }

        // Handle parameter modification
        if (shouldModifyParams && tokenParams.length > 0) {
            // Create a copy to modify
            IWeb3Call.TokenParam[]
                memory modifiedParams = new IWeb3Call.TokenParam[](
                    tokenParams.length
                );

            // Copy all parameters
            for (uint256 i = 0; i < tokenParams.length; i++) {
                modifiedParams[i] = tokenParams[i];
            }

            // Modify first parameter
            if (tokenParams.length > 0) {
                modifiedParams[0].value = string(
                    abi.encodePacked("modified_", tokenParams[0].value)
                );
            }

            // Handle parameter addition if needed
            if (shouldAddParam) {
                // Create new array with one additional element
                IWeb3Call.TokenParam[]
                    memory augmentedParams = new IWeb3Call.TokenParam[](
                        modifiedParams.length + 1
                    );

                // Copy existing modified parameters
                for (uint256 i = 0; i < modifiedParams.length; i++) {
                    augmentedParams[i] = modifiedParams[i];
                }

                // Add new parameter
                augmentedParams[modifiedParams.length] = IWeb3Call.TokenParam({
                    key: augmentKey,
                    value: augmentValue
                });

                return augmentedParams;
            }

            return modifiedParams;
        }

        // Handle parameter addition only
        if (shouldAddParam) {
            // Create new array with one additional element
            IWeb3Call.TokenParam[]
                memory augmentedParams = new IWeb3Call.TokenParam[](
                    tokenParams.length + 1
                );

            // Copy existing parameters
            for (uint256 i = 0; i < tokenParams.length; i++) {
                augmentedParams[i] = tokenParams[i];
            }

            // Add new parameter
            augmentedParams[tokenParams.length] = IWeb3Call.TokenParam({
                key: augmentKey,
                value: augmentValue
            });

            return augmentedParams;
        }

        // This should never be reached due to the if checks above
        revert("MockPMPAugmentHook: Unexpected behavior");
    }

    /**
     * @notice Implement ERC165 interface detection
     * @param interfaceId The interface ID to check
     * @return True if the interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IPMPAugmentHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
