import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

// ERC-7821 execution modes
const MODE_BASIC =
  "0x0100000000000000000000000000000000000000000000000000000000000000";
const MODE_BATCH_OF_BATCHES =
  "0x0100000000007821000200000000000000000000000000000000000000000000";

// Event topic hashes
const BUNDLE_EXECUTED_TOPIC = ethers.utils.id("BundleExecuted()");
const BUNDLE_FAILED_TOPIC = ethers.utils.id("BundleFailed(uint256,bytes)");
const CALLED_TOPIC = ethers.utils.id("Called(uint256)");

describe("RelayExecutorPartialReverts", function () {
  async function _beforeEach() {
    const [deployer, user] = await ethers.getSigners();

    const helperFactory = await ethers.getContractFactory(
      "RelayExecutorPartialRevertsTestHelper"
    );
    const executor = await helperFactory.connect(deployer).deploy();

    const targetFactory = await ethers.getContractFactory("MockTarget");
    const target1 = await targetFactory.connect(deployer).deploy();
    const target2 = await targetFactory.connect(deployer).deploy();
    const target3 = await targetFactory.connect(deployer).deploy();

    return {
      executor,
      target1,
      target2,
      target3,
      accounts: { deployer, user },
    };
  }

  function encodeBatch(
    calls: { to: string; value: string | number; data: string }[]
  ): string {
    const callTupleType = "tuple(address to, uint256 value, bytes data)[]";
    return ethers.utils.defaultAbiCoder.encode([callTupleType], [calls]);
  }

  function encodeBatchOfBatches(
    bundles: { to: string; value: string | number; data: string }[][]
  ): string {
    const subBatches = bundles.map((calls) => encodeBatch(calls));
    return ethers.utils.defaultAbiCoder.encode(["bytes[]"], [subBatches]);
  }

  // Slice logs into per-bundle groups using BundleExecuted and BundleFailed
  // as delimiters. Returns { logs, success } per bundle.
  function sliceBundles(
    receipt: { logs: { topics: string[]; address: string; data: string }[] },
    emitter: string
  ): { logs: { topics: string[]; address: string }[]; success: boolean }[] {
    const emitterLower = emitter.toLowerCase();
    const bundles: {
      logs: { topics: string[]; address: string }[];
      success: boolean;
    }[] = [];
    let current: { topics: string[]; address: string }[] = [];

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== emitterLower) {
        current.push(log);
        continue;
      }
      if (log.topics[0] === BUNDLE_EXECUTED_TOPIC) {
        bundles.push({ logs: current, success: true });
        current = [];
      } else if (log.topics[0] === BUNDLE_FAILED_TOPIC) {
        bundles.push({ logs: current, success: false });
        current = [];
      } else {
        current.push(log);
      }
    }
    return bundles;
  }

  describe("All bundles succeed", function () {
    it("behaves identically to RelayExecutor when all bundles pass", async function () {
      const { executor, target1, target2, target3 } =
        await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [10]),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [20]),
          },
        ],
        [
          {
            to: target3.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [30]),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(10);
      expect(await target2.value()).to.equal(20);
      expect(await target3.value()).to.equal(30);

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(3);

      const failedEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedEvents).to.have.lengthOf(0);
    });

    it("single-batch mode still reverts on failure (not affected)", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatch([
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("alwaysReverts"),
        },
      ]);

      await expect(executor.selfExecute(MODE_BASIC, executionData)).to.be
        .reverted;
    });
  });

  describe("Partial failure — middle bundle fails", function () {
    it("reverts only the failed bundle, others persist", async function () {
      const { executor, target1, target2, target3 } =
        await loadFixture(_beforeEach);
      const iface = target1.interface;

      // Bundle 0: set target1 = 100
      // Bundle 1: alwaysReverts on target2 → fails
      // Bundle 2: set target3 = 300
      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [100]),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [200]),
          },
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
        [
          {
            to: target3.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [300]),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      // Bundle 0 persisted
      expect(await target1.value()).to.equal(100);
      // Bundle 1 reverted — target2 setValue(200) was rolled back
      expect(await target2.value()).to.equal(0);
      // Bundle 2 persisted
      expect(await target3.value()).to.equal(300);

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(2);

      const failedEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedEvents).to.have.lengthOf(1);
    });
  });

  describe("Partial failure — first bundle fails", function () {
    it("first bundle fails, remaining bundles still execute", async function () {
      const { executor, target1, target2 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [42]),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(0);
      expect(await target2.value()).to.equal(42);

      const failedEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedEvents).to.have.lengthOf(1);
    });
  });

  describe("Partial failure — last bundle fails", function () {
    it("last bundle fails, earlier bundles' state persists", async function () {
      const { executor, target1, target2 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [999]),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(999);
      expect(await target2.value()).to.equal(0);

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(1);

      const failedEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedEvents).to.have.lengthOf(1);
    });
  });

  describe("All bundles fail", function () {
    it("emits BundleFailed for each, no state changes", async function () {
      const { executor, target1, target2, target3 } =
        await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
        [
          {
            to: target3.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(0);
      expect(await target2.value()).to.equal(0);
      expect(await target3.value()).to.equal(0);

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(0);

      const failedEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedEvents).to.have.lengthOf(3);
    });
  });

  describe("Log slicing with mixed success/failure", function () {
    it("correctly slices logs using both delimiter types", async function () {
      const { executor, target1, target2, target3 } =
        await loadFixture(_beforeEach);
      const iface = target1.interface;

      // Bundle 0: 2 calls to target1 → success
      // Bundle 1: 1 call then revert on target2 → fail
      // Bundle 2: 1 call to target3 → success
      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [1]),
          },
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [2]),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
        [
          {
            to: target3.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [5]),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      const bundles = sliceBundles(receipt, executor.address);
      expect(bundles).to.have.lengthOf(3);

      // Bundle 0: success, 2 Called events
      expect(bundles[0].success).to.be.true;
      expect(bundles[0].logs).to.have.lengthOf(2);

      // Bundle 1: failed, no inner logs (they were reverted)
      expect(bundles[1].success).to.be.false;
      expect(bundles[1].logs).to.have.lengthOf(0);

      // Bundle 2: success, 1 Called event
      expect(bundles[2].success).to.be.true;
      expect(bundles[2].logs).to.have.lengthOf(1);
    });
  });

  describe("BundleFailed event data", function () {
    it("includes the revert reason in the event", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      const failedLog = receipt.logs.find(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedLog).to.not.be.undefined;

      const decoded = ethers.utils.defaultAbiCoder.decode(
        ["uint256", "bytes"],
        failedLog!.data
      );
      expect(decoded[0]).to.equal(0); // bundleIndex

      // The reason bytes contain the nested revert from MockTarget.
      // The outer execute() call wraps it, so the reason should contain
      // the "MockTarget: forced revert" string somewhere in the ABI encoding.
      const reasonHex = decoded[1] as string;
      expect(reasonHex.length).to.be.greaterThan(2);
    });

    it("emits correct bundleIndex for each failed bundle", async function () {
      const { executor, target1, target2, target3 } =
        await loadFixture(_beforeEach);
      const iface = target1.interface;

      // Bundle 0: success, Bundle 1: fail, Bundle 2: fail
      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [1]),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
        [
          {
            to: target3.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      const failedLogs = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedLogs).to.have.lengthOf(2);

      const indices = failedLogs.map((l: any) => {
        const decoded = ethers.utils.defaultAbiCoder.decode(
          ["uint256", "bytes"],
          l.data
        );
        return decoded[0].toNumber();
      });
      expect(indices).to.deep.equal([1, 2]);
    });
  });

  describe("ETH handling with partial failures", function () {
    it("failed bundle's ETH transfers are reverted, ETH remains in executor", async function () {
      const { executor, target1, target2, accounts } =
        await loadFixture(_beforeEach);
      const iface = target1.interface;
      const amount = ethers.utils.parseEther("1.0");

      // Fund the executor
      await accounts.deployer.sendTransaction({
        to: executor.address,
        value: amount,
      });

      // Bundle 0: send 0.5 ETH to target1 → success
      // Bundle 1: send 0.5 ETH to target2 then revert → fail, ETH returned
      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: ethers.utils.parseEther("0.5").toString(),
            data: iface.encodeFunctionData("setValue", [1]),
          },
        ],
        [
          {
            to: target2.address,
            value: ethers.utils.parseEther("0.5").toString(),
            data: iface.encodeFunctionData("setValue", [2]),
          },
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
      ]);

      await executor.selfExecute(MODE_BATCH_OF_BATCHES, executionData);

      // target1 got its 0.5 ETH
      expect(await ethers.provider.getBalance(target1.address)).to.equal(
        ethers.utils.parseEther("0.5")
      );

      // target2 got nothing — its bundle reverted
      expect(await ethers.provider.getBalance(target2.address)).to.equal(0);

      // Remaining 0.5 ETH stays in the executor
      expect(await ethers.provider.getBalance(executor.address)).to.equal(
        ethers.utils.parseEther("0.5")
      );
    });
  });

  describe("Edge cases", function () {
    it("handles empty bundles mixed with failures", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      // Bundle 0: empty → success
      // Bundle 1: revert → fail
      // Bundle 2: empty → success
      const executionData = encodeBatchOfBatches([
        [],
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
        [],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(2);

      const failedEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedEvents).to.have.lengthOf(1);
    });

    it("single bundle that fails emits BundleFailed, tx still succeeds", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      // Tx succeeded (no revert at top level)
      expect(receipt.status).to.equal(1);

      const failedEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_FAILED_TOPIC
      );
      expect(failedEvents).to.have.lengthOf(1);
    });

    it("authorization: external caller cannot invoke execute directly", async function () {
      const { executor, target1, accounts } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [1]),
          },
        ],
      ]);

      await expect(
        executor
          .connect(accounts.user)
          .execute(MODE_BATCH_OF_BATCHES, executionData)
      ).to.be.reverted;
    });
  });
});
