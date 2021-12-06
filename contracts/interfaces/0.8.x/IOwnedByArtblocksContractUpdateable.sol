// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "./IOwnedByArtblocksContract.sol";

pragma solidity ^0.8.0;

interface IOwnedByArtblocksContractUpdateable is IOwnedByArtblocksContract {
    event ArtblocksContractUpdated(address indexed artblocksContract);

    function updateArtblocksContract(address _genArt721Address) external;
}
