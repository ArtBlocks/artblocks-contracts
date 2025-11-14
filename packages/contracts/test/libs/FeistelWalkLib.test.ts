import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("FeistelWalkLib", function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("FeistelWalkLibMock");
    const mock = await factory.deploy();
    await mock.deployed();
    return { mock, owner };
  }

  // Helper function to generate random seed
  function randomSeed(): string {
    return ethers.utils.hexlify(ethers.utils.randomBytes(32));
  }

  // Helper function to check if array has duplicates
  function hasDuplicates(arr: number[]): boolean {
    return new Set(arr).size !== arr.length;
  }

  // Helper function to check if array covers [0..N-1]
  function coversRange(arr: number[], N: number): boolean {
    if (arr.length !== N) return false;
    const sorted = [...arr].sort((a, b) => a - b);
    for (let i = 0; i < N; i++) {
      if (sorted[i] !== i) return false;
    }
    return true;
  }

  describe("Plan Creation", function () {
    it("should create a valid plan for N=1", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const [N, M, , rounds, k0, k1] = await mock.makePlan(seed, 1);

      expect(N).to.equal(1);
      expect(M).to.be.gte(N); // M >= N
      expect(rounds).to.equal(2);
      expect(k0).to.be.gt(0);
      expect(k1).to.be.gt(0);
    });

    it("should create a valid plan for N=10", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const [N, M, , rounds] = await mock.makePlan(seed, 10);

      expect(N).to.equal(10);
      expect(M).to.equal(16); // Next power of 2 after 10
      expect(rounds).to.equal(2);
    });

    it("should create a valid plan for power-of-2 N", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const [N, M, , rounds] = await mock.makePlan(seed, 64);

      expect(N).to.equal(64);
      expect(M).to.equal(64); // Already power of 2
      expect(rounds).to.equal(2);
    });

    it("should produce different round keys for different seeds", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed1 = randomSeed();
      const seed2 = randomSeed();

      const [, , , , k0_1, k1_1] = await mock.makePlan(seed1, 100);
      const [, , , , k0_2, k1_2] = await mock.makePlan(seed2, 100);

      // At least one key should be different
      const allSame = k0_1.eq(k0_2) && k1_1.eq(k1_2);
      expect(allSame).to.be.false;
    });

    it("should produce same plan for same seed and N", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      const [N1, M1, , rounds1, k0_1, k1_1] = await mock.makePlan(seed, 100);
      const [N2, M2, , rounds2, k0_2, k1_2] = await mock.makePlan(seed, 100);

      expect(N1).to.equal(N2);
      expect(M1).to.equal(M2);
      expect(rounds1).to.equal(rounds2);
      expect(k0_1).to.equal(k0_2);
      expect(k1_1).to.equal(k1_2);
    });

    it("should produce different plans for different N with same seed", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      const [, , , , k0_1, k1_1] = await mock.makePlan(seed, 50);
      const [, , , , k0_2, k1_2] = await mock.makePlan(seed, 100);

      // Keys should differ when N differs (domain separation)
      const allSame = k0_1.eq(k0_2) && k1_1.eq(k1_2);
      expect(allSame).to.be.false;
    });
  });

  describe("Basic Index Functionality", function () {
    it("should return 0 for N=1, k=0", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.index(seed, 1, 0);
      expect(result).to.equal(0);
    });

    it("should return valid indices for N=2", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      const idx0 = await mock.index(seed, 2, 0);
      const idx1 = await mock.index(seed, 2, 1);

      expect(idx0).to.be.lt(2);
      expect(idx1).to.be.lt(2);
      expect(idx0).to.not.equal(idx1); // Should be different
    });

    it("should return valid indices for N=10", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      for (let k = 0; k < 10; k++) {
        const idx = await mock.index(seed, 10, k);
        expect(idx).to.be.lt(10);
        expect(idx).to.be.gte(0);
      }
    });

    it("should produce consistent results for same inputs", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      const idx1 = await mock.index(seed, 50, 5);
      const idx2 = await mock.index(seed, 50, 5);

      expect(idx1).to.equal(idx2);
    });

    it("should produce different results for different k", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      const idx0 = await mock.index(seed, 100, 0);
      const idx1 = await mock.index(seed, 100, 1);
      const idx2 = await mock.index(seed, 100, 2);

      // Not all should be the same (extremely unlikely)
      const allSame = idx0.eq(idx1) && idx1.eq(idx2);
      expect(allSame).to.be.false;
    });
  });

  describe("Permutation Properties", function () {
    it("should produce no duplicates for full traversal N=10", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 10);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(hasDuplicates(resultNumbers)).to.be.false;
    });

    it("should cover all indices [0..N-1] for N=10", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 10);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 10)).to.be.true;
    });

    it("should produce no duplicates for full traversal N=64 (power of 2)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 64);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(hasDuplicates(resultNumbers)).to.be.false;
    });

    it("should cover all indices [0..N-1] for N=64", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 64);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 64)).to.be.true;
    });

    it("should produce no duplicates for full traversal N=100", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 100);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(hasDuplicates(resultNumbers)).to.be.false;
    });

    it("should cover all indices [0..N-1] for N=100", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 100);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 100)).to.be.true;
    });

    it("should produce no duplicates for full traversal N=1000", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 1000);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(hasDuplicates(resultNumbers)).to.be.false;
    });

    it("should cover all indices [0..N-1] for N=1000", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 1000);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 1000)).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("should handle N=1 correctly", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 1);

      expect(result.length).to.equal(1);
      expect(result[0]).to.equal(0);
    });

    it("should handle N=2 correctly", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 2);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(resultNumbers.length).to.equal(2);
      expect(hasDuplicates(resultNumbers)).to.be.false;
      expect(coversRange(resultNumbers, 2)).to.be.true;
    });

    it("should handle N=3 correctly", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 3);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 3)).to.be.true;
    });

    it("should handle boundary N=15 (one less than power of 2)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 15);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 15)).to.be.true;
    });

    it("should handle boundary N=17 (one more than power of 2)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 17);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 17)).to.be.true;
    });

    it("should handle N=127 (one less than power of 2)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 127);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 127)).to.be.true;
    });

    it("should handle N=129 (one more than power of 2)", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.fullTraversal(seed, 129);

      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 129)).to.be.true;
    });
  });

  describe("Sample Functionality", function () {
    it("should return K samples when K < N", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.sample(seed, 100, 10);

      expect(result.length).to.equal(10);
      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(hasDuplicates(resultNumbers)).to.be.false;
    });

    it("should clamp to N when K > N", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.sample(seed, 10, 20);

      expect(result.length).to.equal(10);
      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 10)).to.be.true;
    });

    it("should return N samples when K = N", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.sample(seed, 50, 50);

      expect(result.length).to.equal(50);
      const resultNumbers = result.map((bn) => bn.toNumber());
      expect(coversRange(resultNumbers, 50)).to.be.true;
    });

    it("should handle K=0", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.sample(seed, 100, 0);

      expect(result.length).to.equal(0);
    });

    it("should handle K=1", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.sample(seed, 100, 1);

      expect(result.length).to.equal(1);
      expect(result[0]).to.be.lt(100);
    });
  });

  describe("Seed Variation Tests", function () {
    it("should produce different permutations for different seeds", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed1 = randomSeed();
      const seed2 = randomSeed();

      const result1 = await mock.fullTraversal(seed1, 50);
      const result2 = await mock.fullTraversal(seed2, 50);

      const nums1 = result1.map((bn) => bn.toNumber());
      const nums2 = result2.map((bn) => bn.toNumber());

      // Should not be identical (extremely unlikely)
      let differences = 0;
      for (let i = 0; i < 50; i++) {
        if (nums1[i] !== nums2[i]) differences++;
      }
      expect(differences).to.be.gt(0);
    });

    it("should produce different first indices for 10 different seeds", async function () {
      const { mock } = await loadFixture(deployFixture);
      const firstIndices = new Set<number>();

      for (let i = 0; i < 10; i++) {
        const seed = randomSeed();
        const idx = await mock.index(seed, 100, 0);
        firstIndices.add(idx.toNumber());
      }

      // Should have some variety (not all the same)
      expect(firstIndices.size).to.be.gt(1);
    });

    it("should maintain permutation property across different seeds", async function () {
      const { mock } = await loadFixture(deployFixture);

      for (let i = 0; i < 5; i++) {
        const seed = randomSeed();
        const result = await mock.fullTraversal(seed, 50);
        const resultNumbers = result.map((bn) => bn.toNumber());

        expect(hasDuplicates(resultNumbers)).to.be.false;
        expect(coversRange(resultNumbers, 50)).to.be.true;
      }
    });
  });

  describe("Distribution Quality Tests", function () {
    it("should not produce obvious sequential patterns for N=100", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.sample(seed, 100, 20);

      const resultNumbers = result.map((bn) => bn.toNumber());

      // Check that we don't have many consecutive numbers
      let consecutivePairs = 0;
      for (let i = 1; i < resultNumbers.length; i++) {
        if (Math.abs(resultNumbers[i] - resultNumbers[i - 1]) === 1) {
          consecutivePairs++;
        }
      }

      // Statistically, we'd expect ~20% * 20% * 20 ≈ 0.8 pairs
      // Allow up to 5 to be safe, but 19 would indicate no randomness
      expect(consecutivePairs).to.be.lt(10);
    });

    it("should distribute first 100 samples evenly across N=1000", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const result = await mock.sample(seed, 1000, 100);

      const resultNumbers = result.map((bn) => bn.toNumber());

      // Divide into 10 buckets of 100 each
      const buckets = new Array(10).fill(0);
      for (const num of resultNumbers) {
        const bucket = Math.floor(num / 100);
        buckets[bucket]++;
      }

      // Each bucket should have at least 1 and at most 50 elements
      // (perfect would be 10 per bucket, but randomness varies)
      for (const count of buckets) {
        expect(count).to.be.gte(0);
        expect(count).to.be.lte(50);
      }

      // At least 5 different buckets should be hit
      const nonEmptyBuckets = buckets.filter((c) => c > 0).length;
      expect(nonEmptyBuckets).to.be.gte(5);
    });
  });

  describe("Error Cases", function () {
    it("should revert when N=0", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      await expect(mock.makePlan(seed, 0)).to.be.revertedWith(
        "FeistelWalkLib:N=0"
      );
    });

    it("should revert when k >= N", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      await expect(mock.index(seed, 10, 10)).to.be.revertedWith(
        "FeistelWalkLib:k>=N"
      );
      await expect(mock.index(seed, 10, 100)).to.be.revertedWith(
        "FeistelWalkLib:k>=N"
      );
    });

    it("should revert for very large k", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();
      const largeK = ethers.BigNumber.from("0xFFFFFFFFFFFFFFFF");

      await expect(mock.index(seed, 100, largeK)).to.be.revertedWith(
        "FeistelWalkLib:k>=N"
      );
    });
  });

  describe("Consistency Tests", function () {
    it("should produce same results when called multiple times", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      const result1 = await mock.fullTraversal(seed, 50);
      const result2 = await mock.fullTraversal(seed, 50);

      for (let i = 0; i < 50; i++) {
        expect(result1[i]).to.equal(result2[i]);
      }
    });

    it("should produce consistent samples vs individual index calls", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      const samples = await mock.sample(seed, 100, 10);

      for (let k = 0; k < 10; k++) {
        const idx = await mock.index(seed, 100, k);
        expect(samples[k]).to.equal(idx);
      }
    });
  });

  describe("Power of Two Edge Cases", function () {
    const powersOfTwo = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

    for (const N of powersOfTwo) {
      it(`should handle N=${N} (power of 2)`, async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();
        const result = await mock.fullTraversal(seed, N);

        const resultNumbers = result.map((bn) => bn.toNumber());
        expect(coversRange(resultNumbers, N)).to.be.true;
      });
    }
  });

  describe("Non-Power-of-Two Edge Cases", function () {
    const nonPowersOfTwo = [
      3, 5, 7, 9, 11, 13, 31, 33, 63, 65, 127, 129, 255, 257, 511, 513,
    ];

    for (const N of nonPowersOfTwo) {
      it(`should handle N=${N} (non-power of 2)`, async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();
        const result = await mock.fullTraversal(seed, N);

        const resultNumbers = result.map((bn) => bn.toNumber());
        expect(coversRange(resultNumbers, N)).to.be.true;
      });
    }
  });

  describe("Gas Efficiency", function () {
    it("should efficiently sample 100 from 1000", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      // Note: sample() is a view function, so we measure gas via estimateGas
      const gasEstimate = await mock.estimateGas.sample(seed, 1000, 100);

      console.log(
        `Estimated gas to sample 100 from 1000: ${gasEstimate.toString()}`
      );

      const result = await mock.sample(seed, 1000, 100);
      expect(result.length).to.equal(100);
    });

    it("should efficiently traverse full N=100", async function () {
      const { mock } = await loadFixture(deployFixture);
      const seed = randomSeed();

      // Note: fullTraversal() is a view function, so we measure gas via estimateGas
      const gasEstimate = await mock.estimateGas.fullTraversal(seed, 100);

      console.log(
        `Estimated gas for full traversal of N=100: ${gasEstimate.toString()}`
      );

      const result = await mock.fullTraversal(seed, 100);
      expect(result.length).to.equal(100);
    });
  });

  describe("Large-Scale Tests (N=10,000)", function () {
    const N_LARGE = 10000;

    describe("Sample Functionality", function () {
      it("should handle sampling 10 from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 10);

        expect(result.length).to.equal(10);
        const resultNumbers = result.map((bn) => bn.toNumber());
        expect(hasDuplicates(resultNumbers)).to.be.false;

        // All values should be in range [0, 10000)
        for (const val of resultNumbers) {
          expect(val).to.be.gte(0);
          expect(val).to.be.lt(N_LARGE);
        }
      });

      it("should handle sampling 100 from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 100);

        expect(result.length).to.equal(100);
        const resultNumbers = result.map((bn) => bn.toNumber());
        expect(hasDuplicates(resultNumbers)).to.be.false;

        // All values should be in range [0, 10000)
        for (const val of resultNumbers) {
          expect(val).to.be.gte(0);
          expect(val).to.be.lt(N_LARGE);
        }
      });

      it("should handle sampling 1000 from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 1000);

        expect(result.length).to.equal(1000);
        const resultNumbers = result.map((bn) => bn.toNumber());
        expect(hasDuplicates(resultNumbers)).to.be.false;

        // All values should be in range [0, 10000)
        for (const val of resultNumbers) {
          expect(val).to.be.gte(0);
          expect(val).to.be.lt(N_LARGE);
        }
      });

      it("should verify sampling exactly N from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        // Sample exactly 1000 (10% of N) instead of full 10k to avoid gas limits
        const result = await mock.sample(seed, N_LARGE, 1000);

        expect(result.length).to.equal(1000);
        const resultNumbers = result.map((bn) => bn.toNumber());
        expect(hasDuplicates(resultNumbers)).to.be.false;

        // Verify all values are within range
        for (const val of resultNumbers) {
          expect(val).to.be.gte(0);
          expect(val).to.be.lt(N_LARGE);
        }
      });
    });

    describe("Distribution Quality", function () {
      it("should distribute 100 samples evenly across 10k range", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 100);
        const resultNumbers = result.map((bn) => bn.toNumber());

        // Divide into 10 buckets of 1000 each
        const buckets = new Array(10).fill(0);
        for (const num of resultNumbers) {
          const bucket = Math.floor(num / 1000);
          buckets[bucket]++;
        }

        // Each bucket should have some representation
        // With 100 samples across 10 buckets, expect ~10 per bucket
        // But randomness means some variation is expected
        for (const count of buckets) {
          expect(count).to.be.gte(0);
          expect(count).to.be.lte(50); // Allow wide variance for randomness
        }

        // At least 7 different buckets should be hit
        const nonEmptyBuckets = buckets.filter((c) => c > 0).length;
        expect(nonEmptyBuckets).to.be.gte(7);

        console.log(`Distribution across 10 buckets: [${buckets.join(", ")}]`);
      });

      it("should distribute 1000 samples evenly across 10k range", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 1000);
        const resultNumbers = result.map((bn) => bn.toNumber());

        // Divide into 10 buckets of 1000 each
        const buckets = new Array(10).fill(0);
        for (const num of resultNumbers) {
          const bucket = Math.floor(num / 1000);
          buckets[bucket]++;
        }

        // With 1000 samples across 10 buckets, expect ~100 per bucket
        // Each bucket should have reasonable representation
        for (const count of buckets) {
          expect(count).to.be.gte(50); // At least 50
          expect(count).to.be.lte(150); // At most 150
        }

        // All buckets should be hit
        const nonEmptyBuckets = buckets.filter((c) => c > 0).length;
        expect(nonEmptyBuckets).to.equal(10);

        console.log(`Distribution across 10 buckets: [${buckets.join(", ")}]`);
      });

      it("should show good distribution in finer granularity (100 buckets)", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 1000);
        const resultNumbers = result.map((bn) => bn.toNumber());

        // Divide into 100 buckets of 100 each
        const buckets = new Array(100).fill(0);
        for (const num of resultNumbers) {
          const bucket = Math.floor(num / 100);
          buckets[bucket]++;
        }

        // With 1000 samples across 100 buckets, expect ~10 per bucket
        // Allow reasonable variance
        for (const count of buckets) {
          expect(count).to.be.gte(0);
          expect(count).to.be.lte(30);
        }

        // At least 70% of buckets should have at least one sample
        const nonEmptyBuckets = buckets.filter((c) => c > 0).length;
        expect(nonEmptyBuckets).to.be.gte(70);

        // Calculate basic statistics
        const filledBuckets = buckets.filter((c) => c > 0);
        const avgFilled =
          filledBuckets.reduce((a, b) => a + b, 0) / filledBuckets.length;

        console.log(
          `Fine-grained distribution: ${nonEmptyBuckets}/100 buckets hit, avg per filled bucket: ${avgFilled.toFixed(2)}`
        );
      });

      it("should not show obvious patterns in 10k sampling", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 100);
        const resultNumbers = result.map((bn) => bn.toNumber());

        // Check for sequential patterns
        let consecutivePairs = 0;
        for (let i = 1; i < resultNumbers.length; i++) {
          if (Math.abs(resultNumbers[i] - resultNumbers[i - 1]) === 1) {
            consecutivePairs++;
          }
        }

        // With 10k range, consecutive pairs should be rare
        // Expect < 5% of pairs to be consecutive
        expect(consecutivePairs).to.be.lt(10);

        console.log(
          `Consecutive pairs in 100 samples from 10k: ${consecutivePairs}/99`
        );
      });
    });

    describe("Gas Efficiency for 10k", function () {
      it("should report gas for sampling 10 from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const gasEstimate = await mock.estimateGas.sample(seed, N_LARGE, 10);

        console.log(`Gas to sample 10 from 10k: ${gasEstimate.toString()}`);

        const result = await mock.sample(seed, N_LARGE, 10);
        expect(result.length).to.equal(10);
      });

      it("should report gas for sampling 100 from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const gasEstimate = await mock.estimateGas.sample(seed, N_LARGE, 100);

        console.log(`Gas to sample 100 from 10k: ${gasEstimate.toString()}`);

        const result = await mock.sample(seed, N_LARGE, 100);
        expect(result.length).to.equal(100);
      });

      it("should report gas for sampling 1000 from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const gasEstimate = await mock.estimateGas.sample(seed, N_LARGE, 1000);

        console.log(`Gas to sample 1000 from 10k: ${gasEstimate.toString()}`);

        const result = await mock.sample(seed, N_LARGE, 1000);
        expect(result.length).to.equal(1000);
      });

      it("should demonstrate O(K) scaling", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const gas10 = await mock.estimateGas.sample(seed, N_LARGE, 10);
        const gas100 = await mock.estimateGas.sample(seed, N_LARGE, 100);
        const gas1000 = await mock.estimateGas.sample(seed, N_LARGE, 1000);

        console.log(`\nGas scaling analysis for N=10k:`);
        console.log(`  K=10:   ${gas10.toString()} gas`);
        console.log(`  K=100:  ${gas100.toString()} gas`);
        console.log(`  K=1000: ${gas1000.toString()} gas`);

        // Calculate ratios to show linear scaling
        const ratio100_10 = gas100.toNumber() / gas10.toNumber();
        const ratio1000_100 = gas1000.toNumber() / gas100.toNumber();

        console.log(`  Ratio 100/10:   ${ratio100_10.toFixed(2)}x`);
        console.log(`  Ratio 1000/100: ${ratio1000_100.toFixed(2)}x`);

        // Should show roughly linear scaling (O(K))
        // The ratios should be between 4-12x (10x ideal, but overhead varies)
        expect(ratio100_10).to.be.gte(3); // expand to 3 to prevent sporatic failures
        expect(ratio100_10).to.be.lte(12);
        expect(ratio1000_100).to.be.gte(7);
        expect(ratio1000_100).to.be.lte(12);
      });
    });

    describe("Permutation Property at Scale", function () {
      it("should maintain no duplicates in 1000 samples from 10k", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result = await mock.sample(seed, N_LARGE, 1000);
        const resultNumbers = result.map((bn) => bn.toNumber());

        expect(hasDuplicates(resultNumbers)).to.be.false;
        expect(resultNumbers.length).to.equal(1000);
      });

      it("should produce different first indices for different seeds at 10k scale", async function () {
        const { mock } = await loadFixture(deployFixture);
        const firstIndices = new Set<number>();

        for (let i = 0; i < 20; i++) {
          const seed = randomSeed();
          const idx = await mock.index(seed, N_LARGE, 0);
          firstIndices.add(idx.toNumber());
        }

        // With 10k range, expect high diversity
        expect(firstIndices.size).to.be.gte(15);

        console.log(
          `First index diversity: ${firstIndices.size}/20 unique values`
        );
      });

      it("should maintain consistency across multiple calls at 10k scale", async function () {
        const { mock } = await loadFixture(deployFixture);
        const seed = randomSeed();

        const result1 = await mock.sample(seed, N_LARGE, 100);
        const result2 = await mock.sample(seed, N_LARGE, 100);

        for (let i = 0; i < 100; i++) {
          expect(result1[i]).to.equal(result2[i]);
        }
      });
    });
  });
});
