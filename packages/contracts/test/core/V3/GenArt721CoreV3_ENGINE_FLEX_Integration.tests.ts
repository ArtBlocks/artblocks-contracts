import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  GENART721_ERROR_NAME,
  GENART721_ERROR_CODES,
} from "../../util/common";

import { GenArt721CoreV3_Engine_Flex } from "../../../scripts/contracts";

// extend T_Config to the configured settings for this test file
interface GenArt721CoreV3_Engine_Flex_Integration_TestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine_Flex;
  projectZero: number;
  projectTwo: number;
}

// enum for external asset dependency types
const IPFS = 0;
const ARWEAVE = 1;
const ONCHAIN = 2;
const ART_BLOCKS_DEPENDENCY_REGISTRY = 3;

// constants used for testing
const GENERIC_CID = "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo";
const GENERIC_CID2 = "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo2";
const GENERIC_CID3 = "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo3";
const GENERIC_ASSET_STRING = "Hello world";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

/**
 * Flex functionality integration tests for V3 core Engine Flex.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Integration`, async function () {
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
        "MinterFilterV1"
      ));

      config.minter = await deployAndGet(config, "MinterSetPriceV2", [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

      // add project
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      // configure minter for project zero
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, 0);
      return config as GenArt721CoreV3_Engine_Flex_Integration_TestConfig;
    }

    describe("external asset dependencies", async function () {
      it("can add an external asset dependency (off-chain)", async function () {
        const config = await loadFixture(_beforeEach);
        // add external asset dependency to project 0
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .addProjectExternalAssetDependency(
              config.projectZero,
              GENERIC_CID,
              IPFS
            )
        )
          .to.emit(config.genArt721Core, "ExternalAssetDependencyUpdated")
          .withArgs(0, 0, GENERIC_CID, 0, 1);
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);

        expect(externalAssetDependency.cid).to.equal(GENERIC_CID);
        expect(externalAssetDependency.dependencyType).to.equal(IPFS);
        expect(externalAssetDependency.bytecodeAddress).to.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependency.data).to.equal("");
      });

      it("can add an external asset dependency (on-chain)", async function () {
        const config = await loadFixture(_beforeEach);
        // add external asset dependency to project 0
        const dataString = "here is some data";
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .addProjectExternalAssetDependency(
              config.projectZero,
              dataString,
              ONCHAIN
            )
        )
          .to.emit(config.genArt721Core, "ExternalAssetDependencyUpdated")
          .withArgs(0, 0, "", 2, 1);
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);

        expect(externalAssetDependency.cid).to.equal("");
        expect(externalAssetDependency.dependencyType).to.equal(ONCHAIN);
        expect(externalAssetDependency.bytecodeAddress).to.not.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependency.data).to.equal(dataString);
      });

      it("can not remove external asset dependency not at last index", async function () {
        const config = await loadFixture(_beforeEach);
        // add external asset dependency to project 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            IPFS
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID2,
            ARWEAVE
          );

        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .removeProjectExternalAssetDependency(config.projectZero, 0),
          "Only removal of last asset"
        );
      });

      it("can remove an external asset dependency (off-chain)", async function () {
        const config = await loadFixture(_beforeEach);
        // add assets for project 0 at index 0, 1, 2
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            IPFS
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID2,
            ARWEAVE
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID3,
            ARWEAVE
          );
        // remove external asset at index 2, which is type 1 (off-chain)
        await config.genArt721Core
          .connect(config.accounts.artist)
          .removeProjectExternalAssetDependency(0, 2);

        // project external asset info at index 2 should be set back to default values as a result of being deleted
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 2);
        expect(externalAssetDependency.cid).to.equal("");
        expect(externalAssetDependency.dependencyType).to.equal(IPFS);

        // project external asset info at index 1 should remain unchanged relative to prior to removal
        const externalAssetDependencyAtIndex1 = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 1);
        expect(externalAssetDependencyAtIndex1.cid).to.equal(GENERIC_CID2);
        expect(externalAssetDependencyAtIndex1.dependencyType).to.equal(
          ARWEAVE
        );

        // count should now be only 2
        const externalAssetDependencyCount = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyCount(0);
        expect(externalAssetDependencyCount).to.equal(2);
      });

      it("can remove an external asset dependency (on-chain)", async function () {
        const config = await loadFixture(_beforeEach);
        const dataString = "here are some data";
        const dataString2 = "here are some data2";
        // add assets for project 0 at index 0, 1, 2
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            IPFS
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            dataString,
            ARWEAVE
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            dataString2,
            ONCHAIN
          );

        // remove ONCHAIN external asset at index 2
        await config.genArt721Core
          .connect(config.accounts.artist)
          .removeProjectExternalAssetDependency(config.projectZero, 2);

        // project external asset info at index 2 should be set back to default values as a result of being deleted
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 2);
        expect(externalAssetDependency.cid).to.equal("");
        expect(externalAssetDependency.dependencyType).to.equal(IPFS);
        expect(externalAssetDependency.bytecodeAddress).to.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependency.data).to.equal("");

        // project external asset info at index 1 should be unchanged relative to prior to removal
        const externalAssetDependencyAtIndex1 = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 1);
        expect(externalAssetDependencyAtIndex1.cid).to.equal(dataString);
        expect(externalAssetDependencyAtIndex1.dependencyType).to.equal(
          ARWEAVE
        );
        expect(externalAssetDependencyAtIndex1.bytecodeAddress).to.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependencyAtIndex1.data).to.equal("");

        // count should now be only 2
        const externalAssetDependencyCount = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyCount(0);
        expect(externalAssetDependencyCount).to.equal(2);
      });

      it("can update an external asset dependency (off-chain)", async function () {
        const config = await loadFixture(_beforeEach);
        // add assets for project 0 at index 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            IPFS
          );
        // get asset info at index 0 for project 0
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency.cid).to.equal(GENERIC_CID);
        expect(externalAssetDependency.dependencyType).to.equal(IPFS);
        // update asset info at index 0 for project 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependency(
            config.projectZero,
            0,
            GENERIC_CID2,
            ARWEAVE
          );

        const externalAssetDependency2 = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency2.cid).to.equal(GENERIC_CID2);
        expect(externalAssetDependency2.dependencyType).to.equal(ARWEAVE);
      });

      it("clears stale fields when updating extenal asset dependency from on-chain to off-chain", async function () {
        const config = await loadFixture(_beforeEach);
        // add assets for project 0 at index 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(config.projectZero, "", ONCHAIN);
        // replace asset at index 0 with off-chain asset
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependency(
            config.projectZero,
            0,
            GENERIC_CID,
            IPFS
          );
        // asset at index 0 should remove any on-chain data
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency.cid).to.equal(GENERIC_CID);
        expect(externalAssetDependency.dependencyType).to.equal(IPFS);
        expect(externalAssetDependency.bytecodeAddress).to.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependency.data).to.equal("");
      });

      it("can update an external asset dependency (on-chain)", async function () {
        const config = await loadFixture(_beforeEach);
        // validating that an off-chain asset dependency can be updated to an on-chain asset dependency
        const exampleCID = GENERIC_CID;
        const dataString = "here is some data";
        // add assets for project 0 at index 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            exampleCID,
            IPFS
          );
        // get asset info at index 0 for project 0
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency.cid).to.equal(exampleCID);
        expect(externalAssetDependency.dependencyType).to.equal(IPFS);

        // update asset info at index 0 for project 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependency(
            config.projectZero,
            0,
            dataString,
            ONCHAIN
          );

        const externalAssetDependency2 = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency2.cid).to.equal("");
        expect(externalAssetDependency2.dependencyType).to.equal(ONCHAIN);
        expect(externalAssetDependency2.bytecodeAddress).to.not.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependency2.data).to.equal(dataString);

        // validate updating an on-chain asset with another on-chain asset
        const externalAssetDependency2ByteCodeAddress =
          externalAssetDependency2[2];
        const dataString2 = "here is some more data2";
        // update asset info at index 0 for project 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependency(
            config.projectZero,
            0,
            dataString2,
            ONCHAIN
          );

        const externalAssetDependency3 = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency3.cid).to.equal("");
        expect(externalAssetDependency3.dependencyType).to.equal(ONCHAIN);
        expect(externalAssetDependency3.bytecodeAddress).to.not.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependency3.bytecodeAddress).to.not.equal(
          externalAssetDependency2ByteCodeAddress
        );
        expect(externalAssetDependency3.data).to.equal(dataString2);

        // update asset info at index 0 for project 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependency(
            config.projectZero,
            0,
            exampleCID,
            IPFS
          );
        // get asset info at index 0 for project 0
        const externalAssetDependency4 = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency4.cid).to.equal(exampleCID);
        expect(externalAssetDependency4.dependencyType).to.equal(IPFS);
      });

      it("can lock a projects external asset dependencies", async function () {
        const config = await loadFixture(_beforeEach);
        // add assets for project 0 at index 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            IPFS
          );
        // lock external asset dependencies for project 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .lockProjectExternalAssetDependencies(config.projectZero);

        // get asset info at index 0 for project 0
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);

        expect(externalAssetDependency.cid).to.equal(GENERIC_CID);
        expect(externalAssetDependency.dependencyType).to.equal(IPFS);

        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectExternalAssetDependency(
              config.projectZero,
              0,
              GENERIC_CID2,
              ARWEAVE
            ),
          "External dependencies locked"
        );
      });

      it("can use projectExternalAssetDependencyCount getter", async function () {
        const config = await loadFixture(_beforeEach);
        const externalAssetDependencyCountA = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyCount(0);
        expect(externalAssetDependencyCountA).to.equal(0);
        // add assets for project 0 at index 0
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            IPFS
          );

        const externalAssetDependencyCountB = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyCount(0);
        expect(externalAssetDependencyCountB).to.equal(1);
      });

      it("can update contract preferred IPFS & Arweave gateways", async function () {
        const config = await loadFixture(_beforeEach);
        const targetIPFSGateway = "https://ipfs.io/ipfs/";
        // setting IPFS gateway
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateIPFSGateway(targetIPFSGateway)
        )
          .to.emit(config.genArt721Core, "GatewayUpdated")
          .withArgs(0, targetIPFSGateway);
        // check for state update
        const ipfsGateway = await config.genArt721Core.preferredIPFSGateway();
        expect(ipfsGateway).to.equal(targetIPFSGateway);

        // setting Arweave gateway
        const targetArweaveGateway = "https://arweave.net/";
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArweaveGateway(targetArweaveGateway)
        )
          .to.emit(config.genArt721Core, "GatewayUpdated")
          .withArgs(1, targetArweaveGateway);
        // check for state update
        const arweaveGateway =
          await config.genArt721Core.preferredArweaveGateway();
        expect(arweaveGateway).to.equal(targetArweaveGateway);
      });

      it("reverts when updating asset out of range", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectExternalAssetDependency(
              config.projectZero,
              0,
              GENERIC_CID,
              IPFS
            ),
          "Asset index out of range"
        );
      });
    });

    describe("updateProjectExternalAssetDependencyOnChainCompressed", function () {
      it("reverts when called by non-admin, non-artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.genArt721Core
            .connect(config.accounts.user)
            .updateProjectExternalAssetDependencyOnChainCompressed(
              config.projectZero,
              0,
              "0x"
            )
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyArtistOrAdminACL);
      });

      it("allows artist to call", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            ONCHAIN
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependencyOnChainCompressed(
            config.projectZero,
            0,
            "0x"
          );
      });

      it("allows admin to call", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            ONCHAIN
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectExternalAssetDependencyOnChainCompressed(
            config.projectZero,
            0,
            "0x"
          );
      });

      it("reverts when asset index is out of range", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectExternalAssetDependencyOnChainCompressed(
              config.projectZero,
              0,
              "0x"
            ),
          "Asset index out of range"
        );
      });

      it("reverts when assets are locked", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            ONCHAIN
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .lockProjectExternalAssetDependencies(config.projectZero);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectExternalAssetDependencyOnChainCompressed(
              config.projectZero,
              0,
              "0x"
            ),
          "External dependencies locked"
        );
      });

      it("emits event when called", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            ONCHAIN
          );
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectExternalAssetDependencyOnChainCompressed(
              config.projectZero,
              0,
              "0x"
            )
        )
          .to.emit(config.genArt721Core, "ExternalAssetDependencyUpdated")
          .withArgs(config.projectZero, 0, "", ONCHAIN, 1);
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            GENERIC_CID,
            ONCHAIN
          );
        const compressedGenericAsset =
          await config.genArt721Core.getCompressed(GENERIC_ASSET_STRING);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependencyOnChainCompressed(
            config.projectZero,
            0,
            compressedGenericAsset
          );
        const externalAssetDependency = await config.genArt721Core
          .connect(config.accounts.artist)
          .projectExternalAssetDependencyByIndex(config.projectZero, 0);
        expect(externalAssetDependency.cid).to.equal("");
        expect(externalAssetDependency.dependencyType).to.equal(ONCHAIN);
        expect(externalAssetDependency.bytecodeAddress).to.not.equal(
          constants.ZERO_ADDRESS
        );
        expect(externalAssetDependency.data).to.equal(GENERIC_ASSET_STRING);
      });
    });

    describe("updateProjectExternalAssetDependencyOnChainCompressed", function () {
      // TODO
    });

    describe("addProjectExternalAssetDependencyOnChainCompressed", function () {
      // TODO
    });

    describe("addProjectAssetDependencyOnChainAtAddress", function () {
      // TODO
    });
  });
}
