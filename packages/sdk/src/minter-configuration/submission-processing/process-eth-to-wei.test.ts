import { Hex, parseUnits, PublicClient, zeroAddress } from "viem";
import { processEthToWei } from "./process-eth-to-wei";
import { generateTransformProjectMinterConfigurationFormValuesArgs } from "./test-helpers";

// Mock the PublicClient
const mockReadContract = jest.fn();
const mockPublicClient = {
  readContract: mockReadContract,
} as unknown as PublicClient;

describe("processEthToWei", () => {
  let args = generateTransformProjectMinterConfigurationFormValuesArgs();

  beforeEach(() => {
    jest.clearAllMocks();
    args = generateTransformProjectMinterConfigurationFormValuesArgs();
    args.sdk.publicClient = mockPublicClient;
  });

  it("should throw an error if value is not a string, number, or bigint", async () => {
    await expect(processEthToWei([], args)).rejects.toThrow(
      "Value must be a string, number, or bigint to convert to wei"
    );
  });

  it("should parse the value with 18 decimals if currency_address is zero address", async () => {
    args.minterConfiguration.currency_address = zeroAddress;
    const result = await processEthToWei("1.23", args);

    expect(result).toEqual(parseUnits("1.23", 18));
  });

  it("should fetch currency decimals and parse the value accordingly", async () => {
    const currencyAddress: Hex = "0x1234567890123456789012345678901234567890";
    const decimals = 6;
    args.minterConfiguration.currency_address = currencyAddress;

    // Mock the readContract function to return the desired decimals
    mockReadContract.mockResolvedValue(decimals);

    const result = await processEthToWei("1.23", args);

    expect(mockReadContract).toHaveBeenCalledWith({
      address: currencyAddress,
      abi: expect.any(Array),
      functionName: "decimals",
    });
    expect(result).toEqual(parseUnits("1.23", decimals));
  });

  it("should fall back to 18 decimals if fetching currency decimals fails", async () => {
    const currencyAddress = "0x1234567890123456789012345678901234567890" as Hex;
    args.minterConfiguration.currency_address = currencyAddress;

    // Mock the readContract function to throw an error
    mockReadContract.mockRejectedValue(new Error("Failed to fetch decimals"));

    const result = await processEthToWei("1.23", args);

    expect(mockReadContract).toHaveBeenCalledWith({
      address: currencyAddress,
      abi: expect.any(Array),
      functionName: "decimals",
    });
    expect(result).toEqual(parseUnits("1.23", 18));
  });
});
