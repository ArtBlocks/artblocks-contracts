import { Client, cacheExchange, fetchExchange } from "urql/core";
import fetch from "node-fetch";

const getEndpointAndAdminSecret = (): {
  graphqlAPIEndpoint: string;
  hasuraAdminSecret: string;
} => {
  let graphqlAPIEndpoint: string = "";
  let hasuraAdminSecret: string = "";
  switch (process.env.NODE_ENV) {
    case "dev":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_DEV;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_DEV;
      break;
    case "arbitrum-dev":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_ARBITRUM_DEV;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_ARBITRUM_DEV;
      break;
    case "arbitrum-staging":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_ARBITRUM_STAGING;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_ARBITRUM_STAGING;
      break;
    case "arbitrum":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_ARBITRUM_MAINNET;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_ARBITRUM_MAINNET;
      break;
    case "staging":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_STAGING;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_STAGING;
      break;
    case "mainnet":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_MAINNET;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_MAINNET;
      break;
    case "base":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_BASE_MAINNET;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_BASE_MAINNET;
      break;
    default:
      throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}`);
  }
  return { graphqlAPIEndpoint, hasuraAdminSecret };
};

export const getClient = (): Client => {
  const { graphqlAPIEndpoint, hasuraAdminSecret } = getEndpointAndAdminSecret();
  const client = new Client({
    url: graphqlAPIEndpoint,
    fetch: fetch as any,
    fetchOptions: {
      headers: {
        "x-hasura-admin-secret": hasuraAdminSecret,
      },
    },
    exchanges: [cacheExchange, fetchExchange],
  });
  return client;
};
