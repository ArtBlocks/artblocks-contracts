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
    case "staging":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_STAGING;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_STAGING;
      break;
    case "prod":
      graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_PROD;
      hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_PROD;
      break;
    default:
      throw new Error(
        `Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be "dev", "staging", or "prod".`
      );
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
