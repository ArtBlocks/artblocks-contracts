import { Client, cacheExchange, fetchExchange } from "urql/core";
import { fetch as undiciFetch } from "undici";

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
    // Hardhat replaces global fetch with node-fetch v2, which throws
    // ERR_STREAM_PREMATURE_CLOSE on gzipped Hasura Cloud responses.
    fetch: undiciFetch as unknown as typeof fetch,
    fetchOptions: {
      headers: {
        "x-hasura-admin-secret": hasuraAdminSecret,
        "accept-encoding": "identity",
      },
    },
    exchanges: [cacheExchange, fetchExchange],
  });
  return client;
};
