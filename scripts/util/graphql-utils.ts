import {
  ContractMetadataUpdateInfoFragment,
  InsertContractsMetadataDocument,
  InsertContractsMetadataMutation,
  InsertContractsMetadataMutationVariables,
  Contracts_Metadata_Insert_Input,
  Contract_Type_Names_Enum,
} from "../../generated/graphql";
import { Client } from "urql/core";
import { getClient } from "./graphql-client-utils";

export const syncContractBucketAndType = async (
  contractAddress: string,
  bucketName: string,
  contractType: Contract_Type_Names_Enum,
  client?: Client
): Promise<InsertContractsMetadataMutation> => {
  if (client === undefined) {
    client = getClient();
  }
  const contract_metadatas: ContractMetadataUpdateInfoFragment[] = [
    {
      address: contractAddress.toLowerCase(),
      bucket_name: bucketName,
      contract_type: contractType,
    },
  ];
  console.log(`Upserting ${contract_metadatas.length} contracts`);

  const contractsMetadataInsertInput = contract_metadatas.map(
    (contract_metadata) => {
      return generateContractsMetadataInputFromContractsMetadata(
        contract_metadata
      );
    }
  );

  console.log("Contracts metadata upsert input", contractsMetadataInsertInput);
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
    console.log(`Successfully upserted ${contract_metadatas.length} contracts`);
    return insertContractsMetadataRes.data;
  }
};

const generateContractsMetadataInputFromContractsMetadata = (
  contract_metadata: ContractMetadataUpdateInfoFragment
): Contracts_Metadata_Insert_Input => {
  const contractsMetadataInsertInput: Contracts_Metadata_Insert_Input = {
    address: contract_metadata.address,
    bucket_name: contract_metadata.bucket_name,
    contract_type: contract_metadata.contract_type,
  };

  return contractsMetadataInsertInput;
};
