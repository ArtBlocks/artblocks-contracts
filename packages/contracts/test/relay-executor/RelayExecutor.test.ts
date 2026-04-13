import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

// ERC-7821 execution modes (first 10 bytes matter, rest is zero-padded to 32)
const MODE_BASIC =
  "0x0100000000000000000000000000000000000000000000000000000000000000";
const MODE_WITH_OPDATA =
  "0x0100000000007821000100000000000000000000000000000000000000000000";
const MODE_BATCH_OF_BATCHES =
  "0x0100000000007821000200000000000000000000000000000000000000000000";
const MODE_UNSUPPORTED =
  "0xff00000000000000000000000000000000000000000000000000000000000000";

// ERC-1271 magic value
const ERC1271_MAGIC = "0x1626ba7e";
const ERC1271_INVALID = "0xffffffff";

// BundleExecuted topic hash (keccak256("BundleExecuted()"))
const BUNDLE_EXECUTED_TOPIC = ethers.utils.id("BundleExecuted()");

// MockTarget Called topic hash
const CALLED_TOPIC = ethers.utils.id("Called(uint256)");

describe("RelayExecutor", function () {
  async function _beforeEach() {
    const [deployer, user, user2] = await ethers.getSigners();

    const helperFactory = await ethers.getContractFactory(
      "RelayExecutorTestHelper"
    );
    const executor = await helperFactory.connect(deployer).deploy();

    const targetFactory = await ethers.getContractFactory("MockTarget");
    const target1 = await targetFactory.connect(deployer).deploy();
    const target2 = await targetFactory.connect(deployer).deploy();
    const target3 = await targetFactory.connect(deployer).deploy();

    const executorFactory = await ethers.getContractFactory("RelayExecutor");
    const standalone = await executorFactory.connect(deployer).deploy();

    return {
      executor,
      standalone,
      target1,
      target2,
      target3,
      accounts: { deployer, user, user2 },
    };
  }

  // Encode a single batch of Call structs into executionData
  function encodeBatch(
    calls: { to: string; value: string | number; data: string }[]
  ): string {
    const callTupleType = "tuple(address to, uint256 value, bytes data)[]";
    return ethers.utils.defaultAbiCoder.encode([callTupleType], [calls]);
  }

  // Encode a batch of batches: each sub-batch is its own executionData
  function encodeBatchOfBatches(
    bundles: { to: string; value: string | number; data: string }[][]
  ): string {
    const subBatches = bundles.map((calls) => encodeBatch(calls));
    return ethers.utils.defaultAbiCoder.encode(["bytes[]"], [subBatches]);
  }

  // Filter raw logs from a receipt to find BundleExecuted events from a
  // specific emitter, then slice all logs into per-bundle groups.
  function sliceBundles(
    receipt: { logs: { topics: string[]; address: string }[] },
    emitter: string
  ): { topics: string[]; address: string }[][] {
    const emitterLower = emitter.toLowerCase();
    const bundles: { topics: string[]; address: string }[][] = [];
    let current: { topics: string[]; address: string }[] = [];

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() === emitterLower &&
        log.topics[0] === BUNDLE_EXECUTED_TOPIC
      ) {
        bundles.push(current);
        current = [];
      } else {
        current.push(log);
      }
    }
    return bundles;
  }

  describe("Deployment", function () {
    it("deploys successfully", async function () {
      const { executor } = await loadFixture(_beforeEach);
      expect(executor.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("supports basic execution mode", async function () {
      const { executor } = await loadFixture(_beforeEach);
      expect(await executor.supportsExecutionMode(MODE_BASIC)).to.be.true;
    });

    it("supports execution mode with opData", async function () {
      const { executor } = await loadFixture(_beforeEach);
      expect(await executor.supportsExecutionMode(MODE_WITH_OPDATA)).to.be.true;
    });

    it("supports batch of batches mode", async function () {
      const { executor } = await loadFixture(_beforeEach);
      expect(await executor.supportsExecutionMode(MODE_BATCH_OF_BATCHES)).to.be
        .true;
    });

    it("rejects unsupported execution mode", async function () {
      const { executor } = await loadFixture(_beforeEach);
      expect(await executor.supportsExecutionMode(MODE_UNSUPPORTED)).to.be
        .false;
    });
  });

  describe("Single bundle execution", function () {
    it("executes a single call and emits BundleExecuted", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;
      const calldata = iface.encodeFunctionData("setValue", [42]);

      const executionData = encodeBatch([
        { to: target1.address, value: 0, data: calldata },
      ]);

      const tx = await executor.selfExecute(MODE_BASIC, executionData);
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(42);
      expect(await target1.lastCaller()).to.equal(executor.address);

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(1);
    });

    it("executes multiple calls in one bundle with single BundleExecuted", async function () {
      const { executor, target1, target2 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatch([
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("setValue", [100]),
        },
        {
          to: target2.address,
          value: 0,
          data: iface.encodeFunctionData("setValue", [200]),
        },
      ]);

      const tx = await executor.selfExecute(MODE_BASIC, executionData);
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(100);
      expect(await target2.value()).to.equal(200);

      // Only ONE BundleExecuted for the entire bundle
      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(1);
    });

    it("emits BundleExecuted for empty bundle", async function () {
      const { executor } = await loadFixture(_beforeEach);
      const executionData = encodeBatch([]);

      const tx = await executor.selfExecute(MODE_BASIC, executionData);
      const receipt = await tx.wait();

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(1);
    });
  });

  describe("Batch of batches (relay mode)", function () {
    it("emits one BundleExecuted per sub-batch", async function () {
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
    });

    it("log slicing correctly attributes logs to bundles", async function () {
      const { executor, target1, target2, target3 } =
        await loadFixture(_beforeEach);
      const iface = target1.interface;

      // Bundle 0: 2 calls to target1
      // Bundle 1: 1 call to target2
      // Bundle 2: 2 calls to target3
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
            data: iface.encodeFunctionData("setValue", [3]),
          },
        ],
        [
          {
            to: target3.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [4]),
          },
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

      // Bundle 0: 2 Called events from target1
      expect(bundles[0]).to.have.lengthOf(2);
      expect(bundles[0].every((l) => l.address === target1.address)).to.be.true;

      // Bundle 1: 1 Called event from target2
      expect(bundles[1]).to.have.lengthOf(1);
      expect(bundles[1][0].address).to.equal(target2.address);

      // Bundle 2: 2 Called events from target3
      expect(bundles[2]).to.have.lengthOf(2);
      expect(bundles[2].every((l) => l.address === target3.address)).to.be.true;
    });

    it("fewer events than per-call approach (50 two-call bundles = 50 events)", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const bundleCount = 10; // scaled down for test speed
      const callsPerBundle = 2;

      const bundles = Array.from({ length: bundleCount }, (_, i) =>
        Array.from({ length: callsPerBundle }, (_, j) => ({
          to: target1.address,
          value: 0 as number,
          data: iface.encodeFunctionData("setValue", [i * callsPerBundle + j]),
        }))
      );

      const executionData = encodeBatchOfBatches(bundles);
      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      // Exactly bundleCount BundleExecuted events (NOT bundleCount * callsPerBundle)
      expect(bundleEvents).to.have.lengthOf(bundleCount);

      // Total logs = bundleCount * callsPerBundle Called events + bundleCount BundleExecuted
      const calledEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === CALLED_TOPIC
      );
      expect(calledEvents).to.have.lengthOf(bundleCount * callsPerBundle);
    });

    it("handles single bundle in batch-of-batches mode", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
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

      expect(await target1.value()).to.equal(42);

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(1);
    });

    it("handles empty bundles within batch of batches", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      // 3 bundles: empty, one call, empty
      const executionData = encodeBatchOfBatches([
        [],
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [99]),
          },
        ],
        [],
      ]);

      const tx = await executor.selfExecute(
        MODE_BATCH_OF_BATCHES,
        executionData
      );
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(99);

      // All 3 bundles emit BundleExecuted (even empty ones)
      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(3);

      // Log slicing: bundle 0 = empty, bundle 1 = 1 log, bundle 2 = empty
      const bundles = sliceBundles(receipt, executor.address);
      expect(bundles[0]).to.have.lengthOf(0);
      expect(bundles[1]).to.have.lengthOf(1);
      expect(bundles[2]).to.have.lengthOf(0);
    });
  });

  describe("Authorization", function () {
    it("reverts when external caller invokes execute directly", async function () {
      const { executor, target1, accounts } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatch([
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("setValue", [1]),
        },
      ]);

      await expect(
        executor.connect(accounts.user).execute(MODE_BASIC, executionData)
      ).to.be.reverted;
    });

    it("reverts when external caller invokes batch-of-batches directly", async function () {
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

    it("succeeds via selfExecute (msg.sender == address(this))", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatch([
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("setValue", [42]),
        },
      ]);

      await executor.selfExecute(MODE_BASIC, executionData);
      expect(await target1.value()).to.equal(42);
    });
  });

  describe("Value forwarding", function () {
    it("forwards ETH to sub-calls in a single bundle", async function () {
      const { executor, target1, accounts } = await loadFixture(_beforeEach);
      const sendAmount = ethers.utils.parseEther("1.0");

      await accounts.deployer.sendTransaction({
        to: executor.address,
        value: sendAmount,
      });

      const iface = target1.interface;
      const executionData = encodeBatch([
        {
          to: target1.address,
          value: sendAmount.toString(),
          data: iface.encodeFunctionData("setValue", [1]),
        },
      ]);

      await executor.selfExecute(MODE_BASIC, executionData);
      expect(await ethers.provider.getBalance(target1.address)).to.equal(
        sendAmount
      );
    });

    it("forwards ETH across multiple bundles in batch-of-batches", async function () {
      const { executor, target1, target2, accounts } =
        await loadFixture(_beforeEach);
      const amount1 = ethers.utils.parseEther("0.5");
      const amount2 = ethers.utils.parseEther("0.3");

      await accounts.deployer.sendTransaction({
        to: executor.address,
        value: amount1.add(amount2),
      });

      const iface = target1.interface;
      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: amount1.toString(),
            data: iface.encodeFunctionData("setValue", [1]),
          },
        ],
        [
          {
            to: target2.address,
            value: amount2.toString(),
            data: iface.encodeFunctionData("setValue", [2]),
          },
        ],
      ]);

      await executor.selfExecute(MODE_BATCH_OF_BATCHES, executionData);
      expect(await ethers.provider.getBalance(target1.address)).to.equal(
        amount1
      );
      expect(await ethers.provider.getBalance(target2.address)).to.equal(
        amount2
      );
    });
  });

  describe("Revert bubbling", function () {
    it("reverts entire batch if any call in a bundle reverts", async function () {
      const { executor, target1 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      const executionData = encodeBatch([
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("setValue", [1]),
        },
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("alwaysReverts"),
        },
      ]);

      await expect(executor.selfExecute(MODE_BASIC, executionData)).to.be
        .reverted;
      // State not persisted since entire tx reverted
      expect(await target1.value()).to.equal(0);
    });

    it("reverts entire batch-of-batches if any bundle reverts", async function () {
      const { executor, target1, target2 } = await loadFixture(_beforeEach);
      const iface = target1.interface;

      // Bundle 0 succeeds, bundle 1 reverts → entire tx rolls back
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
            data: iface.encodeFunctionData("alwaysReverts"),
          },
        ],
      ]);

      await expect(executor.selfExecute(MODE_BATCH_OF_BATCHES, executionData))
        .to.be.reverted;
      // Bundle 0's state also rolled back
      expect(await target1.value()).to.equal(0);
    });
  });

  describe("ETH receiving", function () {
    it("can receive ETH via plain transfer", async function () {
      const { executor, accounts } = await loadFixture(_beforeEach);
      const amount = ethers.utils.parseEther("1.0");

      await accounts.deployer.sendTransaction({
        to: executor.address,
        value: amount,
      });

      expect(await ethers.provider.getBalance(executor.address)).to.equal(
        amount
      );
    });
  });

  describe("isValidSignature (ERC-1271)", function () {
    it("returns invalid for non-matching signer", async function () {
      const { standalone, accounts } = await loadFixture(_beforeEach);
      const hash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("test message")
      );

      // deployer.address != standalone.address → invalid
      const signature = await accounts.deployer.signMessage(
        ethers.utils.arrayify(hash)
      );
      const result = await standalone.isValidSignature(hash, signature);
      expect(result).to.equal(ERC1271_INVALID);
    });

    it("returns invalid for wrong signer", async function () {
      const { standalone, accounts } = await loadFixture(_beforeEach);
      const hash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("some data")
      );

      const signature = await accounts.user.signMessage(
        ethers.utils.arrayify(hash)
      );
      const result = await standalone.isValidSignature(hash, signature);
      expect(result).to.equal(ERC1271_INVALID);
    });

    it("reverts for malformed signature (wrong length)", async function () {
      const { standalone } = await loadFixture(_beforeEach);
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      const malformed = "0x" + "ab".repeat(32);
      await expect(standalone.isValidSignature(hash, malformed)).to.be.reverted;
    });

    it("reverts for empty signature", async function () {
      const { standalone } = await loadFixture(_beforeEach);
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));

      await expect(standalone.isValidSignature(hash, "0x")).to.be.reverted;
    });

    it("handles 64-byte EIP-2098 compact signature", async function () {
      const { standalone, accounts } = await loadFixture(_beforeEach);
      const hash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("compact sig test")
      );

      const fullSig = await accounts.deployer.signMessage(
        ethers.utils.arrayify(hash)
      );
      const { r, _vs } = ethers.utils.splitSignature(fullSig);
      const compactSig = ethers.utils.concat([r, _vs]);

      // Valid 64-byte format → returns result (invalid since deployer != standalone)
      const result = await standalone.isValidSignature(hash, compactSig);
      expect(result).to.equal(ERC1271_INVALID);
    });
  });

  // -----------------------------------------------------------------------
  // EIP-7702 simulation via hardhat_setCode
  //
  // Plants RelayExecutor runtime bytecode at an EOA's address, simulating
  // what EIP-7702 delegation does on a live chain. The EOA retains its
  // private key, so msg.sender == address(this) holds naturally, and
  // isValidSignature can be tested with a real valid signer.
  // -----------------------------------------------------------------------
  describe("EIP-7702 delegation simulation (hardhat_setCode)", function () {
    async function _eip7702Setup() {
      const [deployer, eoa, otherSigner] = await ethers.getSigners();

      // Deploy the real RelayExecutor to get its runtime bytecode
      const factory = await ethers.getContractFactory("RelayExecutor");
      const impl = await factory.connect(deployer).deploy();
      const runtimeCode = await ethers.provider.getCode(impl.address);

      // Plant the bytecode at the EOA's address (simulates EIP-7702 delegation)
      await ethers.provider.send("hardhat_setCode", [eoa.address, runtimeCode]);

      // Create a contract handle bound to the EOA address
      const delegated = factory.attach(eoa.address).connect(eoa);

      // Deploy mock targets
      const targetFactory = await ethers.getContractFactory("MockTarget");
      const target1 = await targetFactory.connect(deployer).deploy();
      const target2 = await targetFactory.connect(deployer).deploy();

      return { delegated, eoa, otherSigner, target1, target2, deployer };
    }

    it("EOA executes a batch on itself via delegated code", async function () {
      const { delegated, eoa, target1 } = await loadFixture(_eip7702Setup);
      const iface = target1.interface;

      const executionData = encodeBatch([
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("setValue", [777]),
        },
      ]);

      // EOA calls execute() on its own address — msg.sender == address(this)
      const tx = await delegated.execute(MODE_BASIC, executionData);
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(777);
      // The caller of target is the EOA (delegated code runs in EOA's context)
      expect(await target1.lastCaller()).to.equal(eoa.address);

      const bundleEvents = receipt.logs.filter(
        (l: any) => l.topics[0] === BUNDLE_EXECUTED_TOPIC
      );
      expect(bundleEvents).to.have.lengthOf(1);
    });

    it("EOA executes batch-of-batches with correct log slicing", async function () {
      const { delegated, eoa, target1, target2 } =
        await loadFixture(_eip7702Setup);
      const iface = target1.interface;

      const executionData = encodeBatchOfBatches([
        [
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [10]),
          },
          {
            to: target1.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [20]),
          },
        ],
        [
          {
            to: target2.address,
            value: 0,
            data: iface.encodeFunctionData("setValue", [30]),
          },
        ],
      ]);

      const tx = await delegated.execute(MODE_BATCH_OF_BATCHES, executionData);
      const receipt = await tx.wait();

      expect(await target1.value()).to.equal(20);
      expect(await target2.value()).to.equal(30);

      // BundleExecuted emitted from the EOA address
      const bundleEvents = receipt.logs.filter(
        (l: any) =>
          l.topics[0] === BUNDLE_EXECUTED_TOPIC &&
          l.address.toLowerCase() === eoa.address.toLowerCase()
      );
      expect(bundleEvents).to.have.lengthOf(2);

      // Log slicing works against the EOA address
      const bundles = sliceBundles(receipt, eoa.address);
      expect(bundles).to.have.lengthOf(2);
      expect(bundles[0]).to.have.lengthOf(2); // 2 Called from target1
      expect(bundles[1]).to.have.lengthOf(1); // 1 Called from target2
    });

    it("rejects external caller (msg.sender != address(this))", async function () {
      const { delegated, target1, otherSigner } =
        await loadFixture(_eip7702Setup);
      const iface = target1.interface;

      const executionData = encodeBatch([
        {
          to: target1.address,
          value: 0,
          data: iface.encodeFunctionData("setValue", [1]),
        },
      ]);

      // otherSigner calls the EOA's delegated execute → should revert
      const asOther = delegated.connect(otherSigner);
      await expect(asOther.execute(MODE_BASIC, executionData)).to.be.reverted;
    });

    it("forwards ETH from delegated EOA to targets", async function () {
      const { delegated, eoa, target1, deployer } =
        await loadFixture(_eip7702Setup);
      const sendAmount = ethers.utils.parseEther("2.0");

      // Fund the EOA
      await deployer.sendTransaction({
        to: eoa.address,
        value: sendAmount,
      });

      const iface = target1.interface;
      const executionData = encodeBatch([
        {
          to: target1.address,
          value: ethers.utils.parseEther("1.0").toString(),
          data: iface.encodeFunctionData("setValue", [1]),
        },
      ]);

      await delegated.execute(MODE_BASIC, executionData);
      expect(await ethers.provider.getBalance(target1.address)).to.equal(
        ethers.utils.parseEther("1.0")
      );
    });

    it("isValidSignature returns magic value for the EOA's own signature", async function () {
      const { delegated, eoa } = await loadFixture(_eip7702Setup);
      const hash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("hello from eoa")
      );

      // EOA signs the raw hash (not eth_sign prefixed — recoverCalldata
      // expects the caller to provide the final digest)
      const sig = await eoa.signMessage(ethers.utils.arrayify(hash));

      // The contract does ecrecover(hash, sig). But signMessage applies the
      // EIP-191 prefix internally, so recoverCalldata(hash, sig) will NOT
      // recover eoa.address — it recovers the address that signed the
      // *prefixed* hash.
      //
      // To test the valid path, we need to pass the prefixed hash to
      // isValidSignature so that ecrecover(prefixedHash, sig) == eoa.address.
      const prefixedHash = ethers.utils.hashMessage(
        ethers.utils.arrayify(hash)
      );
      const result = await delegated.isValidSignature(prefixedHash, sig);
      expect(result).to.equal(ERC1271_MAGIC);
    });

    it("isValidSignature returns invalid for a different signer", async function () {
      const { delegated, otherSigner } = await loadFixture(_eip7702Setup);
      const hash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("wrong signer")
      );

      const sig = await otherSigner.signMessage(ethers.utils.arrayify(hash));
      const prefixedHash = ethers.utils.hashMessage(
        ethers.utils.arrayify(hash)
      );

      const result = await delegated.isValidSignature(prefixedHash, sig);
      expect(result).to.equal(ERC1271_INVALID);
    });

    it("EOA can receive ETH after delegation", async function () {
      const { eoa, deployer } = await loadFixture(_eip7702Setup);
      const amount = ethers.utils.parseEther("1.0");
      const balBefore = await ethers.provider.getBalance(eoa.address);

      await deployer.sendTransaction({ to: eoa.address, value: amount });

      const balAfter = await ethers.provider.getBalance(eoa.address);
      expect(balAfter.sub(balBefore)).to.equal(amount);
    });
  });
});
