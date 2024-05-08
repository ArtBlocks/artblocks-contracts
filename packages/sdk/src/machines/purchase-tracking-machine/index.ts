import { setup, assign, fromPromise, enqueueActions, emit } from "xstate";
import { GetTokenDetailsQuery } from "../../generated/graphql";
import { Hex, parseEventLogs } from "viem";
import { iGenArt721CoreContractV3BaseAbi } from "../../../abis/iGenArt721CoreContractV3BaseAbi";
import { tokenPollingMachine } from "../purchase-tracking-manager-machine/token-polling-machine";
import { getMessageFromError } from "../utils";
import { ArtBlocksClient } from "../..";

/**
 * TODO
 * - No inline actions/guards
 * - Break out actor into a function defined outside of setup
 * - Add description fields to states and transitions
 */

/**
 * Token details pulled from Hasura after a token has been minted.
 */
export type TokenDetails = GetTokenDetailsQuery["tokens_metadata_by_pk"];

export type PurchaseTrackingMachineContext = {
  artblocksClient: ArtBlocksClient;
  purchaseTransactionHash: Hex;
  mintedTokenId?: string;
  mintedToken?: TokenDetails;
  errorMessage?: string;
};

export const purchaseTrackingMachine = setup({
  types: {
    input: {} as {
      purchaseTransactionHash: Hex;
      artblocksClient: ArtBlocksClient;
      marketplaceUrl?: string;
    },
    context: {} as PurchaseTrackingMachineContext,
    emitted: {} as
      | { type: "awaitingPurchaseConfirmations" }
      | { type: "awaitingTokenSync" }
      | { type: "tokenReady"; token: TokenDetails }
      | { type: "error"; errorMessage: string },
  },
  actors: {
    awaitPurchaseConfirmations: fromPromise(
      async ({
        input,
      }: {
        input: {
          artblocksClient: ArtBlocksClient;
          purchaseTransactionHash: Hex;
        };
      }) => {
        const { purchaseTransactionHash, artblocksClient } = input;
        const publicClient = artblocksClient.getPublicClient();

        if (!publicClient) {
          throw new Error("Public client not found");
        }

        try {
          const txReceipt = await publicClient.waitForTransactionReceipt({
            hash: purchaseTransactionHash,
            confirmations: 1,
          });

          if (txReceipt.status === "reverted") {
            throw new Error("Purchase transaction reverted");
          }

          const events = parseEventLogs({
            logs: txReceipt.logs,
            abi: iGenArt721CoreContractV3BaseAbi,
            eventName: "Mint",
          });
          const mintEvent = events[0];

          if (!mintEvent) {
            throw new Error("Mint event not found");
          }

          const mintedTokenId = `${mintEvent.address.toLowerCase()}-${
            mintEvent.args._tokenId
          }`;
          return mintedTokenId;
        } catch (e) {
          if (e instanceof Error) {
            throw new Error(
              `Purchase transaction reverted with error: ${e.message}`
            );
          }

          throw new Error("Purchase transaction failed with unknown error");
        }
      }
    ),
    tokenPollingMachine,
  },
  actions: {
    assignMintedTokenId: assign({
      mintedTokenId: (_, params: { mintedTokenId: string }) =>
        params.mintedTokenId,
    }),
    assignMintedToken: assign({
      mintedToken: (_, params: { mintedToken: TokenDetails }) =>
        params.mintedToken,
    }),
    assignErrorMessageFromError: assign({
      errorMessage: (
        _,
        params: { error: unknown; fallbackMessage?: string }
      ) => {
        return getMessageFromError(params.error, params.fallbackMessage);
      },
    }),
    assignErrorMessage: assign({
      errorMessage: (_, params: { errorMessage?: string }) =>
        params.errorMessage,
    }),
  },
  guards: {
    tokenFound: (_, { mintedToken }: { mintedToken: TokenDetails }) =>
      Boolean(mintedToken),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAnAxgCwIazABV1dMBrASwDsoBZU7asAOlwHdcKAXaqABQw58YAMIB7KgDMK6ALa4eEgMQQJLagDcxZFmix4CxUpRr0cTVh268B+4eKkz5iqgk1jMCihIDaABgBdfwDEFDFYawlQkAAPRABaAE4AFmTmAHYADgAmAEZMzIA2IoBmXL90gBoQAE9EZLLmROzM5NyS1MLEivT0gF8+6r0hQxJyXjNGKhZ2Th4aWxHRCWk5L2UwdHQxdGZkABsFSR3ZPcEDIjGTOgYLWesF8-sVp3XXd08XYODo5HDIqjROIIJKpZi5XJtRLddIAVhy8OqdQQeVyzGyFRKsPSLRKJT8zWyAyGT1Gxgmt2mljmvEI2jAVAAyjUqJgVGpmO4dGc7GTxqZKTMrPMoHSdEyWZg3FQtJ9vFRvoFfv8XECEtlmB1YX5IVkCSUEVVavVGs1Wu1OjDEsSQMMLkZ+TdzFT7iKxQzmaz2VSubpSZdyQLnUKaTR3RLWdLZW9vrkQkhbSr5WqUZr8XDetluok4e0kYhUejMdjcfjCQNBiAqGIIHBfv6HddJkxlRFVQngfF2plYcxCskc+lkj2-LDYcl8whcnk+5kSs1ugae-jcja7cJGxTg9SHvx-Q5Vs5kwm-m3j6BO+0Suk+wPesPtWOJ8aEG1Ck0-APCrkx4VP-2SjXBsri3KYQ13cNPUwVsARTeJYWyDUf3abJhxKPIMMnN8PwHZptUydJ8lQoDeQDR1mypLh6SoAAlMBcAgZEwjPKIO0QbU-CaApYQtVIs2SWEsKzHDoT8Ippx-XoSKWTcgzA5hNm2dAYPbC8EmHDVMhSVIUi6McSkKQSXwxRJwTnRIOi6dJvxxWEKz6IA */
  id: "purchaseTrackingMachine",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    purchaseTransactionHash: input.purchaseTransactionHash,
  }),
  initial: "awaitingPurchaseConfirmation",
  states: {
    awaitingPurchaseConfirmation: {
      entry: emit({ type: "awaitingPurchaseConfirmations" }),
      invoke: {
        src: "awaitPurchaseConfirmations",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          purchaseTransactionHash: context.purchaseTransactionHash,
        }),
        onDone: {
          target: "awaitingTokenSync",
          actions: [
            {
              type: "assignMintedTokenId",
              params: ({ event }) => ({
                mintedTokenId: event.output,
              }),
            },
          ],
        },
        onError: {
          target: "error",
          actions: {
            type: "assignErrorMessageFromError",
            params: ({ event }) => ({
              error: event.error,
            }),
          },
        },
      },
    },
    awaitingTokenSync: {
      entry: emit({ type: "awaitingTokenSync" }),
      invoke: {
        src: "tokenPollingMachine",
        input: ({ context }) => ({
          tokenId: context.mintedTokenId,
          artblocksClient: context.artblocksClient,
        }),
        onDone: [
          {
            target: "tokenReady",
            actions: {
              type: "assignMintedToken",
              params: ({ event }) => ({
                mintedToken: event.output.token,
              }),
            },
            guard: {
              type: "tokenFound",
              params: ({ event }) => ({
                mintedToken: event.output.token,
              }),
            },
          },
          {
            target: "error",
            actions: {
              type: "assignErrorMessage",
              params: ({ event }) => ({
                errorMessage: event.output.errorMessage,
              }),
            },
          },
        ],
      },
    },
    tokenReady: {
      entry: enqueueActions(({ context, enqueue }) => {
        if (context.mintedToken) {
          enqueue.emit({
            type: "tokenReady",
            token: context.mintedToken,
          });
        }
      }),
    },
    error: {
      entry: emit(({ context }) => ({
        type: "error",
        errorMessage: context.errorMessage ?? "Unknown error",
      })),
    },
  },
});
