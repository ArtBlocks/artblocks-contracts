import { describe, it, expect } from "@jest/globals";

import {
  getDelegateVaults,
  getDelegationRegistryContract,
  DELEGATION_REGISTRY,
} from "./delegation";

import { ethers } from "ethers";
import { IDelegationRegistry__factory } from "../generated/contracts/factories/IDelegationRegistry__factory";

const DELEGATE_TEST_ADDRESS = "0x81c41D4405bd22A2012830870A10E26D3F740A31";
const FAKE_VAULT_ADDRESS = "0xbea796E9f85E9821d4910AE9D2bA64A24b60Aae3";
const FAKE_VAULT_ADDRESS_2 = "0xC433E65449165848180779521CA99eCe75D7DB69";

describe("getDelegationRegistryContract", () => {
  it("should get the delegation registry contract", async () => {
    // mock IDelegationRegistry__factory.connect so we can assert without making eth calls
    const mockConnect = jest.fn();
    mockConnect.mockReturnValue("mocked contract");
    IDelegationRegistry__factory.connect = mockConnect;
    const signer = new ethers.VoidSigner(DELEGATE_TEST_ADDRESS);

    // call getDelegationRegistryContract and ensure it returns the mocked contract
    const contract = getDelegationRegistryContract(DELEGATION_REGISTRY, signer);

    // assert that the correct mocked contract was returned
    expect(mockConnect).toBeCalledWith(DELEGATION_REGISTRY, signer);
    expect(contract).toEqual("mocked contract");
  });
});

describe("getDelegateVault", () => {
  it("should return the vault address when the user has delegated", async () => {
    const mockConnect = jest.fn();
    const provider = new ethers.providers.JsonRpcProvider();
    mockConnect.mockReturnValueOnce({
      getDelegationsByDelegate: async () => [{ vault: FAKE_VAULT_ADDRESS }],
    });
    IDelegationRegistry__factory.connect = mockConnect;
    const vault = await getDelegateVaults(provider, DELEGATE_TEST_ADDRESS);
    expect(vault).toEqual([FAKE_VAULT_ADDRESS]);
  });

  it("returns 2 vaults when the user is a delegate for 2 vaults", async () => {
    const mockConnect = jest.fn();
    const provider = new ethers.providers.JsonRpcProvider();
    mockConnect.mockReturnValueOnce({
      getDelegationsByDelegate: async () => [
        { vault: FAKE_VAULT_ADDRESS },
        { vault: FAKE_VAULT_ADDRESS_2 },
      ],
    });
    IDelegationRegistry__factory.connect = mockConnect;

    expect(
      await getDelegateVaults(provider, DELEGATE_TEST_ADDRESS)
    ).toHaveLength(2);
  });

  it("should return empty array when the user has not delegated", async () => {
    const mockConnect = jest.fn();
    const provider = new ethers.providers.JsonRpcProvider();
    mockConnect.mockReturnValueOnce({
      getDelegationsByDelegate: async () => [],
    });
    IDelegationRegistry__factory.connect = mockConnect;
    const vaults = await getDelegateVaults(provider, DELEGATE_TEST_ADDRESS);
    expect(vaults).toEqual([]);
  });
});
