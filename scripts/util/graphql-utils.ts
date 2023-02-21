import {
  InsertContractsMetadataDocument,
  InsertContractsMetadataMutation,
  InsertContractsMetadataMutationVariables,
  Contracts_Metadata_Insert_Input,
  Projects_Metadata_Insert_Input,
  InsertProjectsMetadataMutation,
  InsertProjectsMetadataMutationVariables,
  InsertProjectsMetadataDocument,
} from "../../generated/graphql";
import { Client } from "urql/core";
import { getClient } from "./graphql-client-utils";

export const syncContractMetadataAfterDeploy = async (
  contractAddress: string,
  contractName: string,
  bucketName: string,
  defaultVerticalName?: string,
  client?: Client
): Promise<InsertContractsMetadataMutation> => {
  if (client === undefined) {
    client = getClient();
  }
  console.log(`Upserting 1 contract...`);
  const contractsMetadataInsertInput: Contracts_Metadata_Insert_Input = {
    address: contractAddress,
    name: contractName,
    bucket_name: bucketName,
    default_vertical_name: defaultVerticalName || "unassigned",
  };
  console.log("Contracts metadata upsert input", contractsMetadataInsertInput);
  // upsert contract metadata
  const insertContractsMetadataRes = await client
    .mutation<
      InsertContractsMetadataMutation,
      InsertContractsMetadataMutationVariables
    >(InsertContractsMetadataDocument, {
      contractsMetadata: contractsMetadataInsertInput,
    })
    .toPromise();

  if (insertContractsMetadataRes.error || !insertContractsMetadataRes.data) {
    console.error(
      `Error upserting contracts`,
      insertContractsMetadataRes.error
    );
    throw insertContractsMetadataRes.error;
  } else {
    console.log(`Successfully upserted 1 contract`);
    return insertContractsMetadataRes.data;
  }
};

// This is generally used to update the vertical name of a project after deployment
export const syncProjectMetadataAfterDeploy = async (
  contractAddress: string,
  projectId: number,
  artistAddress: string,
  verticalName?: string,
  client?: Client
): Promise<InsertProjectsMetadataMutation> => {
  if (client === undefined) {
    client = getClient();
  }
  console.log(`Upserting 1 project...`);
  const projectsMetadataInsertInput: Projects_Metadata_Insert_Input = {
    id: `${contractAddress.toLowerCase()}-${projectId}`,
    contract_address: contractAddress.toLowerCase(),
    artist_address: artistAddress.toLowerCase(),
    vertical_name: verticalName || "unassigned",
  };
  console.log("Projects metadata upsert input", projectsMetadataInsertInput);
  // upsert project metadata
  const insertProjectsMetadataRes = await client
    .mutation<
      InsertProjectsMetadataMutation,
      InsertProjectsMetadataMutationVariables
    >(InsertProjectsMetadataDocument, {
      projectsMetadata: projectsMetadataInsertInput,
    })
    .toPromise();

  if (insertProjectsMetadataRes.error || !insertProjectsMetadataRes.data) {
    console.error(`Error upserting projects`, insertProjectsMetadataRes.error);
    throw insertProjectsMetadataRes.error;
  } else {
    console.log(`Successfully upserted 1 project`);
    return insertProjectsMetadataRes.data;
  }
};
