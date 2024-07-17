import { Hex, formatEther, getContract, parseEventLogs } from "viem";
import { ActorRefFrom, assign, fromPromise, setup, stateIn } from "xstate";
import { ArtBlocksClient } from "../..";
import { minterRAMV0Abi } from "../../../abis/minterRAMV0Abi";
import { BidDetailsFragment } from "../../generated/graphql";
import { graphql } from "../../generated/index";
import { liveSaleDataPollingMachine } from "../project-sale-manager-machine/live-sale-data-polling-machine";
import { ProjectDetails } from "../project-sale-manager-machine/utils";
import {
  getCoreContractAddressAndProjectIndexFromProjectId,
  getMessageFromError,
  isUserRejectedError,
} from "../utils";
import { dbBidIdToOnChainBidId, slotIndexToBidValue } from "./utils";

export type RAMBidMachineEvents =
  | {
      type: "SUBMIT_BID";
      bidSlotIndex: number;
    }
  | {
      type: "RESET";
    }
  | {
      type: "BID_ACTION_CHOSEN";
      bidAction: BidAction;
    }
  | {
      type: "TOP_UP_BID_CHOSEN";
      bidId: string;
    }
  | {
      type: "BACK";
    };

type BidAction = "create" | "topUp";

export type RAMBidMachineContext = {
  // Client used to interact with ArtBlocks API with access to walletClient and publicClient
  artblocksClient: ArtBlocksClient;
  // Details of the project relevant to sale
  project: NonNullable<ProjectDetails>;
  // Error message that may arise during the bidding process
  errorMessage?: string;
  // List of user bids for the current project
  userBids: Array<BidDetailsFragment>;
  // Database ID of the bid that is being topped up (if applicable)
  topUpBidId?: string;
  // Slot index for the new bid or top up bid
  bidSlotIndex?: number;
  // Reference to the live sale data polling machine actor
  liveSaleDataPollingMachineRef: ActorRefFrom<
    typeof liveSaleDataPollingMachine
  >;
  // Transaction hash of the createBid or topUpBid transaction
  txHash?: Hex;
  // Action to be performed (create or top up)
  bidAction?: BidAction;
  pollingRetries: number;
  // On-Chain ID of the pending bid
  pendingBidId?: number;
};

export type RAMBidMachineInput = Pick<
  RAMBidMachineContext,
  "artblocksClient" | "project"
>;

graphql(/* GraphQL */ `
  fragment BidDetails on bids_metadata {
    id
    slot_index
    bid_value
  }
`);

const getUserBidsDocument = graphql(/* GraphQL */ `
  query GetUserBids($projectId: String!, $userAddress: String!) {
    bids_metadata(
      where: {
        project_id: { _eq: $projectId }
        bidder_address: { _eq: $userAddress }
      }
    ) {
      ...BidDetails
    }
  }
`);

const MAX_RETRIES = 2;

