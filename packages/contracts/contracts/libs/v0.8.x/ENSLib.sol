// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title IUniversalResolver
 * @notice Minimal ENS Universal Resolver interface for reverse resolution
 * @dev See https://docs.ens.domains/resolvers/universal#reverse-resolution
 */
interface IUniversalResolver {
    function reverse(
        bytes calldata lookupAddress,
        uint256 coinType
    )
        external
        view
        returns (
            string memory primary,
            address resolver,
            address reverseResolver
        );
}

/**
 * @title ENS Library
 * @notice This library provides helper functions for ENS name resolution
 * using the ENS Universal Resolver following ENS best practices.
 * @author Art Blocks Inc.
 * @dev This library uses the Universal Resolver's reverse() function which
 * performs both reverse lookup AND forward verification in a single call.
 * For an address to have a valid ENS name returned by this library, the owner
 * must set up a reverse record (reverse lookup) by calling setName() on the
 * reverse registrar. This is OPTIONAL and must be done by the address owner
 * on-chain. If not set, the library returns an empty string.
 *
 * References:
 * - Universal Resolver: https://docs.ens.domains/resolvers/universal
 * - Reverse Resolution: https://docs.ens.domains/resolvers/universal#reverse-resolution
 */
library ENSLib {
    /// @notice ENS Universal Resolver deployment address (same on mainnet and testnets)
    /// @dev This is a proxy contract owned by ENS DAO
    /// See: https://docs.ens.domains/resolvers/universal
    address internal constant UNIVERSAL_RESOLVER_ADDRESS =
        0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe;

    /// @notice Coin type for Ethereum (used in reverse resolution)
    /// @dev See ENSIP-9 for multichain address resolution
    uint256 internal constant COIN_TYPE_ETH = 60;

    /**
     * @notice Resolves an ENS name for a given address using the Universal Resolver.
     * @dev Uses the ENS Universal Resolver's reverse() function which internally:
     * 1. Performs reverse lookup to get the name claimed by the address
     * 2. Verifies forward resolution to ensure the name actually resolves back to the address
     *
     * This provides protection against spoofing in a single call.
     *
     * NOTE: For an address to have a valid ENS name returned by this function, the owner must:
     * - Set up a reverse record (reverse lookup) by calling setName() on the reverse registrar
     * - This is OPTIONAL and must be done by the address owner on-chain
     * - If not set, this function returns an empty string
     *
     * @param ownerAddress The address to resolve the ENS name for.
     * @return ensName The ENS name for the address, or empty string if not found/invalid.
     */
    function getEnsName(
        address ownerAddress
    ) internal view returns (string memory) {
        // Call the Universal Resolver's reverse function
        // The reverse function internally performs both reverse lookup and forward verification
        try
            IUniversalResolver(UNIVERSAL_RESOLVER_ADDRESS).reverse(
                abi.encodePacked(ownerAddress),
                COIN_TYPE_ETH
            )
        returns (string memory primary, address, address) {
            return primary;
        } catch {
            // If any error occurs (no reverse record, forward mismatch, etc.), return empty string
            return "";
        }
    }
}
