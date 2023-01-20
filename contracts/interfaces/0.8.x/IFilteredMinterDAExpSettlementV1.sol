// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterDAExpSettlement_Mixin.sol";
import "./IFilteredMinterV1.sol";
import "./IFilteredMinterV3_Mixin.sol";
import "./IFilteredMinterDAExpV0.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface combines the set of interfaces that add support for
 * a Dutch Auction with Settlement minter.
 * @dev Capabilities added by IFilteredMinterV2 are intentionally not included
 * in this interface. This is because a local maxInvocations limit is not
 * included in the DAExpSettlementV1 minter.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterDAExpSettlementV1 is
    IFilteredMinterDAExpSettlement_Mixin,
    IFilteredMinterV1,
    IFilteredMinterV3_Mixin,
    IFilteredMinterDAExpV0
{

}
