import { setup, assign, fromPromise, not } from "xstate";
import { graphql } from "../../generated/index";
import { TokenDetails } from "../purchase-tracking-machine";
import { ArtBlocksClient } from "../..";

/**
 * TODO
 * - Break out actor into a function defined outside of setup
 * - Add retry logic for error while fetching token details
 * - Don't poll sansa directly in this machine
 */

const getTokenDetailsDocument = graphql(/* GraphQL */ `
  query GetTokenDetails($tokenId: String!) {
    tokens_metadata_by_pk(id: $tokenId) {
      id
      token_id
      invocation
      contract_address
      invocation
      live_view_url
      project {
        name
      }
    }
  }
`);

const POLLING_INTERVAL = 5000;

type TokenPollingMachineContext = {
  artblocksClient: ArtBlocksClient;
  tokenId?: string;
  token?: TokenDetails;
  maxRetries: number;
  retries: number;
  errorMessage?: string;
  marketplaceUrl?: string;
};

/**
 * Defines the `tokenPollingMachine` for managing the retrieval and
 * synchronization of token details post-purchase.
 *
 * This state machine is responsible for polling the backend or blockchain to
 * fetch the details of a newly minted token. It ensures that the token has been
 * properly indexed and is ready for further interaction within the application.
 * The machine handles retries, errors, and successful retrieval of token
 * details.
 *
 * ## Actors:
 * - `getTokenDetails`: A promise-based actor that fetches the token details
 *   given a `tokenId`. It uses the artblocksClient to query the for the
 *   token's metadata.
 *
 * ## Guards:
 * - `tokenSynced`: Checks if the token details have been successfully
 *   retrieved.
 * - `maxRetriesReached`: Determines if the maximum number of polling retries
 *   has been exceeded.
 *
 * ## Actions:
 * - `assignToken`: Assigns the retrieved token details to the machine's
 *   context.
 * - `incrementRetries`: Increments the retry counter each time a polling
 *   attempt fails.
 * - `assignErrorMessage`: Assigns a custom error message to the context.
 * - `assignErrorMessageFromError`: Assigns an error message based on the caught
 *   error, with a fallback for unknown errors.
 *
 * ## States:
 * - `fetchingTokenDetails`: The initial state where the machine attempts to
 *   fetch the token details.
 * - `waiting`: A state where the machine waits before retrying the fetch
 *   operation, based on a defined polling interval.
 * - `error`: A final state indicating that an error has occurred, either due to
 *   reaching the maximum number of retries or an error in fetching the token
 *   details.
 * - `complete`: A final state indicating successful retrieval of the token
 *   details.
 *
 * The machine transitions through these states based on the success or failure
 * of the `getTokenDetails` actor, the result of the `tokenSynced` guard, and
 * whether the maximum number of retries has been reached.
 *
 * ## Usage:
 * This machine is typically invoked after a token purchase transaction has been
 * confirmed, to ensure that the token details are available for the user or
 * application.
 */
