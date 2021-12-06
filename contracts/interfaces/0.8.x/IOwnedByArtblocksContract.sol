// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.
import "./IGenArt721CoreContract.sol";

pragma solidity ^0.8.0;

interface IOwnedByArtblocksContract {
    function artblocksContract() external view returns (IGenArt721CoreContract);
}
