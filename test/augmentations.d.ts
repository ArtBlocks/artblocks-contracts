/**
 * @dev this augments the mocha context to include some common properties
 * we use in our tests
 */
import { BigNumber } from "ethers";
import { TestAccountsArtBlocks } from "./util/common";

declare module "mocha" {
  export interface Context {
    accounts: TestAccountsArtBlocks;
    name: string;
    symbol: string;
    pricePerTokenInWei: BigNumber;
    maxInvocations: Number;
    // project IDs
    projectZero: number;
    projectOne: number;
    projectTwo: number;
    // token IDs
    projectZeroTokenZero: BigNumber;
    projectZeroTokenOne: BigNumber;
    projectOneTokenZero: BigNumber;
    projectOneTokenOne: BigNumber;
    projectTwoTokenZero: BigNumber;
    projectTwoTokenOne: BigNumber;
  }
}
