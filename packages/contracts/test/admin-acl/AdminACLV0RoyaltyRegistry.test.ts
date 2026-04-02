import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
const IADMINACL_V0_INTERFACE_ID = "0xc00707bc";
const ERC165_INTERFACE_ID = "0x01ffc9a7";

describe("AdminACLV0RoyaltyRegistry", async function () {
  let deployer: SignerWithAddress;
  let newSuperAdmin: SignerWithAddress;
  let nonAdmin: SignerWithAddress;
  let adminACL: Contract;

  async function _beforeEach() {
    [deployer, newSuperAdmin, nonAdmin] = await ethers.getSigners();

    const factory = await ethers.getContractFactory(
      "AdminACLV0RoyaltyRegistry"
    );
    adminACL = await factory.connect(deployer).deploy();
  }

  describe("deployment", async function () {
    it("sets superAdmin to deployer", async function () {
      await loadFixture(_beforeEach);
      expect(await adminACL.superAdmin()).to.equal(deployer.address);
    });

    it("reports correct AdminACLType", async function () {
      await loadFixture(_beforeEach);
      expect(await adminACL.AdminACLType()).to.equal(
        "AdminACLV0RoyaltyRegistry"
      );
    });
  });

  describe("supportsInterface", async function () {
    it("supports IAdminACLV0", async function () {
      await loadFixture(_beforeEach);
      expect(
        await adminACL.supportsInterface(IADMINACL_V0_INTERFACE_ID)
      ).to.be.true;
    });

    it("supports IERC165", async function () {
      await loadFixture(_beforeEach);
      expect(await adminACL.supportsInterface(ERC165_INTERFACE_ID)).to.be.true;
    });

    it("does not support invalid interface", async function () {
      await loadFixture(_beforeEach);
      expect(await adminACL.supportsInterface("0xffffffff")).to.be.false;
    });
  });

  describe("allowed", async function () {
    it("returns true for superAdmin", async function () {
      await loadFixture(_beforeEach);
      expect(
        await adminACL.allowed(
          deployer.address,
          ADDRESS_ZERO,
          "0x00000000"
        )
      ).to.be.true;
    });

    it("returns false for non-superAdmin", async function () {
      await loadFixture(_beforeEach);
      expect(
        await adminACL.allowed(
          nonAdmin.address,
          ADDRESS_ZERO,
          "0x00000000"
        )
      ).to.be.false;
    });
  });

  describe("changeSuperAdmin", async function () {
    it("allows superAdmin to change superAdmin", async function () {
      await loadFixture(_beforeEach);
      await expect(
        adminACL
          .connect(deployer)
          .changeSuperAdmin(newSuperAdmin.address, [])
      )
        .to.emit(adminACL, "SuperAdminTransferred")
        .withArgs(deployer.address, newSuperAdmin.address, []);

      expect(await adminACL.superAdmin()).to.equal(newSuperAdmin.address);
    });

    it("reverts for non-superAdmin", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        adminACL
          .connect(nonAdmin)
          .changeSuperAdmin(newSuperAdmin.address, []),
        "Only superAdmin"
      );
    });

    it("new superAdmin can exercise admin functions", async function () {
      await loadFixture(_beforeEach);
      await adminACL
        .connect(deployer)
        .changeSuperAdmin(newSuperAdmin.address, []);

      // old superAdmin no longer authorized
      expect(
        await adminACL.allowed(
          deployer.address,
          ADDRESS_ZERO,
          "0x00000000"
        )
      ).to.be.false;

      // new superAdmin is authorized
      expect(
        await adminACL.allowed(
          newSuperAdmin.address,
          ADDRESS_ZERO,
          "0x00000000"
        )
      ).to.be.true;
    });
  });

  describe("transferOwnershipOn", async function () {
    it("reverts for non-superAdmin", async function () {
      await loadFixture(_beforeEach);
      // deploy a dummy Ownable contract to transfer
      const dummyFactory = await ethers.getContractFactory(
        "AdminACLV0RoyaltyRegistry"
      );
      const dummy = await dummyFactory.connect(deployer).deploy();

      await expectRevert(
        adminACL
          .connect(nonAdmin)
          .transferOwnershipOn(dummy.address, adminACL.address),
        "Only superAdmin"
      );
    });

    it("reverts when new admin does not support IAdminACLV0", async function () {
      await loadFixture(_beforeEach);
      // deploy a contract that supports ERC165 but not IAdminACLV0
      const overrideFactory = await ethers.getContractFactory(
        "GenArt721RoyaltyOverrideSplits"
      );
      const nonAdminACLContract = await overrideFactory
        .connect(deployer)
        .deploy(deployer.address);

      await expectRevert(
        adminACL
          .connect(deployer)
          .transferOwnershipOn(
            nonAdminACLContract.address,
            nonAdminACLContract.address
          ),
        "AdminACLV0RoyaltyRegistry: new admin ACL does not support IAdminACLV0"
      );
    });
  });

  describe("renounceOwnershipOn", async function () {
    it("reverts for non-superAdmin", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        adminACL.connect(nonAdmin).renounceOwnershipOn(ADDRESS_ZERO),
        "Only superAdmin"
      );
    });
  });

  describe("setRoyaltyLookupAddressOn", async function () {
    it("reverts for non-superAdmin", async function () {
      await loadFixture(_beforeEach);
      await expectRevert(
        adminACL
          .connect(nonAdmin)
          .setRoyaltyLookupAddressOn(
            ADDRESS_ZERO,
            ADDRESS_ZERO,
            ADDRESS_ZERO
          ),
        "Only superAdmin"
      );
    });

    // Integration test with a mock registry is covered in the fork test,
    // which exercises the real Royalty Registry contract on mainnet.
  });
});
