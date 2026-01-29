import { ethers } from "hardhat";
import { expect } from "chai";
import { MockGenArt721V3Core, MockPMP } from "../../scripts/contracts";

describe("MockGenArt721V3Core", function () {
  let mockCore: MockGenArt721V3Core;

  beforeEach(async function () {
    const MockGenArt721V3CoreFactory = await ethers.getContractFactory(
      "MockGenArt721V3Core"
    );
    mockCore =
      (await MockGenArt721V3CoreFactory.deploy()) as MockGenArt721V3Core;
    await mockCore.deployed();
  });

  describe("coreType and coreVersion", function () {
    it("returns correct core type", async function () {
      expect(await mockCore.coreType()).to.equal("GenArt721CoreV3_Engine_Flex");
    });

    it("returns correct core version", async function () {
      expect(await mockCore.coreVersion()).to.equal("v3.2.5");
    });
  });

  describe("tokenIdToHash", function () {
    it("returns deterministic hash for valid token IDs", async function () {
      // Token 0
      const hash0 = await mockCore.tokenIdToHash(0);
      expect(hash0).to.not.equal(ethers.constants.HashZero);

      // Token 1
      const hash1 = await mockCore.tokenIdToHash(1);
      expect(hash1).to.not.equal(ethers.constants.HashZero);
      expect(hash1).to.not.equal(hash0);

      // Hashes should be consistent
      const hash0Again = await mockCore.tokenIdToHash(0);
      expect(hash0Again).to.equal(hash0);
    });

    it("reverts for invalid token IDs", async function () {
      // Token 10 should not exist (only 0-9)
      await expect(mockCore.tokenIdToHash(10)).to.be.revertedWith(
        "Token does not exist"
      );
    });

    it("works for all 10 tokens", async function () {
      const hashes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const hash = await mockCore.tokenIdToHash(i);
        expect(hash).to.not.equal(ethers.constants.HashZero);
        hashes.add(hash);
      }
      // All hashes should be unique
      expect(hashes.size).to.equal(10);
    });
  });

  describe("projectScriptDetails", function () {
    it("returns correct script details for project 0", async function () {
      const details = await mockCore.projectScriptDetails(0);
      expect(details.scriptTypeAndVersion).to.equal("p5js@1.0.0");
      expect(details.aspectRatio).to.equal("1");
      expect(details.scriptCount).to.equal(1);
    });

    it("reverts for non-existent projects", async function () {
      await expect(mockCore.projectScriptDetails(1)).to.be.revertedWith(
        "Project does not exist"
      );
    });
  });

  describe("projectScriptByIndex", function () {
    it("returns script content for valid index", async function () {
      const script = await mockCore.projectScriptByIndex(0, 0);
      expect(script).to.include("createCanvas");
    });

    it("reverts for invalid script index", async function () {
      await expect(mockCore.projectScriptByIndex(0, 1)).to.be.revertedWith(
        "Script index out of bounds"
      );
    });
  });

  describe("external asset dependencies", function () {
    it("returns correct dependency count", async function () {
      const count = await mockCore.projectExternalAssetDependencyCount(0);
      expect(count).to.equal(1);
    });

    it("returns correct dependency details for ONCHAIN type", async function () {
      const dep = await mockCore.projectExternalAssetDependencyByIndex(0, 0);
      // For ONCHAIN type: cid is empty, data contains the content
      expect(dep.cid).to.equal("");
      expect(dep.data).to.equal("#web3call_contract#");
      expect(dep.dependencyType).to.equal(2); // ONCHAIN
    });
  });

  describe("gateway preferences", function () {
    it("returns correct IPFS gateway", async function () {
      const gateway = await mockCore.preferredIPFSGateway();
      expect(gateway).to.equal("https://ipfs.io/ipfs/");
    });

    it("returns correct Arweave gateway", async function () {
      const gateway = await mockCore.preferredArweaveGateway();
      expect(gateway).to.equal("https://arweave.net/");
    });
  });

  describe("admin functions", function () {
    it("can set external asset dependency bytecode address", async function () {
      const newAddress = "0x1234567890123456789012345678901234567890";
      await mockCore.setExternalAssetDependencyBytecodeAddress(0, newAddress);

      const dep = await mockCore.projectExternalAssetDependencyByIndex(0, 0);
      expect(dep.bytecodeAddress.toLowerCase()).to.equal(
        newAddress.toLowerCase()
      );
    });

    it("can add project script", async function () {
      const newScript = "function newDraw() { }";
      await mockCore.addProjectScript(newScript);

      const details = await mockCore.projectScriptDetails(0);
      expect(details.scriptCount).to.equal(2);

      const script = await mockCore.projectScriptByIndex(0, 1);
      expect(script).to.equal(newScript);
    });
  });

  describe("project metadata", function () {
    it("returns correct project details", async function () {
      const details = await mockCore.projectDetails(0);
      expect(details.projectName).to.equal("Mock Project");
      expect(details.artist).to.equal("Mock Artist");
    });

    it("returns correct project state data", async function () {
      const state = await mockCore.projectStateData(0);
      expect(state.invocations).to.equal(10);
      expect(state.maxInvocations).to.equal(10);
      expect(state.active).to.be.true;
      expect(state.paused).to.be.false;
    });
  });
});

