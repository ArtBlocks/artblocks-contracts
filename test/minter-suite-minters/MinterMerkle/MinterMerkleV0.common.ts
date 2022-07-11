import { Minter_Common } from "../Minter.common";

/**
 * These tests are intended to check common MinterMerkle functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterMerkle_Common = async () => {
  describe("common minter tests", async () => {
    Minter_Common();
  });
};
