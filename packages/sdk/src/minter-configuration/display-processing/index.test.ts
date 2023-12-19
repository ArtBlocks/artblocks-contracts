import { processValueForDisplay } from "./index";

describe("processValueForDisplay", () => {
  it("should convert wei to ether correctly", () => {
    const value = "1000000000000000000"; // 1 ether in wei
    const result = processValueForDisplay(value, "weiToEth");
    expect(result).toEqual(1);
  });

  it("should convert unix timestamp to datetime correctly", () => {
    const value = "1633640400"; // corresponds to 2021-10-07T21:00:00.000Z
    const result = processValueForDisplay(value, "unixTimestampToDatetime");
    expect(result).toEqual("2021-10-07T21:00:00.000Z");
  });

  it("should return the current datetime for undefined or null values with unixTimestampToDatetime", () => {
    const fixedDate = new Date("2022-01-01T00:00:00Z");
    jest
      .spyOn(global, "Date")
      .mockImplementation(() => fixedDate as unknown as Date);

    const value = undefined;
    const result = processValueForDisplay(value, "unixTimestampToDatetime");

    expect(result).toEqual(fixedDate.toISOString());

    // Remember to clear the mock after the test
    jest.spyOn(global, "Date").mockRestore();
  });

  it("should return an empty string for undefined or null values with weiToEth", () => {
    const value = undefined;
    const result = processValueForDisplay(value, "weiToEth");
    expect(result).toEqual("");
  });

  it("should throw an error for incompatible value type with weiToEth", () => {
    const value = { some: "object" };
    expect(() => processValueForDisplay(value, "weiToEth")).toThrow();
  });

  it("should throw an error for incompatible value type with unixTimestampToDatetime", () => {
    const value = { some: "object" };
    expect(() =>
      processValueForDisplay(value, "unixTimestampToDatetime")
    ).toThrow();
  });

  it("should return the value as is for undefined displayProcessing", () => {
    const value = "some value";
    const result = processValueForDisplay(value);
    expect(result).toEqual(value);
  });
});
