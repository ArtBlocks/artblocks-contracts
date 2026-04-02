import helpers = require("@nomicfoundation/hardhat-network-helpers");
import { expect } from "chai";
import { ethers } from "hardhat";

const FORK_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const FORK_BLOCK_NUMBER = 24792290;

// Mainnet addresses
const V0_CORE = "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a";
const V1_CORE = "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270";
const V3_CORE = "0x99a9B7c1116f9ceEB1652de04d5969CcE509B069";

const ROYALTY_REGISTRY_PROXY = "0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D";
const CURRENT_ADMIN_ACL_V1 = "0x18b18cF97a3D8BCC43f8D1Df282CebA85f717C82";

// IArtblocksRoyaltyOverride interface ID
const ROYALTY_OVERRIDE_INTERFACE_ID = "0x9ca7dc7a";

// Royalty Registry ABI (only the functions we need)
const ROYALTY_REGISTRY_ABI = [
  "function getRoyaltyLookupAddress(address tokenAddress) external view returns (address)",
  "function setRoyaltyLookupAddress(address tokenAddress, address royaltyLookupAddress) external returns (bool)",
  "function overrideAllowed(address tokenAddress) external view returns (bool)",
];

// Minimal ABI for reading admin/owner/superAdmin
const CORE_ABI = [
  "function admin() external view returns (address)",
  "function owner() external view returns (address)",
];

const ADMIN_ACL_ABI = [
  "function superAdmin() external view returns (address)",
  "function transferOwnershipOn(address _contract, address _newAdminACL) external",
  "function getNumPaymentApprovers() external view returns (uint256)",
];

