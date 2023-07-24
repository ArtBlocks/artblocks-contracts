// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./ISharedRandomizerV0.sol";

/**
 * @title Interface for accessing a shared randomizer on a core contract.
 * @notice This interface provides access to a V3 core contract's shared
 * randomizer. Note that randomizers are configurable by core contract admin,
 * and therefore may not currently be assigned a shared randomizer. For that
 * reason, this is a separate interface from `IGenArt721CoreContractV3_Base,
 * and casting a contract as this interface makes the assumption that the core
 * contract's randomizer conforms to `ISharedRandomizerV0`.
 * This interface is expected to be most useful for minters that explicitly
 * assign hash seeds via mechanisms on the shared randomizer (e.g. Polyptych
 * minters)
 */
interface IGenArt721CoreContractV3WithSharedRandomizer {
    /// current randomizer contract, that we cast as a shared randomizer
    function randomizerContract() external returns (ISharedRandomizerV0);
}
