import { expect } from "chai";
import { Wallet } from "ethers";
import { arrayify } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  assignDefaultConstants,
  deployAndGet,
  getAccounts,
} from "../util/common";

/**
 * These tests are intended to check the IYK integration's functionality.
 * These tests are not complete, and assume all GenArt721CoreV2_PBAB functionality
 * remains perfectly function, as GenArt721CoreV2_IYK subclasses it.
 */
describe("GenArt721CoreV2_IYK_Integration", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    this.signVerifier = new Wallet(
      "fb45bc2049e143fb168fd438ae6dd3eefffa7f798a7f4d865b6748831abaa625" as string
    );
    // deploy and configure core, randomizer, and minter
    this.randomizer = await deployAndGet.call(this, "BasicRandomizer", []);

    // assign the iyk sign verifier
    this.signVerifierRegistry = await deployAndGet.call(
      this,
      "SignVerifierRegistryMock",
      []
    );
    this.iykId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IYK"));

    // V2_PRTNR need additional arg for starting project ID
    this.genArt721Core = await deployAndGet.call(this, "GenArt721CoreV2_IYK", [
      this.name,
      this.symbol,
      this.randomizer.address,
      0,
      this.signVerifierRegistry.address,
      this.iykId,
    ]);
    this.minter = await deployAndGet.call(this, "GenArt721Minter_PBAB", [
      this.genArt721Core.address,
    ]);

    // add minter
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minter.address);

    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address, this.projectZero);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);

    // add user minter for testing IYK integration
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.accounts.additional.address);

    // register sign verifier for testing iyk integration
    await this.signVerifierRegistry.register(
      this.iykId,
      this.signVerifier.address
    );
  });

  describe("getClaimSigningHash", () => {
    describe("should return the correct hash", () => {
      it("when called", async function () {
        const blockExpiry = ethers.BigNumber.from(123);
        const tokenId = ethers.BigNumber.from(1);

        const claimSigningHash = await this.genArt721Core.getClaimSigningHash(
          blockExpiry,
          this.accounts.user.address,
          tokenId
        );
        expect(claimSigningHash).to.equal(
          ethers.utils.solidityKeccak256(
            ["uint256", "address", "uint256", "address", "uint256"],
            [
              blockExpiry,
              this.accounts.user.address,
              tokenId,
              this.genArt721Core.address,
              await this.genArt721Core.getClaimNonce(
                this.accounts.user.address
              ),
            ]
          )
        );
      });
    });
  });

  describe("signVerifier", () => {
    describe("getSignVerifier should return the correct verifier address", () => {
      it("when called", async function () {
        const signVerifier = await this.genArt721Core.getSignVerifier();
        expect(signVerifier).to.equal(this.signVerifier.address);
      });
    });

    describe("signVerifierRegistry should return the correct registry address", () => {
      it("when called", async function () {
        const signVerifierRegistry =
          await this.genArt721Core.signVerifierRegistry();
        expect(signVerifierRegistry).to.equal(
          this.signVerifierRegistry.address
        );
      });
    });

    describe("setSignVerifierId should change the verifier address", () => {
      it("when called", async function () {
        const newId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NEW"));
        const newVerifier = this.accounts.user.address;

        await this.signVerifierRegistry.register(newId, newVerifier);
        await this.genArt721Core.setSignVerifierId(newId);

        const signVerifier = await this.genArt721Core.getSignVerifier();
        expect(signVerifier).to.equal(newVerifier);
      });
    });

    describe("setSignVerifierRegistry should change the registry address", () => {
      it("when called", async function () {
        await this.genArt721Core.setSignVerifierRegistry(
          this.accounts.additional.address
        );

        const signVerifierRegistry =
          await this.genArt721Core.signVerifierRegistry();
        expect(signVerifierRegistry).to.equal(this.accounts.additional.address);
      });
    });
  });

  describe("claimNFT", () => {
    describe("should transfer a tokens ownership", () => {
      it("when the signature is valid", async function () {
        // Mint token to owner
        const tokenId = (
          await this.genArt721Core
            .connect(this.accounts.additional)
            .mint(
              this.accounts.deployer.address,
              this.projectZero,
              this.accounts.deployer.address
            )
        ).value;

        // Get signing hash
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        const blockExpiry = ethers.BigNumber.from(currentBlockNumber + 20);
        const claimSigningHash = await this.genArt721Core.getClaimSigningHash(
          blockExpiry,
          this.accounts.user.address,
          tokenId
        );

        // SignVerifier signs hash
        const sig = await this.signVerifier.signMessage(
          arrayify(claimSigningHash)
        );

        // Send claim from addr1
        await this.genArt721Core
          .connect(this.accounts.user)
          .claimNFT(sig, blockExpiry, this.accounts.user.address, tokenId);

        expect(await this.genArt721Core.ownerOf(tokenId)).to.not.equal(
          this.accounts.deployer.address
        );
        expect(await this.genArt721Core.ownerOf(tokenId)).to.equal(
          this.accounts.user.address
        );
      });
    });
    describe("should revert", () => {
      it("when the signature has expired", async function () {
        // Mint token to owner
        const tokenId = (
          await this.genArt721Core
            .connect(this.accounts.additional)
            .mint(
              this.accounts.deployer.address,
              this.projectZero,
              this.accounts.deployer.address
            )
        ).value;

        // Get signing hash
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        const blockExpiry = ethers.BigNumber.from(currentBlockNumber + 1);
        const claimSigningHash = await this.genArt721Core.getClaimSigningHash(
          blockExpiry,
          this.accounts.user.address,
          tokenId
        );

        // SignVerifier signs hash
        const sig = await this.signVerifier.signMessage(
          arrayify(claimSigningHash)
        );

        // Send claim from addr1 on CURR_BLOCK_NUMBER + 1 (expiry block)
        await ethers.provider.send("evm_mine", []);

        // Expect claim to fail
        expect(
          this.genArt721Core
            .connect(this.accounts.user)
            .claimNFT(sig, blockExpiry, this.accounts.user.address, tokenId)
        ).to.be.revertedWith("Sig expired");
      });
      it("when reusing a signature", async function () {
        // Mint token to owner
        const tokenId = (
          await this.genArt721Core
            .connect(this.accounts.additional)
            .mint(
              this.accounts.deployer.address,
              this.projectZero,
              this.accounts.deployer.address
            )
        ).value;

        // Get signing hash
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        const blockExpiry = ethers.BigNumber.from(currentBlockNumber + 20);
        const claimSigningHash = await this.genArt721Core.getClaimSigningHash(
          blockExpiry,
          this.accounts.user.address,
          tokenId
        );

        // SignVerifier signs hash
        const sig = await this.signVerifier.signMessage(
          arrayify(claimSigningHash)
        );

        // Send claim from addr1
        await this.genArt721Core
          .connect(this.accounts.user)
          .claimNFT(sig, blockExpiry, this.accounts.user.address, tokenId);

        expect(await this.genArt721Core.ownerOf(tokenId)).to.not.equal(
          this.accounts.deployer.address
        );
        expect(await this.genArt721Core.ownerOf(tokenId)).to.equal(
          this.accounts.user.address
        );

        // Expect claim to fail with same sig
        expect(
          this.genArt721Core
            .connect(this.accounts.user2)
            .claimNFT(sig, blockExpiry, this.accounts.user.address, tokenId)
        ).to.be.revertedWith("Permission to call this function failed");
      });
      it("when tokenId has not yet been minted", async function () {
        // Mint token to owner
        await this.genArt721Core
          .connect(this.accounts.additional)
          .mint(
            this.accounts.deployer.address,
            this.projectZero,
            this.accounts.deployer.address
          );
        const tokenId = ethers.BigNumber.from(5);

        // Get signing hash
        const currentBlockNumber = await ethers.provider.getBlockNumber();
        const blockExpiry = ethers.BigNumber.from(currentBlockNumber + 20);
        const claimSigningHash = await this.genArt721Core.getClaimSigningHash(
          blockExpiry,
          this.accounts.user.address,
          tokenId
        );

        // SignVerifier signs hash
        const sig = await this.signVerifier.signMessage(
          arrayify(claimSigningHash)
        );

        // Expect claim to fail
        expect(
          this.genArt721Core
            .connect(this.accounts.user)
            .claimNFT(sig, blockExpiry, this.accounts.user.address, tokenId)
        ).to.be.revertedWith("ERC721: owner query for nonexistent token");
      });
    });
  });
});