describe("Royalty Override Splitter Migration - Mainnet Fork [ @skip-on-coverage ]", async function () {
  before(async function () {
    if (!FORK_URL) {
      this.skip();
    }
    await helpers.reset(FORK_URL, FORK_BLOCK_NUMBER);
  });

  after(async function () {
    await helpers.reset();
  });

  describe("pre-migration state verification", async function () {
    it("V0 core admin() returns an EOA", async function () {
      const v0Core = new ethers.Contract(V0_CORE, CORE_ABI, ethers.provider);
      const admin = await v0Core.admin();
      expect(admin).to.not.equal(ethers.constants.AddressZero);
      // verify it's not a contract (EOA)
      const code = await ethers.provider.getCode(admin);
      expect(code).to.equal("0x");
    });

    it("V1 core admin() returns an EOA", async function () {
      const v1Core = new ethers.Contract(V1_CORE, CORE_ABI, ethers.provider);
      const admin = await v1Core.admin();
      expect(admin).to.not.equal(ethers.constants.AddressZero);
      const code = await ethers.provider.getCode(admin);
      expect(code).to.equal("0x");
    });

    it("V3 core admin() returns AdminACLV1", async function () {
      const v3Core = new ethers.Contract(V3_CORE, CORE_ABI, ethers.provider);
      const admin = await v3Core.admin();
      expect(admin).to.equal(CURRENT_ADMIN_ACL_V1);
    });

    it("AdminACLV1 superAdmin is accessible", async function () {
      const adminAcl = new ethers.Contract(
        CURRENT_ADMIN_ACL_V1,
        ADMIN_ACL_ABI,
        ethers.provider
      );
      const superAdmin = await adminAcl.superAdmin();
      expect(superAdmin).to.not.equal(ethers.constants.AddressZero);
    });
  });

  describe("full migration simulation", async function () {
    it("executes complete migration for all three core contracts", async function () {
      // --- Read current mainnet state ---
      const v0Core = new ethers.Contract(V0_CORE, CORE_ABI, ethers.provider);
      const v1Core = new ethers.Contract(V1_CORE, CORE_ABI, ethers.provider);
      const v3Core = new ethers.Contract(V3_CORE, CORE_ABI, ethers.provider);
      const royaltyRegistry = new ethers.Contract(
        ROYALTY_REGISTRY_PROXY,
        ROYALTY_REGISTRY_ABI,
        ethers.provider
      );
      const currentAdminAcl = new ethers.Contract(
        CURRENT_ADMIN_ACL_V1,
        ADMIN_ACL_ABI,
        ethers.provider
      );

      const v0Admin = await v0Core.admin();
      const v1Admin = await v1Core.admin();
      const v3SuperAdmin = await currentAdminAcl.superAdmin();

      // --- Phase 1: Deploy new contracts ---

      // Deploy GenArt721RoyaltyOverrideSplits with a local deployer as owner
      // (in prod, owner would be the multisig)
      const [localDeployer] = await ethers.getSigners();

      const overrideFactory = await ethers.getContractFactory(
        "GenArt721RoyaltyOverrideSplits"
      );
      const newShim = await overrideFactory
        .connect(localDeployer)
        .deploy(localDeployer.address);

      // Deploy AdminACLV0RoyaltyRegistry
      const adminAclFactory = await ethers.getContractFactory(
        "AdminACLV0RoyaltyRegistry"
      );
      const newAdminACL = await adminAclFactory.connect(localDeployer).deploy();
      // transfer superAdmin to the real V3 superAdmin (multisig)
      await newAdminACL
        .connect(localDeployer)
        .changeSuperAdmin(v3SuperAdmin, [V3_CORE]);

      expect(await newAdminACL.superAdmin()).to.equal(v3SuperAdmin);

      // Verify new shim supports correct interface
      expect(
        await newShim.supportsInterface(ROYALTY_OVERRIDE_INTERFACE_ID)
      ).to.be.true;

      // --- Phase 2: Configure royalty splitters ---

      // Use localDeployer as a stand-in splitter address for testing
      const testSplitterAddress = localDeployer.address;
      const testBps = 750;

      // Configure a sample project on each core contract
      await newShim
        .connect(localDeployer)
        .setRoyaltyConfig(V0_CORE, 0, testSplitterAddress, testBps);
      await newShim
        .connect(localDeployer)
        .setRoyaltyConfig(V1_CORE, 0, testSplitterAddress, testBps);
      await newShim
        .connect(localDeployer)
        .setRoyaltyConfig(V3_CORE, 0, testSplitterAddress, testBps);

      // Verify configs are set
      const v0Config = await newShim.royaltyConfigs(V0_CORE, 0);
      expect(v0Config.splitter).to.equal(testSplitterAddress);
      expect(v0Config.bps).to.equal(testBps);

      // Verify getRoyalties works for a token on project 0
      const v0Royalties = await newShim.getRoyalties(V0_CORE, 0);
      expect(v0Royalties.recipients_[0]).to.equal(testSplitterAddress);
      expect(v0Royalties.bps[0]).to.equal(testBps);

      // Verify unconfigured project reverts
      await expect(newShim.getRoyalties(V0_CORE, 1_000_000)).to.be.revertedWith(
        "No royalty configured"
      );

      // --- Phase 3: V0 and V1 — Update Royalty Registry ---

      // Impersonate V0 admin and fund with ETH for gas
      const impersonatedV0Admin =
        await ethers.getImpersonatedSigner(v0Admin);
      await ethers.provider.send("hardhat_setBalance", [
        v0Admin,
        "0x8AC7230489E80000", // 10 ETH
      ]);

      // Verify override is allowed for V0 admin
      expect(
        await royaltyRegistry
          .connect(impersonatedV0Admin)
          .overrideAllowed(V0_CORE)
      ).to.be.true;

      // Set royalty lookup address for V0
      await royaltyRegistry
        .connect(impersonatedV0Admin)
        .setRoyaltyLookupAddress(V0_CORE, newShim.address);
      expect(await royaltyRegistry.getRoyaltyLookupAddress(V0_CORE)).to.equal(
        newShim.address
      );

      // Impersonate V1 admin
      const impersonatedV1Admin =
        await ethers.getImpersonatedSigner(v1Admin);
      await ethers.provider.send("hardhat_setBalance", [
        v1Admin,
        "0x8AC7230489E80000",
      ]);

      // Set royalty lookup address for V1
      await royaltyRegistry
        .connect(impersonatedV1Admin)
        .setRoyaltyLookupAddress(V1_CORE, newShim.address);
      expect(await royaltyRegistry.getRoyaltyLookupAddress(V1_CORE)).to.equal(
        newShim.address
      );

      // --- Phase 4: V3 — AdminACL Migration + Royalty Registry ---

      // Impersonate V3 superAdmin (multisig)
      const impersonatedSuperAdmin =
        await ethers.getImpersonatedSigner(v3SuperAdmin);
      await ethers.provider.send("hardhat_setBalance", [
        v3SuperAdmin,
        "0x8AC7230489E80000",
      ]);

      // Step 4.2: Transfer V3 core ownership from AdminACLV1 to new AdminACL
      await currentAdminAcl
        .connect(impersonatedSuperAdmin)
        .transferOwnershipOn(V3_CORE, newAdminACL.address);

      // Verify ownership transferred
      expect(await v3Core.owner()).to.equal(newAdminACL.address);
      expect(await v3Core.admin()).to.equal(newAdminACL.address);

      // Verify superAdmin on new AdminACL is still the multisig
      expect(await newAdminACL.superAdmin()).to.equal(v3SuperAdmin);

      // Step 4.3: Use new AdminACL to set royalty lookup for V3
      // The royalty registry checks IArtBlocks(tokenAddress).admin() == msg.sender
      // newAdminACL is now admin() of V3, so this should pass
      await newAdminACL
        .connect(impersonatedSuperAdmin)
        .setRoyaltyLookupAddressOn(
          ROYALTY_REGISTRY_PROXY,
          V3_CORE,
          newShim.address
        );
      expect(await royaltyRegistry.getRoyaltyLookupAddress(V3_CORE)).to.equal(
        newShim.address
      );

      // --- Phase 5: Post-migration verification ---

      // All three core contracts point to the new shim
      expect(await royaltyRegistry.getRoyaltyLookupAddress(V0_CORE)).to.equal(
        newShim.address
      );
      expect(await royaltyRegistry.getRoyaltyLookupAddress(V1_CORE)).to.equal(
        newShim.address
      );
      expect(await royaltyRegistry.getRoyaltyLookupAddress(V3_CORE)).to.equal(
        newShim.address
      );

      // Royalties return correct values for configured projects
      for (const coreAddr of [V0_CORE, V1_CORE, V3_CORE]) {
        const royalties = await newShim.getRoyalties(coreAddr, 0);
        expect(royalties.recipients_.length).to.equal(1);
        expect(royalties.recipients_[0]).to.equal(testSplitterAddress);
        expect(royalties.bps[0]).to.equal(testBps);
      }

      // --- Verify AdminACL migration is reversible ---

      // Roll back V3 core ownership to original AdminACLV1
      await newAdminACL
        .connect(impersonatedSuperAdmin)
        .transferOwnershipOn(V3_CORE, CURRENT_ADMIN_ACL_V1);

      expect(await v3Core.admin()).to.equal(CURRENT_ADMIN_ACL_V1);
      expect(await v3Core.owner()).to.equal(CURRENT_ADMIN_ACL_V1);

      // Re-migrate forward to confirm full round-trip works
      await currentAdminAcl
        .connect(impersonatedSuperAdmin)
        .transferOwnershipOn(V3_CORE, newAdminACL.address);

      expect(await v3Core.admin()).to.equal(newAdminACL.address);
    });
  });
});
