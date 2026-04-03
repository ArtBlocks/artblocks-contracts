import { setup, assign, enqueueActions, ActorRefFrom } from "xstate";
import { receiptPollingMachine } from "./receipt-polling-machine";
import {
  excessSettlementFundsClaimMachine,
  ExcessSettlementFundsClaimMachineEvents,
} from "../excess-settlement-funds-claim-machine";
import { ArtBlocksClient } from "../..";
import { ReceiptSettlementDataFragment } from "../../generated/graphql";

/**
 * TODO
 * - No inline actions/guards
 * - Add description fields to states and transitions
 * - Use shared web3 events type
 */

const DEFAULT_RECEIPT_POLLING_INTERVAL = 60000;

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
  receiptPollingInterval: number;
};

export const excessSettlementFundsManagerMachine = setup({
  types: {
    input: {} as Pick<
      ExcessSettlementFundsManagerMachineContext,
      "artblocksClient"
    > & { receiptPollingInterval?: number },
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
    restartReceiptPollingMachine: enqueueActions(({ context, enqueue }) => {
      const { artblocksClient, receiptPollingInterval } = context;
      const profileId = artblocksClient.getProfileId();

      enqueue.stopChild("receiptPollingMachine");

      if (profileId === null) {
        return;
      }

      enqueue.spawnChild("receiptPollingMachine", {
        id: "receiptPollingMachine",
        systemId: "receiptPollingMachine",
        input: {
          artblocksClient,
          pollingInterval: receiptPollingInterval,
          profileId,
        },
      });
    }),
    syncClaimMachinesWithArtblocksClient: enqueueActions(
      ({ context }, params: { artblocksClient: ArtBlocksClient }) => {
        const { claimMachines = new Map() } = context;

        claimMachines.forEach((claimMachine) => {
          claimMachine.send({
            type: "ART_BLOCKS_CLIENT_UPDATED",
            artblocksClient: params.artblocksClient,
          } as ExcessSettlementFundsClaimMachineEvents);
        });
      }
    ),
  },
  guards: {
    hasClaimableExcessSettlementFunds: (
      _,
      { receipts }: { receipts: ReceiptSettlementDataFragment[] }
    ) => {
      return receipts.length > 0;
    },
    authenticatedUserAvailable: (
      _,
      { artblocksClient }: { artblocksClient: ArtBlocksClient }
    ) => {
      return artblocksClient.hasAuthenticatedUser();
    },
    authenticatedUserUnavailable: (
      _,
      { artblocksClient }: { artblocksClient: ArtBlocksClient }
    ) => {
      return !artblocksClient.hasAuthenticatedUser();
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgB4GM6wMpgC64BswBbMAO1wDEBXMiWAWQEMymYAnZtACwEsywAYgCiADQDCwrFgD6WYQBUFAGWENhAOQUzKAVQ0ARWeOUBBAJLqDAbQAMAXUSgADgHtYvXL1dknIFIgAjLYArCEAdADsAGwATJG2ACwAnGGx0RkANCAAnogAtADMtsnhsclxKcm2kQAcIYWFiQC+zdmoGLDYeIQk5FS09MysHFx8AuFMaGiutLi6rABuTLwETABGRIKmAEraAELKAPLiANLGyuaa2roACgamCsI2Dn5uHl4+fgEI+anhiRC8RiiUS0Sa0VsgWyeV+-xSkWCTUKwVstRKrXa6EwOHwRFIFBodEYLDYYE4U3GYEm01mFAWTGWqw2W12B2OZwuVy0MjuDyeNkCjiQIHenm8vhFP3y0USAMKiIaiUK6QasViMKCtli4UCgVioXRsRVyXKkUx4GxXVxvQJA2JwzJFJ4-GpBF4sFw5H4UEornYOzAGF4zlwsG2exkhxO5xkJm5N3uj2edmFLnc4q+UsQtT1ANqtUKDSatjRhVqmrhtQBIWCyuiFVs0UihQtHRxPXx-SJQ1Jo0prvC7s93rIvv9geDofDO2EknMtwUskoinEAAkU68RWLPpLQD8whFarEQrKDSiSnrKy2yqfooEG4DC7Fla02iAyK4IHA-O3rZ2+kJQYSRGckxldN4M13b4CgVWxdUKaJj3iRICzLSt8kCepwlSOsGmPEI0ViNsrW6PFAPtXtQOdKkaRmOYGSZNZNjASCPglGDfhVHVAkQ5DIlQ9FC0rRpAnCWpZUiMIMmiU8sJIzoyNtbtgMdfsXQmYcvTIH0-QDIMwBDMM2MzPd-EQFJqwEpDTWKSIW2NSIMIqcJtVCeJkiNWoKmiN9miAA */
  id: "excessSettlementFundsManagerMachine",
  initial: "checkingSession",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    receiptPollingInterval:
      input.receiptPollingInterval ?? DEFAULT_RECEIPT_POLLING_INTERVAL,
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
    checkingSession: {
      always: [
        {
          target: "listeningForReceipts",
          guard: {
            type: "authenticatedUserAvailable",
            params: ({ context }) => ({
              artblocksClient: context.artblocksClient,
            }),
          },
        },
        {
          target: "sessionUnavailable",
        },
      ],
    },
    sessionUnavailable: {
      on: {
        ART_BLOCKS_CLIENT_UPDATED: [
          {
            target: "listeningForReceipts",
            guard: {
              type: "authenticatedUserAvailable",
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
        const { artblocksClient, receiptPollingInterval } = context;
        const profileId = artblocksClient.getProfileId();

        if (profileId === null) {
          return;
        }

        enqueue.spawnChild("receiptPollingMachine", {
          id: "receiptPollingMachine",
          systemId: "receiptPollingMachine",
          input: {
            artblocksClient,
            pollingInterval: receiptPollingInterval,
            profileId,
          },
        });
      }),
      on: {
        ART_BLOCKS_CLIENT_UPDATED: {
          actions: [
            {
              type: "assignArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
            {
              type: "syncClaimMachinesWithArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
            {
              type: "restartReceiptPollingMachine",
            },
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
              const updatedClaimMachines = new Map(claimMachines);

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
                if (
                  !receiptsMap.has(id) &&
                  (snapshot.matches("idle") ||
                    snapshot.matches("wrongWallet") ||
                    snapshot.matches("wrongChain") ||
                    snapshot.matches("walletUnavailable"))
                ) {
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
      always: {
        target: "sessionUnavailable",
        guard: {
          type: "authenticatedUserUnavailable",
          params: ({ context }) => ({
            artblocksClient: context.artblocksClient,
          }),
        },
        actions: enqueueActions(({ context, enqueue }) => {
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
      },
    },
  },
});
