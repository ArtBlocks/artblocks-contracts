import { processAuctionDetailsToHalfLifeSeconds } from "./process-auction-details-to-half-life-seconds";
import { generateTransformProjectMinterConfigurationFormValuesArgs } from "./test-helpers";

describe("processAuctionDetailsToHalfLifeSeconds", () => {
  it("calculates half life seconds correctly", () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        extra_minter_details: {
          startTime: new Date("2022-01-01T00:00:00Z").toISOString(),
          approximateDAExpEndTime: new Date(
            "2022-01-02T00:00:00Z"
          ).toISOString(),
          startPrice: "2",
        },
        base_price: "1",
      },
    });

    const result = processAuctionDetailsToHalfLifeSeconds(args);

    expect(result).toBe("86400"); // 24 hours in seconds
  });

  it("throws an error if form values are not as expected", () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        extra_minter_details: {
          startTime: new Date("2022-01-01T00:00:00Z").toISOString(),
          approximateDAExpEndTime: new Date(
            "2022-01-02T00:00:00Z"
          ).toISOString(),
          startPrice: { some: "object" },
        },
        base_price: "1",
      },
    });

    expect(() => processAuctionDetailsToHalfLifeSeconds(args)).toThrow(
      "Unexpected form value for auction details."
    );
  });
});
