import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getDelegateVaults } from "./delegation";
import { Hex, PublicClient, getContract } from "viem";

// Mocking the necessary parts from viem
jest.mock("viem");

const DELEGATE_TEST_ADDRESS: Hex = "0x81c41D4405bd22A2012830870A10E26D3F740A31";
const FAKE_VAULT_ADDRESS: Hex = "0xbea796E9f85E9821d4910AE9D2bA64A24b60Aae3";
const FAKE_VAULT_ADDRESS_2: Hex = "0xC433E65449165848180779521CA99eCe75D7DB69";

// Setup function to configure the mock for getContract
const setupGetContractMock = (delegations: { vault: Hex }[]) => {
  (getContract as jest.Mock).mockReturnValue({
    read: {
      getDelegationsByDelegate: async () => delegations,
    },
  });
};

describe("getDelegateVault", () => {
  beforeEach(() => {
    // Reset the mock before each test
    jest.clearAllMocks();
  });

  it("should return the vault address when the user has delegated", async () => {
    setupGetContractMock([{ vault: FAKE_VAULT_ADDRESS }]);

    const vaults = await getDelegateVaults(
      {} as PublicClient,
      DELEGATE_TEST_ADDRESS
    );
    expect(vaults).toEqual([FAKE_VAULT_ADDRESS]);
  });

  it("returns 2 vaults when the user is a delegate for 2 vaults", async () => {
    setupGetContractMock([
      { vault: FAKE_VAULT_ADDRESS },
      { vault: FAKE_VAULT_ADDRESS_2 },
    ]);

    const vaults = await getDelegateVaults(
      {} as PublicClient,
      DELEGATE_TEST_ADDRESS
    );
    expect(vaults).toHaveLength(2);
  });

  it("should return empty array when the user has not delegated", async () => {
    setupGetContractMock([]);

    const vaults = await getDelegateVaults(
      {} as PublicClient,
      DELEGATE_TEST_ADDRESS
    );
    expect(vaults).toEqual([]);
  });
});
