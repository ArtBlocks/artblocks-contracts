import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GenArt721CoreV3_Curated_Flex } from "../../../../scripts/contracts";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployCoreWithMinterFilter,
} from "../../../util/common";

interface T_CuratedTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Curated_Flex;
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Curated_Flex", // V3.2 core Curated Flex contract
];

/**
 * Tests for V3 core dealing with configuring the core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Contract Views`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV2"
      ));

      return config as T_CuratedTestConfig;
    }

    describe("ArtBlocksCurationRegistryContractUpdated", function () {
      it("emits event after setting", async function () {
        const config = await loadFixture(_beforeEach);
        const newAddress = config.accounts.deployer.address;
        await expect(
          config.genArt721Core.updateArtblocksCurationRegistryAddress(
            newAddress
          )
        )
          .to.emit(
            config.genArt721Core,
            "ArtBlocksCurationRegistryContractUpdated"
          )
          .withArgs(newAddress);
      });
    });
  });
}
