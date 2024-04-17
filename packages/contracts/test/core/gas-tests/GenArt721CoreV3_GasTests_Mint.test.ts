import { BN, constants } from "@openzeppelin/test-helpers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const numInitialMints = 500;
const numMintsToAverage = 15;

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../util/constants";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

/**
 * @notice This returns the same result as solidity:
 * `keccak256(abi.encodePacked(_address));`
 * @dev mirrors `hashAddress` function in MinterMerkleV0 contract
 */
function hashAddress(_address) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(["address"], [_address]).slice(2),
    "hex"
  );
}

/**
 * General Gas tests for V3 core.
 * Used to test the gas cost of different operations on the core, specifically
 * when optimizing for gas to quantify % reductions to aide in decision making.
 */
describe("GenArt721CoreV3 Gas Tests", async function () {
  // increase test timeout from 20s to 40s due to minting numMintsToAverage tokens in beforeEach
  this.timeout(40000);

  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);

    // use a higher max invocations to avoid artifically low gas costs
    config.higherMaxInvocationsForGasTests = 1000;
    // make price artifically low to enable more mints to simulate real-world common use cases
    config.pricePerTokenInWei = ethers.utils.parseEther("0.1");

    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3",
      "MinterFilterV1"
    ));

    config.minter = await deployAndGet(config, "MinterSetPriceV4", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);

    config.minterSetPriceERC20 = await deployAndGet(
      config,
      "MinterSetPriceERC20V4",
      [config.genArt721Core.address, config.minterFilter.address]
    );

    config.minterDAExp = await deployAndGet(config, "MinterDAExpV4", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);

    config.minterDAExpSettlement = await deployAndGet(
      config,
      "MinterDAExpSettlementV2",
      [config.genArt721Core.address, config.minterFilter.address]
    );

    config.minterDALin = await deployAndGet(config, "MinterDALinV4", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);

    config.minterMerkle = await deployAndGet(config, "MinterMerkleV5", [
      config.genArt721Core.address,
      config.minterFilter.address,
      constants.ZERO_ADDRESS, // dummy delegation registry address since not used in these tests
    ]);

    config.minterHolder = await deployAndGet(config, "MinterHolderV4", [
      config.genArt721Core.address,
      config.minterFilter.address,
      constants.ZERO_ADDRESS, // dummy delegation registry address since not used in these tests
    ]);

    // add four projects, test on project three to directly compare to V1 core, which starts at projectId = 3
    for (let i = 0; i < 4; i++) {
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
    }

    // configure project three (to compare directly to V1 core)
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectThree);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectThree);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(
        config.projectThree,
        config.higherMaxInvocationsForGasTests
      );
    // configure minter for project three
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minter.address);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minterDAExp.address);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(config.projectThree, config.minter.address);
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(config.projectThree, config.pricePerTokenInWei);
    // mint numMintsToAverage tokens on project one to simulate a typical real-world use case
    for (let i = 0; i < numMintsToAverage; i++) {
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectThree, { value: config.pricePerTokenInWei });
    }
    return config;
  }

  describe("mint gas optimization", function () {
    it("test gas cost of mint on MinterSetPrice [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      // manually set minter max invocations such that max invocations is reached
      await config.minter
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectThree,
          numMintsToAverage * 2
        );
      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await config.minter
          .connect(config.accounts.user)
          ["purchase_H4M(uint256)"](config.projectThree, {
            value: config.pricePerTokenInWei,
          });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterSetPriceERC20 [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      // set project three minter to minterSetPriceERC20, and configure
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterSetPriceERC20.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectThree,
          config.minterSetPriceERC20.address
        );
      await config.minterSetPriceERC20
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectThree,
          config.pricePerTokenInWei
        );
      // manually set minter max invocations such that max invocations is reached
      await config.minterSetPriceERC20
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectThree,
          numMintsToAverage * 2
        );

      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await config.minterSetPriceERC20
          .connect(config.accounts.user)
          ["purchase_H4M(uint256)"](config.projectThree, {
            value: config.pricePerTokenInWei,
          });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterDAExp [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      config.startingPrice = ethers.utils.parseEther("10");
      config.basePrice = ethers.utils.parseEther("0.05");
      config.defaultHalfLife = ONE_HOUR / 2;
      config.auctionStartTimeOffset = ONE_HOUR;
      if (!config.startTime) {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        config.startTime = block.timestamp;
      }
      config.startTime = config.startTime + ONE_DAY;

      await ethers.provider.send("evm_mine", [config.startTime - ONE_MINUTE]);
      // set project three minter to minterDAExp, and configure
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterDAExp.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectThree, config.minterDAExp.address);
      await config.minterDAExp
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectThree,
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice
        );
      // manually set minter max invocations such that max invocations is reached
      await config.minterDAExp
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectThree,
          numMintsToAverage * 2
        );
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);

      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await config.minterDAExp
          .connect(config.accounts.user)
          .purchase_H4M(config.projectThree, { value: config.startingPrice });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterDAExpSettlement [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      config.startingPrice = ethers.utils.parseEther("10");
      config.basePrice = ethers.utils.parseEther("0.05");
      config.defaultHalfLife = ONE_HOUR / 2;
      config.auctionStartTimeOffset = ONE_HOUR;
      if (!config.startTime) {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        config.startTime = block.timestamp;
      }
      config.startTime = config.startTime + ONE_DAY;

      await ethers.provider.send("evm_mine", [config.startTime - ONE_MINUTE]);
      // set project three minter to minterDAExpSettlement, and configure
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterDAExpSettlement.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectThree,
          config.minterDAExpSettlement.address
        );
      await config.minterDAExpSettlement
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectThree,
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice
        );
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // manually set minter max invocations such that max invocations is reached
      await config.minterDAExpSettlement
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectThree,
          numMintsToAverage * 2
        );

      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await config.minterDAExpSettlement
          .connect(config.accounts.user)
          .purchase_H4M(config.projectThree, { value: config.startingPrice });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterDALin [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      config.basePrice = ethers.utils.parseEther("0.05");
      config.startingPrice = ethers.utils.parseEther("0.25");
      config.auctionStartTimeOffset = ONE_HOUR;
      if (!config.startTime) {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        config.startTime = block.timestamp;
      }
      config.startTime = config.startTime + ONE_DAY;

      await ethers.provider.send("evm_mine", [config.startTime - ONE_MINUTE]);
      // set project three minter to minterDALin, and configure
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterDALin.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectThree, config.minterDALin.address);

      await config.minterDALin
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectThree,
          config.startTime + config.auctionStartTimeOffset,
          config.startTime + config.auctionStartTimeOffset + ONE_HOUR * 2,
          config.startingPrice,
          config.basePrice
        );
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // manually set minter max invocations such that max invocations is reached
      await config.minterDALin
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectThree,
          numMintsToAverage * 2
        );

      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await config.minterDALin
          .connect(config.accounts.user)
          .purchase_H4M(config.projectThree, { value: config.startingPrice });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterMerkle [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      // set project three minter to MinterMerkle, and configure
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterMerkle.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectThree, config.minterMerkle.address);
      // set price for project three on minter
      await config.minterMerkle
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectThree,
          config.pricePerTokenInWei
        );

      // build new Merkle tree from 1k addresses, including user's address
      const _allowlist = [config.accounts.user.address];
      const crypto = require("crypto");
      for (let i = 1; i < 1000; i++) {
        const _pk = crypto.randomBytes(32).toString("hex");
        const _addr = ethers.utils.computeAddress("0x" + _pk);
        _allowlist.push(_addr);
      }
      const _merkleTree = new MerkleTree(
        _allowlist.map((_addr) => hashAddress(_addr)),
        keccak256,
        {
          sortPairs: true,
        }
      );
      // update Merkle root
      await config.minterMerkle
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectThree, _merkleTree.getRoot());
      // allow unlimited mints to enable taking an average
      await config.minterMerkle
        .connect(config.accounts.artist)
        .setProjectInvocationsPerAddress(config.projectThree, 0);
      await config.minterMerkle
        .connect(config.accounts.artist)
        .updateMerkleRoot(config.projectThree, _merkleTree.getRoot());
      // user mint with new Merkle proof
      const userMerkleProof = _merkleTree.getHexProof(
        hashAddress(config.accounts.user.address)
      );
      // manually set minter max invocations such that max invocations is reached
      await config.minterMerkle
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectThree,
          numMintsToAverage * 2
        );

      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        const tx = await config.minterMerkle
          .connect(config.accounts.user)
          .purchase_gD5(config.projectThree, userMerkleProof, {
            value: config.pricePerTokenInWei,
          });
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });

    it("test gas cost of mint on MinterHolder [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);
      // set project three minter to MinterHolder, and configure
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minterHolder.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectThree, config.minterHolder.address);
      // set price for project three on minter
      await config.minterHolder
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectThree,
          config.pricePerTokenInWei
        );

      // configure minter
      await config.minterHolder
        .connect(config.accounts.deployer)
        .registerNFTAddress(config.genArt721Core.address);
      await config.minterHolder
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectThree,
          [config.genArt721Core.address],
          [config.projectOne]
        );

      // configure project three (to compare directly to V1 core)
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectOne, config.minter.address);
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);

      // user mints a couple tokens on projectOne to use as a pass
      for (let i = 0; i < 2; i++) {
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, { value: config.pricePerTokenInWei });
      }
      // manually set minter max invocations such that max invocations is reached
      await config.minterHolder
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(
          config.projectThree,
          numMintsToAverage * 2
        );

      // report gas over an average of numMintsToAverage purchases
      const receipts = [];
      for (let index = 0; index < numMintsToAverage; index++) {
        // mint on MinterHolder
        const tx = await config.minterHolder
          .connect(config.accounts.user)
          .purchase_nnf(
            config.projectThree,
            config.genArt721Core.address,
            config.projectOneTokenOne.toNumber(),
            {
              value: config.pricePerTokenInWei,
            }
          );
        receipts.push(await ethers.provider.getTransactionReceipt(tx.hash));
      }
      const gasUseds = receipts.map((receipt) => receipt.gasUsed);
      const maxGasUsed = Math.max(...gasUseds);
      console.log(`max gas used for all tested mints: ${maxGasUsed}`);
      const avgGasUsed = gasUseds
        .reduce((a, b) => a.add(b))
        .div(gasUseds.length);
      console.log(`average gas used for mint optimization test: ${avgGasUsed}`);
      const avgGasCostAt100gwei = receipts[0].effectiveGasPrice
        .mul(avgGasUsed)
        .toString();

      const avgGasCostAt100gweiInETH = parseFloat(
        ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
      );
      const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
      console.log(
        `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
      );
    });
  });
});
