import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ImmutableStringArray", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ImmutableStringArrayMock");
    const mock = await factory.deploy();
    await mock.deployed();
    return { mock, owner };
  }

  describe("Basic Functionality", function () {
    it("should store and retrieve a single string", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testStrings = ["Hello, World!"];
      await mock.store(testStrings);

      expect(await mock.length()).to.equal(1);
      console.log(await mock.get(0));
      expect(await mock.get(0)).to.equal(testStrings[0]);
      expect(await mock.getAll()).to.deep.equal(testStrings);
    });

    it("should store and retrieve multiple strings", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testStrings = ["First", "Second", "Third", "Fourth"];
      await mock.store(testStrings);

      expect(await mock.length()).to.equal(4);
      for (let i = 0; i < testStrings.length; i++) {
        expect(await mock.get(i)).to.equal(testStrings[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testStrings);
    });

    it("should handle empty strings", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testStrings = ["", "Not Empty", ""];
      await mock.store(testStrings);

      expect(await mock.length()).to.equal(3);
      expect(await mock.get(0)).to.equal("");
      expect(await mock.get(1)).to.equal("Not Empty");
      expect(await mock.get(2)).to.equal("");
      expect(await mock.getAll()).to.deep.equal(testStrings);
    });

    it("should handle an empty array", async function () {
      const { mock } = await loadFixture(deployFixture);
      await mock.store([]);

      expect(await mock.length()).to.equal(0);
      expect(await mock.getAll()).to.deep.equal([]);
    });

    it("should not revert when reinitialized", async function () {
      const { mock } = await loadFixture(deployFixture);
      // store a first array
      await mock.store(["First"]);
      // store a second array
      await mock.store(["Second"]);
      // get the second array
      expect(await mock.get(0)).to.equal("Second");
      expect(await mock.getAll()).to.deep.equal(["Second"]);
    });
  });

  describe("Edge Cases", function () {
    it("should handle long strings", async function () {
      const { mock } = await loadFixture(deployFixture);
      const longString = "a".repeat(1000);
      const testStrings = [longString, "short", longString];
      await mock.store(testStrings);

      expect(await mock.length()).to.equal(3);
      expect(await mock.get(0)).to.equal(longString);
      expect(await mock.get(1)).to.equal("short");
      expect(await mock.get(2)).to.equal(longString);
      expect(await mock.getAll()).to.deep.equal(testStrings);
    });

    it("should handle special characters", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testStrings = [
        "Hello\n",
        "Tab\there",
        "Unicode 🚀",
        "Symbols !@#$%",
      ];
      await mock.store(testStrings);

      expect(await mock.length()).to.equal(4);
      for (let i = 0; i < testStrings.length; i++) {
        expect(await mock.get(i)).to.equal(testStrings[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testStrings);
    });

    it("should handle many strings", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testStrings = Array.from({ length: 100 }, (_, i) => `String ${i}`);
      await mock.store(testStrings);

      expect(await mock.length()).to.equal(100);
      for (let i = 0; i < testStrings.length; i++) {
        expect(await mock.get(i)).to.equal(testStrings[i]);
      }
      expect(await mock.getAll()).to.deep.equal(testStrings);
    });
  });

  describe("Error Cases", function () {
    it("should revert when accessing out of bounds index", async function () {
      const { mock } = await loadFixture(deployFixture);
      const testStrings = ["Single"];
      await mock.store(testStrings);

      await expect(mock.get(1)).to.be.revertedWith("Index out of bounds");
      await expect(mock.get(999)).to.be.revertedWith("Index out of bounds");
    });

    // @dev no test on overflow of uint64, as realistically impossible
  });
});
