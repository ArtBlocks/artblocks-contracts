import { Hex, getContract } from "viem";
import { fromPromise, setup, assign, sendParent } from "xstate";
import { isUserRejectedError } from "../utils";
import {
  GetReceiptQuery,
  ReceiptSettlementDataFragment,
} from "../../generated/graphql";
import { iSharedMinterDAExpSettlementV0Abi } from "../../../abis/iSharedMinterDAExpSettlementV0Abi";
import { graphql } from "../../generated/index";
import { ArtBlocksClient } from "../..";

/**
 * TODO
 * - No inline actions/guards
 * - Break out actors into a functions defined outside of setup
 * - Revisit error handling
 */

const getReceiptDocument = graphql(/* GraphQL */ `
  query GetReceipt($id: String!) {
    receipt_metadata_by_pk(id: $id) {
      id
      excess_settlement_funds
    }
  }
`);

const SYNC_POLLING_INTERVAL = 5000;

type ExcessSettlementFundsClaimMachineContext = {
  artblocksClient: ArtBlocksClient;
  receipt: ReceiptSettlementDataFragment;
  txHash?: Hex;
};

// TODO: Improve error handling
export const excessSettlementFundsClaimMachine = setup({
  types: {
    input: {} as Pick<
      ExcessSettlementFundsClaimMachineContext,
      "receipt" | "artblocksClient"
    >,
    context: {} as ExcessSettlementFundsClaimMachineContext,
    events: { type: "INITIATE_CLAIM" },
  },
  actors: {
    initiateExcessSettlementFundsClaim: fromPromise(
      async ({
        input: { receipt, artblocksClient },
      }: {
        input: {
          receipt: ReceiptSettlementDataFragment;
          artblocksClient: ArtBlocksClient;
        };
      }): Promise<Hex> => {
        const walletClient = artblocksClient.getWalletClient();
        const publicClient = artblocksClient.getPublicClient();

        if (!publicClient) {
          throw new Error("Public client is not available");
        }

        if (!walletClient?.account) {
          throw new Error("Wallet client is not connected to an account");
        }

        const minter = getContract({
          abi: iSharedMinterDAExpSettlementV0Abi,
          address: receipt.minter.address as Hex,
          client: {
            public: publicClient,
            wallet: walletClient,
          },
        });

        const { request } =
          await minter.simulate.reclaimProjectExcessSettlementFunds(
            [
              BigInt(receipt.project.index as number),
              receipt.project.contract_address as Hex,
            ],
            {
              account: walletClient.account.address,
            }
          );

        const txHash = await walletClient.writeContract(request);
        return txHash;
      }
    ),
    awaitClaimConfirmations: fromPromise(
      async ({
        input: { txHash, artblocksClient },
      }: {
        input: { txHash?: Hex; artblocksClient: ArtBlocksClient };
      }) => {
        const publicClient = artblocksClient.getPublicClient();

        if (!publicClient) {
          throw new Error("Public client is not available");
        }

        if (!txHash) {
          throw new Error("Transaction hash is unavailable");
        }

        await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
      }
    ),
    fetchReceipt: fromPromise(
      async ({
        input: { receipt, artblocksClient },
      }: {
        input: {
          receipt: ReceiptSettlementDataFragment;
          artblocksClient: ArtBlocksClient;
        };
      }) => {
        const res = await artblocksClient.graphqlRequest(getReceiptDocument, {
          id: receipt.id,
        });

        return res.receipt_metadata_by_pk;
      }
    ),
  },
  guards: {
    hasExcessSettlementFunds: (
      _,
      { receipt }: { receipt: GetReceiptQuery["receipt_metadata_by_pk"] }
    ) => {
      if (receipt?.excess_settlement_funds === "0") {
        return false;
      }

      return true;
    },
    isUserRejectedError: (_, { error }: { error: unknown }) => {
      return isUserRejectedError(error);
    },
  },
  actions: {
    assignTxHash: assign({
      txHash: (_, params: { txHash: Hex }) => params.txHash,
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiASQDlaAVWgQSYFEB9AYQBlWtALIBtAAwBdRKAAOAe1i4ALrjn5pIAB6IAtAFYAHADYSBgCxmjATgMAmAOxijZpwBoQAT0R6zJMWdsARls9Iz0xA0MQgF9o9zQsPEJSAmVcdBV8KFgeCnRcVGoINTAyfAA3OQBrUoScAmIytIyCbNz81AQCSswWtXEJAY15RRU1DW0EAGYxKxJbA0CrWynbKyWjAys9dy8EHXtbPztIq3sAwPCxPVj4jHrkppUWrJy8guowACcvuS+SGR5JQAMz+qBIdSSjVSz0ybXenW6cl6Y3wAyGSBAIzS40xkzMU1M9kCWym5gcQQM9h2nkQDgMJBsZkCEQMBhmYimXNuIEhDRS+GacLeHU+Pz+AKBoK+4L5jxh6WF7QKXQqyL6aMkIkCUkx2NRE0QhxIemCegc2ymgSmPlsu0QAV85pcC3CekcZnsPLljXQAHd8nDlageGpgbgZRrYEUSmVKjUIfcoaR-YHWsHQ-hw5HUbBVT0NejJMMFDj1HjEIFAkZ7CanLZrvZVpFrPb9lW5s7-EY1norDaAt6k-ySKm0lkM2GIxhc2Lfv9ARlpbLh48x0GEZnszPVPg80iUbui7rZKWDRWEPZjQTPetrJcjGJAm2pnNrUYNlMLttbEYh4kR2BMAlAeKAACUwEwMBcBkJQY0IONqlqVdGiAkCknAyDoNg-N1VRY8S1GXdDQQJYrxIAkG0cMRiUCT0jDbFk9EZSIXBvM4q2cf8HlQ4DQIgqCYLg4oEKRBMfVIND+KwoTcMPfotR1QiyxIlYG3mbYxGuYJ7GMKY2x0a1CTWLkuTMU06L0KYvTiXkUMkviMIE7C4O+edJSXMFEwAx4pKcmScIPQstWLPUz2Ii93zmKkVksBsLC-Gk9kWeYZh7KsLOtWwzG45MSADccoGoTRYCUDJSnQYElG+ZArjEIhqAk-K0yyDFTyI3FQEmEkvxIK9-G2KtrIWO1aXbbK+vCOwrx8RYzCsP9bKaty-mK0rytHKqapZLSGuW8UvjarFws6rRdCMZwSFfV8wi-GYZmfMa+0CEgqxJFZq1mc0DFykdYAAV0wKDYGjEqyuqzbqq+ZAG12xr7JIAGgbgWAjv1CKurpLZOxcPR3XmmwbQMqxfGu5lqx8AIths2z8DkCA4A0CTlPPTH9gWo4rLsVYfwWIx9LGnQ1L6iJZk5DlstCX75UoMAWYxs72bok0yTU3m9LbHw-AuKZnHWFYScWu4fOhQVYVaEUCnl07JkMpZTDJFkrAWnn1jbAl5i0gx-BWYlDDEGIloR9d003Kcc13eAwo68s2epBkQmCfxdbMcxFgMuinWyrSvyrcyvyNuyTYc9DWmcoTrdjxXLnCEgwgW0J7H7X37AziwTWzzlyfzyxpcaAq4Ur1S6MJEmLGz4k7AYwXrV8JueasoIe0fKY+9IFaviHi8FmV-wlnmtPDgcTXVlezOwifR9Ih+oPi8RwHgaj9qVO372Xt0gPnDx4IuTb5iG0WAHa4PZZjcliNEIAA */
  initial: "idle",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    receipt: input.receipt,
  }),
  states: {
    idle: {
      on: {
        INITIATE_CLAIM: "initiatingsClaim",
      },
    },
    initiatingsClaim: {
      invoke: {
        src: "initiateExcessSettlementFundsClaim",
        input: ({ context: { receipt, artblocksClient } }) => ({
          receipt,
          artblocksClient,
        }),
        onDone: {
          target: "awaitingClaimConfirmations",
          actions: {
            type: "assignTxHash",
            params({ event }) {
              return { txHash: event.output };
            },
          },
        },
        onError: [
          {
            target: "idle",
            guard: {
              type: "isUserRejectedError",
              params({ event }) {
                return {
                  error: event.error,
                };
              },
            },
          },
          {
            target: "error",
          },
        ],
      },
    },
    awaitingClaimConfirmations: {
      invoke: {
        src: "awaitClaimConfirmations",
        input: ({ context: { txHash, artblocksClient } }) => ({
          txHash,
          artblocksClient,
        }),
        onDone: "fetchingReceipt",
        onError: "error",
      },
    },
    fetchingReceipt: {
      invoke: {
        src: "fetchReceipt",
        input: ({ context: { receipt, artblocksClient } }) => ({
          receipt,
          artblocksClient,
        }),
        onDone: [
          {
            target: "waiting",
            guard: {
              type: "hasExcessSettlementFunds",
              params({ event }) {
                return {
                  receipt: event.output,
                };
              },
            },
          },
          {
            target: "success",
          },
        ],
        onError: "error",
      },
    },
    waiting: {
      after: {
        [SYNC_POLLING_INTERVAL]: "fetchingReceipt",
      },
    },
    error: {
      after: {
        1000: "idle",
      },
    },
    success: {
      after: {
        2000: {
          actions: sendParent(({ context }) => {
            return {
              type: "EXCESS_SETTLEMENT_FUNDS_CLAIMED",
              receiptId: context.receipt.id,
            };
          }),
        },
      },
    },
  },
});
