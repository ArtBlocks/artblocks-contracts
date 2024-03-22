import { submitTransaction, mapFormValuesToArgs } from "./submit-transaction";
import { Account, PublicClient, WalletClient, TransactionReceipt } from "viem";

describe("submitTransaction", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;

  beforeEach(() => {
    publicClient = {
      simulateContract: jest.fn(),
      waitForTransactionReceipt: jest.fn(),
    } as unknown as PublicClient;
    walletClient = {
      writeContract: jest.fn(),
    } as unknown as WalletClient;
  });

  it("throws an error if no account is selected", async () => {
    await expect(
      submitTransaction({
        publicClient,
        walletClient,
        address: "0x123",
        abi: [],
        functionName: "testFunction",
        args: [],
      })
    ).rejects.toThrow("No account selected");
  });

  it("throws an error if the transaction simulation fails", async () => {
    walletClient.account = { address: "0x456" } as unknown as Account; // Simulate account selected
    (
      publicClient.simulateContract as jest.MockedFunction<
        PublicClient["simulateContract"]
      >
    ).mockRejectedValue(new Error("Simulation failed"));
    await expect(
      submitTransaction({
        publicClient,
        walletClient,
        address: "0x123",
        abi: [],
        functionName: "testFunction",
        args: [],
      })
    ).rejects.toThrow("Simulation failed");
  });

  it("submits a transaction successfully", async () => {
    walletClient.account = { address: "0x456" } as unknown as Account;
    (
      publicClient.simulateContract as jest.MockedFunction<
        PublicClient["simulateContract"]
      >
    ).mockResolvedValue({ request: {} as any, result: undefined });
    (
      walletClient.writeContract as jest.MockedFunction<
        WalletClient["writeContract"]
      >
    ).mockResolvedValue("0x789");
    (
      publicClient.waitForTransactionReceipt as jest.MockedFunction<
        PublicClient["waitForTransactionReceipt"]
      >
    ).mockResolvedValueOnce({
      status: "success",
      blockHash: "0xabc",
    } as unknown as TransactionReceipt);

    const result = await submitTransaction({
      publicClient,
      walletClient,
      address: "0x123",
      abi: [],
      functionName: "testFunction",
      args: [],
    });

    expect(result).toEqual({ hash: "0x789", blockHash: "0xabc" });
    expect(publicClient.simulateContract).toHaveBeenCalled();
    expect(walletClient.writeContract).toHaveBeenCalled();
    expect(publicClient.waitForTransactionReceipt).toHaveBeenCalled();
  });

  it("throws an error if the transaction simulation fails", async () => {
    walletClient.account = { address: "0x456" } as unknown as Account;
    (
      publicClient.simulateContract as jest.MockedFunction<
        PublicClient["simulateContract"]
      >
    ).mockRejectedValue(new Error("Simulation failed"));

    await expect(
      submitTransaction({
        publicClient,
        walletClient,
        address: "0x123",
        abi: [],
        functionName: "testFunction",
        args: [],
      })
    ).rejects.toThrow("Simulation failed");
  });

  it("throws an error if the transaction was reverted", async () => {
    walletClient.account = { address: "0x456" } as unknown as Account;
    (
      publicClient.simulateContract as jest.MockedFunction<
        PublicClient["simulateContract"]
      >
    ).mockResolvedValue({ request: {} as any, result: undefined });
    (
      walletClient.writeContract as jest.MockedFunction<
        WalletClient["writeContract"]
      >
    ).mockResolvedValue("0x789");
    (
      publicClient.waitForTransactionReceipt as jest.MockedFunction<
        PublicClient["waitForTransactionReceipt"]
      >
    ).mockResolvedValueOnce({
      status: "reverted",
      blockHash: "0xabc",
    } as unknown as TransactionReceipt);

    await expect(
      submitTransaction({
        publicClient,
        walletClient,
        address: "0x123",
        abi: [],
        functionName: "testFunction",
        args: [],
      })
    ).rejects.toThrow("Transaction reverted");
  });
});

describe("mapFormValuesToArgs", () => {
  it("correctly maps form values to arguments", () => {
    const schemaArgs = ["name", "age", "projectIndex", "coreContractAddress"];
    const formValues = { name: "John Doe", age: 30 };
    const projectIndex = 1;
    const coreContractAddress = "0x123";

    const result = mapFormValuesToArgs(
      schemaArgs,
      formValues,
      projectIndex,
      coreContractAddress
    );
    expect(result).toEqual(["John Doe", 30, 1, "0x123"]);
  });

  it("appends projectIndex and coreContractAddress when specified", () => {
    const schemaArgs = ["projectIndex", "coreContractAddress"];
    const formValues = {};
    const projectIndex = 2;
    const coreContractAddress = "0x456";

    const result = mapFormValuesToArgs(
      schemaArgs,
      formValues,
      projectIndex,
      coreContractAddress
    );
    expect(result).toEqual([2, "0x456"]);
  });

  it("handles missing form values by inserting undefined", () => {
    const schemaArgs = ["name", "age"];
    const formValues = { name: "Jane Doe" }; // Age is missing
    const projectIndex = 3; // Not used in this test
    const coreContractAddress = "0x789"; // Not used in this test

    const result = mapFormValuesToArgs(
      schemaArgs,
      formValues,
      projectIndex,
      coreContractAddress
    );
    expect(result).toEqual(["Jane Doe", undefined]);
  });

  it("correctly handles nested form values", () => {
    const schemaArgs = ["user.name", "user.age"];
    const formValues = { user: { name: "Alice", age: 28 } };
    const projectIndex = 4;
    const coreContractAddress = "0xabc";

    const result = mapFormValuesToArgs(
      schemaArgs,
      formValues,
      projectIndex,
      coreContractAddress
    );
    expect(result).toEqual(["Alice", 28]);
  });

  it("correctly handles array form values", () => {
    const schemaArgs = ["tags"];
    const formValues = { tags: ["tag1", "tag2"] };
    const projectIndex = 5; // Not used in this test
    const coreContractAddress = "0xdef"; // Not used in this test

    const result = mapFormValuesToArgs(
      schemaArgs,
      formValues,
      projectIndex,
      coreContractAddress
    );
    expect(result).toEqual([["tag1", "tag2"]]);
  });
});
