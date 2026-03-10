import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

describe("MintMulticallUtil", function () {
  async function _beforeEach() {
    // load minter filter V2 fixture
    const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
    // deploy core contract (using Engine for simplicity) and register on core registry
    ({
      genArt721Core: config.genArt721Core,
      randomizer: config.randomizer,
      adminACL: config.adminACL,
    } = await deployCore(
      config,
      "GenArt721CoreV3_Engine",
      config.coreRegistry
    ));

    // update core's minter to minter filter
    await config.genArt721Core.updateMinterContract(
      config.minterFilter.address
    );

    // deploy MinterSetPriceV5
    config.minter = await deployAndGet(config, "MinterSetPriceV5", [
      config.minterFilter.address,
    ]);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .approveMinterGlobally(config.minter.address);

    // Project setup
    await safeAddProject(
      config.genArt721Core,
      config.accounts.deployer,
      config.accounts.artist.address
    );

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);

    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectZero);

    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(
        config.projectZero,
        config.genArt721Core.address,
        config.minter.address
      );

    // Set price for project zero
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(
        config.projectZero,
        config.genArt721Core.address,
        config.pricePerTokenInWei
      );

    // Set max invocations to 15 (default)
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, 15);

    // Deploy MintMulticallUtil owned by deployer
    const mintMulticallUtil = await deployAndGet(config, "MintMulticallUtil", [
      config.accounts.deployer.address,
    ]);

    return { ...config, mintMulticallUtil };
  }

  describe("purchaseToMulti", function () {
    it("successfully mints 10 tokens at once to specified addresses", async function () {
      const config = await loadFixture(_beforeEach);
      const numMints = 10;

      // Build array of 10 recipient addresses (alternate between user and user2)
      const toAddresses: string[] = [];
      for (let i = 0; i < numMints; i++) {
        toAddresses.push(
          i % 2 === 0
            ? config.accounts.user.address
            : config.accounts.user2.address
        );
      }

      const totalPrice = config.pricePerTokenInWei.mul(numMints);

      // Execute multi-purchase
      const tx = await config.mintMulticallUtil
        .connect(config.accounts.deployer)
        .purchaseToMulti(
          config.minter.address,
          numMints,
          toAddresses,
          config.projectZero,
          config.genArt721Core.address,
          { value: totalPrice }
        );

      const receipt = await tx.wait();

      // Verify TokenMinted events were emitted for each mint
      const tokenMintedEvents = receipt.events?.filter(
        (e: any) => e.event === "TokenMinted"
      );
      expect(tokenMintedEvents).to.have.lengthOf(numMints);

      // Verify each token was minted to the correct address
      for (let i = 0; i < numMints; i++) {
        const expectedOwner =
          i % 2 === 0
            ? config.accounts.user.address
            : config.accounts.user2.address;
        const tokenId = tokenMintedEvents![i].args!.tokenId;
        const owner = await config.genArt721Core.ownerOf(tokenId);
        expect(owner).to.equal(expectedOwner);
      }
    });

    it("reverts when called by non-owner", async function () {
      const config = await loadFixture(_beforeEach);
      const toAddresses = [config.accounts.user.address];
      const totalPrice = config.pricePerTokenInWei;

      await expect(
        config.mintMulticallUtil
          .connect(config.accounts.user)
          .purchaseToMulti(
            config.minter.address,
            1,
            toAddresses,
            config.projectZero,
            config.genArt721Core.address,
            { value: totalPrice }
          )
      ).to.be.revertedWithCustomError(
        config.mintMulticallUtil,
        "OwnableUnauthorizedAccount"
      );
    });

    it("reverts when array length does not match numMints", async function () {
      const config = await loadFixture(_beforeEach);
      const toAddresses = [config.accounts.user.address]; // length 1 but numMints is 2

      await expect(
        config.mintMulticallUtil
          .connect(config.accounts.deployer)
          .purchaseToMulti(
            config.minter.address,
            2,
            toAddresses,
            config.projectZero,
            config.genArt721Core.address,
            { value: config.pricePerTokenInWei.mul(2) }
          )
      ).to.be.revertedWithCustomError(
        config.mintMulticallUtil,
        "ArrayLengthMismatch"
      );
    });

    it("reverts when numMints is zero", async function () {
      const config = await loadFixture(_beforeEach);

      await expect(
        config.mintMulticallUtil
          .connect(config.accounts.deployer)
          .purchaseToMulti(
            config.minter.address,
            0,
            [],
            config.projectZero,
            config.genArt721Core.address,
            { value: 0 }
          )
      ).to.be.revertedWithCustomError(config.mintMulticallUtil, "ZeroMints");
    });
  });
});