export const ramBidMachine = setup({
  types: {
    input: {} as Pick<
      RAMBidMachineContext,
      "project" | "artblocksClient" | "liveSaleDataPollingMachineRef"
    >,
    context: {} as RAMBidMachineContext,
    events: {} as RAMBidMachineEvents,
  },
  actors: {
    fetchUserBids: fromPromise(
      async ({
        input,
      }: {
        input: Pick<RAMBidMachineContext, "artblocksClient" | "project">;
      }): Promise<Array<BidDetailsFragment>> => {
        const { artblocksClient, project } = input;
        const publicClient = artblocksClient.getPublicClient();
        const walletClient = artblocksClient.getWalletClient();

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        // This shouldn't happen but is necessary for type checking
        if (!walletClient?.account) {
          throw new Error("Wallet client not connected");
        }

        const bids = await artblocksClient.graphqlRequest(getUserBidsDocument, {
          projectId: project.id,
          userAddress: walletClient.account.address.toLowerCase(),
        });

        return bids.bids_metadata;
      }
    ),
    initiateBidTx: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          RAMBidMachineContext,
          | "artblocksClient"
          | "project"
          | "topUpBidId"
          | "bidSlotIndex"
          | "liveSaleDataPollingMachineRef"
          | "userBids"
        >;
      }): Promise<Hex> => {
        const { project, artblocksClient } = input;
        const publicClient = artblocksClient.getPublicClient();
        const walletClient = artblocksClient.getWalletClient();

        const { projectIndex, coreContractAddress } =
          getCoreContractAddressAndProjectIndexFromProjectId(project.id);

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        if (!walletClient?.account) {
          throw new Error("Wallet client not connected");
        }

        const minterAddress = project.minter_configuration?.minter?.address;

        if (!minterAddress) {
          throw new Error("Minter is not configured for this project");
        }

        if (input.bidSlotIndex == null) {
          throw new Error("Bid slot is required");
        }

        const basePrice = project.minter_configuration?.base_price;

        if (!basePrice) {
          throw new Error("Base price is not configured for this project");
        }

        const minterContract = getContract({
          abi: minterRAMV0Abi,
          address: minterAddress as Hex,
          client: {
            public: publicClient,
            wallet: walletClient,
          },
        });

        const value = slotIndexToBidValue(
          formatEther(BigInt(basePrice)),
          input.bidSlotIndex
        );

        if (input.topUpBidId) {
          const onChainTopUpBidId = dbBidIdToOnChainBidId(input.topUpBidId);
          const topUpBid = input.userBids.find(
            (bid) => bid.id === input.topUpBidId
          );

          if (!topUpBid) {
            throw new Error("Cannot top up non-existant bid");
          }

          const valueDiff = value - BigInt(topUpBid.bid_value);

          const { request } = await minterContract.simulate.topUpBid(
            [
              projectIndex,
              coreContractAddress,
              onChainTopUpBidId,
              input.bidSlotIndex,
            ],
            {
              value: valueDiff,
              account: walletClient.account.address,
            }
          );

          const txHash = await walletClient.writeContract(request);

          return txHash;
        }

        const { request } = await minterContract.simulate.createBid(
          [projectIndex, coreContractAddress, input.bidSlotIndex],
          {
            value,
            account: walletClient.account.address,
          }
        );

        const txHash = await walletClient.writeContract(request);

        return txHash;
      }
    ),
    waitForBidTxConfirmation: fromPromise(
      async ({
        input,
      }: {
        input: Pick<RAMBidMachineContext, "artblocksClient" | "txHash">;
      }): Promise<bigint> => {
        const { artblocksClient, txHash } = input;
        const publicClient = artblocksClient.getPublicClient();

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        if (!txHash) {
          throw new Error("Transaction hash is required");
        }

        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });

        if (txReceipt.status === "reverted") {
          throw new Error("Purchase transaction reverted");
        }

        const events = parseEventLogs({
          logs: txReceipt.logs,
          abi: minterRAMV0Abi,
          eventName: ["BidCreated", "BidToppedUp"],
        });

        const event = events[0];

        if (!event) {
          throw new Error("No event found");
        }

        return event.args.bidId;
      }
    ),
  },
  actions: {
    assignErrorMessageFromError: assign({
      errorMessage: (
        _,
        params: { error: unknown; fallbackMessage?: string }
      ) => {
        return getMessageFromError(params.error, params.fallbackMessage);
      },
    }),
    assignUserBids: assign({
      userBids: (_, params: { userBids: Array<BidDetailsFragment> }) =>
        params.userBids,
    }),
    assignBidAction: assign({
      bidAction: (_, params: { bidAction: BidAction }) => params.bidAction,
    }),
    resetBidAction: assign({
      bidAction: undefined,
    }),
    assignTopUpBidId: assign({
      topUpBidId: (_, params: { topUpBidId: string }) => params.topUpBidId,
    }),
    resetTopUpBidId: assign({
      topUpBidId: undefined,
    }),
    assignBidSlotIndex: assign({
      bidSlotIndex: (_, params: { bidSlotIndex: number }) =>
        params.bidSlotIndex,
    }),
    assignPendingBidId: assign({
      pendingBidId: (_, params: { bidId: number }) => params.bidId,
    }),
    assignErrorMessage: assign({
      errorMessage: (_, params: { errorMessage?: string }) =>
        params.errorMessage,
    }),
    resetBidContext: assign({
      errorMessage: undefined,
      txHash: undefined,
      bidAction: undefined,
      topUpBidId: undefined,
      bidSlotIndex: undefined,
      pendingBidId: undefined,
    }),
    assignInitiatedTxHash: assign({
      txHash: (_, params: { txHash: Hex }) => params.txHash,
    }),
    incrementPollingRetries: assign({
      pollingRetries: ({ context }) => context.pollingRetries + 1,
    }),
  },
  guards: {
    isUserRejectedError: (_, { error }: { error: unknown }) => {
      return isUserRejectedError(error);
    },
    topUpBidSelected: ({ context }) => {
      return Boolean(context.topUpBidId);
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcCGBbAQgSwgWVQGMALbAOzADoAzMAFxPKgFVYxkcJYBiCAewqVyANz4BrKmiy4CjQbQakyLNh1ywEIvoVR1sAgNoAGALrGTiUAAc+sbHoGWQAD0QBaAIwAWDwE5KAMy+vh4BRgAcvgBMAKxGHgA0IACeiF4xHoHhXl4BHvExUV4AbL4AvmVJUpyySlQKcirsnDz8gloSlNUyRHU09I2szeqaZKI6DmTmBh4WSCA2dpNOrgieuQGUXgDsAQHFMdnF2b7bSakIxcWZRtvhebfBMdu+ARVVGDW95PUDSk1qLjcdjIPjIShWAA2umoYPQXU+PTkv0UTCGgI0Wgm+impnMTkW9hxK3c3miWxihWe22KeS8vmK50QHl2Rko3iiQSiL2Kdyi4XeIG6+G+ghIfFsTE4AEFCJNuJgAJIAEQA+tKAMIAFUVAHkAHKqjUACV1AGUAKL6-HzQnLearNwHGKUXzhbbxXn7fKxJkIHL+cLZHLFTlRbleTmC4W1H6UcWS5QyuU4hUq9XavWGk3mq0zObWSX20CO3lsozXWIeUpGdKhP2lYqUIx0nbedK+GLFaOIkXI+PECV2ZRavhWZhWTjcLW6gAKquY86VapzlutpgJReJDvc4Uy922HhindOsSD4Qbu2bMXp1YC4TiHiiPekfb6qAA7qgiUncNL0HwACuZB0NwZrMJgeCKlqqrLjahZLNuJaIAEHrNqhBy+PS1x7kYMR+vkR5bLsnbxLke6Ui+Xz9uQRK6FKuBas4vACFQHSSL2sbtGQdF6L+EBMaM4z0YYeIbraW6ODuCBPvElDFF4twVqGARFIkKTMp6rq7EGdxumeMRUUifSEAI1DYMg6AMQJzFtGxYziBxr5cVQplkOZlnWYJWIibiZjiQhRJSchCBRC2mQKYp4RGLcXaofhGkyUY3KUIchyHtsdwROkRlvnGn7fnxUBmskZCECxgiwHQuhOdR75fj+xWlYQ8ELJJZAkv6tb+CEEThKGJRHlEfovGysSoUEuylB4kS5S5lAFY1JVlf0qLKOiLQVfZoidDGopUItRXLYQq2DKoLRCdovnTAFbWIcFLiIFEVz+M8nb3jsYWvH6E3stE4Scvsx43ryc37QtDVHc1p3-Bt6hbUIDm7Zx4OHUwx0w2i50jD5kzTLMm73R10nPTEmxxGT-K0qc7p+l2Y0BF4ANGL4tyM0eYP9mjygYw0sPY0CdmIzttXGflkPo9DfNY8MXCXdiolmFEBZ3UFxMhfyXbNiE-W8kGTMBCNQSpdypwBGThT3AKlRCijXMSzzUt-DLGLAsgoLglCMJwgizmow7TUrdL60C5iDkK35rV2khj2hYe-g0nu97JU8BHhv4fh7FEbo0rW3ic-VhWS0Hzsh7LPAgmCELQnQsKWb7dXi0Xjsl2tAIXbjOL4yr0cPas3J4fJrz6XsxTKWciWhJl14s2PoSHCEBdN0t0MB9wzhVTVC3UHQ7AABRxDFACU3B7fbzeBydAdR+1nWaz10Qdqz0XHoyk94VE8l5JEbo+IpoM2zPn0AARrgM0gFCCEDgDwAAShaS0Wob5EzvpGfwoZOQhFQm6Lsfowo+EoPcJmWFcjOh8EvQQldkDcDgQgpBatOqeCIoQmKBswoPj3ARYIbJQzZQZPsQaFQbZkD4BAOATggE-EJvQ6SbgojeBdJlZKk1no5GGpPN0f1+RPhyHeA4bxAF2z6MHdu6gpHFljrIlm2xKCKIwdsFRkYCJs1SjkfYHox4s35OQ1yg5ExQGTOY3u6sLFYWsebfYRRuTbByBeRKn0CHXBbHIxSH1rYfD9v2BMw4oCjnHJOXAZiY6Og8CUmxDJX4sl5LkcMfpBrsm5EEMePgWTVm7AYjJhdGoygAsBOghS+7uEPFkMiikGT5Hek4+8FJazRVZnsYIz52mN24rxLyqxArmNWEcdkZNaShmeMcRmTjYipQGtyfqZJ3TePjGZCyVl+JMX6cE1Y1YYpbFrApbIh4qzHJdF2SJdxrj0iuUssWghuaXyeXffhWw8j8h2NSWsuCHxD35CzfIsVDjXIhbzUuJiuBQpJj4T+uQnxfMRV4Y51jaQzQOP-SkD5sUBwxgHQlIVVLpEoGFPC6QaT0wBpMzYfgrj0hinFe8TKL4Y1gM1SAbLY7m2ePJZm883QsjdD9YIWx05qUOGPY4kqV4rUofK1Y5sriwt-izSIJTKWJWyJkG8PhTjBC5DSa5oCIDgMgdA01aQp6BAOB6IIGQ2wESZk2IIeQ8j2K7OkRZ6TllUBNRJZBMjs5eFSseaKRQXjBgfARbYGR5IzWiFWV1oZBFlCAA */
  id: "ramBidMachine",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    project: input.project,
    liveSaleDataPollingMachineRef: input.liveSaleDataPollingMachineRef,
    userBids: [],
    pollingRetries: 0,
  }),
  initial: "fetchingUserBids",
  states: {
    fetchingUserBids: {
      invoke: {
        src: "fetchUserBids",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
        }),
        onDone: {
          target: "awaitingBidActionChoice",
          actions: [
            {
              type: "assignUserBids",
              params: ({ event }) => ({
                userBids: event.output,
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
    awaitingBidActionChoice: {
      on: {
        BID_ACTION_CHOSEN: [
          {
            target: "awaitingTopUpBidChoice",
            actions: {
              type: "assignBidAction",
              params: ({ event }) => ({
                bidAction: event.bidAction,
              }),
            },
            guard: ({ event, context }) => {
              return event.bidAction === "topUp" && context.userBids.length > 0;
            },
          },
          {
            target: "awaitingBidAmount",
          },
        ],
      },
    },
    awaitingTopUpBidChoice: {
      description: "The user chooses an existing bid to top up",
      on: {
        TOP_UP_BID_CHOSEN: {
          target: "awaitingBidAmount",
          actions: {
            type: "assignTopUpBidId",
            params: ({ event }) => ({
              topUpBidId: event.bidId,
            }),
          },
        },
        BACK: {
          target: "awaitingBidActionChoice",
          actions: "resetBidAction",
        },
      },
    },
    awaitingBidAmount: {
      on: {
        SUBMIT_BID: {
          target: "initiatingBidTx",
          actions: {
            type: "assignBidSlotIndex",
            params: ({ event }) => ({
              bidSlotIndex: event.bidSlotIndex,
            }),
          },
          guard: ({ context, event }) => {
            const topUpBid = context.topUpBidId
              ? context.userBids.find((bid) => {
                  return bid.id === context.topUpBidId;
                })
              : undefined;

            const liveSaleData =
              context.liveSaleDataPollingMachineRef.getSnapshot().context
                .liveSaleData;
            const minBidSlotIndex = Math.max(
              Number(
                liveSaleData?.ramMinterAuctionDetails?.minNextBidSlotIndex
              ),
              topUpBid ? Number(topUpBid.slot_index ?? 0) + 1 : 0
            );

            return event.bidSlotIndex >= minBidSlotIndex;
          },
        },
        BACK: [
          {
            target: "awaitingTopUpBidChoice",
            guard: "topUpBidSelected",
            actions: "resetTopUpBidId",
          },
          {
            target: "awaitingBidActionChoice",
            actions: "resetBidAction",
          },
        ],
      },
    },
    initiatingBidTx: {
      invoke: {
        src: "initiateBidTx",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
          liveSaleDataPollingMachineRef: context.liveSaleDataPollingMachineRef,
          topUpBidId: context.topUpBidId,
          bidSlotIndex: context.bidSlotIndex,
          userBids: context.userBids,
        }),
        onDone: {
          target: "confirmingBidTx",
          actions: {
            type: "assignInitiatedTxHash",
            params: ({ event }) => ({
              txHash: event.output,
            }),
          },
        },
        onError: [
          {
            target: "awaitingBidAmount",
            guard: {
              type: "isUserRejectedError",
              params: ({ event }) => {
                return {
                  error: event.error,
                };
              },
            },
          },
          {
            target: "error",
            actions: {
              type: "assignErrorMessageFromError",
              params: ({ event }) => {
                return {
                  error: event.error,
                };
              },
            },
          },
        ],
      },
    },
    confirmingBidTx: {
      invoke: {
        src: "waitForBidTxConfirmation",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          txHash: context.txHash,
        }),
        onDone: {
          target: "awaitingSync",
          actions: {
            type: "assignPendingBidId",
            params: ({ event }) => ({
              bidId: Number(event.output),
            }),
          },
        },
      },
    },
    awaitingSync: {
      initial: "fetchingUserBids",
      onDone: [
        {
          target: "bidSuccess",
          guard: stateIn({ awaitingSync: "synced" }),
        },
        {
          target: "error",
          guard: stateIn({ awaitingSync: "error" }),
        },
      ],
      states: {
        fetchingUserBids: {
          invoke: {
            src: "fetchUserBids",
            input: ({ context }) => ({
              artblocksClient: context.artblocksClient,
              project: context.project,
            }),
            onDone: [
              {
                target: "synced",
                actions: {
                  type: "assignUserBids",
                  params: ({ event }) => ({
                    userBids: event.output,
                  }),
                },
                guard: ({ context, event }) => {
                  const bid = event.output.find((bid) => {
                    // RAM bid ids in our db follow the format {minter contract address}-{full project ID}-{bidID}
                    const splitBidId = bid.id.split("-");
                    const bidId = splitBidId[splitBidId.length - 1];
                    return bidId === context.pendingBidId?.toString();
                  });

                  // For new bids, the presence of a matching bid means that the bid has synced.
                  // For top-ups, the bid slot index must match the new slot index in context
                  return Boolean(
                    bid && bid.slot_index === context.bidSlotIndex
                  );
                },
              },
              {
                target: "waiting",
                actions: [
                  {
                    type: "incrementPollingRetries",
                  },
                  {
                    type: "assignUserBids",
                    params: ({ event }) => ({
                      userBids: event.output,
                    }),
                  },
                ],
                guard: ({ context }) => {
                  return context.pollingRetries < MAX_RETRIES;
                },
              },
              {
                target: "error",
                actions: {
                  type: "assignErrorMessage",
                  params: {
                    errorMessage:
                      "Your bid has been submitted but indexing is taking longer than usual.",
                  },
                },
              },
            ],
            onError: [
              {
                target: "waiting",
                actions: {
                  type: "incrementPollingRetries",
                },
                guard: ({ context }) => {
                  return context.pollingRetries < MAX_RETRIES;
                },
              },
              {
                target: "error",
                actions: {
                  type: "assignErrorMessageFromError",
                  params: ({ event }) => ({
                    error: event.error,
                  }),
                },
              },
            ],
          },
        },
        waiting: {
          after: {
            5000: "fetchingUserBids",
          },
        },
        synced: {
          type: "final",
        },
        error: {
          type: "final",
        },
      },
    },
    bidSuccess: {
      on: {
        RESET: {
          actions: {
            type: "resetBidContext",
          },
          target: "fetchingUserBids",
        },
      },
    },
    error: {
      on: {
        RESET: {
          actions: {
            type: "resetBidContext",
          },
          target: "fetchingUserBids",
        },
      },
    },
  },
});

export { getNearestSlotForBidValue, slotIndexToBidValue } from "./utils";
