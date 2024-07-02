import { formatEther, parseEther } from "viem";

const SLOTS_PER_PRICE_DOUBLE = BigInt(64);

// This is a replication of the logic in the RAM contract - see here:
// https://github.com/ArtBlocks/artblocks-contracts/blob/a147a26fa87408552343c951d06efdda283f9332/packages/contracts/contracts/libs/v0.8.x/minter-libs/RAMLib.sol#L2894
export function slotIndexToBidValue(
  basePriceEth: string,
  slotIndex: number
): bigint {
  const baseWei = parseEther(basePriceEth);
  const slot = BigInt(slotIndex);
  // use pseud-exponential pricing curve
  // multiply by two (via bit-shifting) for the number of entire
  // slots-per-price-double associated with the slot index
  // @dev overflow not possible due to typing, constants, and check above
  // (max(uint88) << (512 / 64)) < max(uint256)
  let slotBidValue = baseWei << (slot / SLOTS_PER_PRICE_DOUBLE);
  // perform a linear interpolation between partial half-life points, to
  // approximate the current place on a perfect exponential curve.
  // @dev overflow automatically checked in solidity 0.8, not expected
  slotBidValue +=
    (slotBidValue * (slot % SLOTS_PER_PRICE_DOUBLE)) / SLOTS_PER_PRICE_DOUBLE;

  return slotBidValue;
}

export function getNearestSlotForBidValue(
  basePriceEth: string,
  bidValue: number
): { index: number; value: bigint } {
  let slot = 0;
  let slotBidValue = slotIndexToBidValue(basePriceEth, slot);
  const bidWei = parseEther(bidValue.toString());
  while (slotBidValue < bidWei) {
    slot++;
    slotBidValue = slotIndexToBidValue(basePriceEth, slot);
  }
  return { index: slot, value: slotBidValue };
}

export function dbBidIdToOnChainBidId(dbBidId: string): number {
  const splitBidId = dbBidId.split("-");
  const bidId = Number(splitBidId[splitBidId.length - 1]);

  return bidId;
}
