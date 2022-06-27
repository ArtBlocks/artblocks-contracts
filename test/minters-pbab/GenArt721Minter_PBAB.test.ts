import { GenArt721Minter_PBAB_Common } from "./GenArt721Minter_PBAB.common";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
const minter = "GenArt721Minter_PBAB";
describe(minter, async function () {
  // base tests
  GenArt721Minter_PBAB_Common(minter);
  // no additional tests neeeded for this contract
});
