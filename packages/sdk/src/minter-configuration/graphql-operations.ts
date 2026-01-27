import { graphql } from "../generated/gql";

export const getProjectMinterConfigurationQueryDocument = graphql(
  /* GraphQL */ `
    query GetProjectMinterConfiguration($projectId: String!, $chainId: Int!) {
      projects_metadata(
        where: { id: { _eq: $projectId }, chain_id: { _eq: $chainId } }
        limit: 1
      ) {
        chain_id
        project_id
        user_is_artist

        contract {
          user_is_allowlisted
          minter_filter {
            type
            address
            globally_allowed_minters {
              address
              minter_type
              type {
                label
                unversioned_type
                version_number
              }
            }
          }
        }
        minter_configuration {
          currency_address
          currency_symbol
          ...ProjectMinterConfigurationDetails
        }
      }
    }

    fragment ProjectMinterConfigurationDetails on project_minter_configurations {
      id
      project_id
      base_price
      currency_address
      currency_symbol
      max_invocations
      extra_minter_details
      minter {
        address
        minter_type
        type {
          project_configuration_schema
          unversioned_type
          version_number
        }
        extra_minter_details
      }
    }
  `
);

export const getProjectMinterConfigurationUpdatesQueryDocument = graphql(
  /* GraphQL */ `
    query GetProjectMinterConfigurationUpdates(
      $projectId: String!
      $chainId: Int!
    ) {
      projects_metadata(
        where: { id: { _eq: $projectId }, chain_id: { _eq: $chainId } }
        limit: 1
      ) {
        minter_configuration {
          properties_updated_at
        }
      }
    }
  `
);

export const getProjectsMetadataUpdatesQueryDocument = graphql(/* GraphQL */ `
  query GetProjectsMetadataUpdatesQuery($projectId: String!, $chainId: Int!) {
    projects_metadata(
      where: { id: { _eq: $projectId }, chain_id: { _eq: $chainId } }
      limit: 1
    ) {
      properties_updated_at
    }
  }
`);

export const getAllowlistUploadUrlQueryDocument = graphql(/* GraphQL */ `
  query GetAllowlistUploadUrl($projectId: String!) {
    getAllowlistUploadUrl(projectId: $projectId) {
      url
      key
    }
  }
`);

export const updateOffChainExtraMinterDetailsMutationDocument = graphql(
  /* GraphQL */ `
    mutation UpdateOffChainExtraMinterDetails(
      $projectMinterConfigId: String!
      $chainId: Int!
      $extraMinterDetails: jsonb!
    ) {
      update_project_minter_configurations(
        where: {
          id: { _eq: $projectMinterConfigId }
          chain_id: { _eq: $chainId }
        }
        _append: { offchain_extra_minter_details: $extraMinterDetails }
      ) {
        returning {
          offchain_extra_minter_details
        }
      }
    }
  `
);