describe("MockPMP", function () {
  let mockPMP: MockPMP;
  let mockCoreAddress: string;

  beforeEach(async function () {
    const MockPMPFactory = await ethers.getContractFactory("MockPMP");
    mockPMP = (await MockPMPFactory.deploy()) as MockPMP;
    await mockPMP.deployed();

    // Use a dummy core address for tests
    mockCoreAddress = "0x1234567890123456789012345678901234567890";
  });

  describe("getTokenParams", function () {
    it("returns params for token 0", async function () {
      const params = await mockPMP.getTokenParams(mockCoreAddress, 0);
      expect(params.length).to.equal(5);

      // Check each param
      expect(params[0].key).to.equal("color");
      expect(params[0].value).to.equal("#FF5733");

      expect(params[1].key).to.equal("size");
      expect(params[1].value).to.equal("42");

      expect(params[2].key).to.equal("enabled");
      expect(params[2].value).to.equal("true");

      expect(params[3].key).to.equal("mode");
      expect(params[3].value).to.equal("turbo");

      expect(params[4].key).to.equal("label");
      expect(params[4].value).to.equal("Mock Token Label");
    });

    it("returns empty array for non-configured tokens", async function () {
      // Token 1 is not configured
      const params1 = await mockPMP.getTokenParams(mockCoreAddress, 1);
      expect(params1.length).to.equal(0);

      // Token 99 is also not configured
      const params99 = await mockPMP.getTokenParams(mockCoreAddress, 99);
      expect(params99.length).to.equal(0);
    });
  });

  describe("write functions (no-ops)", function () {
    it("configureTokenParams does not revert", async function () {
      // This should not revert
      await expect(mockPMP.configureTokenParams(mockCoreAddress, 0, [])).to.not
        .be.reverted;
    });

    it("configureProject does not revert", async function () {
      // This should not revert
      await expect(mockPMP.configureProject(mockCoreAddress, 0, [])).to.not.be
        .reverted;
    });

    it("configureProjectHooks does not revert", async function () {
      const zeroAddress = ethers.constants.AddressZero;
      // This should not revert
      await expect(
        mockPMP.configureProjectHooks(
          mockCoreAddress,
          0,
          zeroAddress,
          zeroAddress
        )
      ).to.not.be.reverted;
    });
  });

  describe("isTokenOwnerOrDelegate", function () {
    it("always returns true", async function () {
      const [signer] = await ethers.getSigners();
      const result = await mockPMP.isTokenOwnerOrDelegate(
        signer.address,
        mockCoreAddress,
        0
      );
      expect(result).to.be.true;
    });
  });

  describe("getProjectConfig", function () {
    it("returns configured keys for project 0", async function () {
      const config = await mockPMP.getProjectConfig(mockCoreAddress, 0);
      expect(config.pmpKeys.length).to.equal(5);
      expect(config.pmpKeys[0]).to.equal("color");
      expect(config.pmpKeys[1]).to.equal("size");
      expect(config.pmpKeys[2]).to.equal("enabled");
      expect(config.pmpKeys[3]).to.equal("mode");
      expect(config.pmpKeys[4]).to.equal("label");
      expect(config.configNonce).to.equal(1);
    });

    it("returns empty config for non-existent project", async function () {
      const config = await mockPMP.getProjectConfig(mockCoreAddress, 99);
      expect(config.pmpKeys.length).to.equal(0);
      expect(config.configNonce).to.equal(0);
    });
  });

  describe("getProjectPMPConfig", function () {
    it("returns HexColor config for 'color' key", async function () {
      const config = await mockPMP.getProjectPMPConfig(
        mockCoreAddress,
        0,
        "color"
      );
      expect(config.paramType).to.equal(6); // HexColor
      expect(config.highestConfigNonce).to.equal(1);
    });

    it("returns Uint256Range config for 'size' key", async function () {
      const config = await mockPMP.getProjectPMPConfig(
        mockCoreAddress,
        0,
        "size"
      );
      expect(config.paramType).to.equal(3); // Uint256Range
      expect(config.minRange).to.equal(ethers.constants.HashZero);
      expect(config.maxRange).to.equal(
        ethers.utils.hexZeroPad(ethers.utils.hexlify(100), 32)
      );
    });

    it("returns Bool config for 'enabled' key", async function () {
      const config = await mockPMP.getProjectPMPConfig(
        mockCoreAddress,
        0,
        "enabled"
      );
      expect(config.paramType).to.equal(2); // Bool
    });

    it("returns Select config for 'mode' key with options", async function () {
      const config = await mockPMP.getProjectPMPConfig(
        mockCoreAddress,
        0,
        "mode"
      );
      expect(config.paramType).to.equal(1); // Select
      expect(config.selectOptionsLength).to.equal(3);
      expect(config.selectOptions.length).to.equal(3);
      expect(config.selectOptions[0]).to.equal("normal");
      expect(config.selectOptions[1]).to.equal("turbo");
      expect(config.selectOptions[2]).to.equal("eco");
    });

    it("returns String config for 'label' key", async function () {
      const config = await mockPMP.getProjectPMPConfig(
        mockCoreAddress,
        0,
        "label"
      );
      expect(config.paramType).to.equal(8); // String
    });

    it("returns Unconfigured for unknown key", async function () {
      const config = await mockPMP.getProjectPMPConfig(
        mockCoreAddress,
        0,
        "unknownKey"
      );
      expect(config.paramType).to.equal(0); // Unconfigured
      expect(config.highestConfigNonce).to.equal(0);
    });
  });
});