export const tokenPollingMachine = setup({
  types: {
    input: {} as {
      tokenId?: string;
      artblocksClient: ArtBlocksClient;
      marketplaceUrl?: string;
    },
    context: {} as TokenPollingMachineContext,
    output: {} as { token?: TokenDetails; errorMessage?: string },
  },
  actors: {
    getTokenDetails: fromPromise(
      async ({
        input,
      }: {
        input: {
          tokenId?: string;
          artblocksClient: ArtBlocksClient;
          marketplaceUrl?: string;
        };
      }) => {
        if (!input.tokenId) {
          throw new Error("Token ID not found");
        }
        const { tokenId, artblocksClient } = input;

        const res = await artblocksClient.graphqlRequest(
          getTokenDetailsDocument,
          {
            tokenId,
          }
        );

        // Check to see if the token has been indexed by Sansa
        // before returning the token details and moving to the
        // `complete` state. If we have a marketplace URL, make
        // sure the asset exists there as well.
        if (res.tokens_metadata_by_pk && input.marketplaceUrl) {
          try {
            const asset = await getMarketplaceAsset(
              input.marketplaceUrl,
              res.tokens_metadata_by_pk.contract_address,
              res.tokens_metadata_by_pk.token_id
            );

            if (!asset) {
              return null;
            }
          } catch (error) {
            return null;
          }
        }

        return res.tokens_metadata_by_pk;
      }
    ),
  },
  guards: {
    tokenSynced: (_, { token }: { token?: TokenDetails }) => {
      return Boolean(token);
    },
    maxRetriesReached: ({ context }) => {
      return context.retries >= context.maxRetries;
    },
  },
  actions: {
    assignToken: assign({
      token: (_, params: { token?: TokenDetails }) => params.token,
    }),
    incrementRetries: assign({
      retries: ({ context }) => context.retries + 1,
    }),
    assignErrorMessage: assign({
      errorMessage: (_, params: { message: string }) => params.message,
    }),
    assignErrorMessageFromError: assign({
      errorMessage: (
        _,
        params: { error: unknown; fallbackMessage?: string }
      ) => {
        if (params.error instanceof Error) {
          return params.error.message;
        }

        return params.fallbackMessage ?? "Unknown error";
      },
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBcD2BrMA7ACqgNvgJZZQCyAhgMYAWJYAdAGZjK0lQAqG2AIqxSL5YAYgiosjEgDceDNJlwFipSu0nNW6rjyz9kg4QhmoqFZEQkBtAAwBdW3cSgADqlhELE5yAAeiAFoADgBGIIYAdhsbEIBWAE4ANhCQgBZE2IAaEABPRAAmG3iGAGYIsIiy1PjUktiAX3rshWw8Qg41Og0WNi6dRX1DUXENE0x5XTaVcmouxh7tbgGBIVhjLFkzLyxHKxCnJBA3D22ffwQAhJCGdIiEiPza-JL8oOy8hBfYhht8kMfnkF4mkIvFGs1JsoOrN6JpehwlnwVsIxBIpBs5C0lO1VDDulo+oi9Mi1iYtpYdvYrPkDq53J4KWdArEgTdEnd4hEIolUkESjF3ohauEQvF4kEgjZJfkMiUwU0QFiptD1PMCQjdINViIwAAnXWoXUMFz4cxMQ0AWwmimVuNVcMWmpJ6025gpu3sPmODO8h3OAWexTSotij0lEuFgoQCUiNkSiSCqS5wJq+W54MVkJxM3tAHdBBZSCJfLADMhGBQmOXdQAKWLRGwAShESqhdrmDHzDNIji99NOfsCIUqP1StSlQQTsUSgKjhW+1VShRKiXicfiZSCjQVWFQEDgPlb2c69D7J0Zg4uk8SsZiCWSaQyUYDEUiG5Kw7F+ViodiJS3CpHtMJ74vCpBElqwhnj6WBMhc5QlDcP4yryvKghKUZBN8LL5GmoKpCEK7hhmQEqh2XaFlA0EDqA-ohOyDD1oRzwsRuQRcnOoJvn+4oxHGRGJCRWbAXijBUKgFomqwYDURetGIOUDApGuuH5PEaZlIRUaxEuPxxM8ZSJDY-4SkJNptjmHZ6gauqyb68kIOxpQyjYf6JCUHmxMmUb8q+7EyjK9E8vECTbvUQA */
  context: ({ input }) => ({
    tokenId: input.tokenId,
    maxRetries: 100,
    retries: 0,
    marketplaceUrl: input.marketplaceUrl,
    artblocksClient: input.artblocksClient,
  }),
  id: "tokenPollingMachine",
  initial: "fetchingTokenDetails",
  states: {
    fetchingTokenDetails: {
      invoke: {
        src: "getTokenDetails",
        input: ({ context }) => ({
          tokenId: context.tokenId,
          artblocksClient: context.artblocksClient,
          marketplaceUrl: context.marketplaceUrl,
        }),
        onDone: [
          {
            target: "complete",
            actions: {
              type: "assignToken",
              params: ({ event }) => ({
                token: event.output,
              }),
            },
            guard: {
              type: "tokenSynced",
              params: ({ event }) => ({
                token: event.output,
              }),
            },
          },
          {
            target: "waiting",
            actions: "incrementRetries",
            guard: not("maxRetriesReached"),
          },
          {
            target: "error",
            actions: assign({
              errorMessage:
                "Your token has been minted but indexing is taking longer than expected",
            }),
          },
        ],
        onError: [
          {
            target: "waiting",
            actions: "incrementRetries",
            guard: not("maxRetriesReached"),
          },
          {
            target: "error",
            actions: {
              type: "assignErrorMessageFromError",
              params: ({ event }) => ({
                error: event.error,
                fallbackMessage:
                  "An error occurred while fetching token details",
              }),
            },
          },
        ],
      },
    },

    waiting: {
      after: {
        [POLLING_INTERVAL]: "fetchingTokenDetails",
      },
    },

    complete: {
      type: "final",
    },

    error: {
      type: "final",
    },
  },

  output: ({ context }) => ({
    token: context.token,
    errorMessage: context.errorMessage,
  }),
});

// TODO: Add return type
async function getMarketplaceAsset(
  marketplaceUrl: string,
  contractAddress: string,
  tokenId: string
) {
  const url = `${marketplaceUrl}/api/assets`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filters: {
        contractAddress,
        tokenId,
      },
    }),
  });
  const data = await res.json();

  return data?.data?.[0] || null;
}
