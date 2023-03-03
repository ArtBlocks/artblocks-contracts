let graphqlAPIEndpoint, hasuraAdminSecret;
switch (process.env.NODE_ENV) {
  case "dev":
    graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_DEV;
    hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_DEV;
    break;
  case "staging":
    graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_STAGING;
    hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_STAGING;
    break;
  case "mainnet":
    graphqlAPIEndpoint = process.env.GRAPHQL_API_ENDPOINT_MAINNET;
    hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET_MAINNET;
    break;
  default:
    throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}`);
}

module.exports = {
  overwrite: true,
  schema: {
    [graphqlAPIEndpoint]: {
      headers: {
        "x-hasura-admin-secret": hasuraAdminSecret,
      },
    },
  },
  documents: ["./graphql/*.graphql"],
  generates: {
    "generated/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-urql"],
      config: {
        maybeValue: "T | null | undefined",
        scalars: {
          BigInt: "string",
          BigDecimal: "string",
          Bytes: "string",
          timestamptz: "string",
        },
        withHooks: false,
      },
    },
  },
};