describe("MockGenArt721V3Core + MockPMP Integration", function () {
  let mockCore: MockGenArt721V3Core;
  let mockPMP: MockPMP;

  beforeEach(async function () {
    // Deploy both contracts
    const MockGenArt721V3CoreFactory = await ethers.getContractFactory(
      "MockGenArt721V3Core"
    );
    mockCore =
      (await MockGenArt721V3CoreFactory.deploy()) as MockGenArt721V3Core;
    await mockCore.deployed();

    const MockPMPFactory = await ethers.getContractFactory("MockPMP");
    mockPMP = (await MockPMPFactory.deploy()) as MockPMP;
    await mockPMP.deployed();

    // Link them together
    await mockCore.setExternalAssetDependencyBytecodeAddress(
      0,
      mockPMP.address
    );
  });

  it("core contract references PMP contract correctly", async function () {
    const dep = await mockCore.projectExternalAssetDependencyByIndex(0, 0);
    expect(dep.bytecodeAddress).to.equal(mockPMP.address);
    // For ONCHAIN type: cid is empty, data contains "#web3call_contract#"
    expect(dep.cid).to.equal("");
    expect(dep.data).to.equal("#web3call_contract#");
  });

  it("can get token params through PMP using core address", async function () {
    const params = await mockPMP.getTokenParams(mockCore.address, 0);
    expect(params.length).to.equal(5);
    expect(params[0].key).to.equal("color");
  });

  it("simulates full e2e flow", async function () {
    // 1. Get token hash from core
    const tokenHash = await mockCore.tokenIdToHash(0);
    expect(tokenHash).to.not.equal(ethers.constants.HashZero);

    // 2. Get project script details
    const scriptDetails = await mockCore.projectScriptDetails(0);
    expect(scriptDetails.scriptCount).to.be.gt(0);

    // 3. Get external asset dependencies
    const depCount = await mockCore.projectExternalAssetDependencyCount(0);
    expect(depCount).to.be.gt(0);

    // 4. Get the PMP dependency
    const dep = await mockCore.projectExternalAssetDependencyByIndex(0, 0);
    expect(dep.dependencyType).to.equal(2); // ONCHAIN

    // 5. Use the PMP address to get token params
    const pmpAddress = dep.bytecodeAddress;
    expect(pmpAddress).to.equal(mockPMP.address);

    const params = await mockPMP.getTokenParams(mockCore.address, 0);
    expect(params.length).to.equal(5);
  });
});
