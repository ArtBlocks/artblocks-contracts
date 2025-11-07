import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ImmutableUint16Array", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ImmutableUint16ArrayMock");
    const mock = await factory.deploy();
    await mock.deployed();
    return { mock, owner };
  }

  describe("Basic Functionality", function () {
    it("should store and retrieve a single uint16 value", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = [42];
      await mock.store(testValues);

      expect(await mock.length()).to.equal(1);
      expect(await mock.get(0)).to.equal(testValues[0]);
      expect(await mock.getAll()).to.deep.equal(testValues);
      expect(await mock.isEmpty()).to.equal(false);
    });

    it("should store and retrieve multiple uint16 values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = [1, 2, 3, 4, 5];
      await mock.store(testValues);

      expect(await mock.length()).to.equal(5);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
      expect(await mock.isEmpty()).to.equal(false);
    });

    it("should handle zero values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = [0, 100, 0, 200, 0];
      await mock.store(testValues);

      expect(await mock.length()).to.equal(5);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle an empty array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([]);

      expect(await mock.length()).to.equal(0);
      expect(await mock.getAll()).to.deep.equal([]);
      expect(await mock.isEmpty()).to.equal(true);
    });

    it("should not revert when reinitialized", async function () {
      const { mock } = await loadFixture(deployFixture);
      // store a first array
      await mock.store([1, 2, 3]);
      expect(await mock.length()).to.equal(3);

      // store a second array
      await mock.store([100, 200]);

      // get the second array
      expect(await mock.length()).to.equal(2);
      expect(await mock.get(0)).to.equal(100);
      expect(await mock.get(1)).to.equal(200);
      expect(await mock.getAll()).to.deep.equal([100, 200]);
    });
  });

  describe("Boundary Values", function () {
    it("should handle uint16 max value (65535)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const maxUint16 = 65535;
      const testValues = [maxUint16, 0, maxUint16];
      await mock.store(testValues);

      expect(await mock.length()).to.equal(3);
      expect(await mock.get(0)).to.equal(maxUint16);
      expect(await mock.get(1)).to.equal(0);
      expect(await mock.get(2)).to.equal(maxUint16);
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle all zeros", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = [0, 0, 0, 0, 0];
      await mock.store(testValues);

      expect(await mock.length()).to.equal(5);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(0);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle all max values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const maxUint16 = 65535;
      const testValues = [maxUint16, maxUint16, maxUint16];
      await mock.store(testValues);

      expect(await mock.length()).to.equal(3);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(maxUint16);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle sequential values from 0 to 100", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = Array.from({ length: 101 }, (_, i) => i);
      await mock.store(testValues);

      expect(await mock.length()).to.equal(101);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });
  });

  describe("Edge Cases", function () {
    it("should return empty array when uninitialized", async function () {
      const { mock } = await loadFixture(deployFixture);
      expect(await mock.getAll()).to.deep.equal([]);
      expect(await mock.length()).to.equal(0);
      expect(await mock.isEmpty()).to.equal(true);
    });

    it("should handle exactly 16 values (one full chunk)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = Array.from({ length: 16 }, (_, i) => i + 1);
      await mock.store(testValues);

      expect(await mock.length()).to.equal(16);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle 17 values (crossing chunk boundary)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = Array.from({ length: 17 }, (_, i) => i + 1);
      await mock.store(testValues);

      expect(await mock.length()).to.equal(17);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle 32 values (two full chunks)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = Array.from({ length: 32 }, (_, i) => i + 1);
      await mock.store(testValues);

      expect(await mock.length()).to.equal(32);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle 15 values (one short of full chunk)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = Array.from({ length: 15 }, (_, i) => i + 1);
      await mock.store(testValues);

      expect(await mock.length()).to.equal(15);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle many uint16 values (200)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = Array.from({ length: 200 }, (_, i) => i % 65536);
      await mock.store(testValues);

      expect(await mock.length()).to.equal(200);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle alternating min and max values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const maxUint16 = 65535;
      const testValues = Array.from({ length: 20 }, (_, i) =>
        i % 2 === 0 ? 0 : maxUint16
      );
      await mock.store(testValues);

      expect(await mock.length()).to.equal(20);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });
  });

  describe("Clear Functionality", function () {
    it("should clear a populated array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([1, 2, 3, 4, 5]);
      expect(await mock.length()).to.equal(5);
      expect(await mock.isEmpty()).to.equal(false);

      await mock.clear();

      expect(await mock.length()).to.equal(0);
      expect(await mock.getAll()).to.deep.equal([]);
      expect(await mock.isEmpty()).to.equal(true);
    });

    it("should allow storing after clear", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([1, 2, 3]);
      await mock.clear();

      await mock.store([100, 200]);

      expect(await mock.length()).to.equal(2);
      expect(await mock.get(0)).to.equal(100);
      expect(await mock.get(1)).to.equal(200);
      expect(await mock.isEmpty()).to.equal(false);
    });

    it("should not revert when clearing an empty array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.clear();

      expect(await mock.length()).to.equal(0);
      expect(await mock.isEmpty()).to.equal(true);
    });

    it("should not revert when clearing an uninitialized array", async function () {
      const { mock } = await loadFixture(deployFixture);
      // Never stored anything
      await mock.clear();

      expect(await mock.length()).to.equal(0);
      expect(await mock.isEmpty()).to.equal(true);
    });
  });

  describe("Error Cases", function () {
    it("should revert when accessing out of bounds index", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = [42];
      await mock.store(testValues);

      await expect(mock.get(1)).to.be.revertedWith("Index out of bounds");
      await expect(mock.get(999)).to.be.revertedWith("Index out of bounds");
    });

    it("should revert when accessing uninitialized storageArray", async function () {
      const { mock } = await loadFixture(deployFixture);
      await expect(mock.get(0)).to.be.revertedWith("Index out of bounds");
    });

    it("should revert when accessing cleared array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([1, 2, 3]);
      await mock.clear();

      await expect(mock.get(0)).to.be.revertedWith("Index out of bounds");
    });

    it("should revert when accessing negative equivalent indices", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([1, 2, 3]);

      // Very large index (would wrap around if signed)
      const largeIndex = ethers.BigNumber.from(
        "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
      );
      await expect(mock.get(largeIndex)).to.be.revertedWith(
        "Index out of bounds"
      );
    });
  });

  describe("Overwrite Scenarios", function () {
    it("should overwrite with a larger array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([1, 2]);
      expect(await mock.length()).to.equal(2);

      await mock.store([10, 20, 30, 40, 50]);

      expect(await mock.length()).to.equal(5);
      expect(await mock.getAll()).to.deep.equal([10, 20, 30, 40, 50]);
    });

    it("should overwrite with a smaller array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([1, 2, 3, 4, 5]);
      expect(await mock.length()).to.equal(5);

      await mock.store([100, 200]);

      expect(await mock.length()).to.equal(2);
      expect(await mock.getAll()).to.deep.equal([100, 200]);
    });

    it("should overwrite with an empty array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([1, 2, 3, 4, 5]);
      expect(await mock.length()).to.equal(5);

      await mock.store([]);

      expect(await mock.length()).to.equal(0);
      expect(await mock.getAll()).to.deep.equal([]);
      expect(await mock.isEmpty()).to.equal(true);
    });

    it("should overwrite empty array with values", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([]);
      expect(await mock.length()).to.equal(0);

      await mock.store([1, 2, 3]);

      expect(await mock.length()).to.equal(3);
      expect(await mock.getAll()).to.deep.equal([1, 2, 3]);
    });

    it("should handle multiple overwrites", async function () {
      const { mock } = await loadFixture(deployFixture);

      await mock.store([1]);
      expect(await mock.getAll()).to.deep.equal([1]);

      await mock.store([2, 3]);
      expect(await mock.getAll()).to.deep.equal([2, 3]);

      await mock.store([4, 5, 6]);
      expect(await mock.getAll()).to.deep.equal([4, 5, 6]);

      await mock.store([7]);
      expect(await mock.getAll()).to.deep.equal([7]);
    });
  });

  describe("Pattern Testing", function () {
    it("should handle fibonacci sequence (first 20)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const fib = [
        1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597,
        2584, 4181, 6765,
      ];
      await mock.store(fib);

      expect(await mock.length()).to.equal(20);
      for (let i = 0; i < fib.length; i++) {
        expect(await mock.get(i)).to.equal(fib[i]);
      }
      expect(await mock.getAll()).to.deep.equal(fib);
    });

    it("should handle powers of 2", async function () {
      const { mock } = await loadFixture(deployFixture);
      const powersOf2 = [
        1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384,
        32768,
      ];
      await mock.store(powersOf2);

      expect(await mock.length()).to.equal(16);
      for (let i = 0; i < powersOf2.length; i++) {
        expect(await mock.get(i)).to.equal(powersOf2[i]);
      }
      expect(await mock.getAll()).to.deep.equal(powersOf2);
    });

    it("should handle repeating patterns", async function () {
      const { mock } = await loadFixture(deployFixture);
      const pattern = [1, 2, 3, 4, 5];
      const testValues = Array.from(
        { length: 50 },
        (_, i) => pattern[i % pattern.length]
      );
      await mock.store(testValues);

      expect(await mock.length()).to.equal(50);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });

    it("should handle ascending values near uint16 max", async function () {
      const { mock } = await loadFixture(deployFixture);
      const start = 65520;
      const testValues = Array.from({ length: 16 }, (_, i) => start + i);
      await mock.store(testValues);

      expect(await mock.length()).to.equal(16);
      for (let i = 0; i < testValues.length; i++) {
        expect(await mock.get(i)).to.equal(testValues[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testValues);
    });
  });

  describe("Gas Efficiency Patterns", function () {
    it("should efficiently store and retrieve 100 values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testValues = Array.from({ length: 100 }, (_, i) => i * 100);

      const storeTx = await mock.store(testValues);
      const receipt = await storeTx.wait();

      // Log gas used for storing 100 uint16 values
      console.log(
        `Gas used to store 100 uint16 values: ${receipt.gasUsed.toString()}`
      );

      expect(await mock.length()).to.equal(100);

      // Test batch retrieval is consistent
      const getAllTx = await mock.getAll();
      console.log(`Retrieved all 100 values successfully (batch retrieval)`);
      expect(getAllTx).to.deep.equal(testValues);

      // Spot check individual retrievals
      expect(await mock.get(0)).to.equal(0);
      expect(await mock.get(50)).to.equal(5000);
      expect(await mock.get(99)).to.equal(9900);
    });
  });
});
