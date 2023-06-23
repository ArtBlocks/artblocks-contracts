// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IGenArt721CoreContractV3_Base.sol";
import "./IRandomizer_V3CoreBase.sol";

interface IRandomizerV2 is IRandomizer_V3CoreBase {
    // The core contract that may interact with this randomizer contract.
    function genArt721Core()
        external
        view
        returns (IGenArt721CoreContractV3_Base);
}
