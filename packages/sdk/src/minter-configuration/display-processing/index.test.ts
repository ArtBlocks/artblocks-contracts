import { PublicClient, zeroAddress } from "viem";
import { processValueForDisplay } from "./index";
import { ProjectMinterConfigurationDetailsFragment } from "../../generated/graphql";

function generateArgs(value: any, displayProcessing?: string) {
  return {
    value,
    displayProcessing,
    minterConfiguration: {
      currency_address: zeroAddress,
    } as ProjectMinterConfigurationDetailsFragment,
    publicClient: {
      readContract: jest.fn(),
    } as unknown as PublicClient,
  };
}

describe("processValueForDisplay", () => {
  it("should convert wei to ether correctly", async () => {
    const value = "1000000000000000000"; // 1 ETH in wei
    const args = generateArgs(value, "weiToEth");
    const result = await processValueForDisplay(args);
    expect(result).toEqual(1);
  });

  it("should convert ERC20 display unit to base unit", async () => {
    const value = "1000000"; // 1 ETH in wei
    const decimals = 6;
    const args = generateArgs(value, "weiToEth");
    const currencyAddress = "0x1234567890123456789012345678901234567890";
    args.minterConfiguration.currency_address = currencyAddress;

    args.publicClient.readContract = jest.fn().mockResolvedValue(decimals);
    const result = await processValueForDisplay(args);
    expect(result).toEqual(1);
  });

  it("should convert unix timestamp to datetime correctly", async () => {
    const value = "1633640400"; // corresponds to 2021-10-07T21:00:00.000Z
    const args = generateArgs(value, "unixTimestampToDatetime");
    const result = await processValueForDisplay(args);
    expect(result).toEqual("2021-10-07T21:00:00.000Z");
  });

  it("should return the current datetime for undefined or null values with unixTimestampToDatetime", async () => {
    const fixedDate = new Date("2022-01-01T00:00:00Z");
    jest
      .spyOn(global, "Date")
      .mockImplementation(() => fixedDate as unknown as Date);

    const value = undefined;
    const args = generateArgs(value, "unixTimestampToDatetime");
    const result = await processValueForDisplay(args);

    expect(result).toEqual(fixedDate.toISOString());

    // Remember to clear the mock after the test
    jest.spyOn(global, "Date").mockRestore();
  });

  it("should return an empty string for undefined or null values with weiToEth", async () => {
    const value = undefined;
    const args = generateArgs(value, "weiToEth");
    const result = await processValueForDisplay(args);
    expect(result).toEqual("");
  });

  it("should throw an error for incompatible value type with weiToEth", async () => {
    const value = { some: "object" };
    const args = generateArgs(value, "weiToEth");

    await expect(processValueForDisplay(args)).rejects.toThrow();
  });

  it("should throw an error for incompatible value type with unixTimestampToDatetime", async () => {
    const value = { some: "object" };
    const args = generateArgs(value, "unixTimestampToDatetime");
    await expect(processValueForDisplay(args)).rejects.toThrow();
  });

  it("should return the value as is for undefined displayProcessing", async () => {
    const value = "some value";
    const args = generateArgs(value);
    const result = await processValueForDisplay(args);
    expect(result).toEqual(value);
  });
});
