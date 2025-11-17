import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GenArt721CoreV3_Explorations_Flex } from "../../../../scripts/contracts";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployCoreWithMinterFilter,
} from "../../../util/common";

interface T_ExplorationsTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Explorations_Flex;
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Explorations_Flex", // V3.2 core Explorations Flex contract
];

const EXPECTED_CORE_VERSION = "v3.2.8";

const EXPECTED_PREVIOUS_ART_BLOCKS_EXPLORATIONS_CONTRACTS = [
  "0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a",
];

/**
 * Tests for V3 core dealing with views.
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

      return config as T_ExplorationsTestConfig;
    }

    describe("coreVersion", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.genArt721Core.coreVersion()).to.equal(
          EXPECTED_CORE_VERSION
        );
      });
    });

    describe("PREVIOUS_ART_BLOCKS_EXPLORATIONS_CONTRACTS", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        for (
          let i = 0;
          i < EXPECTED_PREVIOUS_ART_BLOCKS_EXPLORATIONS_CONTRACTS.length;
          i++
        ) {
          expect(
            await config.genArt721Core.PREVIOUS_ART_BLOCKS_EXPLORATIONS_CONTRACTS(
              i
            )
          ).to.equal(EXPECTED_PREVIOUS_ART_BLOCKS_EXPLORATIONS_CONTRACTS[i]);
        }
      });
    });

    describe("IS_FLAGSHIP", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        expect(await config.genArt721Core.IS_FLAGSHIP()).to.equal(true);
      });
    });

    describe("artblocksCurationRegistryAddress", function () {
      it("returns null address initially", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.genArt721Core.artblocksCurationRegistryAddress()
        ).to.equal(constants.ZERO_ADDRESS);
      });

      it("returns set address after setting", async function () {
        const config = await loadFixture(_beforeEach);
        const newAddress = config.accounts.deployer.address;
        await config.genArt721Core.updateArtblocksCurationRegistryAddress(
          newAddress
        );
        expect(
          await config.genArt721Core.artblocksCurationRegistryAddress()
        ).to.equal(newAddress);
      });
    });
  });
}

