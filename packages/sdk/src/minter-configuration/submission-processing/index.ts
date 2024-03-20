import get from "lodash/get";
import set from "lodash/set";
import merge from "lodash/merge";
import { parseEther } from "viem";

import { TransformProjectMinterConfigurationFormValuesArgs } from "../types";
import { processAllowlistFileToMerkleRoot } from "./process-allowlist-file-to-merkle-root";
import { processProjectContractTokenHolderList } from "./process-project-contract-token-holder-list";
import { processAuctionDetailsToHalfLifeSeconds } from "./process-auction-details-to-half-life-seconds";

/**
 * Transforms project minter configuration form values for on-chain submission.
 * It uses the defined `schema` to determine the necessary transformations for each form value.
 * Specific field transformations include converting lists to merkle roots, adjusting ETH values to wei,
 * and transforming dates to Unix timestamps among others. The result is a set of values
 * formatted according to the requirements of the blockchain transaction.
 *
 * @param args - The arguments required for processing the form values, which include formValues and schema,
 *               along with additional necessary metadata for transformation.
 *
 * @returns An object containing the original form values merged with the transformed values,
 *          ready for on-chain transaction submission.
 *
 * @throws Will throw an error if a form value cannot be transformed according to its designated
 *         processing type in the schema, indicating a type mismatch or transformation failure.
 */
export async function processProjectMinterConfigurationFormValuesForSubmission(
  args: TransformProjectMinterConfigurationFormValuesArgs
) {
  const { formValues, schema } = args;
  let transformedFormValues: Record<string, any> = {};

  for (const [fieldName, fieldSchema] of Object.entries(
    schema.properties ?? {}
  )) {
    const formFieldValue = get(formValues, fieldName);
    if (typeof fieldSchema === "object" && fieldSchema.submissionProcessing) {
      switch (fieldSchema.submissionProcessing) {
        case "merkleRoot": {
          const merkleRoot = await processAllowlistFileToMerkleRoot(
            formFieldValue,
            args
          );
          set(transformedFormValues, fieldName, merkleRoot);
          break;
        }
        case "tokenHolderAllowlist": {
          const allowRemoveArgs = processProjectContractTokenHolderList(
            formFieldValue,
            args
          );

          transformedFormValues = merge(transformedFormValues, allowRemoveArgs);
          break;
        }
        case "ethToWei": {
          const weiValue = parseEther(`${formFieldValue}`);
          set(transformedFormValues, fieldName, weiValue);
          break;
        }
        case "datetimeToUnixTimestamp": {
          const unixTimestamp = Math.floor(
            new Date(formFieldValue as string).getTime() / 1000
          );

          set(transformedFormValues, fieldName, unixTimestamp);
          break;
        }
        case "auctionEndDatetimeToHalfLifeSeconds": {
          const halfLifeSeconds = processAuctionDetailsToHalfLifeSeconds(args);
          set(transformedFormValues, fieldName, halfLifeSeconds);
          break;
        }
      }
    } else {
      set(transformedFormValues, fieldName, formFieldValue);
    }
  }

  return removeDuplicateDotNotationKeys({
    ...formValues,
    ...transformedFormValues,
  });
}

/**
 * Checks if a given key in dot notation has a corresponding nested object.
 *
 * @param obj - The object to check.
 * @param dotNotationKey - The key in dot notation.
 * @returns A boolean indicating if a corresponding nested object exists.
 */
function hasNestedObjectForDotNotation(
  obj: Record<string, any>,
  dotNotationKey: string
): boolean {
  const parts = dotNotationKey.split(".");
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined) {
      return false;
    }
    current = current[parts[i]];
  }
  return typeof current === "object" && !Array.isArray(current);
}

/**
 * Creates a new object with keys in dot notation removed if a corresponding nested object exists.
 *
 * @param obj - The object from which to remove duplicate dot notation keys.
 * @returns A new object with the duplicates removed.
 */
function removeDuplicateDotNotationKeys(
  obj: Record<string, any>
): Record<string, any> {
  const newObj: Record<string, any> = {};

  // First, copy all values from the original object to the new object.
  Object.entries(obj).forEach(([key, value]) => {
    if (!key.includes(".")) {
      newObj[key] = value;
    }
  });

  // Then, for each key in dot notation, check if a corresponding nested object exists.
  // If it doesn't, copy the value to the new object.
  Object.keys(obj).forEach((key) => {
    if (key.includes(".") && !hasNestedObjectForDotNotation(newObj, key)) {
      // Split the key and reconstruct the nested structure in the new object.
      const parts = key.split(".");
      let current = newObj;
      for (let i = 0; i < parts.length; i++) {
        if (i === parts.length - 1) {
          current[parts[i]] = obj[key];
        } else {
          current[parts[i]] = current[parts[i]] || {};
          current = current[parts[i]];
        }
      }
    }
  });

  return newObj;
}
