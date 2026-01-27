import {
  getMerkleRoot,
  readFileAsText,
  textOrCsvAddressListToArray,
} from "../../utils/merkle";
import { TransformProjectMinterConfigurationFormValuesArgs } from "../types";
import {
  getAllowlistUploadUrlQueryDocument,
  updateOffChainExtraMinterDetailsMutationDocument,
} from "../graphql-operations";

/**
 * Processes a given allowlist file to compute and return a Merkle root, which is
 * then stored in the database along with the file URL. It handles file validation,
 * uploading to S3, and updating off-chain minter details in the database.
 *
 * @param value - The file input value, expected to be a FileList containing the allowlist.
 * @param args - The arguments including sdk, projectId, minterConfiguration, and allowed roles.
 * @returns A promise that resolves to the computed Merkle root string.
 * @throws Error if the file is not as expected or any step of the process fails.
 */
export async function processAllowlistFileToMerkleRoot(
  value: unknown,
  args: TransformProjectMinterConfigurationFormValuesArgs
): Promise<string> {
  const {
    clientContext,
    projectId,
    project,
    minterConfiguration,
    allowedPrivilegedRolesForProject,
  } = args;

  // Expect the form value to be a FileList
  if (!(value instanceof FileList && value.length > 0)) {
    throw new Error(
      "Unexpected form value for merkle root transformation. Please provide a text or csv file."
    );
  }

  const file = value[0];
  const fileType = value[0].type;

  // Expect the file to be a text or csv file
  if (!(fileType === "text/plain" || fileType === "text/csv")) {
    throw new Error(
      "Unexpected file type for merkle root transformation. Please provide a text or csv file."
    );
  }

  // If we have an expected type convert the contents of the file to an Array
  const allowlistFileText = await readFileAsText(file);
  const allowlist = textOrCsvAddressListToArray(allowlistFileText);

  // Get upload signed s3 upload url for allowlist file
  const getAllowlistUploadUrlRes = await clientContext.graphqlClient.request(
    getAllowlistUploadUrlQueryDocument,
    {
      projectId,
    }
  );

  if (
    !getAllowlistUploadUrlRes.getAllowlistUploadUrl?.key ||
    !getAllowlistUploadUrlRes.getAllowlistUploadUrl?.url
  ) {
    throw new Error("Unexpected response from server. Please try again.");
  }

  // Get signed s3 upload url for allowlist file
  const { url } = getAllowlistUploadUrlRes.getAllowlistUploadUrl;

  try {
    // Upload allowlist file to s3 as a json file
    const res = await fetch(url, {
      method: "PUT",
      body: JSON.stringify(allowlist),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(await res.text());
      throw new Error("Unexpected error uploading allowlist file");
    }
  } catch (e) {
    console.error(e);
    throw new Error("Unexpected error uploading allowlist file");
  }

  // Generate merkle root from allowlist
  const merkleRoot = getMerkleRoot(allowlist);

  // Store the proposed merkleRoot and allowlist file url in the database
  // the pendingRoot will be confirmed once the transaction is confirmed
  // and the merkle root syncs to our db. The pendingAllowlistedAddressesLink
  // is only ever available off-chain. We save it as a pending value until
  // we can confirm the synced merkle root matches the merkle root we generated
  // from the pending list.
  // TODO: Handle error if the mutation fails
  await clientContext.graphqlClient.request(
    updateOffChainExtraMinterDetailsMutationDocument,
    {
      projectMinterConfigId: minterConfiguration.id,
      chainId: project.chain_id,
      extraMinterDetails: {
        pendingMerkleRoot: merkleRoot,
        pendingAllowlistedAddressesLink: url.split("?")[0],
      },
    },
    {
      "x-hasura-role": (() => {
        if (allowedPrivilegedRolesForProject.includes("staff")) {
          return "staff";
        } else if (allowedPrivilegedRolesForProject.includes("allowlisted")) {
          return "allowlisted";
        } else if (allowedPrivilegedRolesForProject.includes("artist")) {
          return "artist";
        } else {
          return "base_user";
        }
      })(),
    }
  );

  return merkleRoot;
}
