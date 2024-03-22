import { ProjectMinterConfigurationDetailsFragment } from "../../generated/graphql";
import { processProjectContractTokenHolderList } from "./process-project-contract-token-holder-list";
import { generateTransformProjectMinterConfigurationFormValuesArgs } from "./test-helpers";

describe("processProjectContractTokenHolderList", () => {
  it("processes the token holder list correctly", () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      minterConfiguration: {
        extra_minter_details: {
          allowlistedAddressAndProjectId: ["0x123-1", "0x456-2"],
        },
      } as unknown as ProjectMinterConfigurationDetailsFragment,
    });

    const value = ["0x123-1", "0x789-3"];

    const result = processProjectContractTokenHolderList(value, args);

    expect(result).toEqual({
      ownedNFTAddressesAdd: ["0x789"],
      ownedNFTProjectIdsAdd: ["3"],
      ownedNFTAddressesRemove: ["0x456"],
      ownedNFTProjectIdsRemove: ["2"],
    });
  });

  it("processes the token holder list correctly if not previously set", () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      minterConfiguration: {
        extra_minter_details: {},
      } as unknown as ProjectMinterConfigurationDetailsFragment,
    });

    const value = ["0x123-1", "0x789-3"];

    const result = processProjectContractTokenHolderList(value, args);

    expect(result).toEqual({
      ownedNFTAddressesAdd: ["0x123", "0x789"],
      ownedNFTProjectIdsAdd: ["1", "3"],
      ownedNFTAddressesRemove: [],
      ownedNFTProjectIdsRemove: [],
    });
  });

  it("throws an error if the input is not an array of strings", () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      minterConfiguration: {
        extra_minter_details: {
          allowlistedAddressAndProjectId: ["0x123-1", "0x456-2"],
        },
      } as unknown as ProjectMinterConfigurationDetailsFragment,
    });

    const value = ["0x123-1", 123];

    expect(() => processProjectContractTokenHolderList(value, args)).toThrow(
      "Unexpected form value for token holder allowlist."
    );
  });
});
