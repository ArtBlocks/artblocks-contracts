import difference from "lodash/difference";
import { TransformProjectMinterConfigurationFormValuesArgs } from "../types";

type RemoveHoldersOfProjectArgs = {
  ownedNFTAddressesRemove: string[];
  ownedNFTProjectIdsRemove: string[];
};

type AllowHoldersOfProjectsArgs = {
  ownedNFTAddressesAdd: string[];
  ownedNFTProjectIdsAdd: string[];
};

export function processProjectContractTokenHolderList(
  value: unknown,
  args: TransformProjectMinterConfigurationFormValuesArgs
): AllowHoldersOfProjectsArgs & RemoveHoldersOfProjectArgs {
  const { minterConfiguration } = args;

  // Expect the form value to be an array of strings
  if (!Array.isArray(value) || !value.every((val) => typeof val === "string")) {
    throw new Error("Unexpected form value for token holder allowlist.");
  }

  const currentlyAllowedProjectIds: string[] =
    minterConfiguration.extra_minter_details.allowlistedAddressAndProjectId ??
    [];
  const updatedAllowedProjectIds = value;

  // Expect the list to be submitted as a single array of strings of the formate
  // <contract address>-<project index>. This is the format of project ids in our db.
  const addedProjectIds: string[] = difference(
    updatedAllowedProjectIds,
    currentlyAllowedProjectIds
  );

  const removedProjectIds: string[] = difference(
    currentlyAllowedProjectIds,
    updatedAllowedProjectIds
  );

  const addArgs = addedProjectIds.reduce<AllowHoldersOfProjectsArgs>(
    (acc, id) => {
      const [contractAddress, projectIndex] = id.split("-");
      return {
        ownedNFTAddressesAdd: [...acc.ownedNFTAddressesAdd, contractAddress],
        ownedNFTProjectIdsAdd: [...acc.ownedNFTProjectIdsAdd, projectIndex],
      };
    },
    {
      ownedNFTAddressesAdd: [],
      ownedNFTProjectIdsAdd: [],
    } as AllowHoldersOfProjectsArgs
  );

  // Split both add and remove lists into split arrays one for the
  // contract address and one for project index (id on the contract)
  const removeArgs = removedProjectIds.reduce<RemoveHoldersOfProjectArgs>(
    (acc, id) => {
      const [contractAddress, projectIndex] = id.split("-");
      return {
        ownedNFTAddressesRemove: [
          ...acc.ownedNFTAddressesRemove,
          contractAddress,
        ],
        ownedNFTProjectIdsRemove: [
          ...acc.ownedNFTProjectIdsRemove,
          projectIndex,
        ],
      };
    },
    {
      ownedNFTAddressesRemove: [],
      ownedNFTProjectIdsRemove: [],
    } as RemoveHoldersOfProjectArgs
  );

  return {
    ...removeArgs,
    ...addArgs,
  };
}
