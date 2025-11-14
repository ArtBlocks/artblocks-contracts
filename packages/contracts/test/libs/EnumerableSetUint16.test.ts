import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { EnumerableSetUint16Mock } from "../../scripts/contracts";

describe("EnumerableSetUint16", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EnumerableSetUint16Mock");
    const mock = await factory.deploy();
    await mock.deployed();
    return { mock, owner };
  }

  // Helper function to verify set integrity
  async function verifySetIntegrity(
    mock: EnumerableSetUint16Mock,
    expectedValues: number[]
  ): Promise<void> {
    const length = await mock.length();
    expect(length).to.equal(expectedValues.length, "Length mismatch");

    // Check all expected values are present
    for (const value of expectedValues) {
      expect(await mock.contains(value)).to.be.true;
    }

    // Check all values at indices match (order might differ)
    const actualValues: number[] = [];
    for (let i = 0; i < length.toNumber(); i++) {
      const value = await mock.at(i);
      actualValues.push(value);
      expect(expectedValues).to.include(value);
    }

    // Check values() function
    const valuesArray = await mock.values();
    expect(valuesArray.length).to.equal(expectedValues.length);
    for (let i = 0; i < valuesArray.length; i++) {
      expect(actualValues[i]).to.equal(valuesArray[i].toNumber());
    }
  }

  // Helper to generate random uint16 values
  function randomUint16(): number {
    return Math.floor(Math.random() * 65534); // Max storable value is 65534
  }

  // Helper to shuffle array
  function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  describe("Basic Operations", function () {
    it("should start with length 0", async function () {
      const { mock } = await loadFixture(deployFixture);
      expect(await mock.length()).to.equal(0);
    });

    it("should add a single value", async function () {
      const { mock } = await loadFixture(deployFixture);
      const result = await mock.add(42);
      await result.wait();

      expect(await mock.length()).to.equal(1);
      expect(await mock.contains(42)).to.be.true;
      expect(await mock.at(0)).to.equal(42);
    });

    it("should return true when adding a new value", async function () {
      const { mock } = await loadFixture(deployFixture);
      await expect(mock.add(42)).to.not.be.reverted;
    });

    it("should return false when adding a duplicate value", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.add(42);
      // The second add should return false but not revert
      await mock.add(42);
      expect(await mock.length()).to.equal(1);
    });

    it("should remove a value", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.add(42);
      await mock.remove(42);

      expect(await mock.length()).to.equal(0);
      expect(await mock.contains(42)).to.be.false;
    });

    it("should return true when removing an existing value", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.add(42);
      await expect(mock.remove(42)).to.not.be.reverted;
    });

    it("should return false when removing a non-existent value", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.remove(42);
      expect(await mock.length()).to.equal(0);
    });

    it("should handle contains correctly", async function () {
      const { mock } = await loadFixture(deployFixture);
      expect(await mock.contains(42)).to.be.false;

      await mock.add(42);
      expect(await mock.contains(42)).to.be.true;

      await mock.remove(42);
      expect(await mock.contains(42)).to.be.false;
    });
  });

  describe("Multiple Values", function () {
    it("should add multiple values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = [1, 2, 3, 4, 5];

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });

    it("should add and remove multiple values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = [1, 2, 3, 4, 5];

      for (const value of values) {
        await mock.add(value);
      }

      await mock.remove(3);
      await verifySetIntegrity(mock, [1, 2, 4, 5]);

      await mock.remove(1);
      await verifySetIntegrity(mock, [2, 4, 5]);

      await mock.remove(5);
      await verifySetIntegrity(mock, [2, 4]);
    });

    it("should handle adding values across multiple slots", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 40 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });
  });

  describe("Edge Cases - Slot Boundaries", function () {
    it("should handle exactly 16 values (one full slot)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 16 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });

    it("should handle 17 values (crossing slot boundary)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 17 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });

    it("should handle 32 values (two full slots)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 32 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });

    it("should handle removing from middle of first slot", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 16 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      // Remove from middle (position 7)
      await mock.remove(7);
      await verifySetIntegrity(
        mock,
        values.filter((v) => v !== 7)
      );
    });

    it("should handle removing from end of first slot", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 16 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      // Remove last item in slot (position 15)
      await mock.remove(15);
      await verifySetIntegrity(
        mock,
        values.filter((v) => v !== 15)
      );
    });

    it("should handle removing from middle of second slot", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 24 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      // Remove from middle of second slot (position 20, offset 4 in second slot)
      await mock.remove(20);
      await verifySetIntegrity(
        mock,
        values.filter((v) => v !== 20)
      );
    });

    it("should handle removing last item when it's in middle of a slot", async function () {
      const { mock } = await loadFixture(deployFixture);
      // Add 20 values (fills first slot + 4 in second slot)
      const values = Array.from({ length: 20 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      // Remove the last value (19, at offset 3 in second slot)
      await mock.remove(19);
      await verifySetIntegrity(
        mock,
        values.filter((v) => v !== 19)
      );
    });
  });

  describe("Critical Test - Random Removal Order", function () {
    it("should maintain integrity when adding 40 values and removing in random order [ @skip-on-coverage ]", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 40 }, (_, i) => i);

      // Add all values
      for (const value of values) {
        await mock.add(value);
      }
      await verifySetIntegrity(mock, values);

      // Shuffle and remove one by one
      const shuffledValues = shuffle(values);
      const remaining = [...values];

      for (const valueToRemove of shuffledValues) {
        await mock.remove(valueToRemove);
        const index = remaining.indexOf(valueToRemove);
        remaining.splice(index, 1);

        // Verify integrity after each removal
        await verifySetIntegrity(mock, remaining);
      }

      // Should be empty now
      expect(await mock.length()).to.equal(0);
    });

    it("should maintain integrity with 100 values removed in random order [ @skip-on-coverage ]", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 100 }, (_, i) => i);

      // Add all values
      for (const value of values) {
        await mock.add(value);
      }
      await verifySetIntegrity(mock, values);

      // Shuffle and remove one by one
      const shuffledValues = shuffle(values);
      const remaining = [...values];

      for (const valueToRemove of shuffledValues) {
        await mock.remove(valueToRemove);
        const index = remaining.indexOf(valueToRemove);
        remaining.splice(index, 1);

        // Verify integrity after each removal
        await verifySetIntegrity(mock, remaining);
      }

      expect(await mock.length()).to.equal(0);
    });
  });

  describe("Large Scale Tests", function () {
    it("should handle adding 1000 values [ @skip-on-coverage ]", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 1000 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      expect(await mock.length()).to.equal(1000);

      // Spot check some values
      expect(await mock.contains(0)).to.be.true;
      expect(await mock.contains(500)).to.be.true;
      expect(await mock.contains(999)).to.be.true;
      expect(await mock.contains(1000)).to.be.false;
    });

    it("should handle removing values from large set", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 200 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      // Remove every other value
      for (let i = 0; i < 200; i += 2) {
        await mock.remove(i);
      }

      expect(await mock.length()).to.equal(100);

      // Verify odd values remain
      for (let i = 1; i < 200; i += 2) {
        expect(await mock.contains(i)).to.be.true;
      }

      // Verify even values are gone
      for (let i = 0; i < 200; i += 2) {
        expect(await mock.contains(i)).to.be.false;
      }
    });

    it("should handle mixed add/remove operations", async function () {
      const { mock } = await loadFixture(deployFixture);

      // Add 100 values
      for (let i = 0; i < 100; i++) {
        await mock.add(i);
      }

      // Remove first 50
      for (let i = 0; i < 50; i++) {
        await mock.remove(i);
      }

      // Add 50 more (100-149)
      for (let i = 100; i < 150; i++) {
        await mock.add(i);
      }

      expect(await mock.length()).to.equal(100);

      // Verify 50-149 are present
      for (let i = 50; i < 150; i++) {
        expect(await mock.contains(i)).to.be.true;
      }

      // Verify 0-49 are not present
      for (let i = 0; i < 50; i++) {
        expect(await mock.contains(i)).to.be.false;
      }
    });
  });

  describe("Value Range Tests", function () {
    it("should handle value 0", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.add(0);

      expect(await mock.contains(0)).to.be.true;
      expect(await mock.at(0)).to.equal(0);
    });

    it("should handle max value (65534)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const maxValue = 65534;
      await mock.add(maxValue);

      expect(await mock.contains(maxValue)).to.be.true;
      expect(await mock.at(0)).to.equal(maxValue);
    });

    it("should revert when adding max uint16 value (65535)", async function () {
      const { mock } = await loadFixture(deployFixture);
      await expect(mock.add(65535)).to.be.revertedWith(
        "EnumerableSetUint16: value too large"
      );
    });

    it("should handle random values throughout the range", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = [0, 100, 1000, 10000, 32767, 50000, 65534];

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });
  });

  describe("At() Function Tests", function () {
    it("should revert when accessing out of bounds index", async function () {
      const { mock } = await loadFixture(deployFixture);
      await expect(mock.at(0)).to.be.revertedWith(
        "EnumerableSetUint16: index out of bounds"
      );
    });

    it("should revert when accessing index >= length", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.add(1);
      await mock.add(2);

      await expect(mock.at(2)).to.be.revertedWith(
        "EnumerableSetUint16: index out of bounds"
      );
    });

    it("should allow accessing all valid indices", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = [10, 20, 30, 40, 50];

      for (const value of values) {
        await mock.add(value);
      }

      for (let i = 0; i < 5; i++) {
        const value = await mock.at(i);
        expect(values).to.include(value);
      }
    });
  });

  describe("Values() Function Tests", function () {
    it("should return empty array for empty set", async function () {
      const { mock } = await loadFixture(deployFixture);
      const vals = await mock.values();
      expect(vals.length).to.equal(0);
    });

    it("should return all values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = [1, 2, 3, 4, 5];

      for (const value of values) {
        await mock.add(value);
      }

      const vals = await mock.values();
      expect(vals.length).to.equal(5);

      const valsNumbers = vals.map((v) => v.toNumber());
      for (const value of values) {
        expect(valsNumbers).to.include(value);
      }
    });

    it("should return correct values after removals", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.add(1);
      await mock.add(2);
      await mock.add(3);
      await mock.remove(2);

      const vals = await mock.values();
      const valsNumbers = vals.map((v) => v.toNumber());

      expect(valsNumbers).to.include(1);
      expect(valsNumbers).to.include(3);
      expect(valsNumbers).to.not.include(2);
    });
  });

  describe("Index Packing Tests", function () {
    it("should pack indexes for sequential values (0-15)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = Array.from({ length: 16 }, (_, i) => i);

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);

      // All these values should use the same index bucket (bucket 0)
      // Verify we can remove and add them without issues
      await mock.remove(5);
      await mock.add(5);
      await verifySetIntegrity(mock, values);
    });

    it("should handle values that map to same index bucket", async function () {
      const { mock } = await loadFixture(deployFixture);
      // Values 0, 16, 32, 48 all map to different buckets
      // Values 0-15 map to bucket 0
      const values = [0, 1, 2, 15];

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);

      // Remove and verify
      await mock.remove(1);
      await verifySetIntegrity(mock, [0, 2, 15]);
    });

    it("should handle values across multiple index buckets", async function () {
      const { mock } = await loadFixture(deployFixture);
      // Spread values across multiple index buckets
      const values = [0, 16, 32, 48, 64, 80, 96];

      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });
  });

  describe("Stress Tests - Complex Scenarios", function () {
    it("should handle alternating add and remove", async function () {
      const { mock } = await loadFixture(deployFixture);

      for (let i = 0; i < 50; i++) {
        await mock.add(i);
        if (i > 0 && i % 2 === 0) {
          await mock.remove(i - 1);
        }
      }

      const length = await mock.length();
      expect(length).to.be.gt(0);
    });

    it("should handle removing and re-adding same values", async function () {
      const { mock } = await loadFixture(deployFixture);
      const values = [1, 2, 3, 4, 5];

      // Add all
      for (const value of values) {
        await mock.add(value);
      }

      // Remove all
      for (const value of values) {
        await mock.remove(value);
      }

      expect(await mock.length()).to.equal(0);

      // Add all again
      for (const value of values) {
        await mock.add(value);
      }

      await verifySetIntegrity(mock, values);
    });

    it("should handle filling gaps after removals", async function () {
      const { mock } = await loadFixture(deployFixture);

      // Add 0-49
      for (let i = 0; i < 50; i++) {
        await mock.add(i);
      }

      // Remove 10-19
      for (let i = 10; i < 20; i++) {
        await mock.remove(i);
      }

      // Add 50-59 (should fill the gaps)
      for (let i = 50; i < 60; i++) {
        await mock.add(i);
      }

      expect(await mock.length()).to.equal(50);

      // Verify 0-9, 20-59 are present
      for (let i = 0; i < 10; i++) {
        expect(await mock.contains(i)).to.be.true;
      }
      for (let i = 20; i < 60; i++) {
        expect(await mock.contains(i)).to.be.true;
      }
      for (let i = 10; i < 20; i++) {
        expect(await mock.contains(i)).to.be.false;
      }
    });
  });

  describe("Empty Set Operations", function () {
    it("should handle contains on empty set", async function () {
      const { mock } = await loadFixture(deployFixture);
      expect(await mock.contains(0)).to.be.false;
      expect(await mock.contains(100)).to.be.false;
    });

    it("should handle remove on empty set", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.remove(42);
      expect(await mock.length()).to.equal(0);
    });

    it("should handle values on empty set", async function () {
      const { mock } = await loadFixture(deployFixture);
      const vals = await mock.values();
      expect(vals.length).to.equal(0);
    });
  });

  describe("Random Operations Test", function () {
    it("should handle 200 random operations [ @skip-on-coverage ]", async function () {
      const { mock } = await loadFixture(deployFixture);
      const presentValues = new Set<number>();

      for (let i = 0; i < 200; i++) {
        const value = randomUint16();
        const operation = Math.random() < 0.6 ? "add" : "remove"; // 60% add, 40% remove

        if (operation === "add") {
          await mock.add(value);
          presentValues.add(value);
        } else if (presentValues.size > 0) {
          // Pick a random value to remove from presentValues
          const valuesArray = Array.from(presentValues);
          const valueToRemove =
            valuesArray[Math.floor(Math.random() * valuesArray.length)];
          await mock.remove(valueToRemove);
          presentValues.delete(valueToRemove);
        }

        // Periodically verify integrity
        if (i % 50 === 0) {
          await verifySetIntegrity(mock, Array.from(presentValues));
        }
      }

      // Final integrity check
      await verifySetIntegrity(mock, Array.from(presentValues));
    });
  });

  describe("Gas Efficiency Observations", function () {
    it("should report gas for adding to empty set", async function () {
      const { mock } = await loadFixture(deployFixture);
      const tx = await mock.add(100);
      const receipt = await tx.wait();
      console.log(`\nGas to add first value: ${receipt.gasUsed.toString()}`);
    });

    it("should report gas for adding to set with 15 values (same slot)", async function () {
      const { mock } = await loadFixture(deployFixture);

      // Add 15 values
      for (let i = 0; i < 15; i++) {
        await mock.add(i);
      }

      // Add 16th value (still in first slot)
      const tx = await mock.add(15);
      const receipt = await tx.wait();
      console.log(
        `Gas to add 16th value (same slot): ${receipt.gasUsed.toString()}`
      );
    });

    it("should report gas for adding to set crossing slot boundary", async function () {
      const { mock } = await loadFixture(deployFixture);

      // Add 16 values (fills first slot)
      for (let i = 0; i < 16; i++) {
        await mock.add(i);
      }

      // Add 17th value (new slot)
      const tx = await mock.add(16);
      const receipt = await tx.wait();
      console.log(
        `Gas to add 17th value (new slot): ${receipt.gasUsed.toString()}`
      );
    });

    it("should report gas for sequential values (index packing)", async function () {
      const { mock } = await loadFixture(deployFixture);

      // First value in bucket 0
      const tx1 = await mock.add(0);
      const receipt1 = await tx1.wait();

      // Second value in bucket 0 (should benefit from warm storage)
      const tx2 = await mock.add(1);
      const receipt2 = await tx2.wait();

      console.log(
        `Gas for first value in bucket: ${receipt1.gasUsed.toString()}`
      );
      console.log(
        `Gas for second value in same bucket: ${receipt2.gasUsed.toString()}`
      );
      console.log(
        `Savings: ${receipt1.gasUsed.sub(receipt2.gasUsed).toString()}`
      );
    });

    it("should report gas for remove operations", async function () {
      const { mock } = await loadFixture(deployFixture);

      // Add 20 values
      for (let i = 0; i < 20; i++) {
        await mock.add(i);
      }

      // Remove from middle
      const tx1 = await mock.remove(10);
      const receipt1 = await tx1.wait();
      console.log(`Gas to remove from middle: ${receipt1.gasUsed.toString()}`);

      // Remove last
      const tx2 = await mock.remove(19);
      const receipt2 = await tx2.wait();
      console.log(`Gas to remove last value: ${receipt2.gasUsed.toString()}`);
    });
  });
});
