import {
  InsertContractsMetadataDocument,
  InsertContractsMetadataMutation,
  InsertContractsMetadataMutationVariables,
  Contracts_Metadata_Insert_Input,
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
