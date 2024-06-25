import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { GenArt721CoreV3_Curated } from "../../../../scripts/contracts";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployCoreWithMinterFilter,
} from "../../../util/common";

interface T_CuratedTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Curated;
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Curated", // V3.2 core Curated contract
];

/**
 * Tests for V3 core dealing with configuring the core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Contract Configure`, async function () {
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
      // config.minter = await deployAndGet(config, "MinterSetPriceV2", [
      //   config.genArt721Core.address,
      //   config.minterFilter.address,
      // ]);

      // // add project zero
      // await config.genArt721Core
      //   .connect(config.accounts.deployer)
      //   .addProject("name", config.accounts.artist.address);
      // await config.genArt721Core
      //   .connect(config.accounts.deployer)
      //   .toggleProjectIsActive(config.projectZero);
      // await config.genArt721Core
      //   .connect(config.accounts.artist)
      //   .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      // // add project one without setting it to active or setting max invocations
      // await config.genArt721Core
      //   .connect(config.accounts.deployer)
      //   .addProject("name", config.accounts.artist2.address);

      // // configure minter for project zero
      // await config.minterFilter
      //   .connect(config.accounts.deployer)
      //   .addApprovedMinter(config.minter.address);
      // await config.minterFilter
      //   .connect(config.accounts.deployer)
      //   .setMinterForProject(config.projectZero, config.minter.address);
      // await config.minter
      //   .connect(config.accounts.artist)
      //   .updatePricePerTokenInWei(config.projectZero, 0);
      return config as T_CuratedTestConfig;
    }

    describe("initialize", function () {
      it("reverts on call to initialize (curated is initialized in constructor)", async function () {
        const config = await loadFixture(_beforeEach);
        const validCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        await expect(
          config.genArt721Core.initialize(
            validCuratedConfiguration,
            constants.ZERO_ADDRESS, // dummy,
            "dummybaseurihost",
            constants.ZERO_ADDRESS // dummy
          )
        ).to.be.revertedWith(
          "GenArt721CoreV3_Curated: contract initialized in constructor"
        );
      });
    });
  });
}
