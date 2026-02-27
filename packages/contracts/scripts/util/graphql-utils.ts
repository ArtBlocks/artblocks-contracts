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
  chainId: number,
  defaultVerticalName?: string,
  client?: Client
): Promise<InsertContractsMetadataMutation> => {
  if (client === undefined) {
    client = getClient();
  }
  console.log(`Upserting 1 contract (chain_id: ${chainId})...`);
  const contractsMetadataInsertInput: Contracts_Metadata_Insert_Input = {
    address: contractAddress.toLowerCase(),
    chain_id: chainId,
    name: contractName,
    bucket_name: bucketName,
    default_vertical_name: defaultVerticalName || "unassigned",
  };
  console.log(
    `Contracts metadata upsert input:\n${JSON.stringify(
      contractsMetadataInsertInput,
      null,
      2
    )}`
  );
  const insertContractsMetadataRes = await client
    .mutation<
      InsertContractsMetadataMutation,
      InsertContractsMetadataMutationVariables
    >(InsertContractsMetadataDocument, {
      contractsMetadata: contractsMetadataInsertInput,
    })
    .toPromise();

  if (insertContractsMetadataRes.error || !insertContractsMetadataRes.data) {
    console.log(
      `Error upserting contracts: ${insertContractsMetadataRes.error}`
    );
    throw insertContractsMetadataRes.error;
  } else {
    console.log(`Successfully upserted 1 contract`);
    return insertContractsMetadataRes.data;
  }
};

export const syncProjectMetadataAfterDeploy = async (
  contractAddress: string,
  projectId: number,
  artistAddress: string,
  chainId: number,
  verticalName?: string,
  client?: Client
): Promise<InsertProjectsMetadataMutation> => {
  if (client === undefined) {
    client = getClient();
  }
  console.log(`Upserting 1 project (chain_id: ${chainId})...`);
  const projectsMetadataInsertInput: Projects_Metadata_Insert_Input = {
    id: `${contractAddress.toLowerCase()}-${projectId}`,
    chain_id: chainId,
    contract_address: contractAddress.toLowerCase(),
    project_id: projectId.toString(),
    artist_address: artistAddress.toLowerCase(),
    vertical_name: verticalName || "unassigned",
  };
  console.log(
    `Projects metadata upsert input:\n${JSON.stringify(
      projectsMetadataInsertInput,
      null,
      2
    )}`
  );
  const insertProjectsMetadataRes = await client
    .mutation<
      InsertProjectsMetadataMutation,
      InsertProjectsMetadataMutationVariables
    >(InsertProjectsMetadataDocument, {
      projectsMetadata: projectsMetadataInsertInput,
    })
    .toPromise();

  if (insertProjectsMetadataRes.error || !insertProjectsMetadataRes.data) {
    console.log(`Error upserting project: ${insertProjectsMetadataRes.error}`);
    throw insertProjectsMetadataRes.error;
  } else {
    console.log(`Successfully upserted 1 project`);
    return insertProjectsMetadataRes.data;
  }
};
