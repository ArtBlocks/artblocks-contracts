import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupSplits } from "../../util/fixtures";
import { deployAndGet } from "../../util/common";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";
import { revertMessages as splitterRevertMessages } from "../SplitAtomicV0/constants";

const TARGET_TYPE = "SplitAtomicFactoryV0";

describe(`SplitAtomicFactoryV0 Configure`, async function () {
  async function _beforeEach() {
    // deploy new splitter factory
    const config = await loadFixture(setupSplits);
    return config;
  }

  describe("Deployed", async function () {
    it("is emitted during deployment", async function () {
      const config = await loadFixture(_beforeEach);

      // deploy new splitter factory
      const splitAtomicFactory = await ethers.getContractFactory(TARGET_TYPE);
      const tx = await splitAtomicFactory
        .connect(config.accounts.deployer)
        .deploy(
          config.splitterImplementation.address,
          config.accounts.deployer.address, // required split address
          2222 // required split bps
        );

      const receipt = await await tx.deployTransaction.wait();
      // last log should be deployed
      const deployedLog = receipt.logs[receipt.logs.length - 1];
      // expect "Deployed" event as log 0
      expect(deployedLog.topics[0]).to.be.equal(
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("Deployed(address,bytes32,address,uint16)")
        )
      );
      // expect proper values in log topics and data
      const abiCoder = ethers.utils.defaultAbiCoder;
      expect(
        abiCoder.decode(["address"], deployedLog.topics[1])[0]
      ).to.be.equal(config.splitterImplementation.address);
      expect(
        ethers.utils.parseBytes32String(deployedLog.topics[2])
      ).to.be.equal(TARGET_TYPE);
      const dataArray = abiCoder.decode(
        ["address", "uint16"],
        deployedLog.data
      );
      expect(dataArray[0]).to.be.equal(config.accounts.deployer.address);
      expect(dataArray[1]).to.be.equal(2222);
    });
  });

  describe("SplitAtomicCreated", async function () {
    it("is emitted during new splitter creation", async function () {
      const config = await loadFixture(_beforeEach);
      // @dev do not use helper functions, because need to parse logs for new splitter address

      // deploy valid splitter via factory
      const tx = await config.splitterFactory.createSplit(config.validSplit);
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get splitter address from logs
      const splitterCreationLog = receipt.logs[receipt.logs.length - 1];
      const splitterAddress = ethers.utils.defaultAbiCoder.decode(
        ["address"],
        splitterCreationLog.topics[1]
      )[0];

      // check that the splitter address is a valid splitter contract
      const splitter = await ethers.getContractAt(
        "SplitAtomicV0",
        splitterAddress
      );
      const splitterType = ethers.utils.parseBytes32String(
        await splitter.type_()
      );
      expect(splitterType).to.be.equal("SplitAtomicV0");
    });
  });

  describe("Abandoned", async function () {
    it("is emitted during factory abandonment", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.splitterFactory.connect(config.accounts.deployer).abandon()
      )
        .to.emit(config.splitterFactory, "Abandoned")
        .withArgs();
    });
  });
});
