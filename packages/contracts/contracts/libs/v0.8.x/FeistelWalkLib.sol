// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FeistelWalkLib
 * @author Art Blocks Inc.
 * @notice Uniform once-over traversal of [0..N) via a seeded Feistel permutation.
 * @dev Designed for off-chain eth_call sampling (e.g., pick K=100 from N≈10k).
 *      - No duplicates, full coverage if you iterate k=0..N-1
 *      - O(1) per index; O(K) to sample K items
 *      - Works for any N (uses cycle-walking from next power-of-two domain)
 *      - Not cryptographic; optimized for gas efficiency with good mixing
 *  Uses 2 Feistel rounds with 64-bit round keys (k0, k1) derived from the seed.
 *  Additional keys (k2, k3) reserved for potential future use.
 */
library FeistelWalkLib {
    uint256 private constant MAX_CYCLE_WALKS = 32;
    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /// @notice Immutable traversal plan (deterministic from (seed, N)).
    /// @dev Build once per call, then stream with `index(plan, k)` or batch via `sample(plan, K)`.
    struct Plan {
        uint256 N; // pool size (>= 1)
        uint256 M; // next power-of-two >= N (<= 2N)
        uint256 logM; // log2(M) - precomputed to avoid repeated calculation
        uint256 rounds; // Feistel rounds (2 for gas-efficient mixing)
        // Feistel round keys (64-bit each; derived from seed)
        uint64 k0;
        uint64 k1;
        uint64 k2;
        uint64 k3;
    }

    /// @notice Build a Feistel permutation plan over [0..N).
    /// @param seed Arbitrary seed (domain-separate upstream if you like).
    /// @param N    Domain size; must be > 0.
    function makePlan(
        bytes32 seed,
        uint256 N
    ) internal pure returns (Plan memory p) {
        require(N > 0, "FeistelWalkLib:N=0");
        p.N = N;
        p.M = _nextPow2(N); // <= 2N
        p.logM = _log2ceil(p.M); // precompute to avoid repeated calculation
        p.rounds = 2; // 2 rounds provides good mixing with lower gas cost

        // Derive round keys (disjoint domains so they don't correlate)
        p.k0 = uint64(
            uint256(keccak256(abi.encodePacked(seed, "feistel.k0", N)))
        );
        p.k1 = uint64(
            uint256(keccak256(abi.encodePacked(seed, "feistel.k1", N)))
        );
        p.k2 = uint64(
            uint256(keccak256(abi.encodePacked(seed, "feistel.k2", N)))
        );
        p.k3 = uint64(
            uint256(keccak256(abi.encodePacked(seed, "feistel.k3", N)))
        );
    }

    /// @notice Stream the k-th index in the seeded permutation.
    /// @dev Requires 0 <= k < N. O(1) arithmetic; bounded cycle-walk if N not power of two.
    function index(
        Plan memory p,
        uint256 k
    ) internal pure returns (uint256 idx) {
        require(k < p.N, "FeistelWalkLib:k>=N");
        if (p.N == 1) return 0; // trivial domain

        // Permute k into [0..N) using Feistel over [0..M) + cycle-walking
        return
            _feistelPermuteRange(
                k,
                p.N,
                p.M,
                p.logM,
                p.rounds,
                p.k0,
                p.k1,
                p.k2,
                p.k3
            );
    }

    /// @notice Return up to K indices from the permutation (k = 0..K-1).
    /// @dev If K > N, it clamps to N. Allocates an array of size K'.
    function sample(
        Plan memory p,
        uint256 K
    ) internal pure returns (uint256[] memory out) {
        if (K > p.N) K = p.N;
        out = new uint256[](K);
        unchecked {
            for (uint256 i = 0; i < K; ++i) {
                out[i] = index(p, i);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Internal: Feistel on arbitrary N via power-of-two domain + cycle-walk
    // -------------------------------------------------------------------------

    /// @dev Permute x∈[0..N) by embedding into [0..M) (M power of two), running Feistel,
    ///      then cycle-walking until result < N. With M < 2N, p = N/M ≥ ~0.5 in worst case.
    ///      Hard-cap at MAX_CYCLE_WALKS to guarantee bounded work; on overflow, return `x`.
    function _feistelPermuteRange(
        uint256 x,
        uint256 N,
        uint256 M,
        uint256 logM,
        uint256 rounds,
        uint64 k0,
        uint64 k1,
        uint64 k2,
        uint64 k3
    ) private pure returns (uint256) {
        if (N == 1) return 0; // trivial domain
        uint256 y = x;
        unchecked {
            for (uint256 i = 0; i < MAX_CYCLE_WALKS; ++i) {
                uint256 z = _feistelOnPow2Domain(
                    y,
                    M,
                    logM,
                    rounds,
                    k0,
                    k1,
                    k2,
                    k3
                );
                if (z < N) return z; // landed inside domain
                y = z; // cycle-walk and try again
            }
        }
        // Ultra-rare guard: deterministic in-domain fallback (keeps progress).
        return x;
    }

    /// @dev Feistel permutation over [0..M) where M is a power of two.
    ///      Split into halves and apply round function twice for good mixing.
    function _feistelOnPow2Domain(
        uint256 x,
        uint256 M,
        uint256 logM,
        uint256 /* rounds */,
        uint64 k0,
        uint64 k1,
        uint64 /* k2 */,
        uint64 /* k3 */
    ) private pure returns (uint256) {
        if (M == 1) return 0; // degenerate
        if (M == 2) {
            // Special case: 2-element domain, use key to determine permutation
            return ((k0 & 1) == 0) ? x : (1 - x);
        }

        // Use precomputed logM and balanced Feistel network
        uint256 half = (logM + 1) / 2; // Round up for balanced halves
        uint256 mask;
        assembly {
            mask := sub(shl(half, 1), 1)
        }

        uint256 L;
        uint256 R;
        assembly {
            L := and(x, mask)
            R := and(shr(half, x), mask)
        }

        // Two Feistel rounds for good mixing
        unchecked {
            // Round 0
            uint256 F = _roundF(uint64(R), k0, 0);
            uint256 newR;
            assembly {
                newR := and(xor(L, F), mask)
            }
            L = R;
            R = newR;

            // Round 1
            F = _roundF(uint64(R), k1, 1);
            assembly {
                newR := and(xor(L, F), mask)
            }
            L = R;
            R = newR;
        }

        // Recombine
        uint256 result;
        assembly {
            result := or(shl(half, R), L)
        }
        return result;
    }

    /// @dev Lightweight 64-bit mixing function for Feistel rounds.
    ///      Uses XOR-shift operations for good bit avalanche without expensive multiplications.
    function _roundF(
        uint64 x,
        uint64 k,
        uint256 r
    ) private pure returns (uint64) {
        unchecked {
            // Mix in key and round constant
            x ^= k + uint64(r * 0x9E3779B97F4A7C15);
            // XorShift-style mixing for bit avalanche
            x ^= (x << 13);
            x ^= (x >> 7);
            x ^= (x << 17);
            x ^= (x >> 5);
            return x;
        }
    }

    // -------------------------------------------------------------------------
    // Internal: Bit helpers
    // -------------------------------------------------------------------------

    /// @dev Next power of two ≥ x. For x==0, returns 1.
    function _nextPow2(uint256 x) private pure returns (uint256) {
        if (x <= 1) return 1;
        unchecked {
            x -= 1;
            x |= x >> 1;
            x |= x >> 2;
            x |= x >> 4;
            x |= x >> 8;
            x |= x >> 16;
            x |= x >> 32;
            x |= x >> 64;
            x |= x >> 128;
            return x + 1;
        }
    }

    /// @dev ceil(log2(x)) for x≥1. (Number of bits to represent x-1.)
    function _log2ceil(uint256 x) private pure returns (uint256 n) {
        require(x > 0, "log2ceil(0)");
        unchecked {
            x -= 1;
            while (x > 0) {
                x >>= 1;
                ++n;
            }
        }
    }
}
