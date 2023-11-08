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

  return { ...formValues, ...transformedFormValues };
}
