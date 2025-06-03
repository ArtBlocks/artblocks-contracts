import { setup, assign, enqueueActions, ActorRefFrom } from "xstate";
import { ReceiptSettlementDataFragment } from "../../generated/graphql";
import { receiptPollingMachine } from "./receipt-polling-machine";
import { excessSettlementFundsClaimMachine } from "../excess-settlement-funds-claim-machine";
import { ArtBlocksClient } from "../..";

/**
 * TODO
 * - No inline actions/guards
 * - Add description fields to states and transitions
 * - Use shared web3 events type
 */

export type ExcessSettlementFundsManagerMachineEvent =
  | {
      type: "ART_BLOCKS_CLIENT_UPDATED";
      artblocksClient: ArtBlocksClient;
    }
  | {
      type: "RECEIPTS_FETCHED";
      receipts: ReceiptSettlementDataFragment[];
    }
  | {
      type: "EXCESS_SETTLEMENT_FUNDS_CLAIMED";
      receiptId: string;
    };

export type ExcessSettlementFundsManagerMachineContext = {
  artblocksClient: ArtBlocksClient;
  claimMachines?: Map<
    string,
    ActorRefFrom<typeof excessSettlementFundsClaimMachine>
  >;
};

export const excessSettlementFundsManagerMachine = setup({
  types: {
    input: {} as Pick<
      ExcessSettlementFundsManagerMachineContext,
      "artblocksClient"
    >,
    context: {} as ExcessSettlementFundsManagerMachineContext,
    events: {} as ExcessSettlementFundsManagerMachineEvent,
  },
  actors: {
    receiptPollingMachine,
    excessSettlementFundsClaimMachine,
  },
  actions: {
    assignArtblocksClient: assign({
      artblocksClient: (_, params: { artblocksClient: ArtBlocksClient }) =>
        params.artblocksClient,
    }),
  },
  guards: {
    hasClaimableExcessSettlementFunds: (
      _,
      { receipts }: { receipts: ReceiptSettlementDataFragment[] }
    ) => {
      return receipts.length > 0;
    },
    walletClientAvailable: (
      _,
      { artblocksClient }: { artblocksClient: ArtBlocksClient }
    ) => {
      return Boolean(artblocksClient.getWalletClient());
    },
    walletClientUnavailable: (
      _,
      { artblocksClient }: { artblocksClient: ArtBlocksClient }
    ) => {
      return !artblocksClient.getWalletClient();
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgB4GM6wMpgC64BswBbMAO1wDEBXMiWAWQEMymYAnZtACwEsywAYgCiADQDCwrFgD6WYQBUFAGWENhAOQUzKAVQ0ARWeOUBBAJLqDAbQAMAXUSgADgHtYvXL1dknIFIgAjLYArCEAdADsAGwATJG2ACwAnGGx0RkANCAAnogAtADMtsnhsclxKcm2kQAcIYWFiQC+zdmoGLDYeIQk5FS09MysHFx8AuFMaGiutLi6rABuTLwETABGRIKmAEraAELKAPLiANLGyuaa2roACgamCsI2Dn5uHl4+fgEI+anhiRC8RiiUS0Sa0VsgWyeV+-xSkWCTUKwVstRKrXa6EwOHwRFIFBodEYLDYYE4U3GYEm01mFAWTGWqw2W12B2OZwuVy0MjuDyeNkCjiQIHenm8vhFP3y0USAMKiIaiUK6QasViMKCtli4UCgVioXRsRVyXKkUx4GxXVxvQJA2JwzJFJ4-GpBF4sFw5H4UEornYOzAGF4zlwsG2exkhxO5xkJm5N3uj2edmFLnc4q+UsQtT1ANqtUKDSatjRhVqmrhtQBIWCyuiFVs0UihQtHRxPXx-SJQ1Jo0prvC7s93rIvv9geDofDO2EknMtwUskoinEAAkU68RWLPpLQD8whFarEQrKDSiSnrKy2yqfooEG4DC7Fla02iAyK4IHA-O3rZ2+kJQYSRGckxldN4M13b4CgVWxdUKaJj3iRICzLSt8kCepwlSOsGmPEI0ViNsrW6PFAPtXtQOdKkaRmOYGSZNZNjASCPglGDfhVHVAkQ5DIlQ9FC0rRpAnCWpZUiMIMmiU8sJIzoyNtbtgMdfsXQmYcvTIH0-QDIMwBDMM2MzPd-EQFJqwEpDTWKSIW2NSIMIqcJtVCeJkiNWoKmiN9miAA */
  id: "excessSettlementFundsManagerMachine",
  initial: "accountUnavailable",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
  }),
  on: {
    EXCESS_SETTLEMENT_FUNDS_CLAIMED: {
      actions: enqueueActions(({ event, context, enqueue }) => {
        const { claimMachines = new Map() } = context;
        const updatedClaimMachines = new Map(claimMachines);
        const { receiptId } = event;
        if (claimMachines.has(receiptId)) {
          enqueue.stopChild(receiptId);
          updatedClaimMachines.delete(receiptId);
        }

        enqueue.assign({ claimMachines: updatedClaimMachines });
      }),
    },
  },
  states: {
    accountUnavailable: {
      on: {
        ART_BLOCKS_CLIENT_UPDATED: [
          {
            target: "listeningForReceipts",
            guard: {
              type: "walletClientAvailable",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
            actions: {
              type: "assignArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
          },
          {
            actions: {
              type: "assignArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
          },
        ],
      },
    },
    listeningForReceipts: {
      entry: enqueueActions(({ context, enqueue }) => {
        const { artblocksClient } = context;

        const walletClient = artblocksClient.getWalletClient();
        const publicClient = artblocksClient.getPublicClient();

        if (!walletClient || !publicClient) {
          return;
        }

        enqueue.spawnChild("receiptPollingMachine", {
          id: "receiptPollingMachine",
          systemId: "receiptPollingMachine",
          input: {
            artblocksClient,
          },
        });
      }),
      on: {
        ART_BLOCKS_CLIENT_UPDATED: {
          target: "accountUnavailable",
          guard: {
            type: "walletClientUnavailable",
            params: ({ event }) => ({
              artblocksClient: event.artblocksClient,
            }),
          },
          actions: [
            {
              type: "assignArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
            enqueueActions(({ context, enqueue }) => {
              enqueue.stopChild("receiptPollingMachine");

              const {
                claimMachines = new Map<
                  string,
                  ActorRefFrom<typeof excessSettlementFundsClaimMachine>
                >(),
              } = context;
              claimMachines.forEach((_, id) => {
                enqueue.stopChild(id);
              });

              enqueue.assign({ claimMachines: new Map() });
            }),
          ],
        },
        RECEIPTS_FETCHED: [
          {
            actions: enqueueActions(({ event, enqueue, context }) => {
              const {
                claimMachines = new Map<
                  string,
                  ActorRefFrom<typeof excessSettlementFundsClaimMachine>
                >(),
                artblocksClient,
              } = context;
              const walletClient = artblocksClient.getWalletClient();
              const publicClient = artblocksClient.getPublicClient();

              const updatedClaimMachines = new Map(claimMachines);

              if (!publicClient || !walletClient) {
                enqueue.assign({
                  claimMachines: updatedClaimMachines,
                });
                return;
              }

              const receipts = event.receipts;

              // Convert receipts to a map for easier lookup
              const receiptsMap = new Map(
                receipts.map((receipt) => [receipt.id, receipt])
              );

              // Remove claim machines that are not in the new receipts list
              // and are in the idle state. The machine will send a message
              // to the parent machine when it is done, so we can remove it.
              claimMachines.forEach((claimMachine, id) => {
                const snapshot = claimMachine.getSnapshot();
                if (!receiptsMap.has(id) && snapshot.matches("idle")) {
                  enqueue.stopChild(id);
                  updatedClaimMachines.delete(id);
                }
              });

              // Add new machines for receipts not already in claimMachines
              receipts.forEach((receipt) => {
                if (!claimMachines.has(receipt.id)) {
                  enqueue.assign({
                    claimMachines: ({ spawn }) => {
                      const claimMachine = spawn(
                        "excessSettlementFundsClaimMachine",
                        {
                          id: receipt.id,
                          systemId: receipt.id,
                          input: {
                            receipt,
                            artblocksClient,
                          },
                        }
                      );

                      updatedClaimMachines.set(receipt.id, claimMachine);
                      return updatedClaimMachines;
                    },
                  });
                }
              });
            }),
          },
        ],
      },
    },
  },
});
