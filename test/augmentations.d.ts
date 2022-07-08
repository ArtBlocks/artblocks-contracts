/**
 * @dev this augments the mocha context to include some common properties
 * we use in our tests
 */
import { BigNumber } from "ethers";
import { TestAccountsArtBlocks } from "./util/common";

declare module "mocha" {
  export interface Context {
    accounts: TestAccountsArtBlocks;
    projectZero: Number;
    name: String;
    symbol: String;
    firstTokenId: BigNumber;
    pricePerTokenInWei: BigNumber;
    maxInvocations: Number;
  }
}
