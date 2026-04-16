// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import {RelayExecutor} from "./RelayExecutor.sol";

/// @title RelayExecutorPartialReverts
/// @notice Variant of RelayExecutor where each bundle in a batch-of-batches
///         executes independently. A failing bundle reverts only its own state
///         changes; all other bundles continue executing.
/// @dev Overrides _executeBatchOfBatches to wrap each sub-batch execute() in a
///      try/catch, creating an isolated EVM call frame per bundle.
///
///      Successful bundles emit BundleExecuted (inherited from RelayExecutor).
///      Failed bundles emit BundleFailed with the revert reason from the
///      parent frame — the failed bundle's state changes and logs are rolled
///      back by the EVM.
///
///      Receipt log layout for a batch with 3 bundles (bundle 1 fails):
///        [logA, logB, BundleExecuted, BundleFailed, logF, BundleExecuted]
///         └── bundle 0 ──────────────┘ └─ bundle 1 ┘ └── bundle 2 ────┘
contract RelayExecutorPartialReverts is RelayExecutor {
    /// @notice Emitted when a bundle fails. Serves as a delimiter for the
    ///         failed bundle (no inner logs since its state was reverted).
    /// @param bundleIndex Index of the failed bundle within the batch.
    /// @param reason ABI-encoded revert reason from the failed sub-call.
    event BundleFailed(uint256 bundleIndex, bytes reason);

    /// @dev Overrides ERC7821._executeBatchOfBatches to isolate each sub-batch
    ///      in its own call frame via try/catch on an external self-call.
    ///      The self-call sets msg.sender = address(this) in the child frame,
    ///      so we must enforce auth here to prevent unauthorized callers from
    ///      bypassing the check that normally happens inside _execute.
    function _executeBatchOfBatches(
        bytes32 mode,
        bytes calldata executionData
    ) internal override {
        require(msg.sender == address(this));
        // Convert mode from batch-of-batches (0x78210002) to single-batch
        // with opData support (0x78210001), same as the base implementation.
        mode ^= bytes32(uint256(3 << (22 * 8)));
        (uint256 n, uint256 o, uint256 e) = (0, 0, 0);
        /// @solidity memory-safe-assembly
        assembly {
            let j := calldataload(executionData.offset)
            let t := add(executionData.offset, j)
            n := calldataload(t)
            o := add(0x20, t)
            e := add(executionData.offset, executionData.length)
            if or(
                shr(64, j),
                or(lt(executionData.length, 0x20), gt(add(o, shl(5, n)), e))
            ) {
                mstore(0x00, 0x3995943b) // `BatchOfBatchesDecodingError()`.
                revert(0x1c, 0x04)
            }
        }
        unchecked {
            for (uint256 i; i != n; ++i) {
                bytes calldata batch;
                /// @solidity memory-safe-assembly
                assembly {
                    let j := calldataload(add(o, shl(5, i)))
                    let t := add(o, j)
                    batch.offset := add(t, 0x20)
                    batch.length := calldataload(t)
                    if or(shr(64, j), gt(add(batch.offset, batch.length), e)) {
                        mstore(0x00, 0x3995943b) // `BatchOfBatchesDecodingError()`.
                        revert(0x1c, 0x04)
                    }
                }
                // External self-call creates an isolated call frame.
                // msg.sender == address(this) satisfies the base ERC7821 auth.
                try this.execute(mode, batch) {} catch (bytes memory reason) {
                    emit BundleFailed(i, reason);
                }
            }
        }
    }
}
