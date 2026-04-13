// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import {ERC7821} from "solady/src/accounts/ERC7821.sol";
import {ECDSA} from "solady/src/utils/ECDSA.sol";

/// @title RelayExecutor
/// @notice EIP-7702 delegation target for batched EVM call execution with
///         per-bundle log delimiting. Extends Solady ERC7821 with a
///         BundleExecuted event emitted after each sub-batch completes,
///         enabling reliable log attribution by the relay.
/// @dev Deploy deterministically via CREATE2 for same address on all chains.
///      Stateless, no storage, no initialization, no upgrade concerns.
///
///      Relay encoding uses the ERC-7821 batch-of-batches mode: each queue
///      item becomes its own sub-batch. The base _executeBatchOfBatches loops
///      through sub-batches calling execute() per sub-batch, which flows
///      through our _execute(Call[]) override and emits BundleExecuted.
///
///      Receipt log layout for a batch with 3 bundles:
///        [logA, logB, BundleExecuted, logC, logD, BundleExecuted, logF, BundleExecuted]
///         └── bundle 0 ──────────────┘ └── bundle 1 ─────────────┘ └── bundle 2 ────┘
contract RelayExecutor is ERC7821 {
    /// @notice Emitted after each bundle (sub-batch) completes successfully.
    ///         The relay slices receipt logs between consecutive BundleExecuted
    ///         events to attribute logs to the originating queue item.
    event BundleExecuted();

    /// @notice ERC-1271 signature validation. Performs ecrecover against the
    ///         EOA address (address(this) under EIP-7702 delegation).
    ///         Required because some contracts skip ecrecover when the signer has code.
    function isValidSignature(
        bytes32 hash,
        bytes calldata signature
    ) public view virtual returns (bytes4 result) {
        bool success = ECDSA.recoverCalldata(hash, signature) == address(this);
        /// @solidity memory-safe-assembly
        assembly {
            // success ? bytes4(keccak256("isValidSignature(bytes32,bytes)")) : 0xffffffff
            result := shl(224, or(0x1626ba7e, sub(0, iszero(success))))
        }
    }

    /// @notice Execute all calls in a bundle, then emit BundleExecuted.
    function _execute(
        Call[] calldata calls,
        bytes32 extraData
    ) internal override {
        unchecked {
            uint256 n = calls.length;
            for (uint256 i; i < n; ++i) {
                (address to, uint256 value, bytes calldata data) = _get(
                    calls,
                    i
                );
                _execute(to, value, data, extraData);
            }
        }
        emit BundleExecuted();
    }
}
