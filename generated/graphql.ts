import gql from 'graphql-tag';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  BigInt: string;
  Bytes: string;
  bigint: any;
  float8: any;
  json: any;
  jsonb: any;
  jsonpath: any;
  numeric: any;
  seed_float: any;
  timestamp: any;
  timestamptz: string;
  uuid: any;
};

export type Account = {
  __typename?: 'Account';
  id: Scalars['ID'];
  /** Projects the account is listed as artist for */
  projectsCreated?: Maybe<Array<Project>>;
  /** Projects the account owns tokens from */
  projectsOwned?: Maybe<Array<AccountProject>>;
  /** Receipts for the account, on minters with settlement */
  receipts?: Maybe<Array<Receipt>>;
  tokens?: Maybe<Array<Token>>;
  /** Contracts the account is whitelisted on */
  whitelistedOn?: Maybe<Array<Whitelisting>>;
};


export type AccountProjectsCreatedArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Project_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Project_Filter>;
};


export type AccountProjectsOwnedArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AccountProject_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<AccountProject_Filter>;
};


export type AccountReceiptsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Receipt_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Receipt_Filter>;
};


export type AccountTokensArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Token_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Token_Filter>;
};


export type AccountWhitelistedOnArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Whitelisting_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Whitelisting_Filter>;
};

export type AccountProject = {
  __typename?: 'AccountProject';
  account: Account;
  count: Scalars['Int'];
  id: Scalars['ID'];
  project: Project;
};

export type AccountProject_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  account?: InputMaybe<Scalars['String']>;
  account_?: InputMaybe<Account_Filter>;
  account_contains?: InputMaybe<Scalars['String']>;
  account_contains_nocase?: InputMaybe<Scalars['String']>;
  account_ends_with?: InputMaybe<Scalars['String']>;
  account_ends_with_nocase?: InputMaybe<Scalars['String']>;
  account_gt?: InputMaybe<Scalars['String']>;
  account_gte?: InputMaybe<Scalars['String']>;
  account_in?: InputMaybe<Array<Scalars['String']>>;
  account_lt?: InputMaybe<Scalars['String']>;
  account_lte?: InputMaybe<Scalars['String']>;
  account_not?: InputMaybe<Scalars['String']>;
  account_not_contains?: InputMaybe<Scalars['String']>;
  account_not_contains_nocase?: InputMaybe<Scalars['String']>;
  account_not_ends_with?: InputMaybe<Scalars['String']>;
  account_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  account_not_in?: InputMaybe<Array<Scalars['String']>>;
  account_not_starts_with?: InputMaybe<Scalars['String']>;
  account_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  account_starts_with?: InputMaybe<Scalars['String']>;
  account_starts_with_nocase?: InputMaybe<Scalars['String']>;
  and?: InputMaybe<Array<InputMaybe<AccountProject_Filter>>>;
  count?: InputMaybe<Scalars['Int']>;
  count_gt?: InputMaybe<Scalars['Int']>;
  count_gte?: InputMaybe<Scalars['Int']>;
  count_in?: InputMaybe<Array<Scalars['Int']>>;
  count_lt?: InputMaybe<Scalars['Int']>;
  count_lte?: InputMaybe<Scalars['Int']>;
  count_not?: InputMaybe<Scalars['Int']>;
  count_not_in?: InputMaybe<Array<Scalars['Int']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<AccountProject_Filter>>>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum AccountProject_OrderBy {
  Account = 'account',
  Count = 'count',
  Id = 'id',
  Project = 'project'
}

export type Account_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Account_Filter>>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<Account_Filter>>>;
  projectsCreated_?: InputMaybe<Project_Filter>;
  projectsOwned_?: InputMaybe<AccountProject_Filter>;
  receipts_?: InputMaybe<Receipt_Filter>;
  tokens_?: InputMaybe<Token_Filter>;
  whitelistedOn_?: InputMaybe<Whitelisting_Filter>;
};

export enum Account_OrderBy {
  Id = 'id',
  ProjectsCreated = 'projectsCreated',
  ProjectsOwned = 'projectsOwned',
  Receipts = 'receipts',
  Tokens = 'tokens',
  WhitelistedOn = 'whitelistedOn'
}

export type AuthMessageOutput = {
  __typename?: 'AuthMessageOutput';
  authMessage: Scalars['String'];
};

export type AuthenticateInput = {
  contracts?: InputMaybe<Array<Scalars['String']>>;
  publicAddress: Scalars['String'];
  signature: Scalars['String'];
};

export type AuthenticateOutput = {
  __typename?: 'AuthenticateOutput';
  expiration: Scalars['Int'];
  jwt: Scalars['String'];
};

export type BlockChangedFilter = {
  number_gte: Scalars['Int'];
};

export type Block_Height = {
  hash?: InputMaybe<Scalars['Bytes']>;
  number?: InputMaybe<Scalars['Int']>;
  number_gte?: InputMaybe<Scalars['Int']>;
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Boolean']>;
  _gt?: InputMaybe<Scalars['Boolean']>;
  _gte?: InputMaybe<Scalars['Boolean']>;
  _in?: InputMaybe<Array<Scalars['Boolean']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['Boolean']>;
  _lte?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Scalars['Boolean']>;
  _nin?: InputMaybe<Array<Scalars['Boolean']>>;
};

export type Contract = {
  __typename?: 'Contract';
  admin: Scalars['Bytes'];
  /** Automatically approve all artist split proposals (used on V3 Engine contracts) */
  autoApproveArtistSplitProposals?: Maybe<Scalars['Boolean']>;
  createdAt: Scalars['BigInt'];
  /** Curation registry contract address */
  curationRegistry?: Maybe<Scalars['Bytes']>;
  /** Dependency registry contract address */
  dependencyRegistry?: Maybe<DependencyRegistry>;
  /** Address that receives primary sales platform fees, only for V3_Engine contracts */
  enginePlatformProviderAddress?: Maybe<Scalars['Bytes']>;
  /** Percentage of primary sales allocated to the platform, only for V3_Engine contracts */
  enginePlatformProviderPercentage?: Maybe<Scalars['BigInt']>;
  /** Address that receives secondary sales platform royalties, only for V3_Engine contracts */
  enginePlatformProviderSecondarySalesAddress?: Maybe<Scalars['Bytes']>;
  /** Basis points of secondary sales allocated to the platform, only for V3_Engine contracts */
  enginePlatformProviderSecondarySalesBPS?: Maybe<Scalars['BigInt']>;
  /** Unique identifier made up of the contract address */
  id: Scalars['ID'];
  /** List of contracts that are allowed to mint */
  mintWhitelisted: Array<Scalars['Bytes']>;
  /** Associated minter filter (if being indexed) - not always indexed for Engine contracts */
  minterFilter?: Maybe<MinterFilter>;
  /** New projects forbidden (can only be true on V3+ contracts) */
  newProjectsForbidden: Scalars['Boolean'];
  nextProjectId: Scalars['BigInt'];
  preferredArweaveGateway?: Maybe<Scalars['String']>;
  preferredIPFSGateway?: Maybe<Scalars['String']>;
  /** List of projects on the contract */
  projects?: Maybe<Array<Project>>;
  /** Randomizer contract used to generate token hashes */
  randomizerContract?: Maybe<Scalars['Bytes']>;
  /** Latest engine registry that this contract is registered with, if any (used for indexing purposes) */
  registeredOn?: Maybe<EngineRegistry>;
  /** Address that receives primary sales platform fees */
  renderProviderAddress: Scalars['Bytes'];
  /** Percentage of primary sales allocated to the platform */
  renderProviderPercentage: Scalars['BigInt'];
  /** Address that receives secondary sales platform royalties (null for pre-V3 contracts, check Royalty Registry) */
  renderProviderSecondarySalesAddress?: Maybe<Scalars['Bytes']>;
  /** Basis points of secondary sales allocated to the platform (null for pre-V3 contracts, check Royalty Registry) */
  renderProviderSecondarySalesBPS?: Maybe<Scalars['BigInt']>;
  /** List of tokens on the contract */
  tokens?: Maybe<Array<Token>>;
  /** Core contract type */
  type: CoreType;
  updatedAt: Scalars['BigInt'];
  /** Accounts whitelisted on the contract */
  whitelisted?: Maybe<Array<Whitelisting>>;
};


export type ContractProjectsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Project_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Project_Filter>;
};


export type ContractTokensArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Token_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Token_Filter>;
};


export type ContractWhitelistedArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Whitelisting_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Whitelisting_Filter>;
};

export type Contract_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  admin?: InputMaybe<Scalars['Bytes']>;
  admin_contains?: InputMaybe<Scalars['Bytes']>;
  admin_gt?: InputMaybe<Scalars['Bytes']>;
  admin_gte?: InputMaybe<Scalars['Bytes']>;
  admin_in?: InputMaybe<Array<Scalars['Bytes']>>;
  admin_lt?: InputMaybe<Scalars['Bytes']>;
  admin_lte?: InputMaybe<Scalars['Bytes']>;
  admin_not?: InputMaybe<Scalars['Bytes']>;
  admin_not_contains?: InputMaybe<Scalars['Bytes']>;
  admin_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  and?: InputMaybe<Array<InputMaybe<Contract_Filter>>>;
  autoApproveArtistSplitProposals?: InputMaybe<Scalars['Boolean']>;
  autoApproveArtistSplitProposals_in?: InputMaybe<Array<Scalars['Boolean']>>;
  autoApproveArtistSplitProposals_not?: InputMaybe<Scalars['Boolean']>;
  autoApproveArtistSplitProposals_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  createdAt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  curationRegistry?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_contains?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_gt?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_gte?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_in?: InputMaybe<Array<Scalars['Bytes']>>;
  curationRegistry_lt?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_lte?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_not?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_not_contains?: InputMaybe<Scalars['Bytes']>;
  curationRegistry_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  dependencyRegistry?: InputMaybe<Scalars['String']>;
  dependencyRegistry_?: InputMaybe<DependencyRegistry_Filter>;
  dependencyRegistry_contains?: InputMaybe<Scalars['String']>;
  dependencyRegistry_contains_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_ends_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_gt?: InputMaybe<Scalars['String']>;
  dependencyRegistry_gte?: InputMaybe<Scalars['String']>;
  dependencyRegistry_in?: InputMaybe<Array<Scalars['String']>>;
  dependencyRegistry_lt?: InputMaybe<Scalars['String']>;
  dependencyRegistry_lte?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_contains?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_contains_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_ends_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_in?: InputMaybe<Array<Scalars['String']>>;
  dependencyRegistry_not_starts_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_starts_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_starts_with_nocase?: InputMaybe<Scalars['String']>;
  enginePlatformProviderAddress?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_contains?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_gt?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_gte?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  enginePlatformProviderAddress_lt?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_lte?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_not?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  enginePlatformProviderPercentage?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderPercentage_gt?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderPercentage_gte?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderPercentage_in?: InputMaybe<Array<Scalars['BigInt']>>;
  enginePlatformProviderPercentage_lt?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderPercentage_lte?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderPercentage_not?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderPercentage_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  enginePlatformProviderSecondarySalesAddress?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_contains?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_gt?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_gte?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  enginePlatformProviderSecondarySalesAddress_lt?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_lte?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_not?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  enginePlatformProviderSecondarySalesAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  enginePlatformProviderSecondarySalesBPS?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderSecondarySalesBPS_gt?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderSecondarySalesBPS_gte?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderSecondarySalesBPS_in?: InputMaybe<Array<Scalars['BigInt']>>;
  enginePlatformProviderSecondarySalesBPS_lt?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderSecondarySalesBPS_lte?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderSecondarySalesBPS_not?: InputMaybe<Scalars['BigInt']>;
  enginePlatformProviderSecondarySalesBPS_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  mintWhitelisted?: InputMaybe<Array<Scalars['Bytes']>>;
  mintWhitelisted_contains?: InputMaybe<Array<Scalars['Bytes']>>;
  mintWhitelisted_contains_nocase?: InputMaybe<Array<Scalars['Bytes']>>;
  mintWhitelisted_not?: InputMaybe<Array<Scalars['Bytes']>>;
  mintWhitelisted_not_contains?: InputMaybe<Array<Scalars['Bytes']>>;
  mintWhitelisted_not_contains_nocase?: InputMaybe<Array<Scalars['Bytes']>>;
  minterFilter?: InputMaybe<Scalars['String']>;
  minterFilter_?: InputMaybe<MinterFilter_Filter>;
  minterFilter_contains?: InputMaybe<Scalars['String']>;
  minterFilter_contains_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_ends_with?: InputMaybe<Scalars['String']>;
  minterFilter_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_gt?: InputMaybe<Scalars['String']>;
  minterFilter_gte?: InputMaybe<Scalars['String']>;
  minterFilter_in?: InputMaybe<Array<Scalars['String']>>;
  minterFilter_lt?: InputMaybe<Scalars['String']>;
  minterFilter_lte?: InputMaybe<Scalars['String']>;
  minterFilter_not?: InputMaybe<Scalars['String']>;
  minterFilter_not_contains?: InputMaybe<Scalars['String']>;
  minterFilter_not_contains_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_not_ends_with?: InputMaybe<Scalars['String']>;
  minterFilter_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_not_in?: InputMaybe<Array<Scalars['String']>>;
  minterFilter_not_starts_with?: InputMaybe<Scalars['String']>;
  minterFilter_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_starts_with?: InputMaybe<Scalars['String']>;
  minterFilter_starts_with_nocase?: InputMaybe<Scalars['String']>;
  newProjectsForbidden?: InputMaybe<Scalars['Boolean']>;
  newProjectsForbidden_in?: InputMaybe<Array<Scalars['Boolean']>>;
  newProjectsForbidden_not?: InputMaybe<Scalars['Boolean']>;
  newProjectsForbidden_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  nextProjectId?: InputMaybe<Scalars['BigInt']>;
  nextProjectId_gt?: InputMaybe<Scalars['BigInt']>;
  nextProjectId_gte?: InputMaybe<Scalars['BigInt']>;
  nextProjectId_in?: InputMaybe<Array<Scalars['BigInt']>>;
  nextProjectId_lt?: InputMaybe<Scalars['BigInt']>;
  nextProjectId_lte?: InputMaybe<Scalars['BigInt']>;
  nextProjectId_not?: InputMaybe<Scalars['BigInt']>;
  nextProjectId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<Contract_Filter>>>;
  preferredArweaveGateway?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_contains?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_ends_with?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_gt?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_gte?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_in?: InputMaybe<Array<Scalars['String']>>;
  preferredArweaveGateway_lt?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_lte?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_not?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_not_contains?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_not_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_not_ends_with?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_not_in?: InputMaybe<Array<Scalars['String']>>;
  preferredArweaveGateway_not_starts_with?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_starts_with?: InputMaybe<Scalars['String']>;
  preferredArweaveGateway_starts_with_nocase?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_contains?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_ends_with?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_gt?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_gte?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_in?: InputMaybe<Array<Scalars['String']>>;
  preferredIPFSGateway_lt?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_lte?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_not?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_not_contains?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_not_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_not_ends_with?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_not_in?: InputMaybe<Array<Scalars['String']>>;
  preferredIPFSGateway_not_starts_with?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_starts_with?: InputMaybe<Scalars['String']>;
  preferredIPFSGateway_starts_with_nocase?: InputMaybe<Scalars['String']>;
  projects_?: InputMaybe<Project_Filter>;
  randomizerContract?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_contains?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_gt?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_gte?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_in?: InputMaybe<Array<Scalars['Bytes']>>;
  randomizerContract_lt?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_lte?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_not?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_not_contains?: InputMaybe<Scalars['Bytes']>;
  randomizerContract_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  registeredOn?: InputMaybe<Scalars['String']>;
  registeredOn_?: InputMaybe<EngineRegistry_Filter>;
  registeredOn_contains?: InputMaybe<Scalars['String']>;
  registeredOn_contains_nocase?: InputMaybe<Scalars['String']>;
  registeredOn_ends_with?: InputMaybe<Scalars['String']>;
  registeredOn_ends_with_nocase?: InputMaybe<Scalars['String']>;
  registeredOn_gt?: InputMaybe<Scalars['String']>;
  registeredOn_gte?: InputMaybe<Scalars['String']>;
  registeredOn_in?: InputMaybe<Array<Scalars['String']>>;
  registeredOn_lt?: InputMaybe<Scalars['String']>;
  registeredOn_lte?: InputMaybe<Scalars['String']>;
  registeredOn_not?: InputMaybe<Scalars['String']>;
  registeredOn_not_contains?: InputMaybe<Scalars['String']>;
  registeredOn_not_contains_nocase?: InputMaybe<Scalars['String']>;
  registeredOn_not_ends_with?: InputMaybe<Scalars['String']>;
  registeredOn_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  registeredOn_not_in?: InputMaybe<Array<Scalars['String']>>;
  registeredOn_not_starts_with?: InputMaybe<Scalars['String']>;
  registeredOn_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  registeredOn_starts_with?: InputMaybe<Scalars['String']>;
  registeredOn_starts_with_nocase?: InputMaybe<Scalars['String']>;
  renderProviderAddress?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_contains?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_gt?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_gte?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  renderProviderAddress_lt?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_lte?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_not?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  renderProviderAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  renderProviderPercentage?: InputMaybe<Scalars['BigInt']>;
  renderProviderPercentage_gt?: InputMaybe<Scalars['BigInt']>;
  renderProviderPercentage_gte?: InputMaybe<Scalars['BigInt']>;
  renderProviderPercentage_in?: InputMaybe<Array<Scalars['BigInt']>>;
  renderProviderPercentage_lt?: InputMaybe<Scalars['BigInt']>;
  renderProviderPercentage_lte?: InputMaybe<Scalars['BigInt']>;
  renderProviderPercentage_not?: InputMaybe<Scalars['BigInt']>;
  renderProviderPercentage_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  renderProviderSecondarySalesAddress?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_contains?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_gt?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_gte?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  renderProviderSecondarySalesAddress_lt?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_lte?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_not?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  renderProviderSecondarySalesAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  renderProviderSecondarySalesBPS?: InputMaybe<Scalars['BigInt']>;
  renderProviderSecondarySalesBPS_gt?: InputMaybe<Scalars['BigInt']>;
  renderProviderSecondarySalesBPS_gte?: InputMaybe<Scalars['BigInt']>;
  renderProviderSecondarySalesBPS_in?: InputMaybe<Array<Scalars['BigInt']>>;
  renderProviderSecondarySalesBPS_lt?: InputMaybe<Scalars['BigInt']>;
  renderProviderSecondarySalesBPS_lte?: InputMaybe<Scalars['BigInt']>;
  renderProviderSecondarySalesBPS_not?: InputMaybe<Scalars['BigInt']>;
  renderProviderSecondarySalesBPS_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tokens_?: InputMaybe<Token_Filter>;
  type?: InputMaybe<CoreType>;
  type_in?: InputMaybe<Array<CoreType>>;
  type_not?: InputMaybe<CoreType>;
  type_not_in?: InputMaybe<Array<CoreType>>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  whitelisted_?: InputMaybe<Whitelisting_Filter>;
};

export enum Contract_OrderBy {
  Admin = 'admin',
  AutoApproveArtistSplitProposals = 'autoApproveArtistSplitProposals',
  CreatedAt = 'createdAt',
  CurationRegistry = 'curationRegistry',
  DependencyRegistry = 'dependencyRegistry',
  EnginePlatformProviderAddress = 'enginePlatformProviderAddress',
  EnginePlatformProviderPercentage = 'enginePlatformProviderPercentage',
  EnginePlatformProviderSecondarySalesAddress = 'enginePlatformProviderSecondarySalesAddress',
  EnginePlatformProviderSecondarySalesBps = 'enginePlatformProviderSecondarySalesBPS',
  Id = 'id',
  MintWhitelisted = 'mintWhitelisted',
  MinterFilter = 'minterFilter',
  NewProjectsForbidden = 'newProjectsForbidden',
  NextProjectId = 'nextProjectId',
  PreferredArweaveGateway = 'preferredArweaveGateway',
  PreferredIpfsGateway = 'preferredIPFSGateway',
  Projects = 'projects',
  RandomizerContract = 'randomizerContract',
  RegisteredOn = 'registeredOn',
  RenderProviderAddress = 'renderProviderAddress',
  RenderProviderPercentage = 'renderProviderPercentage',
  RenderProviderSecondarySalesAddress = 'renderProviderSecondarySalesAddress',
  RenderProviderSecondarySalesBps = 'renderProviderSecondarySalesBPS',
  Tokens = 'tokens',
  Type = 'type',
  UpdatedAt = 'updatedAt',
  Whitelisted = 'whitelisted'
}

export enum CoreType {
  /** First Art Blocks flagship core */
  GenArt721CoreV0 = 'GenArt721CoreV0',
  /** Second Art Blocks flagship core */
  GenArt721CoreV1 = 'GenArt721CoreV1',
  /** Art Blocks Engine & Partner cores */
  GenArt721CoreV2 = 'GenArt721CoreV2',
  /** Third Art Blocks flagship core */
  GenArt721CoreV3 = 'GenArt721CoreV3',
  /** V3 Derivative - Art Blocks Engine core */
  GenArt721CoreV3Engine = 'GenArt721CoreV3_Engine'
}

export type CreateApplicationInput = {
  artistName: Scalars['String'];
  creatorHistory?: InputMaybe<Scalars['String']>;
  discord?: InputMaybe<Scalars['String']>;
  email: Scalars['String'];
  originalityAck: Scalars['Boolean'];
  portfolio: Scalars['String'];
  projectName: Scalars['String'];
  technicalProficiency: Scalars['String'];
  timelineAck: Scalars['Boolean'];
  twitter?: InputMaybe<Scalars['String']>;
  walletAddress: Scalars['String'];
};

export type CreateApplicationOutput = {
  __typename?: 'CreateApplicationOutput';
  shellUrl?: Maybe<Scalars['String']>;
};

export type Dependency = {
  __typename?: 'Dependency';
  /** Number of additional CDNs for this dependency */
  additionalCDNCount: Scalars['BigInt'];
  /** Additional CDNs for this dependency */
  additionalCDNs: Array<DependencyAdditionalCdn>;
  /** Number of additional repositories for this dependency */
  additionalRepositories: Array<DependencyAdditionalRepository>;
  /** Additional repositories for this dependency */
  additionalRepositoryCount: Scalars['BigInt'];
  /** Depenency registry contract that this dependency is registered on */
  dependencyRegistry: DependencyRegistry;
  /** Unique identifier made up of dependency name and version separated by an @ symbol (e.g. p5js@1.0.0) */
  id: Scalars['ID'];
  /** Preffered CDN for this dependency */
  preferredCDN: Scalars['String'];
  /** Preffered repository for this dependency */
  preferredRepository: Scalars['String'];
  /** Reference website for this dependency (e.g. https://p5js.org) */
  referenceWebsite: Scalars['String'];
  /** Concatenated string of all scripts for this dependency */
  script?: Maybe<Scalars['String']>;
  /** Number of on-chain scripts for this dependency */
  scriptCount: Scalars['BigInt'];
  /** List of on-chain scripts that for this dependency */
  scripts: Array<DependencyScript>;
  /** Timestamp of last update */
  updatedAt: Scalars['BigInt'];
};


export type DependencyAdditionalCdNsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyAdditionalCdn_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<DependencyAdditionalCdn_Filter>;
};


export type DependencyAdditionalRepositoriesArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyAdditionalRepository_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<DependencyAdditionalRepository_Filter>;
};


export type DependencyScriptsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyScript_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<DependencyScript_Filter>;
};

export type DependencyAdditionalCdn = {
  __typename?: 'DependencyAdditionalCDN';
  /** URL of the CDN */
  cdn: Scalars['String'];
  /** Dependency this additional CDN belongs to */
  dependency: Dependency;
  /** Unique identifier made up of dependency id and index */
  id: Scalars['ID'];
  /** Index of this additional CDN */
  index: Scalars['BigInt'];
};

export type DependencyAdditionalCdn_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<DependencyAdditionalCdn_Filter>>>;
  cdn?: InputMaybe<Scalars['String']>;
  cdn_contains?: InputMaybe<Scalars['String']>;
  cdn_contains_nocase?: InputMaybe<Scalars['String']>;
  cdn_ends_with?: InputMaybe<Scalars['String']>;
  cdn_ends_with_nocase?: InputMaybe<Scalars['String']>;
  cdn_gt?: InputMaybe<Scalars['String']>;
  cdn_gte?: InputMaybe<Scalars['String']>;
  cdn_in?: InputMaybe<Array<Scalars['String']>>;
  cdn_lt?: InputMaybe<Scalars['String']>;
  cdn_lte?: InputMaybe<Scalars['String']>;
  cdn_not?: InputMaybe<Scalars['String']>;
  cdn_not_contains?: InputMaybe<Scalars['String']>;
  cdn_not_contains_nocase?: InputMaybe<Scalars['String']>;
  cdn_not_ends_with?: InputMaybe<Scalars['String']>;
  cdn_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  cdn_not_in?: InputMaybe<Array<Scalars['String']>>;
  cdn_not_starts_with?: InputMaybe<Scalars['String']>;
  cdn_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  cdn_starts_with?: InputMaybe<Scalars['String']>;
  cdn_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dependency?: InputMaybe<Scalars['String']>;
  dependency_?: InputMaybe<Dependency_Filter>;
  dependency_contains?: InputMaybe<Scalars['String']>;
  dependency_contains_nocase?: InputMaybe<Scalars['String']>;
  dependency_ends_with?: InputMaybe<Scalars['String']>;
  dependency_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_gt?: InputMaybe<Scalars['String']>;
  dependency_gte?: InputMaybe<Scalars['String']>;
  dependency_in?: InputMaybe<Array<Scalars['String']>>;
  dependency_lt?: InputMaybe<Scalars['String']>;
  dependency_lte?: InputMaybe<Scalars['String']>;
  dependency_not?: InputMaybe<Scalars['String']>;
  dependency_not_contains?: InputMaybe<Scalars['String']>;
  dependency_not_contains_nocase?: InputMaybe<Scalars['String']>;
  dependency_not_ends_with?: InputMaybe<Scalars['String']>;
  dependency_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_not_in?: InputMaybe<Array<Scalars['String']>>;
  dependency_not_starts_with?: InputMaybe<Scalars['String']>;
  dependency_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_starts_with?: InputMaybe<Scalars['String']>;
  dependency_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<DependencyAdditionalCdn_Filter>>>;
};

export enum DependencyAdditionalCdn_OrderBy {
  Cdn = 'cdn',
  Dependency = 'dependency',
  Id = 'id',
  Index = 'index'
}

export type DependencyAdditionalRepository = {
  __typename?: 'DependencyAdditionalRepository';
  /** Dependency this additional repository belongs to */
  dependency: Dependency;
  /** Unique identifier made up of dependency id and index */
  id: Scalars['ID'];
  /** Index of this additional repository */
  index: Scalars['BigInt'];
  /** URL of the repository */
  repository: Scalars['String'];
};

export type DependencyAdditionalRepository_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<DependencyAdditionalRepository_Filter>>>;
  dependency?: InputMaybe<Scalars['String']>;
  dependency_?: InputMaybe<Dependency_Filter>;
  dependency_contains?: InputMaybe<Scalars['String']>;
  dependency_contains_nocase?: InputMaybe<Scalars['String']>;
  dependency_ends_with?: InputMaybe<Scalars['String']>;
  dependency_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_gt?: InputMaybe<Scalars['String']>;
  dependency_gte?: InputMaybe<Scalars['String']>;
  dependency_in?: InputMaybe<Array<Scalars['String']>>;
  dependency_lt?: InputMaybe<Scalars['String']>;
  dependency_lte?: InputMaybe<Scalars['String']>;
  dependency_not?: InputMaybe<Scalars['String']>;
  dependency_not_contains?: InputMaybe<Scalars['String']>;
  dependency_not_contains_nocase?: InputMaybe<Scalars['String']>;
  dependency_not_ends_with?: InputMaybe<Scalars['String']>;
  dependency_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_not_in?: InputMaybe<Array<Scalars['String']>>;
  dependency_not_starts_with?: InputMaybe<Scalars['String']>;
  dependency_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_starts_with?: InputMaybe<Scalars['String']>;
  dependency_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<DependencyAdditionalRepository_Filter>>>;
  repository?: InputMaybe<Scalars['String']>;
  repository_contains?: InputMaybe<Scalars['String']>;
  repository_contains_nocase?: InputMaybe<Scalars['String']>;
  repository_ends_with?: InputMaybe<Scalars['String']>;
  repository_ends_with_nocase?: InputMaybe<Scalars['String']>;
  repository_gt?: InputMaybe<Scalars['String']>;
  repository_gte?: InputMaybe<Scalars['String']>;
  repository_in?: InputMaybe<Array<Scalars['String']>>;
  repository_lt?: InputMaybe<Scalars['String']>;
  repository_lte?: InputMaybe<Scalars['String']>;
  repository_not?: InputMaybe<Scalars['String']>;
  repository_not_contains?: InputMaybe<Scalars['String']>;
  repository_not_contains_nocase?: InputMaybe<Scalars['String']>;
  repository_not_ends_with?: InputMaybe<Scalars['String']>;
  repository_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  repository_not_in?: InputMaybe<Array<Scalars['String']>>;
  repository_not_starts_with?: InputMaybe<Scalars['String']>;
  repository_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  repository_starts_with?: InputMaybe<Scalars['String']>;
  repository_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum DependencyAdditionalRepository_OrderBy {
  Dependency = 'dependency',
  Id = 'id',
  Index = 'index',
  Repository = 'repository'
}

export type DependencyRegistry = {
  __typename?: 'DependencyRegistry';
  /** List of dependencies that are registered on this registry contract */
  dependencies?: Maybe<Array<Dependency>>;
  /** Unique identifier made up of dependency registry contract address */
  id: Scalars['Bytes'];
  /** Current owner of this contract */
  owner: Scalars['Bytes'];
  /** Core contracts that this registry can provide dependeny overrides for */
  supportedCoreContracts: Array<Contract>;
  /** Timestamp of last update */
  updatedAt: Scalars['BigInt'];
};


export type DependencyRegistryDependenciesArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Dependency_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Dependency_Filter>;
};


export type DependencyRegistrySupportedCoreContractsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Contract_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Contract_Filter>;
};

export type DependencyRegistry_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<DependencyRegistry_Filter>>>;
  dependencies_?: InputMaybe<Dependency_Filter>;
  id?: InputMaybe<Scalars['Bytes']>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  or?: InputMaybe<Array<InputMaybe<DependencyRegistry_Filter>>>;
  owner?: InputMaybe<Scalars['Bytes']>;
  owner_contains?: InputMaybe<Scalars['Bytes']>;
  owner_gt?: InputMaybe<Scalars['Bytes']>;
  owner_gte?: InputMaybe<Scalars['Bytes']>;
  owner_in?: InputMaybe<Array<Scalars['Bytes']>>;
  owner_lt?: InputMaybe<Scalars['Bytes']>;
  owner_lte?: InputMaybe<Scalars['Bytes']>;
  owner_not?: InputMaybe<Scalars['Bytes']>;
  owner_not_contains?: InputMaybe<Scalars['Bytes']>;
  owner_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  supportedCoreContracts_?: InputMaybe<Contract_Filter>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
};

export enum DependencyRegistry_OrderBy {
  Dependencies = 'dependencies',
  Id = 'id',
  Owner = 'owner',
  SupportedCoreContracts = 'supportedCoreContracts',
  UpdatedAt = 'updatedAt'
}

export type DependencyScript = {
  __typename?: 'DependencyScript';
  /** Address of the bytecode storage contract for this script */
  address: Scalars['Bytes'];
  /** Dependency this script belongs to */
  dependency: Dependency;
  /** Unique identifier made up of dependency id and index */
  id: Scalars['ID'];
  /** Index of this script */
  index: Scalars['BigInt'];
  /** Contents of script */
  script: Scalars['String'];
};

export type DependencyScript_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  address?: InputMaybe<Scalars['Bytes']>;
  address_contains?: InputMaybe<Scalars['Bytes']>;
  address_gt?: InputMaybe<Scalars['Bytes']>;
  address_gte?: InputMaybe<Scalars['Bytes']>;
  address_in?: InputMaybe<Array<Scalars['Bytes']>>;
  address_lt?: InputMaybe<Scalars['Bytes']>;
  address_lte?: InputMaybe<Scalars['Bytes']>;
  address_not?: InputMaybe<Scalars['Bytes']>;
  address_not_contains?: InputMaybe<Scalars['Bytes']>;
  address_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  and?: InputMaybe<Array<InputMaybe<DependencyScript_Filter>>>;
  dependency?: InputMaybe<Scalars['String']>;
  dependency_?: InputMaybe<Dependency_Filter>;
  dependency_contains?: InputMaybe<Scalars['String']>;
  dependency_contains_nocase?: InputMaybe<Scalars['String']>;
  dependency_ends_with?: InputMaybe<Scalars['String']>;
  dependency_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_gt?: InputMaybe<Scalars['String']>;
  dependency_gte?: InputMaybe<Scalars['String']>;
  dependency_in?: InputMaybe<Array<Scalars['String']>>;
  dependency_lt?: InputMaybe<Scalars['String']>;
  dependency_lte?: InputMaybe<Scalars['String']>;
  dependency_not?: InputMaybe<Scalars['String']>;
  dependency_not_contains?: InputMaybe<Scalars['String']>;
  dependency_not_contains_nocase?: InputMaybe<Scalars['String']>;
  dependency_not_ends_with?: InputMaybe<Scalars['String']>;
  dependency_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_not_in?: InputMaybe<Array<Scalars['String']>>;
  dependency_not_starts_with?: InputMaybe<Scalars['String']>;
  dependency_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dependency_starts_with?: InputMaybe<Scalars['String']>;
  dependency_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<DependencyScript_Filter>>>;
  script?: InputMaybe<Scalars['String']>;
  script_contains?: InputMaybe<Scalars['String']>;
  script_contains_nocase?: InputMaybe<Scalars['String']>;
  script_ends_with?: InputMaybe<Scalars['String']>;
  script_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_gt?: InputMaybe<Scalars['String']>;
  script_gte?: InputMaybe<Scalars['String']>;
  script_in?: InputMaybe<Array<Scalars['String']>>;
  script_lt?: InputMaybe<Scalars['String']>;
  script_lte?: InputMaybe<Scalars['String']>;
  script_not?: InputMaybe<Scalars['String']>;
  script_not_contains?: InputMaybe<Scalars['String']>;
  script_not_contains_nocase?: InputMaybe<Scalars['String']>;
  script_not_ends_with?: InputMaybe<Scalars['String']>;
  script_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_not_in?: InputMaybe<Array<Scalars['String']>>;
  script_not_starts_with?: InputMaybe<Scalars['String']>;
  script_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  script_starts_with?: InputMaybe<Scalars['String']>;
  script_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum DependencyScript_OrderBy {
  Address = 'address',
  Dependency = 'dependency',
  Id = 'id',
  Index = 'index',
  Script = 'script'
}

export type Dependency_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  additionalCDNCount?: InputMaybe<Scalars['BigInt']>;
  additionalCDNCount_gt?: InputMaybe<Scalars['BigInt']>;
  additionalCDNCount_gte?: InputMaybe<Scalars['BigInt']>;
  additionalCDNCount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalCDNCount_lt?: InputMaybe<Scalars['BigInt']>;
  additionalCDNCount_lte?: InputMaybe<Scalars['BigInt']>;
  additionalCDNCount_not?: InputMaybe<Scalars['BigInt']>;
  additionalCDNCount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalCDNs_?: InputMaybe<DependencyAdditionalCdn_Filter>;
  additionalRepositories_?: InputMaybe<DependencyAdditionalRepository_Filter>;
  additionalRepositoryCount?: InputMaybe<Scalars['BigInt']>;
  additionalRepositoryCount_gt?: InputMaybe<Scalars['BigInt']>;
  additionalRepositoryCount_gte?: InputMaybe<Scalars['BigInt']>;
  additionalRepositoryCount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalRepositoryCount_lt?: InputMaybe<Scalars['BigInt']>;
  additionalRepositoryCount_lte?: InputMaybe<Scalars['BigInt']>;
  additionalRepositoryCount_not?: InputMaybe<Scalars['BigInt']>;
  additionalRepositoryCount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  and?: InputMaybe<Array<InputMaybe<Dependency_Filter>>>;
  dependencyRegistry?: InputMaybe<Scalars['String']>;
  dependencyRegistry_?: InputMaybe<DependencyRegistry_Filter>;
  dependencyRegistry_contains?: InputMaybe<Scalars['String']>;
  dependencyRegistry_contains_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_ends_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_gt?: InputMaybe<Scalars['String']>;
  dependencyRegistry_gte?: InputMaybe<Scalars['String']>;
  dependencyRegistry_in?: InputMaybe<Array<Scalars['String']>>;
  dependencyRegistry_lt?: InputMaybe<Scalars['String']>;
  dependencyRegistry_lte?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_contains?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_contains_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_ends_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_in?: InputMaybe<Array<Scalars['String']>>;
  dependencyRegistry_not_starts_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dependencyRegistry_starts_with?: InputMaybe<Scalars['String']>;
  dependencyRegistry_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<Dependency_Filter>>>;
  preferredCDN?: InputMaybe<Scalars['String']>;
  preferredCDN_contains?: InputMaybe<Scalars['String']>;
  preferredCDN_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredCDN_ends_with?: InputMaybe<Scalars['String']>;
  preferredCDN_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredCDN_gt?: InputMaybe<Scalars['String']>;
  preferredCDN_gte?: InputMaybe<Scalars['String']>;
  preferredCDN_in?: InputMaybe<Array<Scalars['String']>>;
  preferredCDN_lt?: InputMaybe<Scalars['String']>;
  preferredCDN_lte?: InputMaybe<Scalars['String']>;
  preferredCDN_not?: InputMaybe<Scalars['String']>;
  preferredCDN_not_contains?: InputMaybe<Scalars['String']>;
  preferredCDN_not_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredCDN_not_ends_with?: InputMaybe<Scalars['String']>;
  preferredCDN_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredCDN_not_in?: InputMaybe<Array<Scalars['String']>>;
  preferredCDN_not_starts_with?: InputMaybe<Scalars['String']>;
  preferredCDN_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  preferredCDN_starts_with?: InputMaybe<Scalars['String']>;
  preferredCDN_starts_with_nocase?: InputMaybe<Scalars['String']>;
  preferredRepository?: InputMaybe<Scalars['String']>;
  preferredRepository_contains?: InputMaybe<Scalars['String']>;
  preferredRepository_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredRepository_ends_with?: InputMaybe<Scalars['String']>;
  preferredRepository_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredRepository_gt?: InputMaybe<Scalars['String']>;
  preferredRepository_gte?: InputMaybe<Scalars['String']>;
  preferredRepository_in?: InputMaybe<Array<Scalars['String']>>;
  preferredRepository_lt?: InputMaybe<Scalars['String']>;
  preferredRepository_lte?: InputMaybe<Scalars['String']>;
  preferredRepository_not?: InputMaybe<Scalars['String']>;
  preferredRepository_not_contains?: InputMaybe<Scalars['String']>;
  preferredRepository_not_contains_nocase?: InputMaybe<Scalars['String']>;
  preferredRepository_not_ends_with?: InputMaybe<Scalars['String']>;
  preferredRepository_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  preferredRepository_not_in?: InputMaybe<Array<Scalars['String']>>;
  preferredRepository_not_starts_with?: InputMaybe<Scalars['String']>;
  preferredRepository_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  preferredRepository_starts_with?: InputMaybe<Scalars['String']>;
  preferredRepository_starts_with_nocase?: InputMaybe<Scalars['String']>;
  referenceWebsite?: InputMaybe<Scalars['String']>;
  referenceWebsite_contains?: InputMaybe<Scalars['String']>;
  referenceWebsite_contains_nocase?: InputMaybe<Scalars['String']>;
  referenceWebsite_ends_with?: InputMaybe<Scalars['String']>;
  referenceWebsite_ends_with_nocase?: InputMaybe<Scalars['String']>;
  referenceWebsite_gt?: InputMaybe<Scalars['String']>;
  referenceWebsite_gte?: InputMaybe<Scalars['String']>;
  referenceWebsite_in?: InputMaybe<Array<Scalars['String']>>;
  referenceWebsite_lt?: InputMaybe<Scalars['String']>;
  referenceWebsite_lte?: InputMaybe<Scalars['String']>;
  referenceWebsite_not?: InputMaybe<Scalars['String']>;
  referenceWebsite_not_contains?: InputMaybe<Scalars['String']>;
  referenceWebsite_not_contains_nocase?: InputMaybe<Scalars['String']>;
  referenceWebsite_not_ends_with?: InputMaybe<Scalars['String']>;
  referenceWebsite_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  referenceWebsite_not_in?: InputMaybe<Array<Scalars['String']>>;
  referenceWebsite_not_starts_with?: InputMaybe<Scalars['String']>;
  referenceWebsite_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  referenceWebsite_starts_with?: InputMaybe<Scalars['String']>;
  referenceWebsite_starts_with_nocase?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  scriptCount?: InputMaybe<Scalars['BigInt']>;
  scriptCount_gt?: InputMaybe<Scalars['BigInt']>;
  scriptCount_gte?: InputMaybe<Scalars['BigInt']>;
  scriptCount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  scriptCount_lt?: InputMaybe<Scalars['BigInt']>;
  scriptCount_lte?: InputMaybe<Scalars['BigInt']>;
  scriptCount_not?: InputMaybe<Scalars['BigInt']>;
  scriptCount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  script_contains?: InputMaybe<Scalars['String']>;
  script_contains_nocase?: InputMaybe<Scalars['String']>;
  script_ends_with?: InputMaybe<Scalars['String']>;
  script_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_gt?: InputMaybe<Scalars['String']>;
  script_gte?: InputMaybe<Scalars['String']>;
  script_in?: InputMaybe<Array<Scalars['String']>>;
  script_lt?: InputMaybe<Scalars['String']>;
  script_lte?: InputMaybe<Scalars['String']>;
  script_not?: InputMaybe<Scalars['String']>;
  script_not_contains?: InputMaybe<Scalars['String']>;
  script_not_contains_nocase?: InputMaybe<Scalars['String']>;
  script_not_ends_with?: InputMaybe<Scalars['String']>;
  script_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_not_in?: InputMaybe<Array<Scalars['String']>>;
  script_not_starts_with?: InputMaybe<Scalars['String']>;
  script_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  script_starts_with?: InputMaybe<Scalars['String']>;
  script_starts_with_nocase?: InputMaybe<Scalars['String']>;
  scripts_?: InputMaybe<DependencyScript_Filter>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
};

export enum Dependency_OrderBy {
  AdditionalCdnCount = 'additionalCDNCount',
  AdditionalCdNs = 'additionalCDNs',
  AdditionalRepositories = 'additionalRepositories',
  AdditionalRepositoryCount = 'additionalRepositoryCount',
  DependencyRegistry = 'dependencyRegistry',
  Id = 'id',
  PreferredCdn = 'preferredCDN',
  PreferredRepository = 'preferredRepository',
  ReferenceWebsite = 'referenceWebsite',
  Script = 'script',
  ScriptCount = 'scriptCount',
  Scripts = 'scripts',
  UpdatedAt = 'updatedAt'
}

export type EngineRegistry = {
  __typename?: 'EngineRegistry';
  /** Unique identifier made up of the Engine Registry's contract address */
  id: Scalars['ID'];
  /** Core contracts that are registered on this Engine Registry, when this is most recent Engine Registry to add the contract */
  registeredContracts?: Maybe<Array<Contract>>;
};


export type EngineRegistryRegisteredContractsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Contract_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Contract_Filter>;
};

export type EngineRegistry_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<EngineRegistry_Filter>>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<EngineRegistry_Filter>>>;
  registeredContracts_?: InputMaybe<Contract_Filter>;
};

export enum EngineRegistry_OrderBy {
  Id = 'id',
  RegisteredContracts = 'registeredContracts'
}

export enum Exchange {
  /** LooksRare */
  LrV1 = 'LR_V1',
  /** Opensea Seaport */
  OsSp = 'OS_SP',
  /** Opensea V1 */
  OsV1 = 'OS_V1',
  /** Opensea V2 */
  OsV2 = 'OS_V2'
}

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']>;
  _gt?: InputMaybe<Scalars['Int']>;
  _gte?: InputMaybe<Scalars['Int']>;
  _in?: InputMaybe<Array<Scalars['Int']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['Int']>;
  _lte?: InputMaybe<Scalars['Int']>;
  _neq?: InputMaybe<Scalars['Int']>;
  _nin?: InputMaybe<Array<Scalars['Int']>>;
};

export type Minter = {
  __typename?: 'Minter';
  coreContract: Contract;
  /** Configuration details used by specific minters (json string) */
  extraMinterDetails: Scalars['String'];
  /** Unique identifier made up of minter contract address */
  id: Scalars['ID'];
  /** Maximum allowed half life in seconds (exponential Dutch auction minters) */
  maximumHalfLifeInSeconds?: Maybe<Scalars['BigInt']>;
  /** Minimum allowed auction length in seconds (linear Dutch auction minters) */
  minimumAuctionLengthInSeconds?: Maybe<Scalars['BigInt']>;
  /** Minimum allowed half life in seconds (exponential Dutch auction minters) */
  minimumHalfLifeInSeconds?: Maybe<Scalars['BigInt']>;
  /** Associated Minter Filter */
  minterFilter: MinterFilter;
  /** Receipts for this minter, only for minters with settlement */
  receipts?: Maybe<Array<Receipt>>;
  /** Minter type - String if minter returns it's type, empty string otherwise */
  type: Scalars['String'];
  updatedAt: Scalars['BigInt'];
};


export type MinterReceiptsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Receipt_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Receipt_Filter>;
};

export type MinterFilter = {
  __typename?: 'MinterFilter';
  /** Minters associated with MinterFilter */
  associatedMinters: Array<Minter>;
  /** Associated core contract */
  coreContract: Contract;
  /** Unique identifier made up of minter filter contract address */
  id: Scalars['ID'];
  /** Minters allowlisted on MinterFilter */
  minterAllowlist: Array<Minter>;
  updatedAt: Scalars['BigInt'];
};


export type MinterFilterAssociatedMintersArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Minter_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Minter_Filter>;
};


export type MinterFilterMinterAllowlistArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Minter_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Minter_Filter>;
};

export type MinterFilter_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<MinterFilter_Filter>>>;
  associatedMinters_?: InputMaybe<Minter_Filter>;
  coreContract?: InputMaybe<Scalars['String']>;
  coreContract_?: InputMaybe<Contract_Filter>;
  coreContract_contains?: InputMaybe<Scalars['String']>;
  coreContract_contains_nocase?: InputMaybe<Scalars['String']>;
  coreContract_ends_with?: InputMaybe<Scalars['String']>;
  coreContract_ends_with_nocase?: InputMaybe<Scalars['String']>;
  coreContract_gt?: InputMaybe<Scalars['String']>;
  coreContract_gte?: InputMaybe<Scalars['String']>;
  coreContract_in?: InputMaybe<Array<Scalars['String']>>;
  coreContract_lt?: InputMaybe<Scalars['String']>;
  coreContract_lte?: InputMaybe<Scalars['String']>;
  coreContract_not?: InputMaybe<Scalars['String']>;
  coreContract_not_contains?: InputMaybe<Scalars['String']>;
  coreContract_not_contains_nocase?: InputMaybe<Scalars['String']>;
  coreContract_not_ends_with?: InputMaybe<Scalars['String']>;
  coreContract_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  coreContract_not_in?: InputMaybe<Array<Scalars['String']>>;
  coreContract_not_starts_with?: InputMaybe<Scalars['String']>;
  coreContract_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  coreContract_starts_with?: InputMaybe<Scalars['String']>;
  coreContract_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  minterAllowlist?: InputMaybe<Array<Scalars['String']>>;
  minterAllowlist_?: InputMaybe<Minter_Filter>;
  minterAllowlist_contains?: InputMaybe<Array<Scalars['String']>>;
  minterAllowlist_contains_nocase?: InputMaybe<Array<Scalars['String']>>;
  minterAllowlist_not?: InputMaybe<Array<Scalars['String']>>;
  minterAllowlist_not_contains?: InputMaybe<Array<Scalars['String']>>;
  minterAllowlist_not_contains_nocase?: InputMaybe<Array<Scalars['String']>>;
  or?: InputMaybe<Array<InputMaybe<MinterFilter_Filter>>>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
};

export enum MinterFilter_OrderBy {
  AssociatedMinters = 'associatedMinters',
  CoreContract = 'coreContract',
  Id = 'id',
  MinterAllowlist = 'minterAllowlist',
  UpdatedAt = 'updatedAt'
}

export type Minter_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Minter_Filter>>>;
  coreContract?: InputMaybe<Scalars['String']>;
  coreContract_?: InputMaybe<Contract_Filter>;
  coreContract_contains?: InputMaybe<Scalars['String']>;
  coreContract_contains_nocase?: InputMaybe<Scalars['String']>;
  coreContract_ends_with?: InputMaybe<Scalars['String']>;
  coreContract_ends_with_nocase?: InputMaybe<Scalars['String']>;
  coreContract_gt?: InputMaybe<Scalars['String']>;
  coreContract_gte?: InputMaybe<Scalars['String']>;
  coreContract_in?: InputMaybe<Array<Scalars['String']>>;
  coreContract_lt?: InputMaybe<Scalars['String']>;
  coreContract_lte?: InputMaybe<Scalars['String']>;
  coreContract_not?: InputMaybe<Scalars['String']>;
  coreContract_not_contains?: InputMaybe<Scalars['String']>;
  coreContract_not_contains_nocase?: InputMaybe<Scalars['String']>;
  coreContract_not_ends_with?: InputMaybe<Scalars['String']>;
  coreContract_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  coreContract_not_in?: InputMaybe<Array<Scalars['String']>>;
  coreContract_not_starts_with?: InputMaybe<Scalars['String']>;
  coreContract_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  coreContract_starts_with?: InputMaybe<Scalars['String']>;
  coreContract_starts_with_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails?: InputMaybe<Scalars['String']>;
  extraMinterDetails_contains?: InputMaybe<Scalars['String']>;
  extraMinterDetails_contains_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_ends_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_ends_with_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_gt?: InputMaybe<Scalars['String']>;
  extraMinterDetails_gte?: InputMaybe<Scalars['String']>;
  extraMinterDetails_in?: InputMaybe<Array<Scalars['String']>>;
  extraMinterDetails_lt?: InputMaybe<Scalars['String']>;
  extraMinterDetails_lte?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_contains?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_contains_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_ends_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_in?: InputMaybe<Array<Scalars['String']>>;
  extraMinterDetails_not_starts_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_starts_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  maximumHalfLifeInSeconds?: InputMaybe<Scalars['BigInt']>;
  maximumHalfLifeInSeconds_gt?: InputMaybe<Scalars['BigInt']>;
  maximumHalfLifeInSeconds_gte?: InputMaybe<Scalars['BigInt']>;
  maximumHalfLifeInSeconds_in?: InputMaybe<Array<Scalars['BigInt']>>;
  maximumHalfLifeInSeconds_lt?: InputMaybe<Scalars['BigInt']>;
  maximumHalfLifeInSeconds_lte?: InputMaybe<Scalars['BigInt']>;
  maximumHalfLifeInSeconds_not?: InputMaybe<Scalars['BigInt']>;
  maximumHalfLifeInSeconds_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  minimumAuctionLengthInSeconds?: InputMaybe<Scalars['BigInt']>;
  minimumAuctionLengthInSeconds_gt?: InputMaybe<Scalars['BigInt']>;
  minimumAuctionLengthInSeconds_gte?: InputMaybe<Scalars['BigInt']>;
  minimumAuctionLengthInSeconds_in?: InputMaybe<Array<Scalars['BigInt']>>;
  minimumAuctionLengthInSeconds_lt?: InputMaybe<Scalars['BigInt']>;
  minimumAuctionLengthInSeconds_lte?: InputMaybe<Scalars['BigInt']>;
  minimumAuctionLengthInSeconds_not?: InputMaybe<Scalars['BigInt']>;
  minimumAuctionLengthInSeconds_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  minimumHalfLifeInSeconds?: InputMaybe<Scalars['BigInt']>;
  minimumHalfLifeInSeconds_gt?: InputMaybe<Scalars['BigInt']>;
  minimumHalfLifeInSeconds_gte?: InputMaybe<Scalars['BigInt']>;
  minimumHalfLifeInSeconds_in?: InputMaybe<Array<Scalars['BigInt']>>;
  minimumHalfLifeInSeconds_lt?: InputMaybe<Scalars['BigInt']>;
  minimumHalfLifeInSeconds_lte?: InputMaybe<Scalars['BigInt']>;
  minimumHalfLifeInSeconds_not?: InputMaybe<Scalars['BigInt']>;
  minimumHalfLifeInSeconds_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  minterFilter?: InputMaybe<Scalars['String']>;
  minterFilter_?: InputMaybe<MinterFilter_Filter>;
  minterFilter_contains?: InputMaybe<Scalars['String']>;
  minterFilter_contains_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_ends_with?: InputMaybe<Scalars['String']>;
  minterFilter_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_gt?: InputMaybe<Scalars['String']>;
  minterFilter_gte?: InputMaybe<Scalars['String']>;
  minterFilter_in?: InputMaybe<Array<Scalars['String']>>;
  minterFilter_lt?: InputMaybe<Scalars['String']>;
  minterFilter_lte?: InputMaybe<Scalars['String']>;
  minterFilter_not?: InputMaybe<Scalars['String']>;
  minterFilter_not_contains?: InputMaybe<Scalars['String']>;
  minterFilter_not_contains_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_not_ends_with?: InputMaybe<Scalars['String']>;
  minterFilter_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_not_in?: InputMaybe<Array<Scalars['String']>>;
  minterFilter_not_starts_with?: InputMaybe<Scalars['String']>;
  minterFilter_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  minterFilter_starts_with?: InputMaybe<Scalars['String']>;
  minterFilter_starts_with_nocase?: InputMaybe<Scalars['String']>;
  or?: InputMaybe<Array<InputMaybe<Minter_Filter>>>;
  receipts_?: InputMaybe<Receipt_Filter>;
  type?: InputMaybe<Scalars['String']>;
  type_contains?: InputMaybe<Scalars['String']>;
  type_contains_nocase?: InputMaybe<Scalars['String']>;
  type_ends_with?: InputMaybe<Scalars['String']>;
  type_ends_with_nocase?: InputMaybe<Scalars['String']>;
  type_gt?: InputMaybe<Scalars['String']>;
  type_gte?: InputMaybe<Scalars['String']>;
  type_in?: InputMaybe<Array<Scalars['String']>>;
  type_lt?: InputMaybe<Scalars['String']>;
  type_lte?: InputMaybe<Scalars['String']>;
  type_not?: InputMaybe<Scalars['String']>;
  type_not_contains?: InputMaybe<Scalars['String']>;
  type_not_contains_nocase?: InputMaybe<Scalars['String']>;
  type_not_ends_with?: InputMaybe<Scalars['String']>;
  type_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  type_not_in?: InputMaybe<Array<Scalars['String']>>;
  type_not_starts_with?: InputMaybe<Scalars['String']>;
  type_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  type_starts_with?: InputMaybe<Scalars['String']>;
  type_starts_with_nocase?: InputMaybe<Scalars['String']>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
};

export enum Minter_OrderBy {
  CoreContract = 'coreContract',
  ExtraMinterDetails = 'extraMinterDetails',
  Id = 'id',
  MaximumHalfLifeInSeconds = 'maximumHalfLifeInSeconds',
  MinimumAuctionLengthInSeconds = 'minimumAuctionLengthInSeconds',
  MinimumHalfLifeInSeconds = 'minimumHalfLifeInSeconds',
  MinterFilter = 'minterFilter',
  Receipts = 'receipts',
  Type = 'type',
  UpdatedAt = 'updatedAt'
}

export type OpenseaCollectionData = {
  __typename?: 'OpenseaCollectionData';
  projectId: Scalars['String'];
  url: Scalars['String'];
};

/** Defines the order direction, either ascending or descending */
export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type Payment = {
  __typename?: 'Payment';
  /** Payment id formatted: '{SaleId}-{paymentNumber}' (paymentNumber will be 0 for non-Seaport trades) */
  id: Scalars['ID'];
  /** The address of the token used for the payment */
  paymentToken: Scalars['Bytes'];
  /** Type of token transferred in this payment */
  paymentType: PaymentType;
  /** The price of the sale */
  price: Scalars['BigInt'];
  /** The recipient address */
  recipient: Scalars['Bytes'];
  /** The associated sale */
  sale: Sale;
};

export enum PaymentType {
  Erc20 = 'ERC20',
  Erc721 = 'ERC721',
  Erc1155 = 'ERC1155',
  Native = 'Native'
}

export type Payment_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Payment_Filter>>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<Payment_Filter>>>;
  paymentToken?: InputMaybe<Scalars['Bytes']>;
  paymentToken_contains?: InputMaybe<Scalars['Bytes']>;
  paymentToken_gt?: InputMaybe<Scalars['Bytes']>;
  paymentToken_gte?: InputMaybe<Scalars['Bytes']>;
  paymentToken_in?: InputMaybe<Array<Scalars['Bytes']>>;
  paymentToken_lt?: InputMaybe<Scalars['Bytes']>;
  paymentToken_lte?: InputMaybe<Scalars['Bytes']>;
  paymentToken_not?: InputMaybe<Scalars['Bytes']>;
  paymentToken_not_contains?: InputMaybe<Scalars['Bytes']>;
  paymentToken_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  paymentType?: InputMaybe<PaymentType>;
  paymentType_in?: InputMaybe<Array<PaymentType>>;
  paymentType_not?: InputMaybe<PaymentType>;
  paymentType_not_in?: InputMaybe<Array<PaymentType>>;
  price?: InputMaybe<Scalars['BigInt']>;
  price_gt?: InputMaybe<Scalars['BigInt']>;
  price_gte?: InputMaybe<Scalars['BigInt']>;
  price_in?: InputMaybe<Array<Scalars['BigInt']>>;
  price_lt?: InputMaybe<Scalars['BigInt']>;
  price_lte?: InputMaybe<Scalars['BigInt']>;
  price_not?: InputMaybe<Scalars['BigInt']>;
  price_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  recipient?: InputMaybe<Scalars['Bytes']>;
  recipient_contains?: InputMaybe<Scalars['Bytes']>;
  recipient_gt?: InputMaybe<Scalars['Bytes']>;
  recipient_gte?: InputMaybe<Scalars['Bytes']>;
  recipient_in?: InputMaybe<Array<Scalars['Bytes']>>;
  recipient_lt?: InputMaybe<Scalars['Bytes']>;
  recipient_lte?: InputMaybe<Scalars['Bytes']>;
  recipient_not?: InputMaybe<Scalars['Bytes']>;
  recipient_not_contains?: InputMaybe<Scalars['Bytes']>;
  recipient_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  sale?: InputMaybe<Scalars['String']>;
  sale_?: InputMaybe<Sale_Filter>;
  sale_contains?: InputMaybe<Scalars['String']>;
  sale_contains_nocase?: InputMaybe<Scalars['String']>;
  sale_ends_with?: InputMaybe<Scalars['String']>;
  sale_ends_with_nocase?: InputMaybe<Scalars['String']>;
  sale_gt?: InputMaybe<Scalars['String']>;
  sale_gte?: InputMaybe<Scalars['String']>;
  sale_in?: InputMaybe<Array<Scalars['String']>>;
  sale_lt?: InputMaybe<Scalars['String']>;
  sale_lte?: InputMaybe<Scalars['String']>;
  sale_not?: InputMaybe<Scalars['String']>;
  sale_not_contains?: InputMaybe<Scalars['String']>;
  sale_not_contains_nocase?: InputMaybe<Scalars['String']>;
  sale_not_ends_with?: InputMaybe<Scalars['String']>;
  sale_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  sale_not_in?: InputMaybe<Array<Scalars['String']>>;
  sale_not_starts_with?: InputMaybe<Scalars['String']>;
  sale_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  sale_starts_with?: InputMaybe<Scalars['String']>;
  sale_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum Payment_OrderBy {
  Id = 'id',
  PaymentToken = 'paymentToken',
  PaymentType = 'paymentType',
  Price = 'price',
  Recipient = 'recipient',
  Sale = 'sale'
}

export type Project = {
  __typename?: 'Project';
  activatedAt?: Maybe<Scalars['BigInt']>;
  /** Determines if the project should be visible to the public */
  active: Scalars['Boolean'];
  /** Address to split primary sales with the artist */
  additionalPayee?: Maybe<Scalars['Bytes']>;
  /** Percentage of artist's share of primary sales that goes to additional payee */
  additionalPayeePercentage?: Maybe<Scalars['BigInt']>;
  /** Address to split Secondary sales with the artist */
  additionalPayeeSecondarySalesAddress?: Maybe<Scalars['Bytes']>;
  /** Percentage of artist's share of secondary sales that goes to additional payee */
  additionalPayeeSecondarySalesPercentage?: Maybe<Scalars['BigInt']>;
  /** Artist that created the project */
  artist: Account;
  /** Wallet address of the artist */
  artistAddress: Scalars['Bytes'];
  /** Artist name */
  artistName?: Maybe<Scalars['String']>;
  /** Aspect ratio of the project (see `scriptJSON` if null) */
  aspectRatio?: Maybe<Scalars['String']>;
  baseIpfsUri?: Maybe<Scalars['String']>;
  baseUri?: Maybe<Scalars['String']>;
  /** A project is complete when it has reached its maximum invocations */
  complete: Scalars['Boolean'];
  /** Timestamp at which a project was completed */
  completedAt?: Maybe<Scalars['BigInt']>;
  contract: Contract;
  createdAt: Scalars['BigInt'];
  /** Curated, playground, factory. A project with no curation status is considered factory */
  curationStatus?: Maybe<Scalars['String']>;
  /** ERC-20 contract address if the project is purchasable via ERC-20 */
  currencyAddress?: Maybe<Scalars['Bytes']>;
  /** Currency symbol for ERC-20 */
  currencySymbol?: Maybe<Scalars['String']>;
  /** Artist description of the project */
  description?: Maybe<Scalars['String']>;
  /** Is the project dynamic or a static image */
  dynamic: Scalars['Boolean'];
  externalAssetDependencies: Array<ProjectExternalAssetDependency>;
  /** Once the project's external asset dependencies are locked they may never be modified again */
  externalAssetDependenciesLocked: Scalars['Boolean'];
  /** The number of external asset dependencies stored on-chain */
  externalAssetDependencyCount: Scalars['BigInt'];
  /** Unique identifier made up of contract address and project id */
  id: Scalars['ID'];
  /** Number of times the project has been invoked - number of tokens of the project */
  invocations: Scalars['BigInt'];
  ipfsHash?: Maybe<Scalars['String']>;
  /** License for the project */
  license?: Maybe<Scalars['String']>;
  /** For V3 and-on, this field is null, and projects lock 4 weeks after `completedAt`. Once the project is locked its script may never be updated again. */
  locked?: Maybe<Scalars['Boolean']>;
  /** Maximum number of invocations allowed for the project. Note that minter contracts may additionally limit a project's maxInvocations on a specific minter. */
  maxInvocations: Scalars['BigInt'];
  /** Minter configuration for this project (not implemented prior to minter filters) */
  minterConfiguration?: Maybe<ProjectMinterConfiguration>;
  /** Project name */
  name?: Maybe<Scalars['String']>;
  /** Accounts that own tokens of the project */
  owners?: Maybe<Array<AccountProject>>;
  /** Purchases paused */
  paused: Scalars['Boolean'];
  pricePerTokenInWei: Scalars['BigInt'];
  /** ID of the project on the contract */
  projectId: Scalars['BigInt'];
  /** Proposed Artist addresses and payment split percentages */
  proposedArtistAddressesAndSplits?: Maybe<ProposedArtistAddressesAndSplit>;
  /** Receipts for this project, only on minters with settlement */
  receipts?: Maybe<Array<Receipt>>;
  /** Artist/additional payee royalty percentage */
  royaltyPercentage?: Maybe<Scalars['BigInt']>;
  /** Lookup table to get the Sale history of the project */
  saleLookupTables: Array<SaleLookupTable>;
  /** The full script composed of scripts */
  script?: Maybe<Scalars['String']>;
  /** The number of scripts stored on-chain */
  scriptCount: Scalars['BigInt'];
  /** Extra information about the script and rendering options */
  scriptJSON?: Maybe<Scalars['String']>;
  /** Script type and version (see `scriptJSON` if null) */
  scriptTypeAndVersion?: Maybe<Scalars['String']>;
  scriptUpdatedAt?: Maybe<Scalars['BigInt']>;
  /** Parts of the project script */
  scripts?: Maybe<Array<ProjectScript>>;
  /** Tokens of the project */
  tokens?: Maybe<Array<Token>>;
  updatedAt: Scalars['BigInt'];
  /** Does the project actually use the hash string */
  useHashString: Scalars['Boolean'];
  /** Does the project use media from ipfs */
  useIpfs?: Maybe<Scalars['Boolean']>;
  /** Artist or project website */
  website?: Maybe<Scalars['String']>;
};


export type ProjectExternalAssetDependenciesArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectExternalAssetDependency_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<ProjectExternalAssetDependency_Filter>;
};


export type ProjectOwnersArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AccountProject_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<AccountProject_Filter>;
};


export type ProjectReceiptsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Receipt_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Receipt_Filter>;
};


export type ProjectSaleLookupTablesArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<SaleLookupTable_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<SaleLookupTable_Filter>;
};


export type ProjectScriptsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectScript_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<ProjectScript_Filter>;
};


export type ProjectTokensArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Token_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Token_Filter>;
};

export type ProjectExternalAssetDependency = {
  __typename?: 'ProjectExternalAssetDependency';
  /** The dependency cid */
  cid: Scalars['String'];
  /** The dependency type */
  dependencyType: ProjectExternalAssetDependencyType;
  /** Unique identifier made up of projectId-index */
  id: Scalars['ID'];
  /** The dependency index */
  index: Scalars['BigInt'];
  /** The associated project */
  project: Project;
};

export enum ProjectExternalAssetDependencyType {
  /** Asset hosted on Arweave */
  Arweave = 'ARWEAVE',
  /** Asset hosted on IPFS */
  Ipfs = 'IPFS'
}

export type ProjectExternalAssetDependency_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<ProjectExternalAssetDependency_Filter>>>;
  cid?: InputMaybe<Scalars['String']>;
  cid_contains?: InputMaybe<Scalars['String']>;
  cid_contains_nocase?: InputMaybe<Scalars['String']>;
  cid_ends_with?: InputMaybe<Scalars['String']>;
  cid_ends_with_nocase?: InputMaybe<Scalars['String']>;
  cid_gt?: InputMaybe<Scalars['String']>;
  cid_gte?: InputMaybe<Scalars['String']>;
  cid_in?: InputMaybe<Array<Scalars['String']>>;
  cid_lt?: InputMaybe<Scalars['String']>;
  cid_lte?: InputMaybe<Scalars['String']>;
  cid_not?: InputMaybe<Scalars['String']>;
  cid_not_contains?: InputMaybe<Scalars['String']>;
  cid_not_contains_nocase?: InputMaybe<Scalars['String']>;
  cid_not_ends_with?: InputMaybe<Scalars['String']>;
  cid_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  cid_not_in?: InputMaybe<Array<Scalars['String']>>;
  cid_not_starts_with?: InputMaybe<Scalars['String']>;
  cid_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  cid_starts_with?: InputMaybe<Scalars['String']>;
  cid_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dependencyType?: InputMaybe<ProjectExternalAssetDependencyType>;
  dependencyType_in?: InputMaybe<Array<ProjectExternalAssetDependencyType>>;
  dependencyType_not?: InputMaybe<ProjectExternalAssetDependencyType>;
  dependencyType_not_in?: InputMaybe<Array<ProjectExternalAssetDependencyType>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<ProjectExternalAssetDependency_Filter>>>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum ProjectExternalAssetDependency_OrderBy {
  Cid = 'cid',
  DependencyType = 'dependencyType',
  Id = 'id',
  Index = 'index',
  Project = 'project'
}

export type ProjectMinterConfiguration = {
  __typename?: 'ProjectMinterConfiguration';
  /** price of token or resting price of Duch auction, in wei */
  basePrice?: Maybe<Scalars['BigInt']>;
  /** currency address as defined on minter - address(0) reserved for ether */
  currencyAddress: Scalars['Bytes'];
  /** currency symbol as defined on minter - ETH reserved for ether */
  currencySymbol: Scalars['String'];
  /** Linear Dutch auction end time (unix timestamp) */
  endTime?: Maybe<Scalars['BigInt']>;
  /** Configuration details used by specific minter project configurations (json string) */
  extraMinterDetails: Scalars['String'];
  /** Half life for exponential decay Dutch auction, in seconds */
  halfLifeSeconds?: Maybe<Scalars['BigInt']>;
  /** Unique identifier made up of minter contract address-projectId */
  id: Scalars['ID'];
  /** Maximum number of invocations allowed for the project (on the minter). If less than than a project's maximum invocations defined on a core contract, the minter contract will limit this project's maximum invocations */
  maxInvocations?: Maybe<Scalars['BigInt']>;
  /** The associated minter */
  minter: Minter;
  /** true if project's token price has been configured on minter */
  priceIsConfigured: Scalars['Boolean'];
  /** The associated project */
  project: Project;
  /** Defines if purchasing token to another is allowed */
  purchaseToDisabled: Scalars['Boolean'];
  /** Dutch auction start price, in wei */
  startPrice?: Maybe<Scalars['BigInt']>;
  /** Dutch auction start time (unix timestamp) */
  startTime?: Maybe<Scalars['BigInt']>;
};

export type ProjectMinterConfiguration_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<ProjectMinterConfiguration_Filter>>>;
  basePrice?: InputMaybe<Scalars['BigInt']>;
  basePrice_gt?: InputMaybe<Scalars['BigInt']>;
  basePrice_gte?: InputMaybe<Scalars['BigInt']>;
  basePrice_in?: InputMaybe<Array<Scalars['BigInt']>>;
  basePrice_lt?: InputMaybe<Scalars['BigInt']>;
  basePrice_lte?: InputMaybe<Scalars['BigInt']>;
  basePrice_not?: InputMaybe<Scalars['BigInt']>;
  basePrice_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  currencyAddress?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_contains?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_gt?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_gte?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  currencyAddress_lt?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_lte?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_not?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  currencySymbol?: InputMaybe<Scalars['String']>;
  currencySymbol_contains?: InputMaybe<Scalars['String']>;
  currencySymbol_contains_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_ends_with?: InputMaybe<Scalars['String']>;
  currencySymbol_ends_with_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_gt?: InputMaybe<Scalars['String']>;
  currencySymbol_gte?: InputMaybe<Scalars['String']>;
  currencySymbol_in?: InputMaybe<Array<Scalars['String']>>;
  currencySymbol_lt?: InputMaybe<Scalars['String']>;
  currencySymbol_lte?: InputMaybe<Scalars['String']>;
  currencySymbol_not?: InputMaybe<Scalars['String']>;
  currencySymbol_not_contains?: InputMaybe<Scalars['String']>;
  currencySymbol_not_contains_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_not_ends_with?: InputMaybe<Scalars['String']>;
  currencySymbol_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_not_in?: InputMaybe<Array<Scalars['String']>>;
  currencySymbol_not_starts_with?: InputMaybe<Scalars['String']>;
  currencySymbol_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_starts_with?: InputMaybe<Scalars['String']>;
  currencySymbol_starts_with_nocase?: InputMaybe<Scalars['String']>;
  endTime?: InputMaybe<Scalars['BigInt']>;
  endTime_gt?: InputMaybe<Scalars['BigInt']>;
  endTime_gte?: InputMaybe<Scalars['BigInt']>;
  endTime_in?: InputMaybe<Array<Scalars['BigInt']>>;
  endTime_lt?: InputMaybe<Scalars['BigInt']>;
  endTime_lte?: InputMaybe<Scalars['BigInt']>;
  endTime_not?: InputMaybe<Scalars['BigInt']>;
  endTime_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  extraMinterDetails?: InputMaybe<Scalars['String']>;
  extraMinterDetails_contains?: InputMaybe<Scalars['String']>;
  extraMinterDetails_contains_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_ends_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_ends_with_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_gt?: InputMaybe<Scalars['String']>;
  extraMinterDetails_gte?: InputMaybe<Scalars['String']>;
  extraMinterDetails_in?: InputMaybe<Array<Scalars['String']>>;
  extraMinterDetails_lt?: InputMaybe<Scalars['String']>;
  extraMinterDetails_lte?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_contains?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_contains_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_ends_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_in?: InputMaybe<Array<Scalars['String']>>;
  extraMinterDetails_not_starts_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  extraMinterDetails_starts_with?: InputMaybe<Scalars['String']>;
  extraMinterDetails_starts_with_nocase?: InputMaybe<Scalars['String']>;
  halfLifeSeconds?: InputMaybe<Scalars['BigInt']>;
  halfLifeSeconds_gt?: InputMaybe<Scalars['BigInt']>;
  halfLifeSeconds_gte?: InputMaybe<Scalars['BigInt']>;
  halfLifeSeconds_in?: InputMaybe<Array<Scalars['BigInt']>>;
  halfLifeSeconds_lt?: InputMaybe<Scalars['BigInt']>;
  halfLifeSeconds_lte?: InputMaybe<Scalars['BigInt']>;
  halfLifeSeconds_not?: InputMaybe<Scalars['BigInt']>;
  halfLifeSeconds_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  maxInvocations?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_gt?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_gte?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_in?: InputMaybe<Array<Scalars['BigInt']>>;
  maxInvocations_lt?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_lte?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_not?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  minter?: InputMaybe<Scalars['String']>;
  minter_?: InputMaybe<Minter_Filter>;
  minter_contains?: InputMaybe<Scalars['String']>;
  minter_contains_nocase?: InputMaybe<Scalars['String']>;
  minter_ends_with?: InputMaybe<Scalars['String']>;
  minter_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minter_gt?: InputMaybe<Scalars['String']>;
  minter_gte?: InputMaybe<Scalars['String']>;
  minter_in?: InputMaybe<Array<Scalars['String']>>;
  minter_lt?: InputMaybe<Scalars['String']>;
  minter_lte?: InputMaybe<Scalars['String']>;
  minter_not?: InputMaybe<Scalars['String']>;
  minter_not_contains?: InputMaybe<Scalars['String']>;
  minter_not_contains_nocase?: InputMaybe<Scalars['String']>;
  minter_not_ends_with?: InputMaybe<Scalars['String']>;
  minter_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minter_not_in?: InputMaybe<Array<Scalars['String']>>;
  minter_not_starts_with?: InputMaybe<Scalars['String']>;
  minter_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  minter_starts_with?: InputMaybe<Scalars['String']>;
  minter_starts_with_nocase?: InputMaybe<Scalars['String']>;
  or?: InputMaybe<Array<InputMaybe<ProjectMinterConfiguration_Filter>>>;
  priceIsConfigured?: InputMaybe<Scalars['Boolean']>;
  priceIsConfigured_in?: InputMaybe<Array<Scalars['Boolean']>>;
  priceIsConfigured_not?: InputMaybe<Scalars['Boolean']>;
  priceIsConfigured_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
  purchaseToDisabled?: InputMaybe<Scalars['Boolean']>;
  purchaseToDisabled_in?: InputMaybe<Array<Scalars['Boolean']>>;
  purchaseToDisabled_not?: InputMaybe<Scalars['Boolean']>;
  purchaseToDisabled_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  startPrice?: InputMaybe<Scalars['BigInt']>;
  startPrice_gt?: InputMaybe<Scalars['BigInt']>;
  startPrice_gte?: InputMaybe<Scalars['BigInt']>;
  startPrice_in?: InputMaybe<Array<Scalars['BigInt']>>;
  startPrice_lt?: InputMaybe<Scalars['BigInt']>;
  startPrice_lte?: InputMaybe<Scalars['BigInt']>;
  startPrice_not?: InputMaybe<Scalars['BigInt']>;
  startPrice_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  startTime?: InputMaybe<Scalars['BigInt']>;
  startTime_gt?: InputMaybe<Scalars['BigInt']>;
  startTime_gte?: InputMaybe<Scalars['BigInt']>;
  startTime_in?: InputMaybe<Array<Scalars['BigInt']>>;
  startTime_lt?: InputMaybe<Scalars['BigInt']>;
  startTime_lte?: InputMaybe<Scalars['BigInt']>;
  startTime_not?: InputMaybe<Scalars['BigInt']>;
  startTime_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
};

export enum ProjectMinterConfiguration_OrderBy {
  BasePrice = 'basePrice',
  CurrencyAddress = 'currencyAddress',
  CurrencySymbol = 'currencySymbol',
  EndTime = 'endTime',
  ExtraMinterDetails = 'extraMinterDetails',
  HalfLifeSeconds = 'halfLifeSeconds',
  Id = 'id',
  MaxInvocations = 'maxInvocations',
  Minter = 'minter',
  PriceIsConfigured = 'priceIsConfigured',
  Project = 'project',
  PurchaseToDisabled = 'purchaseToDisabled',
  StartPrice = 'startPrice',
  StartTime = 'startTime'
}

export type ProjectScript = {
  __typename?: 'ProjectScript';
  id: Scalars['ID'];
  index: Scalars['BigInt'];
  project: Project;
  script: Scalars['String'];
};

export type ProjectScript_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<ProjectScript_Filter>>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<ProjectScript_Filter>>>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  script_contains?: InputMaybe<Scalars['String']>;
  script_contains_nocase?: InputMaybe<Scalars['String']>;
  script_ends_with?: InputMaybe<Scalars['String']>;
  script_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_gt?: InputMaybe<Scalars['String']>;
  script_gte?: InputMaybe<Scalars['String']>;
  script_in?: InputMaybe<Array<Scalars['String']>>;
  script_lt?: InputMaybe<Scalars['String']>;
  script_lte?: InputMaybe<Scalars['String']>;
  script_not?: InputMaybe<Scalars['String']>;
  script_not_contains?: InputMaybe<Scalars['String']>;
  script_not_contains_nocase?: InputMaybe<Scalars['String']>;
  script_not_ends_with?: InputMaybe<Scalars['String']>;
  script_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_not_in?: InputMaybe<Array<Scalars['String']>>;
  script_not_starts_with?: InputMaybe<Scalars['String']>;
  script_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  script_starts_with?: InputMaybe<Scalars['String']>;
  script_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum ProjectScript_OrderBy {
  Id = 'id',
  Index = 'index',
  Project = 'project',
  Script = 'script'
}

export type Project_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  activatedAt?: InputMaybe<Scalars['BigInt']>;
  activatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  activatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  activatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  activatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  activatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  activatedAt_not?: InputMaybe<Scalars['BigInt']>;
  activatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  active?: InputMaybe<Scalars['Boolean']>;
  active_in?: InputMaybe<Array<Scalars['Boolean']>>;
  active_not?: InputMaybe<Scalars['Boolean']>;
  active_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  additionalPayee?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePercentage?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePercentage_gt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePercentage_gte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePercentage_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalPayeePercentage_lt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePercentage_lte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePercentage_not?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePercentage_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalPayeeSecondarySalesAddress?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_gt?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_gte?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  additionalPayeeSecondarySalesAddress_lt?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_lte?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_not?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  additionalPayeeSecondarySalesPercentage?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_gt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_gte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalPayeeSecondarySalesPercentage_lt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_lte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_not?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalPayee_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayee_gt?: InputMaybe<Scalars['Bytes']>;
  additionalPayee_gte?: InputMaybe<Scalars['Bytes']>;
  additionalPayee_in?: InputMaybe<Array<Scalars['Bytes']>>;
  additionalPayee_lt?: InputMaybe<Scalars['Bytes']>;
  additionalPayee_lte?: InputMaybe<Scalars['Bytes']>;
  additionalPayee_not?: InputMaybe<Scalars['Bytes']>;
  additionalPayee_not_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayee_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  and?: InputMaybe<Array<InputMaybe<Project_Filter>>>;
  artist?: InputMaybe<Scalars['String']>;
  artistAddress?: InputMaybe<Scalars['Bytes']>;
  artistAddress_contains?: InputMaybe<Scalars['Bytes']>;
  artistAddress_gt?: InputMaybe<Scalars['Bytes']>;
  artistAddress_gte?: InputMaybe<Scalars['Bytes']>;
  artistAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  artistAddress_lt?: InputMaybe<Scalars['Bytes']>;
  artistAddress_lte?: InputMaybe<Scalars['Bytes']>;
  artistAddress_not?: InputMaybe<Scalars['Bytes']>;
  artistAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  artistAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  artistName?: InputMaybe<Scalars['String']>;
  artistName_contains?: InputMaybe<Scalars['String']>;
  artistName_contains_nocase?: InputMaybe<Scalars['String']>;
  artistName_ends_with?: InputMaybe<Scalars['String']>;
  artistName_ends_with_nocase?: InputMaybe<Scalars['String']>;
  artistName_gt?: InputMaybe<Scalars['String']>;
  artistName_gte?: InputMaybe<Scalars['String']>;
  artistName_in?: InputMaybe<Array<Scalars['String']>>;
  artistName_lt?: InputMaybe<Scalars['String']>;
  artistName_lte?: InputMaybe<Scalars['String']>;
  artistName_not?: InputMaybe<Scalars['String']>;
  artistName_not_contains?: InputMaybe<Scalars['String']>;
  artistName_not_contains_nocase?: InputMaybe<Scalars['String']>;
  artistName_not_ends_with?: InputMaybe<Scalars['String']>;
  artistName_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  artistName_not_in?: InputMaybe<Array<Scalars['String']>>;
  artistName_not_starts_with?: InputMaybe<Scalars['String']>;
  artistName_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  artistName_starts_with?: InputMaybe<Scalars['String']>;
  artistName_starts_with_nocase?: InputMaybe<Scalars['String']>;
  artist_?: InputMaybe<Account_Filter>;
  artist_contains?: InputMaybe<Scalars['String']>;
  artist_contains_nocase?: InputMaybe<Scalars['String']>;
  artist_ends_with?: InputMaybe<Scalars['String']>;
  artist_ends_with_nocase?: InputMaybe<Scalars['String']>;
  artist_gt?: InputMaybe<Scalars['String']>;
  artist_gte?: InputMaybe<Scalars['String']>;
  artist_in?: InputMaybe<Array<Scalars['String']>>;
  artist_lt?: InputMaybe<Scalars['String']>;
  artist_lte?: InputMaybe<Scalars['String']>;
  artist_not?: InputMaybe<Scalars['String']>;
  artist_not_contains?: InputMaybe<Scalars['String']>;
  artist_not_contains_nocase?: InputMaybe<Scalars['String']>;
  artist_not_ends_with?: InputMaybe<Scalars['String']>;
  artist_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  artist_not_in?: InputMaybe<Array<Scalars['String']>>;
  artist_not_starts_with?: InputMaybe<Scalars['String']>;
  artist_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  artist_starts_with?: InputMaybe<Scalars['String']>;
  artist_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aspectRatio?: InputMaybe<Scalars['String']>;
  aspectRatio_contains?: InputMaybe<Scalars['String']>;
  aspectRatio_contains_nocase?: InputMaybe<Scalars['String']>;
  aspectRatio_ends_with?: InputMaybe<Scalars['String']>;
  aspectRatio_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aspectRatio_gt?: InputMaybe<Scalars['String']>;
  aspectRatio_gte?: InputMaybe<Scalars['String']>;
  aspectRatio_in?: InputMaybe<Array<Scalars['String']>>;
  aspectRatio_lt?: InputMaybe<Scalars['String']>;
  aspectRatio_lte?: InputMaybe<Scalars['String']>;
  aspectRatio_not?: InputMaybe<Scalars['String']>;
  aspectRatio_not_contains?: InputMaybe<Scalars['String']>;
  aspectRatio_not_contains_nocase?: InputMaybe<Scalars['String']>;
  aspectRatio_not_ends_with?: InputMaybe<Scalars['String']>;
  aspectRatio_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  aspectRatio_not_in?: InputMaybe<Array<Scalars['String']>>;
  aspectRatio_not_starts_with?: InputMaybe<Scalars['String']>;
  aspectRatio_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  aspectRatio_starts_with?: InputMaybe<Scalars['String']>;
  aspectRatio_starts_with_nocase?: InputMaybe<Scalars['String']>;
  baseIpfsUri?: InputMaybe<Scalars['String']>;
  baseIpfsUri_contains?: InputMaybe<Scalars['String']>;
  baseIpfsUri_contains_nocase?: InputMaybe<Scalars['String']>;
  baseIpfsUri_ends_with?: InputMaybe<Scalars['String']>;
  baseIpfsUri_ends_with_nocase?: InputMaybe<Scalars['String']>;
  baseIpfsUri_gt?: InputMaybe<Scalars['String']>;
  baseIpfsUri_gte?: InputMaybe<Scalars['String']>;
  baseIpfsUri_in?: InputMaybe<Array<Scalars['String']>>;
  baseIpfsUri_lt?: InputMaybe<Scalars['String']>;
  baseIpfsUri_lte?: InputMaybe<Scalars['String']>;
  baseIpfsUri_not?: InputMaybe<Scalars['String']>;
  baseIpfsUri_not_contains?: InputMaybe<Scalars['String']>;
  baseIpfsUri_not_contains_nocase?: InputMaybe<Scalars['String']>;
  baseIpfsUri_not_ends_with?: InputMaybe<Scalars['String']>;
  baseIpfsUri_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  baseIpfsUri_not_in?: InputMaybe<Array<Scalars['String']>>;
  baseIpfsUri_not_starts_with?: InputMaybe<Scalars['String']>;
  baseIpfsUri_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  baseIpfsUri_starts_with?: InputMaybe<Scalars['String']>;
  baseIpfsUri_starts_with_nocase?: InputMaybe<Scalars['String']>;
  baseUri?: InputMaybe<Scalars['String']>;
  baseUri_contains?: InputMaybe<Scalars['String']>;
  baseUri_contains_nocase?: InputMaybe<Scalars['String']>;
  baseUri_ends_with?: InputMaybe<Scalars['String']>;
  baseUri_ends_with_nocase?: InputMaybe<Scalars['String']>;
  baseUri_gt?: InputMaybe<Scalars['String']>;
  baseUri_gte?: InputMaybe<Scalars['String']>;
  baseUri_in?: InputMaybe<Array<Scalars['String']>>;
  baseUri_lt?: InputMaybe<Scalars['String']>;
  baseUri_lte?: InputMaybe<Scalars['String']>;
  baseUri_not?: InputMaybe<Scalars['String']>;
  baseUri_not_contains?: InputMaybe<Scalars['String']>;
  baseUri_not_contains_nocase?: InputMaybe<Scalars['String']>;
  baseUri_not_ends_with?: InputMaybe<Scalars['String']>;
  baseUri_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  baseUri_not_in?: InputMaybe<Array<Scalars['String']>>;
  baseUri_not_starts_with?: InputMaybe<Scalars['String']>;
  baseUri_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  baseUri_starts_with?: InputMaybe<Scalars['String']>;
  baseUri_starts_with_nocase?: InputMaybe<Scalars['String']>;
  complete?: InputMaybe<Scalars['Boolean']>;
  complete_in?: InputMaybe<Array<Scalars['Boolean']>>;
  complete_not?: InputMaybe<Scalars['Boolean']>;
  complete_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  completedAt?: InputMaybe<Scalars['BigInt']>;
  completedAt_gt?: InputMaybe<Scalars['BigInt']>;
  completedAt_gte?: InputMaybe<Scalars['BigInt']>;
  completedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  completedAt_lt?: InputMaybe<Scalars['BigInt']>;
  completedAt_lte?: InputMaybe<Scalars['BigInt']>;
  completedAt_not?: InputMaybe<Scalars['BigInt']>;
  completedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  contract?: InputMaybe<Scalars['String']>;
  contract_?: InputMaybe<Contract_Filter>;
  contract_contains?: InputMaybe<Scalars['String']>;
  contract_contains_nocase?: InputMaybe<Scalars['String']>;
  contract_ends_with?: InputMaybe<Scalars['String']>;
  contract_ends_with_nocase?: InputMaybe<Scalars['String']>;
  contract_gt?: InputMaybe<Scalars['String']>;
  contract_gte?: InputMaybe<Scalars['String']>;
  contract_in?: InputMaybe<Array<Scalars['String']>>;
  contract_lt?: InputMaybe<Scalars['String']>;
  contract_lte?: InputMaybe<Scalars['String']>;
  contract_not?: InputMaybe<Scalars['String']>;
  contract_not_contains?: InputMaybe<Scalars['String']>;
  contract_not_contains_nocase?: InputMaybe<Scalars['String']>;
  contract_not_ends_with?: InputMaybe<Scalars['String']>;
  contract_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  contract_not_in?: InputMaybe<Array<Scalars['String']>>;
  contract_not_starts_with?: InputMaybe<Scalars['String']>;
  contract_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  contract_starts_with?: InputMaybe<Scalars['String']>;
  contract_starts_with_nocase?: InputMaybe<Scalars['String']>;
  createdAt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  curationStatus?: InputMaybe<Scalars['String']>;
  curationStatus_contains?: InputMaybe<Scalars['String']>;
  curationStatus_contains_nocase?: InputMaybe<Scalars['String']>;
  curationStatus_ends_with?: InputMaybe<Scalars['String']>;
  curationStatus_ends_with_nocase?: InputMaybe<Scalars['String']>;
  curationStatus_gt?: InputMaybe<Scalars['String']>;
  curationStatus_gte?: InputMaybe<Scalars['String']>;
  curationStatus_in?: InputMaybe<Array<Scalars['String']>>;
  curationStatus_lt?: InputMaybe<Scalars['String']>;
  curationStatus_lte?: InputMaybe<Scalars['String']>;
  curationStatus_not?: InputMaybe<Scalars['String']>;
  curationStatus_not_contains?: InputMaybe<Scalars['String']>;
  curationStatus_not_contains_nocase?: InputMaybe<Scalars['String']>;
  curationStatus_not_ends_with?: InputMaybe<Scalars['String']>;
  curationStatus_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  curationStatus_not_in?: InputMaybe<Array<Scalars['String']>>;
  curationStatus_not_starts_with?: InputMaybe<Scalars['String']>;
  curationStatus_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  curationStatus_starts_with?: InputMaybe<Scalars['String']>;
  curationStatus_starts_with_nocase?: InputMaybe<Scalars['String']>;
  currencyAddress?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_contains?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_gt?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_gte?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  currencyAddress_lt?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_lte?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_not?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  currencyAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  currencySymbol?: InputMaybe<Scalars['String']>;
  currencySymbol_contains?: InputMaybe<Scalars['String']>;
  currencySymbol_contains_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_ends_with?: InputMaybe<Scalars['String']>;
  currencySymbol_ends_with_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_gt?: InputMaybe<Scalars['String']>;
  currencySymbol_gte?: InputMaybe<Scalars['String']>;
  currencySymbol_in?: InputMaybe<Array<Scalars['String']>>;
  currencySymbol_lt?: InputMaybe<Scalars['String']>;
  currencySymbol_lte?: InputMaybe<Scalars['String']>;
  currencySymbol_not?: InputMaybe<Scalars['String']>;
  currencySymbol_not_contains?: InputMaybe<Scalars['String']>;
  currencySymbol_not_contains_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_not_ends_with?: InputMaybe<Scalars['String']>;
  currencySymbol_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_not_in?: InputMaybe<Array<Scalars['String']>>;
  currencySymbol_not_starts_with?: InputMaybe<Scalars['String']>;
  currencySymbol_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  currencySymbol_starts_with?: InputMaybe<Scalars['String']>;
  currencySymbol_starts_with_nocase?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  description_contains?: InputMaybe<Scalars['String']>;
  description_contains_nocase?: InputMaybe<Scalars['String']>;
  description_ends_with?: InputMaybe<Scalars['String']>;
  description_ends_with_nocase?: InputMaybe<Scalars['String']>;
  description_gt?: InputMaybe<Scalars['String']>;
  description_gte?: InputMaybe<Scalars['String']>;
  description_in?: InputMaybe<Array<Scalars['String']>>;
  description_lt?: InputMaybe<Scalars['String']>;
  description_lte?: InputMaybe<Scalars['String']>;
  description_not?: InputMaybe<Scalars['String']>;
  description_not_contains?: InputMaybe<Scalars['String']>;
  description_not_contains_nocase?: InputMaybe<Scalars['String']>;
  description_not_ends_with?: InputMaybe<Scalars['String']>;
  description_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  description_not_in?: InputMaybe<Array<Scalars['String']>>;
  description_not_starts_with?: InputMaybe<Scalars['String']>;
  description_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  description_starts_with?: InputMaybe<Scalars['String']>;
  description_starts_with_nocase?: InputMaybe<Scalars['String']>;
  dynamic?: InputMaybe<Scalars['Boolean']>;
  dynamic_in?: InputMaybe<Array<Scalars['Boolean']>>;
  dynamic_not?: InputMaybe<Scalars['Boolean']>;
  dynamic_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  externalAssetDependenciesLocked?: InputMaybe<Scalars['Boolean']>;
  externalAssetDependenciesLocked_in?: InputMaybe<Array<Scalars['Boolean']>>;
  externalAssetDependenciesLocked_not?: InputMaybe<Scalars['Boolean']>;
  externalAssetDependenciesLocked_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  externalAssetDependencies_?: InputMaybe<ProjectExternalAssetDependency_Filter>;
  externalAssetDependencyCount?: InputMaybe<Scalars['BigInt']>;
  externalAssetDependencyCount_gt?: InputMaybe<Scalars['BigInt']>;
  externalAssetDependencyCount_gte?: InputMaybe<Scalars['BigInt']>;
  externalAssetDependencyCount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  externalAssetDependencyCount_lt?: InputMaybe<Scalars['BigInt']>;
  externalAssetDependencyCount_lte?: InputMaybe<Scalars['BigInt']>;
  externalAssetDependencyCount_not?: InputMaybe<Scalars['BigInt']>;
  externalAssetDependencyCount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  invocations?: InputMaybe<Scalars['BigInt']>;
  invocations_gt?: InputMaybe<Scalars['BigInt']>;
  invocations_gte?: InputMaybe<Scalars['BigInt']>;
  invocations_in?: InputMaybe<Array<Scalars['BigInt']>>;
  invocations_lt?: InputMaybe<Scalars['BigInt']>;
  invocations_lte?: InputMaybe<Scalars['BigInt']>;
  invocations_not?: InputMaybe<Scalars['BigInt']>;
  invocations_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  ipfsHash?: InputMaybe<Scalars['String']>;
  ipfsHash_contains?: InputMaybe<Scalars['String']>;
  ipfsHash_contains_nocase?: InputMaybe<Scalars['String']>;
  ipfsHash_ends_with?: InputMaybe<Scalars['String']>;
  ipfsHash_ends_with_nocase?: InputMaybe<Scalars['String']>;
  ipfsHash_gt?: InputMaybe<Scalars['String']>;
  ipfsHash_gte?: InputMaybe<Scalars['String']>;
  ipfsHash_in?: InputMaybe<Array<Scalars['String']>>;
  ipfsHash_lt?: InputMaybe<Scalars['String']>;
  ipfsHash_lte?: InputMaybe<Scalars['String']>;
  ipfsHash_not?: InputMaybe<Scalars['String']>;
  ipfsHash_not_contains?: InputMaybe<Scalars['String']>;
  ipfsHash_not_contains_nocase?: InputMaybe<Scalars['String']>;
  ipfsHash_not_ends_with?: InputMaybe<Scalars['String']>;
  ipfsHash_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  ipfsHash_not_in?: InputMaybe<Array<Scalars['String']>>;
  ipfsHash_not_starts_with?: InputMaybe<Scalars['String']>;
  ipfsHash_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  ipfsHash_starts_with?: InputMaybe<Scalars['String']>;
  ipfsHash_starts_with_nocase?: InputMaybe<Scalars['String']>;
  license?: InputMaybe<Scalars['String']>;
  license_contains?: InputMaybe<Scalars['String']>;
  license_contains_nocase?: InputMaybe<Scalars['String']>;
  license_ends_with?: InputMaybe<Scalars['String']>;
  license_ends_with_nocase?: InputMaybe<Scalars['String']>;
  license_gt?: InputMaybe<Scalars['String']>;
  license_gte?: InputMaybe<Scalars['String']>;
  license_in?: InputMaybe<Array<Scalars['String']>>;
  license_lt?: InputMaybe<Scalars['String']>;
  license_lte?: InputMaybe<Scalars['String']>;
  license_not?: InputMaybe<Scalars['String']>;
  license_not_contains?: InputMaybe<Scalars['String']>;
  license_not_contains_nocase?: InputMaybe<Scalars['String']>;
  license_not_ends_with?: InputMaybe<Scalars['String']>;
  license_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  license_not_in?: InputMaybe<Array<Scalars['String']>>;
  license_not_starts_with?: InputMaybe<Scalars['String']>;
  license_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  license_starts_with?: InputMaybe<Scalars['String']>;
  license_starts_with_nocase?: InputMaybe<Scalars['String']>;
  locked?: InputMaybe<Scalars['Boolean']>;
  locked_in?: InputMaybe<Array<Scalars['Boolean']>>;
  locked_not?: InputMaybe<Scalars['Boolean']>;
  locked_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  maxInvocations?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_gt?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_gte?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_in?: InputMaybe<Array<Scalars['BigInt']>>;
  maxInvocations_lt?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_lte?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_not?: InputMaybe<Scalars['BigInt']>;
  maxInvocations_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  minterConfiguration?: InputMaybe<Scalars['String']>;
  minterConfiguration_?: InputMaybe<ProjectMinterConfiguration_Filter>;
  minterConfiguration_contains?: InputMaybe<Scalars['String']>;
  minterConfiguration_contains_nocase?: InputMaybe<Scalars['String']>;
  minterConfiguration_ends_with?: InputMaybe<Scalars['String']>;
  minterConfiguration_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minterConfiguration_gt?: InputMaybe<Scalars['String']>;
  minterConfiguration_gte?: InputMaybe<Scalars['String']>;
  minterConfiguration_in?: InputMaybe<Array<Scalars['String']>>;
  minterConfiguration_lt?: InputMaybe<Scalars['String']>;
  minterConfiguration_lte?: InputMaybe<Scalars['String']>;
  minterConfiguration_not?: InputMaybe<Scalars['String']>;
  minterConfiguration_not_contains?: InputMaybe<Scalars['String']>;
  minterConfiguration_not_contains_nocase?: InputMaybe<Scalars['String']>;
  minterConfiguration_not_ends_with?: InputMaybe<Scalars['String']>;
  minterConfiguration_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minterConfiguration_not_in?: InputMaybe<Array<Scalars['String']>>;
  minterConfiguration_not_starts_with?: InputMaybe<Scalars['String']>;
  minterConfiguration_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  minterConfiguration_starts_with?: InputMaybe<Scalars['String']>;
  minterConfiguration_starts_with_nocase?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  name_contains?: InputMaybe<Scalars['String']>;
  name_contains_nocase?: InputMaybe<Scalars['String']>;
  name_ends_with?: InputMaybe<Scalars['String']>;
  name_ends_with_nocase?: InputMaybe<Scalars['String']>;
  name_gt?: InputMaybe<Scalars['String']>;
  name_gte?: InputMaybe<Scalars['String']>;
  name_in?: InputMaybe<Array<Scalars['String']>>;
  name_lt?: InputMaybe<Scalars['String']>;
  name_lte?: InputMaybe<Scalars['String']>;
  name_not?: InputMaybe<Scalars['String']>;
  name_not_contains?: InputMaybe<Scalars['String']>;
  name_not_contains_nocase?: InputMaybe<Scalars['String']>;
  name_not_ends_with?: InputMaybe<Scalars['String']>;
  name_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  name_not_in?: InputMaybe<Array<Scalars['String']>>;
  name_not_starts_with?: InputMaybe<Scalars['String']>;
  name_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  name_starts_with?: InputMaybe<Scalars['String']>;
  name_starts_with_nocase?: InputMaybe<Scalars['String']>;
  or?: InputMaybe<Array<InputMaybe<Project_Filter>>>;
  owners_?: InputMaybe<AccountProject_Filter>;
  paused?: InputMaybe<Scalars['Boolean']>;
  paused_in?: InputMaybe<Array<Scalars['Boolean']>>;
  paused_not?: InputMaybe<Scalars['Boolean']>;
  paused_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  pricePerTokenInWei?: InputMaybe<Scalars['BigInt']>;
  pricePerTokenInWei_gt?: InputMaybe<Scalars['BigInt']>;
  pricePerTokenInWei_gte?: InputMaybe<Scalars['BigInt']>;
  pricePerTokenInWei_in?: InputMaybe<Array<Scalars['BigInt']>>;
  pricePerTokenInWei_lt?: InputMaybe<Scalars['BigInt']>;
  pricePerTokenInWei_lte?: InputMaybe<Scalars['BigInt']>;
  pricePerTokenInWei_not?: InputMaybe<Scalars['BigInt']>;
  pricePerTokenInWei_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  projectId?: InputMaybe<Scalars['BigInt']>;
  projectId_gt?: InputMaybe<Scalars['BigInt']>;
  projectId_gte?: InputMaybe<Scalars['BigInt']>;
  projectId_in?: InputMaybe<Array<Scalars['BigInt']>>;
  projectId_lt?: InputMaybe<Scalars['BigInt']>;
  projectId_lte?: InputMaybe<Scalars['BigInt']>;
  projectId_not?: InputMaybe<Scalars['BigInt']>;
  projectId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  proposedArtistAddressesAndSplits?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_?: InputMaybe<ProposedArtistAddressesAndSplit_Filter>;
  proposedArtistAddressesAndSplits_contains?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_contains_nocase?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_ends_with?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_ends_with_nocase?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_gt?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_gte?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_in?: InputMaybe<Array<Scalars['String']>>;
  proposedArtistAddressesAndSplits_lt?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_lte?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_not?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_not_contains?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_not_contains_nocase?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_not_ends_with?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_not_in?: InputMaybe<Array<Scalars['String']>>;
  proposedArtistAddressesAndSplits_not_starts_with?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_starts_with?: InputMaybe<Scalars['String']>;
  proposedArtistAddressesAndSplits_starts_with_nocase?: InputMaybe<Scalars['String']>;
  receipts_?: InputMaybe<Receipt_Filter>;
  royaltyPercentage?: InputMaybe<Scalars['BigInt']>;
  royaltyPercentage_gt?: InputMaybe<Scalars['BigInt']>;
  royaltyPercentage_gte?: InputMaybe<Scalars['BigInt']>;
  royaltyPercentage_in?: InputMaybe<Array<Scalars['BigInt']>>;
  royaltyPercentage_lt?: InputMaybe<Scalars['BigInt']>;
  royaltyPercentage_lte?: InputMaybe<Scalars['BigInt']>;
  royaltyPercentage_not?: InputMaybe<Scalars['BigInt']>;
  royaltyPercentage_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  saleLookupTables_?: InputMaybe<SaleLookupTable_Filter>;
  script?: InputMaybe<Scalars['String']>;
  scriptCount?: InputMaybe<Scalars['BigInt']>;
  scriptCount_gt?: InputMaybe<Scalars['BigInt']>;
  scriptCount_gte?: InputMaybe<Scalars['BigInt']>;
  scriptCount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  scriptCount_lt?: InputMaybe<Scalars['BigInt']>;
  scriptCount_lte?: InputMaybe<Scalars['BigInt']>;
  scriptCount_not?: InputMaybe<Scalars['BigInt']>;
  scriptCount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  scriptJSON?: InputMaybe<Scalars['String']>;
  scriptJSON_contains?: InputMaybe<Scalars['String']>;
  scriptJSON_contains_nocase?: InputMaybe<Scalars['String']>;
  scriptJSON_ends_with?: InputMaybe<Scalars['String']>;
  scriptJSON_ends_with_nocase?: InputMaybe<Scalars['String']>;
  scriptJSON_gt?: InputMaybe<Scalars['String']>;
  scriptJSON_gte?: InputMaybe<Scalars['String']>;
  scriptJSON_in?: InputMaybe<Array<Scalars['String']>>;
  scriptJSON_lt?: InputMaybe<Scalars['String']>;
  scriptJSON_lte?: InputMaybe<Scalars['String']>;
  scriptJSON_not?: InputMaybe<Scalars['String']>;
  scriptJSON_not_contains?: InputMaybe<Scalars['String']>;
  scriptJSON_not_contains_nocase?: InputMaybe<Scalars['String']>;
  scriptJSON_not_ends_with?: InputMaybe<Scalars['String']>;
  scriptJSON_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  scriptJSON_not_in?: InputMaybe<Array<Scalars['String']>>;
  scriptJSON_not_starts_with?: InputMaybe<Scalars['String']>;
  scriptJSON_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  scriptJSON_starts_with?: InputMaybe<Scalars['String']>;
  scriptJSON_starts_with_nocase?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_contains?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_contains_nocase?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_ends_with?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_ends_with_nocase?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_gt?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_gte?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_in?: InputMaybe<Array<Scalars['String']>>;
  scriptTypeAndVersion_lt?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_lte?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_not?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_not_contains?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_not_contains_nocase?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_not_ends_with?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_not_in?: InputMaybe<Array<Scalars['String']>>;
  scriptTypeAndVersion_not_starts_with?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_starts_with?: InputMaybe<Scalars['String']>;
  scriptTypeAndVersion_starts_with_nocase?: InputMaybe<Scalars['String']>;
  scriptUpdatedAt?: InputMaybe<Scalars['BigInt']>;
  scriptUpdatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  scriptUpdatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  scriptUpdatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  scriptUpdatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  scriptUpdatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  scriptUpdatedAt_not?: InputMaybe<Scalars['BigInt']>;
  scriptUpdatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  script_contains?: InputMaybe<Scalars['String']>;
  script_contains_nocase?: InputMaybe<Scalars['String']>;
  script_ends_with?: InputMaybe<Scalars['String']>;
  script_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_gt?: InputMaybe<Scalars['String']>;
  script_gte?: InputMaybe<Scalars['String']>;
  script_in?: InputMaybe<Array<Scalars['String']>>;
  script_lt?: InputMaybe<Scalars['String']>;
  script_lte?: InputMaybe<Scalars['String']>;
  script_not?: InputMaybe<Scalars['String']>;
  script_not_contains?: InputMaybe<Scalars['String']>;
  script_not_contains_nocase?: InputMaybe<Scalars['String']>;
  script_not_ends_with?: InputMaybe<Scalars['String']>;
  script_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  script_not_in?: InputMaybe<Array<Scalars['String']>>;
  script_not_starts_with?: InputMaybe<Scalars['String']>;
  script_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  script_starts_with?: InputMaybe<Scalars['String']>;
  script_starts_with_nocase?: InputMaybe<Scalars['String']>;
  scripts_?: InputMaybe<ProjectScript_Filter>;
  tokens_?: InputMaybe<Token_Filter>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  useHashString?: InputMaybe<Scalars['Boolean']>;
  useHashString_in?: InputMaybe<Array<Scalars['Boolean']>>;
  useHashString_not?: InputMaybe<Scalars['Boolean']>;
  useHashString_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  useIpfs?: InputMaybe<Scalars['Boolean']>;
  useIpfs_in?: InputMaybe<Array<Scalars['Boolean']>>;
  useIpfs_not?: InputMaybe<Scalars['Boolean']>;
  useIpfs_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  website?: InputMaybe<Scalars['String']>;
  website_contains?: InputMaybe<Scalars['String']>;
  website_contains_nocase?: InputMaybe<Scalars['String']>;
  website_ends_with?: InputMaybe<Scalars['String']>;
  website_ends_with_nocase?: InputMaybe<Scalars['String']>;
  website_gt?: InputMaybe<Scalars['String']>;
  website_gte?: InputMaybe<Scalars['String']>;
  website_in?: InputMaybe<Array<Scalars['String']>>;
  website_lt?: InputMaybe<Scalars['String']>;
  website_lte?: InputMaybe<Scalars['String']>;
  website_not?: InputMaybe<Scalars['String']>;
  website_not_contains?: InputMaybe<Scalars['String']>;
  website_not_contains_nocase?: InputMaybe<Scalars['String']>;
  website_not_ends_with?: InputMaybe<Scalars['String']>;
  website_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  website_not_in?: InputMaybe<Array<Scalars['String']>>;
  website_not_starts_with?: InputMaybe<Scalars['String']>;
  website_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  website_starts_with?: InputMaybe<Scalars['String']>;
  website_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum Project_OrderBy {
  ActivatedAt = 'activatedAt',
  Active = 'active',
  AdditionalPayee = 'additionalPayee',
  AdditionalPayeePercentage = 'additionalPayeePercentage',
  AdditionalPayeeSecondarySalesAddress = 'additionalPayeeSecondarySalesAddress',
  AdditionalPayeeSecondarySalesPercentage = 'additionalPayeeSecondarySalesPercentage',
  Artist = 'artist',
  ArtistAddress = 'artistAddress',
  ArtistName = 'artistName',
  AspectRatio = 'aspectRatio',
  BaseIpfsUri = 'baseIpfsUri',
  BaseUri = 'baseUri',
  Complete = 'complete',
  CompletedAt = 'completedAt',
  Contract = 'contract',
  CreatedAt = 'createdAt',
  CurationStatus = 'curationStatus',
  CurrencyAddress = 'currencyAddress',
  CurrencySymbol = 'currencySymbol',
  Description = 'description',
  Dynamic = 'dynamic',
  ExternalAssetDependencies = 'externalAssetDependencies',
  ExternalAssetDependenciesLocked = 'externalAssetDependenciesLocked',
  ExternalAssetDependencyCount = 'externalAssetDependencyCount',
  Id = 'id',
  Invocations = 'invocations',
  IpfsHash = 'ipfsHash',
  License = 'license',
  Locked = 'locked',
  MaxInvocations = 'maxInvocations',
  MinterConfiguration = 'minterConfiguration',
  Name = 'name',
  Owners = 'owners',
  Paused = 'paused',
  PricePerTokenInWei = 'pricePerTokenInWei',
  ProjectId = 'projectId',
  ProposedArtistAddressesAndSplits = 'proposedArtistAddressesAndSplits',
  Receipts = 'receipts',
  RoyaltyPercentage = 'royaltyPercentage',
  SaleLookupTables = 'saleLookupTables',
  Script = 'script',
  ScriptCount = 'scriptCount',
  ScriptJson = 'scriptJSON',
  ScriptTypeAndVersion = 'scriptTypeAndVersion',
  ScriptUpdatedAt = 'scriptUpdatedAt',
  Scripts = 'scripts',
  Tokens = 'tokens',
  UpdatedAt = 'updatedAt',
  UseHashString = 'useHashString',
  UseIpfs = 'useIpfs',
  Website = 'website'
}

export type ProposedArtistAddressesAndSplit = {
  __typename?: 'ProposedArtistAddressesAndSplit';
  /** Proposed artist additional payee address for primary sales */
  additionalPayeePrimarySalesAddress: Scalars['Bytes'];
  /** Proposed artist additional payee percentage for primary sales */
  additionalPayeePrimarySalesPercentage: Scalars['BigInt'];
  /** Proposed artist additional payee address for secondary sales */
  additionalPayeeSecondarySalesAddress: Scalars['Bytes'];
  /** Proposed artist additional payee percentage for secondary sales */
  additionalPayeeSecondarySalesPercentage: Scalars['BigInt'];
  /** Proposed artist address */
  artistAddress: Scalars['Bytes'];
  createdAt: Scalars['BigInt'];
  /** Unique identifier made up of contract address and project id */
  id: Scalars['ID'];
  /** Project associated with this proposed artist addresses and splits */
  project: Project;
};

export type ProposedArtistAddressesAndSplit_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  additionalPayeePrimarySalesAddress?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_gt?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_gte?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  additionalPayeePrimarySalesAddress_lt?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_lte?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_not?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayeePrimarySalesAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  additionalPayeePrimarySalesPercentage?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePrimarySalesPercentage_gt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePrimarySalesPercentage_gte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePrimarySalesPercentage_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalPayeePrimarySalesPercentage_lt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePrimarySalesPercentage_lte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePrimarySalesPercentage_not?: InputMaybe<Scalars['BigInt']>;
  additionalPayeePrimarySalesPercentage_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalPayeeSecondarySalesAddress?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_gt?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_gte?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  additionalPayeeSecondarySalesAddress_lt?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_lte?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_not?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  additionalPayeeSecondarySalesAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  additionalPayeeSecondarySalesPercentage?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_gt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_gte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_in?: InputMaybe<Array<Scalars['BigInt']>>;
  additionalPayeeSecondarySalesPercentage_lt?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_lte?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_not?: InputMaybe<Scalars['BigInt']>;
  additionalPayeeSecondarySalesPercentage_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  and?: InputMaybe<Array<InputMaybe<ProposedArtistAddressesAndSplit_Filter>>>;
  artistAddress?: InputMaybe<Scalars['Bytes']>;
  artistAddress_contains?: InputMaybe<Scalars['Bytes']>;
  artistAddress_gt?: InputMaybe<Scalars['Bytes']>;
  artistAddress_gte?: InputMaybe<Scalars['Bytes']>;
  artistAddress_in?: InputMaybe<Array<Scalars['Bytes']>>;
  artistAddress_lt?: InputMaybe<Scalars['Bytes']>;
  artistAddress_lte?: InputMaybe<Scalars['Bytes']>;
  artistAddress_not?: InputMaybe<Scalars['Bytes']>;
  artistAddress_not_contains?: InputMaybe<Scalars['Bytes']>;
  artistAddress_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  createdAt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<ProposedArtistAddressesAndSplit_Filter>>>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum ProposedArtistAddressesAndSplit_OrderBy {
  AdditionalPayeePrimarySalesAddress = 'additionalPayeePrimarySalesAddress',
  AdditionalPayeePrimarySalesPercentage = 'additionalPayeePrimarySalesPercentage',
  AdditionalPayeeSecondarySalesAddress = 'additionalPayeeSecondarySalesAddress',
  AdditionalPayeeSecondarySalesPercentage = 'additionalPayeeSecondarySalesPercentage',
  ArtistAddress = 'artistAddress',
  CreatedAt = 'createdAt',
  Id = 'id',
  Project = 'project'
}

export type Receipt = {
  __typename?: 'Receipt';
  /** The associated account */
  account: Account;
  /** Unique identifier made up of minter contract address-projectId-accountAddress */
  id: Scalars['ID'];
  /** The associated minter */
  minter: Minter;
  /** The total net amount posted (sent to settlement contract) for tokens */
  netPosted: Scalars['BigInt'];
  /** The total quantity of tokens purchased on the project */
  numPurchased: Scalars['BigInt'];
  /** The associated project */
  project: Project;
  updatedAt: Scalars['BigInt'];
};

export type Receipt_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  account?: InputMaybe<Scalars['String']>;
  account_?: InputMaybe<Account_Filter>;
  account_contains?: InputMaybe<Scalars['String']>;
  account_contains_nocase?: InputMaybe<Scalars['String']>;
  account_ends_with?: InputMaybe<Scalars['String']>;
  account_ends_with_nocase?: InputMaybe<Scalars['String']>;
  account_gt?: InputMaybe<Scalars['String']>;
  account_gte?: InputMaybe<Scalars['String']>;
  account_in?: InputMaybe<Array<Scalars['String']>>;
  account_lt?: InputMaybe<Scalars['String']>;
  account_lte?: InputMaybe<Scalars['String']>;
  account_not?: InputMaybe<Scalars['String']>;
  account_not_contains?: InputMaybe<Scalars['String']>;
  account_not_contains_nocase?: InputMaybe<Scalars['String']>;
  account_not_ends_with?: InputMaybe<Scalars['String']>;
  account_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  account_not_in?: InputMaybe<Array<Scalars['String']>>;
  account_not_starts_with?: InputMaybe<Scalars['String']>;
  account_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  account_starts_with?: InputMaybe<Scalars['String']>;
  account_starts_with_nocase?: InputMaybe<Scalars['String']>;
  and?: InputMaybe<Array<InputMaybe<Receipt_Filter>>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  minter?: InputMaybe<Scalars['String']>;
  minter_?: InputMaybe<Minter_Filter>;
  minter_contains?: InputMaybe<Scalars['String']>;
  minter_contains_nocase?: InputMaybe<Scalars['String']>;
  minter_ends_with?: InputMaybe<Scalars['String']>;
  minter_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minter_gt?: InputMaybe<Scalars['String']>;
  minter_gte?: InputMaybe<Scalars['String']>;
  minter_in?: InputMaybe<Array<Scalars['String']>>;
  minter_lt?: InputMaybe<Scalars['String']>;
  minter_lte?: InputMaybe<Scalars['String']>;
  minter_not?: InputMaybe<Scalars['String']>;
  minter_not_contains?: InputMaybe<Scalars['String']>;
  minter_not_contains_nocase?: InputMaybe<Scalars['String']>;
  minter_not_ends_with?: InputMaybe<Scalars['String']>;
  minter_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  minter_not_in?: InputMaybe<Array<Scalars['String']>>;
  minter_not_starts_with?: InputMaybe<Scalars['String']>;
  minter_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  minter_starts_with?: InputMaybe<Scalars['String']>;
  minter_starts_with_nocase?: InputMaybe<Scalars['String']>;
  netPosted?: InputMaybe<Scalars['BigInt']>;
  netPosted_gt?: InputMaybe<Scalars['BigInt']>;
  netPosted_gte?: InputMaybe<Scalars['BigInt']>;
  netPosted_in?: InputMaybe<Array<Scalars['BigInt']>>;
  netPosted_lt?: InputMaybe<Scalars['BigInt']>;
  netPosted_lte?: InputMaybe<Scalars['BigInt']>;
  netPosted_not?: InputMaybe<Scalars['BigInt']>;
  netPosted_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  numPurchased?: InputMaybe<Scalars['BigInt']>;
  numPurchased_gt?: InputMaybe<Scalars['BigInt']>;
  numPurchased_gte?: InputMaybe<Scalars['BigInt']>;
  numPurchased_in?: InputMaybe<Array<Scalars['BigInt']>>;
  numPurchased_lt?: InputMaybe<Scalars['BigInt']>;
  numPurchased_lte?: InputMaybe<Scalars['BigInt']>;
  numPurchased_not?: InputMaybe<Scalars['BigInt']>;
  numPurchased_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<Receipt_Filter>>>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
};

export enum Receipt_OrderBy {
  Account = 'account',
  Id = 'id',
  Minter = 'minter',
  NetPosted = 'netPosted',
  NumPurchased = 'numPurchased',
  Project = 'project',
  UpdatedAt = 'updatedAt'
}

export type Sale = {
  __typename?: 'Sale';
  /** The block number of the sale */
  blockNumber: Scalars['BigInt'];
  /** The timestamp of the sale */
  blockTimestamp: Scalars['BigInt'];
  /** The buyer address */
  buyer: Scalars['Bytes'];
  /** The exchange used for this sale */
  exchange: Exchange;
  /** The sale id formated: tokenId - token.nextSaleId (using first token sold for bundles) for Opensea V1/V2, orderHash from sale event for Looksrare and Seaport */
  id: Scalars['ID'];
  /** Private sales are flagged by this boolean */
  isPrivate: Scalars['Boolean'];
  /** List of Payment tokens involved in this sale */
  payments: Array<Payment>;
  /** Lookup table to get the list of Tokens sold in this sale */
  saleLookupTables: Array<SaleLookupTable>;
  /** The sale type (Single | Bundle) */
  saleType: SaleType;
  /** The seller address */
  seller: Scalars['Bytes'];
  /** A raw formated string of the token(s) sold (i.e TokenID1::TokenID2::TokenID3) */
  summaryTokensSold: Scalars['String'];
  /** The hash of the transaction */
  txHash: Scalars['Bytes'];
};


export type SalePaymentsArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Payment_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Payment_Filter>;
};


export type SaleSaleLookupTablesArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<SaleLookupTable_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<SaleLookupTable_Filter>;
};

export type SaleLookupTable = {
  __typename?: 'SaleLookupTable';
  /** The block number of the sale */
  blockNumber: Scalars['BigInt'];
  /** Set to `Project Id::Token Id::Sale Id */
  id: Scalars['ID'];
  /** The associated project */
  project: Project;
  /** The associated sale */
  sale: Sale;
  /** Timestamp of the sale */
  timestamp: Scalars['BigInt'];
  /** The token sold */
  token: Token;
};

export type SaleLookupTable_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<SaleLookupTable_Filter>>>;
  blockNumber?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockNumber_lt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_lte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_not?: InputMaybe<Scalars['BigInt']>;
  blockNumber_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<SaleLookupTable_Filter>>>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
  sale?: InputMaybe<Scalars['String']>;
  sale_?: InputMaybe<Sale_Filter>;
  sale_contains?: InputMaybe<Scalars['String']>;
  sale_contains_nocase?: InputMaybe<Scalars['String']>;
  sale_ends_with?: InputMaybe<Scalars['String']>;
  sale_ends_with_nocase?: InputMaybe<Scalars['String']>;
  sale_gt?: InputMaybe<Scalars['String']>;
  sale_gte?: InputMaybe<Scalars['String']>;
  sale_in?: InputMaybe<Array<Scalars['String']>>;
  sale_lt?: InputMaybe<Scalars['String']>;
  sale_lte?: InputMaybe<Scalars['String']>;
  sale_not?: InputMaybe<Scalars['String']>;
  sale_not_contains?: InputMaybe<Scalars['String']>;
  sale_not_contains_nocase?: InputMaybe<Scalars['String']>;
  sale_not_ends_with?: InputMaybe<Scalars['String']>;
  sale_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  sale_not_in?: InputMaybe<Array<Scalars['String']>>;
  sale_not_starts_with?: InputMaybe<Scalars['String']>;
  sale_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  sale_starts_with?: InputMaybe<Scalars['String']>;
  sale_starts_with_nocase?: InputMaybe<Scalars['String']>;
  timestamp?: InputMaybe<Scalars['BigInt']>;
  timestamp_gt?: InputMaybe<Scalars['BigInt']>;
  timestamp_gte?: InputMaybe<Scalars['BigInt']>;
  timestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  timestamp_lt?: InputMaybe<Scalars['BigInt']>;
  timestamp_lte?: InputMaybe<Scalars['BigInt']>;
  timestamp_not?: InputMaybe<Scalars['BigInt']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  token?: InputMaybe<Scalars['String']>;
  token_?: InputMaybe<Token_Filter>;
  token_contains?: InputMaybe<Scalars['String']>;
  token_contains_nocase?: InputMaybe<Scalars['String']>;
  token_ends_with?: InputMaybe<Scalars['String']>;
  token_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_gt?: InputMaybe<Scalars['String']>;
  token_gte?: InputMaybe<Scalars['String']>;
  token_in?: InputMaybe<Array<Scalars['String']>>;
  token_lt?: InputMaybe<Scalars['String']>;
  token_lte?: InputMaybe<Scalars['String']>;
  token_not?: InputMaybe<Scalars['String']>;
  token_not_contains?: InputMaybe<Scalars['String']>;
  token_not_contains_nocase?: InputMaybe<Scalars['String']>;
  token_not_ends_with?: InputMaybe<Scalars['String']>;
  token_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_not_in?: InputMaybe<Array<Scalars['String']>>;
  token_not_starts_with?: InputMaybe<Scalars['String']>;
  token_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  token_starts_with?: InputMaybe<Scalars['String']>;
  token_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum SaleLookupTable_OrderBy {
  BlockNumber = 'blockNumber',
  Id = 'id',
  Project = 'project',
  Sale = 'sale',
  Timestamp = 'timestamp',
  Token = 'token'
}

export enum SaleType {
  Bundle = 'Bundle',
  Single = 'Single'
}

export type Sale_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Sale_Filter>>>;
  blockNumber?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockNumber_lt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_lte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_not?: InputMaybe<Scalars['BigInt']>;
  blockNumber_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockTimestamp?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_gt?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_gte?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockTimestamp_lt?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_lte?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_not?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  buyer?: InputMaybe<Scalars['Bytes']>;
  buyer_contains?: InputMaybe<Scalars['Bytes']>;
  buyer_gt?: InputMaybe<Scalars['Bytes']>;
  buyer_gte?: InputMaybe<Scalars['Bytes']>;
  buyer_in?: InputMaybe<Array<Scalars['Bytes']>>;
  buyer_lt?: InputMaybe<Scalars['Bytes']>;
  buyer_lte?: InputMaybe<Scalars['Bytes']>;
  buyer_not?: InputMaybe<Scalars['Bytes']>;
  buyer_not_contains?: InputMaybe<Scalars['Bytes']>;
  buyer_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  exchange?: InputMaybe<Exchange>;
  exchange_in?: InputMaybe<Array<Exchange>>;
  exchange_not?: InputMaybe<Exchange>;
  exchange_not_in?: InputMaybe<Array<Exchange>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  isPrivate?: InputMaybe<Scalars['Boolean']>;
  isPrivate_in?: InputMaybe<Array<Scalars['Boolean']>>;
  isPrivate_not?: InputMaybe<Scalars['Boolean']>;
  isPrivate_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  or?: InputMaybe<Array<InputMaybe<Sale_Filter>>>;
  payments_?: InputMaybe<Payment_Filter>;
  saleLookupTables_?: InputMaybe<SaleLookupTable_Filter>;
  saleType?: InputMaybe<SaleType>;
  saleType_in?: InputMaybe<Array<SaleType>>;
  saleType_not?: InputMaybe<SaleType>;
  saleType_not_in?: InputMaybe<Array<SaleType>>;
  seller?: InputMaybe<Scalars['Bytes']>;
  seller_contains?: InputMaybe<Scalars['Bytes']>;
  seller_gt?: InputMaybe<Scalars['Bytes']>;
  seller_gte?: InputMaybe<Scalars['Bytes']>;
  seller_in?: InputMaybe<Array<Scalars['Bytes']>>;
  seller_lt?: InputMaybe<Scalars['Bytes']>;
  seller_lte?: InputMaybe<Scalars['Bytes']>;
  seller_not?: InputMaybe<Scalars['Bytes']>;
  seller_not_contains?: InputMaybe<Scalars['Bytes']>;
  seller_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  summaryTokensSold?: InputMaybe<Scalars['String']>;
  summaryTokensSold_contains?: InputMaybe<Scalars['String']>;
  summaryTokensSold_contains_nocase?: InputMaybe<Scalars['String']>;
  summaryTokensSold_ends_with?: InputMaybe<Scalars['String']>;
  summaryTokensSold_ends_with_nocase?: InputMaybe<Scalars['String']>;
  summaryTokensSold_gt?: InputMaybe<Scalars['String']>;
  summaryTokensSold_gte?: InputMaybe<Scalars['String']>;
  summaryTokensSold_in?: InputMaybe<Array<Scalars['String']>>;
  summaryTokensSold_lt?: InputMaybe<Scalars['String']>;
  summaryTokensSold_lte?: InputMaybe<Scalars['String']>;
  summaryTokensSold_not?: InputMaybe<Scalars['String']>;
  summaryTokensSold_not_contains?: InputMaybe<Scalars['String']>;
  summaryTokensSold_not_contains_nocase?: InputMaybe<Scalars['String']>;
  summaryTokensSold_not_ends_with?: InputMaybe<Scalars['String']>;
  summaryTokensSold_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  summaryTokensSold_not_in?: InputMaybe<Array<Scalars['String']>>;
  summaryTokensSold_not_starts_with?: InputMaybe<Scalars['String']>;
  summaryTokensSold_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  summaryTokensSold_starts_with?: InputMaybe<Scalars['String']>;
  summaryTokensSold_starts_with_nocase?: InputMaybe<Scalars['String']>;
  txHash?: InputMaybe<Scalars['Bytes']>;
  txHash_contains?: InputMaybe<Scalars['Bytes']>;
  txHash_gt?: InputMaybe<Scalars['Bytes']>;
  txHash_gte?: InputMaybe<Scalars['Bytes']>;
  txHash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  txHash_lt?: InputMaybe<Scalars['Bytes']>;
  txHash_lte?: InputMaybe<Scalars['Bytes']>;
  txHash_not?: InputMaybe<Scalars['Bytes']>;
  txHash_not_contains?: InputMaybe<Scalars['Bytes']>;
  txHash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
};

export enum Sale_OrderBy {
  BlockNumber = 'blockNumber',
  BlockTimestamp = 'blockTimestamp',
  Buyer = 'buyer',
  Exchange = 'exchange',
  Id = 'id',
  IsPrivate = 'isPrivate',
  Payments = 'payments',
  SaleLookupTables = 'saleLookupTables',
  SaleType = 'saleType',
  Seller = 'seller',
  SummaryTokensSold = 'summaryTokensSold',
  TxHash = 'txHash'
}

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']>;
  _gt?: InputMaybe<Scalars['String']>;
  _gte?: InputMaybe<Scalars['String']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']>;
  _in?: InputMaybe<Array<Scalars['String']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']>;
  _lt?: InputMaybe<Scalars['String']>;
  _lte?: InputMaybe<Scalars['String']>;
  _neq?: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']>;
  _nin?: InputMaybe<Array<Scalars['String']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']>;
};

export type Token = {
  __typename?: 'Token';
  /** Contract the token is on */
  contract: Contract;
  createdAt: Scalars['BigInt'];
  /** Unique string used as input to the tokens project script */
  hash: Scalars['Bytes'];
  /** Unique identifier made up of contract address and token id */
  id: Scalars['ID'];
  /** Invocation number of the project */
  invocation: Scalars['BigInt'];
  /** Next available sale id */
  nextSaleId: Scalars['BigInt'];
  /** Current owner of the token */
  owner: Account;
  /** Project of the token */
  project: Project;
  /** Lookup table to get the Sale history */
  saleLookupTables: Array<SaleLookupTable>;
  /** ID of the token on the contract */
  tokenId: Scalars['BigInt'];
  /** Transaction hash of token mint */
  transactionHash: Scalars['Bytes'];
  transfers?: Maybe<Array<Transfer>>;
  updatedAt: Scalars['BigInt'];
  uri?: Maybe<Scalars['String']>;
};


export type TokenSaleLookupTablesArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<SaleLookupTable_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<SaleLookupTable_Filter>;
};


export type TokenTransfersArgs = {
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  where?: InputMaybe<Transfer_Filter>;
};

export type Token_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Token_Filter>>>;
  contract?: InputMaybe<Scalars['String']>;
  contract_?: InputMaybe<Contract_Filter>;
  contract_contains?: InputMaybe<Scalars['String']>;
  contract_contains_nocase?: InputMaybe<Scalars['String']>;
  contract_ends_with?: InputMaybe<Scalars['String']>;
  contract_ends_with_nocase?: InputMaybe<Scalars['String']>;
  contract_gt?: InputMaybe<Scalars['String']>;
  contract_gte?: InputMaybe<Scalars['String']>;
  contract_in?: InputMaybe<Array<Scalars['String']>>;
  contract_lt?: InputMaybe<Scalars['String']>;
  contract_lte?: InputMaybe<Scalars['String']>;
  contract_not?: InputMaybe<Scalars['String']>;
  contract_not_contains?: InputMaybe<Scalars['String']>;
  contract_not_contains_nocase?: InputMaybe<Scalars['String']>;
  contract_not_ends_with?: InputMaybe<Scalars['String']>;
  contract_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  contract_not_in?: InputMaybe<Array<Scalars['String']>>;
  contract_not_starts_with?: InputMaybe<Scalars['String']>;
  contract_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  contract_starts_with?: InputMaybe<Scalars['String']>;
  contract_starts_with_nocase?: InputMaybe<Scalars['String']>;
  createdAt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gt?: InputMaybe<Scalars['BigInt']>;
  createdAt_gte?: InputMaybe<Scalars['BigInt']>;
  createdAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  createdAt_lt?: InputMaybe<Scalars['BigInt']>;
  createdAt_lte?: InputMaybe<Scalars['BigInt']>;
  createdAt_not?: InputMaybe<Scalars['BigInt']>;
  createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  hash?: InputMaybe<Scalars['Bytes']>;
  hash_contains?: InputMaybe<Scalars['Bytes']>;
  hash_gt?: InputMaybe<Scalars['Bytes']>;
  hash_gte?: InputMaybe<Scalars['Bytes']>;
  hash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  hash_lt?: InputMaybe<Scalars['Bytes']>;
  hash_lte?: InputMaybe<Scalars['Bytes']>;
  hash_not?: InputMaybe<Scalars['Bytes']>;
  hash_not_contains?: InputMaybe<Scalars['Bytes']>;
  hash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  invocation?: InputMaybe<Scalars['BigInt']>;
  invocation_gt?: InputMaybe<Scalars['BigInt']>;
  invocation_gte?: InputMaybe<Scalars['BigInt']>;
  invocation_in?: InputMaybe<Array<Scalars['BigInt']>>;
  invocation_lt?: InputMaybe<Scalars['BigInt']>;
  invocation_lte?: InputMaybe<Scalars['BigInt']>;
  invocation_not?: InputMaybe<Scalars['BigInt']>;
  invocation_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  nextSaleId?: InputMaybe<Scalars['BigInt']>;
  nextSaleId_gt?: InputMaybe<Scalars['BigInt']>;
  nextSaleId_gte?: InputMaybe<Scalars['BigInt']>;
  nextSaleId_in?: InputMaybe<Array<Scalars['BigInt']>>;
  nextSaleId_lt?: InputMaybe<Scalars['BigInt']>;
  nextSaleId_lte?: InputMaybe<Scalars['BigInt']>;
  nextSaleId_not?: InputMaybe<Scalars['BigInt']>;
  nextSaleId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  or?: InputMaybe<Array<InputMaybe<Token_Filter>>>;
  owner?: InputMaybe<Scalars['String']>;
  owner_?: InputMaybe<Account_Filter>;
  owner_contains?: InputMaybe<Scalars['String']>;
  owner_contains_nocase?: InputMaybe<Scalars['String']>;
  owner_ends_with?: InputMaybe<Scalars['String']>;
  owner_ends_with_nocase?: InputMaybe<Scalars['String']>;
  owner_gt?: InputMaybe<Scalars['String']>;
  owner_gte?: InputMaybe<Scalars['String']>;
  owner_in?: InputMaybe<Array<Scalars['String']>>;
  owner_lt?: InputMaybe<Scalars['String']>;
  owner_lte?: InputMaybe<Scalars['String']>;
  owner_not?: InputMaybe<Scalars['String']>;
  owner_not_contains?: InputMaybe<Scalars['String']>;
  owner_not_contains_nocase?: InputMaybe<Scalars['String']>;
  owner_not_ends_with?: InputMaybe<Scalars['String']>;
  owner_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  owner_not_in?: InputMaybe<Array<Scalars['String']>>;
  owner_not_starts_with?: InputMaybe<Scalars['String']>;
  owner_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  owner_starts_with?: InputMaybe<Scalars['String']>;
  owner_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project?: InputMaybe<Scalars['String']>;
  project_?: InputMaybe<Project_Filter>;
  project_contains?: InputMaybe<Scalars['String']>;
  project_contains_nocase?: InputMaybe<Scalars['String']>;
  project_ends_with?: InputMaybe<Scalars['String']>;
  project_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_gt?: InputMaybe<Scalars['String']>;
  project_gte?: InputMaybe<Scalars['String']>;
  project_in?: InputMaybe<Array<Scalars['String']>>;
  project_lt?: InputMaybe<Scalars['String']>;
  project_lte?: InputMaybe<Scalars['String']>;
  project_not?: InputMaybe<Scalars['String']>;
  project_not_contains?: InputMaybe<Scalars['String']>;
  project_not_contains_nocase?: InputMaybe<Scalars['String']>;
  project_not_ends_with?: InputMaybe<Scalars['String']>;
  project_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  project_not_in?: InputMaybe<Array<Scalars['String']>>;
  project_not_starts_with?: InputMaybe<Scalars['String']>;
  project_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  project_starts_with?: InputMaybe<Scalars['String']>;
  project_starts_with_nocase?: InputMaybe<Scalars['String']>;
  saleLookupTables_?: InputMaybe<SaleLookupTable_Filter>;
  tokenId?: InputMaybe<Scalars['BigInt']>;
  tokenId_gt?: InputMaybe<Scalars['BigInt']>;
  tokenId_gte?: InputMaybe<Scalars['BigInt']>;
  tokenId_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tokenId_lt?: InputMaybe<Scalars['BigInt']>;
  tokenId_lte?: InputMaybe<Scalars['BigInt']>;
  tokenId_not?: InputMaybe<Scalars['BigInt']>;
  tokenId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  transactionHash?: InputMaybe<Scalars['Bytes']>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  transfers_?: InputMaybe<Transfer_Filter>;
  updatedAt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
  updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
  updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not?: InputMaybe<Scalars['BigInt']>;
  updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  uri?: InputMaybe<Scalars['String']>;
  uri_contains?: InputMaybe<Scalars['String']>;
  uri_contains_nocase?: InputMaybe<Scalars['String']>;
  uri_ends_with?: InputMaybe<Scalars['String']>;
  uri_ends_with_nocase?: InputMaybe<Scalars['String']>;
  uri_gt?: InputMaybe<Scalars['String']>;
  uri_gte?: InputMaybe<Scalars['String']>;
  uri_in?: InputMaybe<Array<Scalars['String']>>;
  uri_lt?: InputMaybe<Scalars['String']>;
  uri_lte?: InputMaybe<Scalars['String']>;
  uri_not?: InputMaybe<Scalars['String']>;
  uri_not_contains?: InputMaybe<Scalars['String']>;
  uri_not_contains_nocase?: InputMaybe<Scalars['String']>;
  uri_not_ends_with?: InputMaybe<Scalars['String']>;
  uri_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  uri_not_in?: InputMaybe<Array<Scalars['String']>>;
  uri_not_starts_with?: InputMaybe<Scalars['String']>;
  uri_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  uri_starts_with?: InputMaybe<Scalars['String']>;
  uri_starts_with_nocase?: InputMaybe<Scalars['String']>;
};

export enum Token_OrderBy {
  Contract = 'contract',
  CreatedAt = 'createdAt',
  Hash = 'hash',
  Id = 'id',
  Invocation = 'invocation',
  NextSaleId = 'nextSaleId',
  Owner = 'owner',
  Project = 'project',
  SaleLookupTables = 'saleLookupTables',
  TokenId = 'tokenId',
  TransactionHash = 'transactionHash',
  Transfers = 'transfers',
  UpdatedAt = 'updatedAt',
  Uri = 'uri'
}

export type Transfer = {
  __typename?: 'Transfer';
  blockHash: Scalars['Bytes'];
  blockNumber: Scalars['BigInt'];
  blockTimestamp: Scalars['BigInt'];
  from: Scalars['Bytes'];
  id: Scalars['ID'];
  to: Scalars['Bytes'];
  token: Token;
  transactionHash: Scalars['Bytes'];
};

export type Transfer_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Transfer_Filter>>>;
  blockHash?: InputMaybe<Scalars['Bytes']>;
  blockHash_contains?: InputMaybe<Scalars['Bytes']>;
  blockHash_gt?: InputMaybe<Scalars['Bytes']>;
  blockHash_gte?: InputMaybe<Scalars['Bytes']>;
  blockHash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  blockHash_lt?: InputMaybe<Scalars['Bytes']>;
  blockHash_lte?: InputMaybe<Scalars['Bytes']>;
  blockHash_not?: InputMaybe<Scalars['Bytes']>;
  blockHash_not_contains?: InputMaybe<Scalars['Bytes']>;
  blockHash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  blockNumber?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockNumber_lt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_lte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_not?: InputMaybe<Scalars['BigInt']>;
  blockNumber_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockTimestamp?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_gt?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_gte?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockTimestamp_lt?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_lte?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_not?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  from?: InputMaybe<Scalars['Bytes']>;
  from_contains?: InputMaybe<Scalars['Bytes']>;
  from_gt?: InputMaybe<Scalars['Bytes']>;
  from_gte?: InputMaybe<Scalars['Bytes']>;
  from_in?: InputMaybe<Array<Scalars['Bytes']>>;
  from_lt?: InputMaybe<Scalars['Bytes']>;
  from_lte?: InputMaybe<Scalars['Bytes']>;
  from_not?: InputMaybe<Scalars['Bytes']>;
  from_not_contains?: InputMaybe<Scalars['Bytes']>;
  from_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<Transfer_Filter>>>;
  to?: InputMaybe<Scalars['Bytes']>;
  to_contains?: InputMaybe<Scalars['Bytes']>;
  to_gt?: InputMaybe<Scalars['Bytes']>;
  to_gte?: InputMaybe<Scalars['Bytes']>;
  to_in?: InputMaybe<Array<Scalars['Bytes']>>;
  to_lt?: InputMaybe<Scalars['Bytes']>;
  to_lte?: InputMaybe<Scalars['Bytes']>;
  to_not?: InputMaybe<Scalars['Bytes']>;
  to_not_contains?: InputMaybe<Scalars['Bytes']>;
  to_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  token?: InputMaybe<Scalars['String']>;
  token_?: InputMaybe<Token_Filter>;
  token_contains?: InputMaybe<Scalars['String']>;
  token_contains_nocase?: InputMaybe<Scalars['String']>;
  token_ends_with?: InputMaybe<Scalars['String']>;
  token_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_gt?: InputMaybe<Scalars['String']>;
  token_gte?: InputMaybe<Scalars['String']>;
  token_in?: InputMaybe<Array<Scalars['String']>>;
  token_lt?: InputMaybe<Scalars['String']>;
  token_lte?: InputMaybe<Scalars['String']>;
  token_not?: InputMaybe<Scalars['String']>;
  token_not_contains?: InputMaybe<Scalars['String']>;
  token_not_contains_nocase?: InputMaybe<Scalars['String']>;
  token_not_ends_with?: InputMaybe<Scalars['String']>;
  token_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  token_not_in?: InputMaybe<Array<Scalars['String']>>;
  token_not_starts_with?: InputMaybe<Scalars['String']>;
  token_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  token_starts_with?: InputMaybe<Scalars['String']>;
  token_starts_with_nocase?: InputMaybe<Scalars['String']>;
  transactionHash?: InputMaybe<Scalars['Bytes']>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
};

export enum Transfer_OrderBy {
  BlockHash = 'blockHash',
  BlockNumber = 'blockNumber',
  BlockTimestamp = 'blockTimestamp',
  From = 'from',
  Id = 'id',
  To = 'to',
  Token = 'token',
  TransactionHash = 'transactionHash'
}

export type UpdateFeaturesScriptOutput = {
  __typename?: 'UpdateFeaturesScriptOutput';
  project_id: Scalars['String'];
};

export type UpdateProjectMediaScriptOutput = {
  __typename?: 'UpdateProjectMediaScriptOutput';
  project_id: Scalars['String'];
};

export type UpdateTokenMediaScriptOutput = {
  __typename?: 'UpdateTokenMediaScriptOutput';
  token_ids: Array<Maybe<Scalars['String']>>;
};

export type Whitelisting = {
  __typename?: 'Whitelisting';
  account: Account;
  contract: Contract;
  id: Scalars['ID'];
};

export type Whitelisting_Filter = {
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  account?: InputMaybe<Scalars['String']>;
  account_?: InputMaybe<Account_Filter>;
  account_contains?: InputMaybe<Scalars['String']>;
  account_contains_nocase?: InputMaybe<Scalars['String']>;
  account_ends_with?: InputMaybe<Scalars['String']>;
  account_ends_with_nocase?: InputMaybe<Scalars['String']>;
  account_gt?: InputMaybe<Scalars['String']>;
  account_gte?: InputMaybe<Scalars['String']>;
  account_in?: InputMaybe<Array<Scalars['String']>>;
  account_lt?: InputMaybe<Scalars['String']>;
  account_lte?: InputMaybe<Scalars['String']>;
  account_not?: InputMaybe<Scalars['String']>;
  account_not_contains?: InputMaybe<Scalars['String']>;
  account_not_contains_nocase?: InputMaybe<Scalars['String']>;
  account_not_ends_with?: InputMaybe<Scalars['String']>;
  account_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  account_not_in?: InputMaybe<Array<Scalars['String']>>;
  account_not_starts_with?: InputMaybe<Scalars['String']>;
  account_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  account_starts_with?: InputMaybe<Scalars['String']>;
  account_starts_with_nocase?: InputMaybe<Scalars['String']>;
  and?: InputMaybe<Array<InputMaybe<Whitelisting_Filter>>>;
  contract?: InputMaybe<Scalars['String']>;
  contract_?: InputMaybe<Contract_Filter>;
  contract_contains?: InputMaybe<Scalars['String']>;
  contract_contains_nocase?: InputMaybe<Scalars['String']>;
  contract_ends_with?: InputMaybe<Scalars['String']>;
  contract_ends_with_nocase?: InputMaybe<Scalars['String']>;
  contract_gt?: InputMaybe<Scalars['String']>;
  contract_gte?: InputMaybe<Scalars['String']>;
  contract_in?: InputMaybe<Array<Scalars['String']>>;
  contract_lt?: InputMaybe<Scalars['String']>;
  contract_lte?: InputMaybe<Scalars['String']>;
  contract_not?: InputMaybe<Scalars['String']>;
  contract_not_contains?: InputMaybe<Scalars['String']>;
  contract_not_contains_nocase?: InputMaybe<Scalars['String']>;
  contract_not_ends_with?: InputMaybe<Scalars['String']>;
  contract_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  contract_not_in?: InputMaybe<Array<Scalars['String']>>;
  contract_not_starts_with?: InputMaybe<Scalars['String']>;
  contract_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  contract_starts_with?: InputMaybe<Scalars['String']>;
  contract_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  or?: InputMaybe<Array<InputMaybe<Whitelisting_Filter>>>;
};

export enum Whitelisting_OrderBy {
  Account = 'account',
  Contract = 'contract',
  Id = 'id'
}

export type _Block_ = {
  __typename?: '_Block_';
  /** The hash of the block */
  hash?: Maybe<Scalars['Bytes']>;
  /** The block number */
  number: Scalars['Int'];
  /** Integer representation of the timestamp stored in blocks for the chain */
  timestamp?: Maybe<Scalars['Int']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  __typename?: '_Meta_';
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   *
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean'];
};

export enum _SubgraphErrorPolicy_ {
  /** Data will be returned even if the subgraph has indexing errors */
  Allow = 'allow',
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  Deny = 'deny'
}

/** columns and relationships of "artists" */
export type Artists = {
  __typename?: 'artists';
  created_at?: Maybe<Scalars['timestamptz']>;
  is_ab_staff?: Maybe<Scalars['Boolean']>;
  is_curator?: Maybe<Scalars['Boolean']>;
  /** An object relationship */
  most_recent_hosted_project?: Maybe<Projects_Metadata>;
  most_recent_hosted_project_id?: Maybe<Scalars['String']>;
  /** An object relationship */
  most_recent_project?: Maybe<Projects_Metadata>;
  most_recent_project_id?: Maybe<Scalars['String']>;
  nonce_offset?: Maybe<Scalars['Int']>;
  /** An array relationship */
  projects: Array<Projects_Metadata>;
  /** An aggregate relationship */
  projects_aggregate: Projects_Metadata_Aggregate;
  public_address?: Maybe<Scalars['String']>;
  tos_accepted_at?: Maybe<Scalars['timestamptz']>;
  /** An object relationship */
  user?: Maybe<Users>;
  viewed_warning_banner?: Maybe<Scalars['Boolean']>;
};


/** columns and relationships of "artists" */
export type ArtistsProjectsArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


/** columns and relationships of "artists" */
export type ArtistsProjects_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};

/** aggregated selection of "artists" */
export type Artists_Aggregate = {
  __typename?: 'artists_aggregate';
  aggregate?: Maybe<Artists_Aggregate_Fields>;
  nodes: Array<Artists>;
};

/** aggregate fields of "artists" */
export type Artists_Aggregate_Fields = {
  __typename?: 'artists_aggregate_fields';
  avg?: Maybe<Artists_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Artists_Max_Fields>;
  min?: Maybe<Artists_Min_Fields>;
  stddev?: Maybe<Artists_Stddev_Fields>;
  stddev_pop?: Maybe<Artists_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Artists_Stddev_Samp_Fields>;
  sum?: Maybe<Artists_Sum_Fields>;
  var_pop?: Maybe<Artists_Var_Pop_Fields>;
  var_samp?: Maybe<Artists_Var_Samp_Fields>;
  variance?: Maybe<Artists_Variance_Fields>;
};


/** aggregate fields of "artists" */
export type Artists_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Artists_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Artists_Avg_Fields = {
  __typename?: 'artists_avg_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "artists". All fields are combined with a logical 'AND'. */
export type Artists_Bool_Exp = {
  _and?: InputMaybe<Array<Artists_Bool_Exp>>;
  _not?: InputMaybe<Artists_Bool_Exp>;
  _or?: InputMaybe<Array<Artists_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  is_ab_staff?: InputMaybe<Boolean_Comparison_Exp>;
  is_curator?: InputMaybe<Boolean_Comparison_Exp>;
  most_recent_hosted_project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  most_recent_hosted_project_id?: InputMaybe<String_Comparison_Exp>;
  most_recent_project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  most_recent_project_id?: InputMaybe<String_Comparison_Exp>;
  nonce_offset?: InputMaybe<Int_Comparison_Exp>;
  projects?: InputMaybe<Projects_Metadata_Bool_Exp>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp>;
  public_address?: InputMaybe<String_Comparison_Exp>;
  tos_accepted_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  viewed_warning_banner?: InputMaybe<Boolean_Comparison_Exp>;
};

/** aggregate max on columns */
export type Artists_Max_Fields = {
  __typename?: 'artists_max_fields';
  created_at?: Maybe<Scalars['timestamptz']>;
  most_recent_hosted_project_id?: Maybe<Scalars['String']>;
  most_recent_project_id?: Maybe<Scalars['String']>;
  nonce_offset?: Maybe<Scalars['Int']>;
  public_address?: Maybe<Scalars['String']>;
  tos_accepted_at?: Maybe<Scalars['timestamptz']>;
};

/** aggregate min on columns */
export type Artists_Min_Fields = {
  __typename?: 'artists_min_fields';
  created_at?: Maybe<Scalars['timestamptz']>;
  most_recent_hosted_project_id?: Maybe<Scalars['String']>;
  most_recent_project_id?: Maybe<Scalars['String']>;
  nonce_offset?: Maybe<Scalars['Int']>;
  public_address?: Maybe<Scalars['String']>;
  tos_accepted_at?: Maybe<Scalars['timestamptz']>;
};

/** Ordering options when selecting data from "artists". */
export type Artists_Order_By = {
  created_at?: InputMaybe<Order_By>;
  is_ab_staff?: InputMaybe<Order_By>;
  is_curator?: InputMaybe<Order_By>;
  most_recent_hosted_project?: InputMaybe<Projects_Metadata_Order_By>;
  most_recent_hosted_project_id?: InputMaybe<Order_By>;
  most_recent_project?: InputMaybe<Projects_Metadata_Order_By>;
  most_recent_project_id?: InputMaybe<Order_By>;
  nonce_offset?: InputMaybe<Order_By>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Order_By>;
  public_address?: InputMaybe<Order_By>;
  tos_accepted_at?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  viewed_warning_banner?: InputMaybe<Order_By>;
};

/** select columns of table "artists" */
export enum Artists_Select_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  IsAbStaff = 'is_ab_staff',
  /** column name */
  IsCurator = 'is_curator',
  /** column name */
  MostRecentHostedProjectId = 'most_recent_hosted_project_id',
  /** column name */
  MostRecentProjectId = 'most_recent_project_id',
  /** column name */
  NonceOffset = 'nonce_offset',
  /** column name */
  PublicAddress = 'public_address',
  /** column name */
  TosAcceptedAt = 'tos_accepted_at',
  /** column name */
  ViewedWarningBanner = 'viewed_warning_banner'
}

/** aggregate stddev on columns */
export type Artists_Stddev_Fields = {
  __typename?: 'artists_stddev_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Artists_Stddev_Pop_Fields = {
  __typename?: 'artists_stddev_pop_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Artists_Stddev_Samp_Fields = {
  __typename?: 'artists_stddev_samp_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "artists" */
export type Artists_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Artists_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Artists_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']>;
  is_ab_staff?: InputMaybe<Scalars['Boolean']>;
  is_curator?: InputMaybe<Scalars['Boolean']>;
  most_recent_hosted_project_id?: InputMaybe<Scalars['String']>;
  most_recent_project_id?: InputMaybe<Scalars['String']>;
  nonce_offset?: InputMaybe<Scalars['Int']>;
  public_address?: InputMaybe<Scalars['String']>;
  tos_accepted_at?: InputMaybe<Scalars['timestamptz']>;
  viewed_warning_banner?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate sum on columns */
export type Artists_Sum_Fields = {
  __typename?: 'artists_sum_fields';
  nonce_offset?: Maybe<Scalars['Int']>;
};

/** aggregate var_pop on columns */
export type Artists_Var_Pop_Fields = {
  __typename?: 'artists_var_pop_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Artists_Var_Samp_Fields = {
  __typename?: 'artists_var_samp_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Artists_Variance_Fields = {
  __typename?: 'artists_variance_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['bigint']>;
  _gt?: InputMaybe<Scalars['bigint']>;
  _gte?: InputMaybe<Scalars['bigint']>;
  _in?: InputMaybe<Array<Scalars['bigint']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['bigint']>;
  _lte?: InputMaybe<Scalars['bigint']>;
  _neq?: InputMaybe<Scalars['bigint']>;
  _nin?: InputMaybe<Array<Scalars['bigint']>>;
};

/** columns and relationships of "categories" */
export type Categories = {
  __typename?: 'categories';
  name: Scalars['String'];
  /** An object relationship */
  project_vertical_category?: Maybe<Project_Vertical_Categories>;
};

/** aggregated selection of "categories" */
export type Categories_Aggregate = {
  __typename?: 'categories_aggregate';
  aggregate?: Maybe<Categories_Aggregate_Fields>;
  nodes: Array<Categories>;
};

/** aggregate fields of "categories" */
export type Categories_Aggregate_Fields = {
  __typename?: 'categories_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Categories_Max_Fields>;
  min?: Maybe<Categories_Min_Fields>;
};


/** aggregate fields of "categories" */
export type Categories_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Categories_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "categories". All fields are combined with a logical 'AND'. */
export type Categories_Bool_Exp = {
  _and?: InputMaybe<Array<Categories_Bool_Exp>>;
  _not?: InputMaybe<Categories_Bool_Exp>;
  _or?: InputMaybe<Array<Categories_Bool_Exp>>;
  name?: InputMaybe<String_Comparison_Exp>;
  project_vertical_category?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
};

/** unique or primary key constraints on table "categories" */
export enum Categories_Constraint {
  /** unique or primary key constraint on columns "name" */
  CategoriesPkey = 'categories_pkey'
}

export enum Categories_Enum {
  Collaborations = 'collaborations',
  Collections = 'collections',
  Engine = 'engine',
  Explorations = 'explorations',
  Unassigned = 'unassigned'
}

/** Boolean expression to compare columns of type "categories_enum". All fields are combined with logical 'AND'. */
export type Categories_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Categories_Enum>;
  _in?: InputMaybe<Array<Categories_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Categories_Enum>;
  _nin?: InputMaybe<Array<Categories_Enum>>;
};

/** input type for inserting data into table "categories" */
export type Categories_Insert_Input = {
  name?: InputMaybe<Scalars['String']>;
  project_vertical_category?: InputMaybe<Project_Vertical_Categories_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Categories_Max_Fields = {
  __typename?: 'categories_max_fields';
  name?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Categories_Min_Fields = {
  __typename?: 'categories_min_fields';
  name?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "categories" */
export type Categories_Mutation_Response = {
  __typename?: 'categories_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Categories>;
};

/** input type for inserting object relation for remote table "categories" */
export type Categories_Obj_Rel_Insert_Input = {
  data: Categories_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Categories_On_Conflict>;
};

/** on_conflict condition type for table "categories" */
export type Categories_On_Conflict = {
  constraint: Categories_Constraint;
  update_columns?: Array<Categories_Update_Column>;
  where?: InputMaybe<Categories_Bool_Exp>;
};

/** Ordering options when selecting data from "categories". */
export type Categories_Order_By = {
  name?: InputMaybe<Order_By>;
  project_vertical_category?: InputMaybe<Project_Vertical_Categories_Order_By>;
};

/** primary key columns input for table: categories */
export type Categories_Pk_Columns_Input = {
  name: Scalars['String'];
};

/** select columns of table "categories" */
export enum Categories_Select_Column {
  /** column name */
  Name = 'name'
}

/** input type for updating data in table "categories" */
export type Categories_Set_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "categories" */
export type Categories_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Categories_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Categories_Stream_Cursor_Value_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** update columns of table "categories" */
export enum Categories_Update_Column {
  /** column name */
  Name = 'name'
}

export type Categories_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Categories_Set_Input>;
  /** filter the rows which have to be updated */
  where: Categories_Bool_Exp;
};

/** columns and relationships of "contract_allowlistings" */
export type Contract_Allowlistings = {
  __typename?: 'contract_allowlistings';
  /** An object relationship */
  contract?: Maybe<Contracts_Metadata>;
  contract_address: Scalars['String'];
  /** An object relationship */
  user?: Maybe<Users>;
  user_address: Scalars['String'];
};

/** aggregated selection of "contract_allowlistings" */
export type Contract_Allowlistings_Aggregate = {
  __typename?: 'contract_allowlistings_aggregate';
  aggregate?: Maybe<Contract_Allowlistings_Aggregate_Fields>;
  nodes: Array<Contract_Allowlistings>;
};

export type Contract_Allowlistings_Aggregate_Bool_Exp = {
  count?: InputMaybe<Contract_Allowlistings_Aggregate_Bool_Exp_Count>;
};

export type Contract_Allowlistings_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "contract_allowlistings" */
export type Contract_Allowlistings_Aggregate_Fields = {
  __typename?: 'contract_allowlistings_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Contract_Allowlistings_Max_Fields>;
  min?: Maybe<Contract_Allowlistings_Min_Fields>;
};


/** aggregate fields of "contract_allowlistings" */
export type Contract_Allowlistings_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "contract_allowlistings" */
export type Contract_Allowlistings_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Contract_Allowlistings_Max_Order_By>;
  min?: InputMaybe<Contract_Allowlistings_Min_Order_By>;
};

/** input type for inserting array relation for remote table "contract_allowlistings" */
export type Contract_Allowlistings_Arr_Rel_Insert_Input = {
  data: Array<Contract_Allowlistings_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Contract_Allowlistings_On_Conflict>;
};

/** Boolean expression to filter rows from the table "contract_allowlistings". All fields are combined with a logical 'AND'. */
export type Contract_Allowlistings_Bool_Exp = {
  _and?: InputMaybe<Array<Contract_Allowlistings_Bool_Exp>>;
  _not?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
  _or?: InputMaybe<Array<Contract_Allowlistings_Bool_Exp>>;
  contract?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  contract_address?: InputMaybe<String_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_address?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "contract_allowlistings" */
export enum Contract_Allowlistings_Constraint {
  /** unique or primary key constraint on columns "user_address", "contract_address" */
  ContractAllowlistingsPkey = 'contract_allowlistings_pkey',
  /** unique or primary key constraint on columns "user_address", "contract_address" */
  ContractAllowlistingsUserAddressContractAddressKey = 'contract_allowlistings_user_address_contract_address_key'
}

/** input type for inserting data into table "contract_allowlistings" */
export type Contract_Allowlistings_Insert_Input = {
  contract?: InputMaybe<Contracts_Metadata_Obj_Rel_Insert_Input>;
  contract_address?: InputMaybe<Scalars['String']>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Contract_Allowlistings_Max_Fields = {
  __typename?: 'contract_allowlistings_max_fields';
  contract_address?: Maybe<Scalars['String']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "contract_allowlistings" */
export type Contract_Allowlistings_Max_Order_By = {
  contract_address?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Contract_Allowlistings_Min_Fields = {
  __typename?: 'contract_allowlistings_min_fields';
  contract_address?: Maybe<Scalars['String']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "contract_allowlistings" */
export type Contract_Allowlistings_Min_Order_By = {
  contract_address?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "contract_allowlistings" */
export type Contract_Allowlistings_Mutation_Response = {
  __typename?: 'contract_allowlistings_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Contract_Allowlistings>;
};

/** on_conflict condition type for table "contract_allowlistings" */
export type Contract_Allowlistings_On_Conflict = {
  constraint: Contract_Allowlistings_Constraint;
  update_columns?: Array<Contract_Allowlistings_Update_Column>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};

/** Ordering options when selecting data from "contract_allowlistings". */
export type Contract_Allowlistings_Order_By = {
  contract?: InputMaybe<Contracts_Metadata_Order_By>;
  contract_address?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** primary key columns input for table: contract_allowlistings */
export type Contract_Allowlistings_Pk_Columns_Input = {
  contract_address: Scalars['String'];
  user_address: Scalars['String'];
};

/** select columns of table "contract_allowlistings" */
export enum Contract_Allowlistings_Select_Column {
  /** column name */
  ContractAddress = 'contract_address',
  /** column name */
  UserAddress = 'user_address'
}

/** input type for updating data in table "contract_allowlistings" */
export type Contract_Allowlistings_Set_Input = {
  contract_address?: InputMaybe<Scalars['String']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "contract_allowlistings" */
export type Contract_Allowlistings_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Contract_Allowlistings_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Contract_Allowlistings_Stream_Cursor_Value_Input = {
  contract_address?: InputMaybe<Scalars['String']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** update columns of table "contract_allowlistings" */
export enum Contract_Allowlistings_Update_Column {
  /** column name */
  ContractAddress = 'contract_address',
  /** column name */
  UserAddress = 'user_address'
}

export type Contract_Allowlistings_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Contract_Allowlistings_Set_Input>;
  /** filter the rows which have to be updated */
  where: Contract_Allowlistings_Bool_Exp;
};

/** columns and relationships of "contract_type_names" */
export type Contract_Type_Names = {
  __typename?: 'contract_type_names';
  name: Scalars['String'];
};

/** aggregated selection of "contract_type_names" */
export type Contract_Type_Names_Aggregate = {
  __typename?: 'contract_type_names_aggregate';
  aggregate?: Maybe<Contract_Type_Names_Aggregate_Fields>;
  nodes: Array<Contract_Type_Names>;
};

/** aggregate fields of "contract_type_names" */
export type Contract_Type_Names_Aggregate_Fields = {
  __typename?: 'contract_type_names_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Contract_Type_Names_Max_Fields>;
  min?: Maybe<Contract_Type_Names_Min_Fields>;
};


/** aggregate fields of "contract_type_names" */
export type Contract_Type_Names_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Contract_Type_Names_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "contract_type_names". All fields are combined with a logical 'AND'. */
export type Contract_Type_Names_Bool_Exp = {
  _and?: InputMaybe<Array<Contract_Type_Names_Bool_Exp>>;
  _not?: InputMaybe<Contract_Type_Names_Bool_Exp>;
  _or?: InputMaybe<Array<Contract_Type_Names_Bool_Exp>>;
  name?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "contract_type_names" */
export enum Contract_Type_Names_Constraint {
  /** unique or primary key constraint on columns "name" */
  ContractTypeNamesPkey = 'contract_type_names_pkey'
}

export enum Contract_Type_Names_Enum {
  GenArt721CoreV0 = 'GenArt721CoreV0',
  GenArt721CoreV1 = 'GenArt721CoreV1',
  GenArt721CoreV2EngineFlex = 'GenArt721CoreV2_ENGINE_FLEX',
  GenArt721CoreV2Pbab = 'GenArt721CoreV2_PBAB',
  GenArt721CoreV3 = 'GenArt721CoreV3',
  GenArt721CoreV3Engine = 'GenArt721CoreV3_Engine'
}

/** Boolean expression to compare columns of type "contract_type_names_enum". All fields are combined with logical 'AND'. */
export type Contract_Type_Names_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Contract_Type_Names_Enum>;
  _in?: InputMaybe<Array<Contract_Type_Names_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Contract_Type_Names_Enum>;
  _nin?: InputMaybe<Array<Contract_Type_Names_Enum>>;
};

/** input type for inserting data into table "contract_type_names" */
export type Contract_Type_Names_Insert_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Contract_Type_Names_Max_Fields = {
  __typename?: 'contract_type_names_max_fields';
  name?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Contract_Type_Names_Min_Fields = {
  __typename?: 'contract_type_names_min_fields';
  name?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "contract_type_names" */
export type Contract_Type_Names_Mutation_Response = {
  __typename?: 'contract_type_names_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Contract_Type_Names>;
};

/** on_conflict condition type for table "contract_type_names" */
export type Contract_Type_Names_On_Conflict = {
  constraint: Contract_Type_Names_Constraint;
  update_columns?: Array<Contract_Type_Names_Update_Column>;
  where?: InputMaybe<Contract_Type_Names_Bool_Exp>;
};

/** Ordering options when selecting data from "contract_type_names". */
export type Contract_Type_Names_Order_By = {
  name?: InputMaybe<Order_By>;
};

/** primary key columns input for table: contract_type_names */
export type Contract_Type_Names_Pk_Columns_Input = {
  name: Scalars['String'];
};

/** select columns of table "contract_type_names" */
export enum Contract_Type_Names_Select_Column {
  /** column name */
  Name = 'name'
}

/** input type for updating data in table "contract_type_names" */
export type Contract_Type_Names_Set_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "contract_type_names" */
export type Contract_Type_Names_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Contract_Type_Names_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Contract_Type_Names_Stream_Cursor_Value_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** update columns of table "contract_type_names" */
export enum Contract_Type_Names_Update_Column {
  /** column name */
  Name = 'name'
}

export type Contract_Type_Names_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Contract_Type_Names_Set_Input>;
  /** filter the rows which have to be updated */
  where: Contract_Type_Names_Bool_Exp;
};

/** columns and relationships of "contract_types" */
export type Contract_Types = {
  __typename?: 'contract_types';
  abi?: Maybe<Scalars['jsonb']>;
  type: Contract_Type_Names_Enum;
};


/** columns and relationships of "contract_types" */
export type Contract_TypesAbiArgs = {
  path?: InputMaybe<Scalars['String']>;
};

/** aggregated selection of "contract_types" */
export type Contract_Types_Aggregate = {
  __typename?: 'contract_types_aggregate';
  aggregate?: Maybe<Contract_Types_Aggregate_Fields>;
  nodes: Array<Contract_Types>;
};

/** aggregate fields of "contract_types" */
export type Contract_Types_Aggregate_Fields = {
  __typename?: 'contract_types_aggregate_fields';
  count: Scalars['Int'];
};


/** aggregate fields of "contract_types" */
export type Contract_Types_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Contract_Types_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Contract_Types_Append_Input = {
  abi?: InputMaybe<Scalars['jsonb']>;
};

/** Boolean expression to filter rows from the table "contract_types". All fields are combined with a logical 'AND'. */
export type Contract_Types_Bool_Exp = {
  _and?: InputMaybe<Array<Contract_Types_Bool_Exp>>;
  _not?: InputMaybe<Contract_Types_Bool_Exp>;
  _or?: InputMaybe<Array<Contract_Types_Bool_Exp>>;
  abi?: InputMaybe<Jsonb_Comparison_Exp>;
  type?: InputMaybe<Contract_Type_Names_Enum_Comparison_Exp>;
};

/** unique or primary key constraints on table "contract_types" */
export enum Contract_Types_Constraint {
  /** unique or primary key constraint on columns "type" */
  ContractTypesPkey = 'contract_types_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Contract_Types_Delete_At_Path_Input = {
  abi?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Contract_Types_Delete_Elem_Input = {
  abi?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Contract_Types_Delete_Key_Input = {
  abi?: InputMaybe<Scalars['String']>;
};

/** input type for inserting data into table "contract_types" */
export type Contract_Types_Insert_Input = {
  abi?: InputMaybe<Scalars['jsonb']>;
  type?: InputMaybe<Contract_Type_Names_Enum>;
};

/** response of any mutation on the table "contract_types" */
export type Contract_Types_Mutation_Response = {
  __typename?: 'contract_types_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Contract_Types>;
};

/** input type for inserting object relation for remote table "contract_types" */
export type Contract_Types_Obj_Rel_Insert_Input = {
  data: Contract_Types_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Contract_Types_On_Conflict>;
};

/** on_conflict condition type for table "contract_types" */
export type Contract_Types_On_Conflict = {
  constraint: Contract_Types_Constraint;
  update_columns?: Array<Contract_Types_Update_Column>;
  where?: InputMaybe<Contract_Types_Bool_Exp>;
};

/** Ordering options when selecting data from "contract_types". */
export type Contract_Types_Order_By = {
  abi?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
};

/** primary key columns input for table: contract_types */
export type Contract_Types_Pk_Columns_Input = {
  type: Contract_Type_Names_Enum;
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Contract_Types_Prepend_Input = {
  abi?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "contract_types" */
export enum Contract_Types_Select_Column {
  /** column name */
  Abi = 'abi',
  /** column name */
  Type = 'type'
}

/** input type for updating data in table "contract_types" */
export type Contract_Types_Set_Input = {
  abi?: InputMaybe<Scalars['jsonb']>;
  type?: InputMaybe<Contract_Type_Names_Enum>;
};

/** Streaming cursor of the table "contract_types" */
export type Contract_Types_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Contract_Types_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Contract_Types_Stream_Cursor_Value_Input = {
  abi?: InputMaybe<Scalars['jsonb']>;
  type?: InputMaybe<Contract_Type_Names_Enum>;
};

/** update columns of table "contract_types" */
export enum Contract_Types_Update_Column {
  /** column name */
  Abi = 'abi',
  /** column name */
  Type = 'type'
}

export type Contract_Types_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Contract_Types_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Contract_Types_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Contract_Types_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Contract_Types_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Contract_Types_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Contract_Types_Set_Input>;
  /** filter the rows which have to be updated */
  where: Contract_Types_Bool_Exp;
};

/** columns and relationships of "contracts_metadata" */
export type Contracts_Metadata = {
  __typename?: 'contracts_metadata';
  address: Scalars['String'];
  admin?: Maybe<Scalars['String']>;
  alertbot_secret?: Maybe<Scalars['String']>;
  alertbot_url?: Maybe<Scalars['String']>;
  /** An array relationship */
  allowlisted_users: Array<Contract_Allowlistings>;
  /** An aggregate relationship */
  allowlisted_users_aggregate: Contract_Allowlistings_Aggregate;
  bucket_name?: Maybe<Scalars['String']>;
  contract_type: Contract_Type_Names_Enum;
  curation_registry_address?: Maybe<Scalars['String']>;
  /** An object relationship */
  default_vertical: Project_Verticals;
  default_vertical_name: Scalars['String'];
  dependency_registry_address?: Maybe<Scalars['String']>;
  generator_url?: Maybe<Scalars['String']>;
  minter_address?: Maybe<Scalars['String']>;
  /** An object relationship */
  minter_filter?: Maybe<Minter_Filters_Metadata>;
  minter_filter_address?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  /** A computed field, executes function "new_projects_forbidden" */
  new_projects_forbidden?: Maybe<Scalars['Boolean']>;
  new_projects_forbidden_offchain: Scalars['Boolean'];
  new_projects_forbidden_onchain: Scalars['Boolean'];
  preferred_arweave_gateway?: Maybe<Scalars['String']>;
  preferred_ipfs_gateway?: Maybe<Scalars['String']>;
  /** An array relationship */
  projects: Array<Projects_Metadata>;
  /** An aggregate relationship */
  projects_aggregate: Projects_Metadata_Aggregate;
  render_provider_address?: Maybe<Scalars['String']>;
  render_provider_percentage?: Maybe<Scalars['Int']>;
  render_provider_secondary_sales_address?: Maybe<Scalars['String']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Int']>;
  token_base_url?: Maybe<Scalars['String']>;
  /** An object relationship */
  type?: Maybe<Contract_Types>;
  updated_at?: Maybe<Scalars['timestamp']>;
  /** A computed field, executes function "user_is_allowlisted" */
  user_is_allowlisted?: Maybe<Scalars['Boolean']>;
};


/** columns and relationships of "contracts_metadata" */
export type Contracts_MetadataAllowlisted_UsersArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


/** columns and relationships of "contracts_metadata" */
export type Contracts_MetadataAllowlisted_Users_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


/** columns and relationships of "contracts_metadata" */
export type Contracts_MetadataProjectsArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


/** columns and relationships of "contracts_metadata" */
export type Contracts_MetadataProjects_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};

/** aggregated selection of "contracts_metadata" */
export type Contracts_Metadata_Aggregate = {
  __typename?: 'contracts_metadata_aggregate';
  aggregate?: Maybe<Contracts_Metadata_Aggregate_Fields>;
  nodes: Array<Contracts_Metadata>;
};

export type Contracts_Metadata_Aggregate_Bool_Exp = {
  bool_and?: InputMaybe<Contracts_Metadata_Aggregate_Bool_Exp_Bool_And>;
  bool_or?: InputMaybe<Contracts_Metadata_Aggregate_Bool_Exp_Bool_Or>;
  count?: InputMaybe<Contracts_Metadata_Aggregate_Bool_Exp_Count>;
};

export type Contracts_Metadata_Aggregate_Bool_Exp_Bool_And = {
  arguments: Contracts_Metadata_Select_Column_Contracts_Metadata_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Contracts_Metadata_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Contracts_Metadata_Select_Column_Contracts_Metadata_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Contracts_Metadata_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "contracts_metadata" */
export type Contracts_Metadata_Aggregate_Fields = {
  __typename?: 'contracts_metadata_aggregate_fields';
  avg?: Maybe<Contracts_Metadata_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Contracts_Metadata_Max_Fields>;
  min?: Maybe<Contracts_Metadata_Min_Fields>;
  stddev?: Maybe<Contracts_Metadata_Stddev_Fields>;
  stddev_pop?: Maybe<Contracts_Metadata_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Contracts_Metadata_Stddev_Samp_Fields>;
  sum?: Maybe<Contracts_Metadata_Sum_Fields>;
  var_pop?: Maybe<Contracts_Metadata_Var_Pop_Fields>;
  var_samp?: Maybe<Contracts_Metadata_Var_Samp_Fields>;
  variance?: Maybe<Contracts_Metadata_Variance_Fields>;
};


/** aggregate fields of "contracts_metadata" */
export type Contracts_Metadata_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "contracts_metadata" */
export type Contracts_Metadata_Aggregate_Order_By = {
  avg?: InputMaybe<Contracts_Metadata_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Contracts_Metadata_Max_Order_By>;
  min?: InputMaybe<Contracts_Metadata_Min_Order_By>;
  stddev?: InputMaybe<Contracts_Metadata_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Contracts_Metadata_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Contracts_Metadata_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Contracts_Metadata_Sum_Order_By>;
  var_pop?: InputMaybe<Contracts_Metadata_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Contracts_Metadata_Var_Samp_Order_By>;
  variance?: InputMaybe<Contracts_Metadata_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "contracts_metadata" */
export type Contracts_Metadata_Arr_Rel_Insert_Input = {
  data: Array<Contracts_Metadata_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Contracts_Metadata_On_Conflict>;
};

/** aggregate avg on columns */
export type Contracts_Metadata_Avg_Fields = {
  __typename?: 'contracts_metadata_avg_fields';
  render_provider_percentage?: Maybe<Scalars['Float']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Avg_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "contracts_metadata". All fields are combined with a logical 'AND'. */
export type Contracts_Metadata_Bool_Exp = {
  _and?: InputMaybe<Array<Contracts_Metadata_Bool_Exp>>;
  _not?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  _or?: InputMaybe<Array<Contracts_Metadata_Bool_Exp>>;
  address?: InputMaybe<String_Comparison_Exp>;
  admin?: InputMaybe<String_Comparison_Exp>;
  alertbot_secret?: InputMaybe<String_Comparison_Exp>;
  alertbot_url?: InputMaybe<String_Comparison_Exp>;
  allowlisted_users?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
  allowlisted_users_aggregate?: InputMaybe<Contract_Allowlistings_Aggregate_Bool_Exp>;
  bucket_name?: InputMaybe<String_Comparison_Exp>;
  contract_type?: InputMaybe<Contract_Type_Names_Enum_Comparison_Exp>;
  curation_registry_address?: InputMaybe<String_Comparison_Exp>;
  default_vertical?: InputMaybe<Project_Verticals_Bool_Exp>;
  default_vertical_name?: InputMaybe<String_Comparison_Exp>;
  dependency_registry_address?: InputMaybe<String_Comparison_Exp>;
  generator_url?: InputMaybe<String_Comparison_Exp>;
  minter_address?: InputMaybe<String_Comparison_Exp>;
  minter_filter?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
  minter_filter_address?: InputMaybe<String_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  new_projects_forbidden?: InputMaybe<Boolean_Comparison_Exp>;
  new_projects_forbidden_offchain?: InputMaybe<Boolean_Comparison_Exp>;
  new_projects_forbidden_onchain?: InputMaybe<Boolean_Comparison_Exp>;
  preferred_arweave_gateway?: InputMaybe<String_Comparison_Exp>;
  preferred_ipfs_gateway?: InputMaybe<String_Comparison_Exp>;
  projects?: InputMaybe<Projects_Metadata_Bool_Exp>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp>;
  render_provider_address?: InputMaybe<String_Comparison_Exp>;
  render_provider_percentage?: InputMaybe<Int_Comparison_Exp>;
  render_provider_secondary_sales_address?: InputMaybe<String_Comparison_Exp>;
  render_provider_secondary_sales_bps?: InputMaybe<Int_Comparison_Exp>;
  token_base_url?: InputMaybe<String_Comparison_Exp>;
  type?: InputMaybe<Contract_Types_Bool_Exp>;
  updated_at?: InputMaybe<Timestamp_Comparison_Exp>;
  user_is_allowlisted?: InputMaybe<Boolean_Comparison_Exp>;
};

/** unique or primary key constraints on table "contracts_metadata" */
export enum Contracts_Metadata_Constraint {
  /** unique or primary key constraint on columns "name" */
  ContractsMetadataNameKey = 'contracts_metadata_name_key',
  /** unique or primary key constraint on columns "address" */
  ContractsMetadataPkey = 'contracts_metadata_pkey'
}

/** input type for incrementing numeric columns in table "contracts_metadata" */
export type Contracts_Metadata_Inc_Input = {
  render_provider_percentage?: InputMaybe<Scalars['Int']>;
  render_provider_secondary_sales_bps?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "contracts_metadata" */
export type Contracts_Metadata_Insert_Input = {
  address?: InputMaybe<Scalars['String']>;
  admin?: InputMaybe<Scalars['String']>;
  alertbot_secret?: InputMaybe<Scalars['String']>;
  alertbot_url?: InputMaybe<Scalars['String']>;
  allowlisted_users?: InputMaybe<Contract_Allowlistings_Arr_Rel_Insert_Input>;
  bucket_name?: InputMaybe<Scalars['String']>;
  contract_type?: InputMaybe<Contract_Type_Names_Enum>;
  curation_registry_address?: InputMaybe<Scalars['String']>;
  default_vertical?: InputMaybe<Project_Verticals_Obj_Rel_Insert_Input>;
  default_vertical_name?: InputMaybe<Scalars['String']>;
  dependency_registry_address?: InputMaybe<Scalars['String']>;
  generator_url?: InputMaybe<Scalars['String']>;
  minter_address?: InputMaybe<Scalars['String']>;
  minter_filter?: InputMaybe<Minter_Filters_Metadata_Obj_Rel_Insert_Input>;
  minter_filter_address?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  new_projects_forbidden_offchain?: InputMaybe<Scalars['Boolean']>;
  new_projects_forbidden_onchain?: InputMaybe<Scalars['Boolean']>;
  preferred_arweave_gateway?: InputMaybe<Scalars['String']>;
  preferred_ipfs_gateway?: InputMaybe<Scalars['String']>;
  projects?: InputMaybe<Projects_Metadata_Arr_Rel_Insert_Input>;
  render_provider_address?: InputMaybe<Scalars['String']>;
  render_provider_percentage?: InputMaybe<Scalars['Int']>;
  render_provider_secondary_sales_address?: InputMaybe<Scalars['String']>;
  render_provider_secondary_sales_bps?: InputMaybe<Scalars['Int']>;
  token_base_url?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<Contract_Types_Obj_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
};

/** aggregate max on columns */
export type Contracts_Metadata_Max_Fields = {
  __typename?: 'contracts_metadata_max_fields';
  address?: Maybe<Scalars['String']>;
  admin?: Maybe<Scalars['String']>;
  alertbot_secret?: Maybe<Scalars['String']>;
  alertbot_url?: Maybe<Scalars['String']>;
  bucket_name?: Maybe<Scalars['String']>;
  curation_registry_address?: Maybe<Scalars['String']>;
  default_vertical_name?: Maybe<Scalars['String']>;
  dependency_registry_address?: Maybe<Scalars['String']>;
  generator_url?: Maybe<Scalars['String']>;
  minter_address?: Maybe<Scalars['String']>;
  minter_filter_address?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  preferred_arweave_gateway?: Maybe<Scalars['String']>;
  preferred_ipfs_gateway?: Maybe<Scalars['String']>;
  render_provider_address?: Maybe<Scalars['String']>;
  render_provider_percentage?: Maybe<Scalars['Int']>;
  render_provider_secondary_sales_address?: Maybe<Scalars['String']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Int']>;
  token_base_url?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** order by max() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Max_Order_By = {
  address?: InputMaybe<Order_By>;
  admin?: InputMaybe<Order_By>;
  alertbot_secret?: InputMaybe<Order_By>;
  alertbot_url?: InputMaybe<Order_By>;
  bucket_name?: InputMaybe<Order_By>;
  curation_registry_address?: InputMaybe<Order_By>;
  default_vertical_name?: InputMaybe<Order_By>;
  dependency_registry_address?: InputMaybe<Order_By>;
  generator_url?: InputMaybe<Order_By>;
  minter_address?: InputMaybe<Order_By>;
  minter_filter_address?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  preferred_arweave_gateway?: InputMaybe<Order_By>;
  preferred_ipfs_gateway?: InputMaybe<Order_By>;
  render_provider_address?: InputMaybe<Order_By>;
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_address?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
  token_base_url?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Contracts_Metadata_Min_Fields = {
  __typename?: 'contracts_metadata_min_fields';
  address?: Maybe<Scalars['String']>;
  admin?: Maybe<Scalars['String']>;
  alertbot_secret?: Maybe<Scalars['String']>;
  alertbot_url?: Maybe<Scalars['String']>;
  bucket_name?: Maybe<Scalars['String']>;
  curation_registry_address?: Maybe<Scalars['String']>;
  default_vertical_name?: Maybe<Scalars['String']>;
  dependency_registry_address?: Maybe<Scalars['String']>;
  generator_url?: Maybe<Scalars['String']>;
  minter_address?: Maybe<Scalars['String']>;
  minter_filter_address?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  preferred_arweave_gateway?: Maybe<Scalars['String']>;
  preferred_ipfs_gateway?: Maybe<Scalars['String']>;
  render_provider_address?: Maybe<Scalars['String']>;
  render_provider_percentage?: Maybe<Scalars['Int']>;
  render_provider_secondary_sales_address?: Maybe<Scalars['String']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Int']>;
  token_base_url?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
};

/** order by min() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Min_Order_By = {
  address?: InputMaybe<Order_By>;
  admin?: InputMaybe<Order_By>;
  alertbot_secret?: InputMaybe<Order_By>;
  alertbot_url?: InputMaybe<Order_By>;
  bucket_name?: InputMaybe<Order_By>;
  curation_registry_address?: InputMaybe<Order_By>;
  default_vertical_name?: InputMaybe<Order_By>;
  dependency_registry_address?: InputMaybe<Order_By>;
  generator_url?: InputMaybe<Order_By>;
  minter_address?: InputMaybe<Order_By>;
  minter_filter_address?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  preferred_arweave_gateway?: InputMaybe<Order_By>;
  preferred_ipfs_gateway?: InputMaybe<Order_By>;
  render_provider_address?: InputMaybe<Order_By>;
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_address?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
  token_base_url?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "contracts_metadata" */
export type Contracts_Metadata_Mutation_Response = {
  __typename?: 'contracts_metadata_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Contracts_Metadata>;
};

/** input type for inserting object relation for remote table "contracts_metadata" */
export type Contracts_Metadata_Obj_Rel_Insert_Input = {
  data: Contracts_Metadata_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Contracts_Metadata_On_Conflict>;
};

/** on_conflict condition type for table "contracts_metadata" */
export type Contracts_Metadata_On_Conflict = {
  constraint: Contracts_Metadata_Constraint;
  update_columns?: Array<Contracts_Metadata_Update_Column>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};

/** Ordering options when selecting data from "contracts_metadata". */
export type Contracts_Metadata_Order_By = {
  address?: InputMaybe<Order_By>;
  admin?: InputMaybe<Order_By>;
  alertbot_secret?: InputMaybe<Order_By>;
  alertbot_url?: InputMaybe<Order_By>;
  allowlisted_users_aggregate?: InputMaybe<Contract_Allowlistings_Aggregate_Order_By>;
  bucket_name?: InputMaybe<Order_By>;
  contract_type?: InputMaybe<Order_By>;
  curation_registry_address?: InputMaybe<Order_By>;
  default_vertical?: InputMaybe<Project_Verticals_Order_By>;
  default_vertical_name?: InputMaybe<Order_By>;
  dependency_registry_address?: InputMaybe<Order_By>;
  generator_url?: InputMaybe<Order_By>;
  minter_address?: InputMaybe<Order_By>;
  minter_filter?: InputMaybe<Minter_Filters_Metadata_Order_By>;
  minter_filter_address?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  new_projects_forbidden?: InputMaybe<Order_By>;
  new_projects_forbidden_offchain?: InputMaybe<Order_By>;
  new_projects_forbidden_onchain?: InputMaybe<Order_By>;
  preferred_arweave_gateway?: InputMaybe<Order_By>;
  preferred_ipfs_gateway?: InputMaybe<Order_By>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Order_By>;
  render_provider_address?: InputMaybe<Order_By>;
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_address?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
  token_base_url?: InputMaybe<Order_By>;
  type?: InputMaybe<Contract_Types_Order_By>;
  updated_at?: InputMaybe<Order_By>;
  user_is_allowlisted?: InputMaybe<Order_By>;
};

/** primary key columns input for table: contracts_metadata */
export type Contracts_Metadata_Pk_Columns_Input = {
  address: Scalars['String'];
};

/** select columns of table "contracts_metadata" */
export enum Contracts_Metadata_Select_Column {
  /** column name */
  Address = 'address',
  /** column name */
  Admin = 'admin',
  /** column name */
  AlertbotSecret = 'alertbot_secret',
  /** column name */
  AlertbotUrl = 'alertbot_url',
  /** column name */
  BucketName = 'bucket_name',
  /** column name */
  ContractType = 'contract_type',
  /** column name */
  CurationRegistryAddress = 'curation_registry_address',
  /** column name */
  DefaultVerticalName = 'default_vertical_name',
  /** column name */
  DependencyRegistryAddress = 'dependency_registry_address',
  /** column name */
  GeneratorUrl = 'generator_url',
  /** column name */
  MinterAddress = 'minter_address',
  /** column name */
  MinterFilterAddress = 'minter_filter_address',
  /** column name */
  Name = 'name',
  /** column name */
  NewProjectsForbiddenOffchain = 'new_projects_forbidden_offchain',
  /** column name */
  NewProjectsForbiddenOnchain = 'new_projects_forbidden_onchain',
  /** column name */
  PreferredArweaveGateway = 'preferred_arweave_gateway',
  /** column name */
  PreferredIpfsGateway = 'preferred_ipfs_gateway',
  /** column name */
  RenderProviderAddress = 'render_provider_address',
  /** column name */
  RenderProviderPercentage = 'render_provider_percentage',
  /** column name */
  RenderProviderSecondarySalesAddress = 'render_provider_secondary_sales_address',
  /** column name */
  RenderProviderSecondarySalesBps = 'render_provider_secondary_sales_bps',
  /** column name */
  TokenBaseUrl = 'token_base_url',
  /** column name */
  UpdatedAt = 'updated_at'
}

/** select "contracts_metadata_aggregate_bool_exp_bool_and_arguments_columns" columns of table "contracts_metadata" */
export enum Contracts_Metadata_Select_Column_Contracts_Metadata_Aggregate_Bool_Exp_Bool_And_Arguments_Columns {
  /** column name */
  NewProjectsForbiddenOffchain = 'new_projects_forbidden_offchain',
  /** column name */
  NewProjectsForbiddenOnchain = 'new_projects_forbidden_onchain'
}

/** select "contracts_metadata_aggregate_bool_exp_bool_or_arguments_columns" columns of table "contracts_metadata" */
export enum Contracts_Metadata_Select_Column_Contracts_Metadata_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns {
  /** column name */
  NewProjectsForbiddenOffchain = 'new_projects_forbidden_offchain',
  /** column name */
  NewProjectsForbiddenOnchain = 'new_projects_forbidden_onchain'
}

/** input type for updating data in table "contracts_metadata" */
export type Contracts_Metadata_Set_Input = {
  address?: InputMaybe<Scalars['String']>;
  admin?: InputMaybe<Scalars['String']>;
  alertbot_secret?: InputMaybe<Scalars['String']>;
  alertbot_url?: InputMaybe<Scalars['String']>;
  bucket_name?: InputMaybe<Scalars['String']>;
  contract_type?: InputMaybe<Contract_Type_Names_Enum>;
  curation_registry_address?: InputMaybe<Scalars['String']>;
  default_vertical_name?: InputMaybe<Scalars['String']>;
  dependency_registry_address?: InputMaybe<Scalars['String']>;
  generator_url?: InputMaybe<Scalars['String']>;
  minter_address?: InputMaybe<Scalars['String']>;
  minter_filter_address?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  new_projects_forbidden_offchain?: InputMaybe<Scalars['Boolean']>;
  new_projects_forbidden_onchain?: InputMaybe<Scalars['Boolean']>;
  preferred_arweave_gateway?: InputMaybe<Scalars['String']>;
  preferred_ipfs_gateway?: InputMaybe<Scalars['String']>;
  render_provider_address?: InputMaybe<Scalars['String']>;
  render_provider_percentage?: InputMaybe<Scalars['Int']>;
  render_provider_secondary_sales_address?: InputMaybe<Scalars['String']>;
  render_provider_secondary_sales_bps?: InputMaybe<Scalars['Int']>;
  token_base_url?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
};

/** aggregate stddev on columns */
export type Contracts_Metadata_Stddev_Fields = {
  __typename?: 'contracts_metadata_stddev_fields';
  render_provider_percentage?: Maybe<Scalars['Float']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Stddev_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Contracts_Metadata_Stddev_Pop_Fields = {
  __typename?: 'contracts_metadata_stddev_pop_fields';
  render_provider_percentage?: Maybe<Scalars['Float']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Stddev_Pop_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Contracts_Metadata_Stddev_Samp_Fields = {
  __typename?: 'contracts_metadata_stddev_samp_fields';
  render_provider_percentage?: Maybe<Scalars['Float']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Stddev_Samp_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "contracts_metadata" */
export type Contracts_Metadata_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Contracts_Metadata_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Contracts_Metadata_Stream_Cursor_Value_Input = {
  address?: InputMaybe<Scalars['String']>;
  admin?: InputMaybe<Scalars['String']>;
  alertbot_secret?: InputMaybe<Scalars['String']>;
  alertbot_url?: InputMaybe<Scalars['String']>;
  bucket_name?: InputMaybe<Scalars['String']>;
  contract_type?: InputMaybe<Contract_Type_Names_Enum>;
  curation_registry_address?: InputMaybe<Scalars['String']>;
  default_vertical_name?: InputMaybe<Scalars['String']>;
  dependency_registry_address?: InputMaybe<Scalars['String']>;
  generator_url?: InputMaybe<Scalars['String']>;
  minter_address?: InputMaybe<Scalars['String']>;
  minter_filter_address?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  new_projects_forbidden_offchain?: InputMaybe<Scalars['Boolean']>;
  new_projects_forbidden_onchain?: InputMaybe<Scalars['Boolean']>;
  preferred_arweave_gateway?: InputMaybe<Scalars['String']>;
  preferred_ipfs_gateway?: InputMaybe<Scalars['String']>;
  render_provider_address?: InputMaybe<Scalars['String']>;
  render_provider_percentage?: InputMaybe<Scalars['Int']>;
  render_provider_secondary_sales_address?: InputMaybe<Scalars['String']>;
  render_provider_secondary_sales_bps?: InputMaybe<Scalars['Int']>;
  token_base_url?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
};

/** aggregate sum on columns */
export type Contracts_Metadata_Sum_Fields = {
  __typename?: 'contracts_metadata_sum_fields';
  render_provider_percentage?: Maybe<Scalars['Int']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Sum_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** update columns of table "contracts_metadata" */
export enum Contracts_Metadata_Update_Column {
  /** column name */
  Address = 'address',
  /** column name */
  Admin = 'admin',
  /** column name */
  AlertbotSecret = 'alertbot_secret',
  /** column name */
  AlertbotUrl = 'alertbot_url',
  /** column name */
  BucketName = 'bucket_name',
  /** column name */
  ContractType = 'contract_type',
  /** column name */
  CurationRegistryAddress = 'curation_registry_address',
  /** column name */
  DefaultVerticalName = 'default_vertical_name',
  /** column name */
  DependencyRegistryAddress = 'dependency_registry_address',
  /** column name */
  GeneratorUrl = 'generator_url',
  /** column name */
  MinterAddress = 'minter_address',
  /** column name */
  MinterFilterAddress = 'minter_filter_address',
  /** column name */
  Name = 'name',
  /** column name */
  NewProjectsForbiddenOffchain = 'new_projects_forbidden_offchain',
  /** column name */
  NewProjectsForbiddenOnchain = 'new_projects_forbidden_onchain',
  /** column name */
  PreferredArweaveGateway = 'preferred_arweave_gateway',
  /** column name */
  PreferredIpfsGateway = 'preferred_ipfs_gateway',
  /** column name */
  RenderProviderAddress = 'render_provider_address',
  /** column name */
  RenderProviderPercentage = 'render_provider_percentage',
  /** column name */
  RenderProviderSecondarySalesAddress = 'render_provider_secondary_sales_address',
  /** column name */
  RenderProviderSecondarySalesBps = 'render_provider_secondary_sales_bps',
  /** column name */
  TokenBaseUrl = 'token_base_url',
  /** column name */
  UpdatedAt = 'updated_at'
}

export type Contracts_Metadata_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Contracts_Metadata_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Contracts_Metadata_Set_Input>;
  /** filter the rows which have to be updated */
  where: Contracts_Metadata_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Contracts_Metadata_Var_Pop_Fields = {
  __typename?: 'contracts_metadata_var_pop_fields';
  render_provider_percentage?: Maybe<Scalars['Float']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Var_Pop_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Contracts_Metadata_Var_Samp_Fields = {
  __typename?: 'contracts_metadata_var_samp_fields';
  render_provider_percentage?: Maybe<Scalars['Float']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Var_Samp_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Contracts_Metadata_Variance_Fields = {
  __typename?: 'contracts_metadata_variance_fields';
  render_provider_percentage?: Maybe<Scalars['Float']>;
  render_provider_secondary_sales_bps?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "contracts_metadata" */
export type Contracts_Metadata_Variance_Order_By = {
  render_provider_percentage?: InputMaybe<Order_By>;
  render_provider_secondary_sales_bps?: InputMaybe<Order_By>;
};

/** fields of action: "createApplication" */
export type CreateApplication = {
  __typename?: 'createApplication';
  /** the time at which this action was created */
  created_at: Scalars['timestamptz'];
  /** errors related to the invocation */
  errors?: Maybe<Scalars['json']>;
  /** the unique id of an action */
  id: Scalars['uuid'];
  /** the output fields of this action */
  output?: Maybe<CreateApplicationOutput>;
};

/** columns and relationships of "curation_statuses" */
export type Curation_Statuses = {
  __typename?: 'curation_statuses';
  value: Scalars['String'];
};

/** aggregated selection of "curation_statuses" */
export type Curation_Statuses_Aggregate = {
  __typename?: 'curation_statuses_aggregate';
  aggregate?: Maybe<Curation_Statuses_Aggregate_Fields>;
  nodes: Array<Curation_Statuses>;
};

/** aggregate fields of "curation_statuses" */
export type Curation_Statuses_Aggregate_Fields = {
  __typename?: 'curation_statuses_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Curation_Statuses_Max_Fields>;
  min?: Maybe<Curation_Statuses_Min_Fields>;
};


/** aggregate fields of "curation_statuses" */
export type Curation_Statuses_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Curation_Statuses_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "curation_statuses". All fields are combined with a logical 'AND'. */
export type Curation_Statuses_Bool_Exp = {
  _and?: InputMaybe<Array<Curation_Statuses_Bool_Exp>>;
  _not?: InputMaybe<Curation_Statuses_Bool_Exp>;
  _or?: InputMaybe<Array<Curation_Statuses_Bool_Exp>>;
  value?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "curation_statuses" */
export enum Curation_Statuses_Constraint {
  /** unique or primary key constraint on columns "value" */
  CurationStatusesPkey = 'curation_statuses_pkey'
}

export enum Curation_Statuses_Enum {
  Curated = 'curated',
  Factory = 'factory',
  Playground = 'playground'
}

/** Boolean expression to compare columns of type "curation_statuses_enum". All fields are combined with logical 'AND'. */
export type Curation_Statuses_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Curation_Statuses_Enum>;
  _in?: InputMaybe<Array<Curation_Statuses_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Curation_Statuses_Enum>;
  _nin?: InputMaybe<Array<Curation_Statuses_Enum>>;
};

/** input type for inserting data into table "curation_statuses" */
export type Curation_Statuses_Insert_Input = {
  value?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Curation_Statuses_Max_Fields = {
  __typename?: 'curation_statuses_max_fields';
  value?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Curation_Statuses_Min_Fields = {
  __typename?: 'curation_statuses_min_fields';
  value?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "curation_statuses" */
export type Curation_Statuses_Mutation_Response = {
  __typename?: 'curation_statuses_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Curation_Statuses>;
};

/** on_conflict condition type for table "curation_statuses" */
export type Curation_Statuses_On_Conflict = {
  constraint: Curation_Statuses_Constraint;
  update_columns?: Array<Curation_Statuses_Update_Column>;
  where?: InputMaybe<Curation_Statuses_Bool_Exp>;
};

/** Ordering options when selecting data from "curation_statuses". */
export type Curation_Statuses_Order_By = {
  value?: InputMaybe<Order_By>;
};

/** primary key columns input for table: curation_statuses */
export type Curation_Statuses_Pk_Columns_Input = {
  value: Scalars['String'];
};

/** select columns of table "curation_statuses" */
export enum Curation_Statuses_Select_Column {
  /** column name */
  Value = 'value'
}

/** input type for updating data in table "curation_statuses" */
export type Curation_Statuses_Set_Input = {
  value?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "curation_statuses" */
export type Curation_Statuses_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Curation_Statuses_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Curation_Statuses_Stream_Cursor_Value_Input = {
  value?: InputMaybe<Scalars['String']>;
};

/** update columns of table "curation_statuses" */
export enum Curation_Statuses_Update_Column {
  /** column name */
  Value = 'value'
}

export type Curation_Statuses_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Curation_Statuses_Set_Input>;
  /** filter the rows which have to be updated */
  where: Curation_Statuses_Bool_Exp;
};

/** ordering argument of a cursor */
export enum Cursor_Ordering {
  /** ascending ordering of the cursor */
  Asc = 'ASC',
  /** descending ordering of the cursor */
  Desc = 'DESC'
}

/** columns and relationships of "dependencies_metadata" */
export type Dependencies_Metadata = {
  __typename?: 'dependencies_metadata';
  /** An array relationship */
  additional_cdns: Array<Dependency_Additional_Cdns>;
  /** An aggregate relationship */
  additional_cdns_aggregate: Dependency_Additional_Cdns_Aggregate;
  /** An array relationship */
  additional_repositories: Array<Dependency_Additional_Repositories>;
  /** An aggregate relationship */
  additional_repositories_aggregate: Dependency_Additional_Repositories_Aggregate;
  /** An object relationship */
  dependency_registry: Dependency_Registries;
  dependency_registry_address: Scalars['String'];
  preferred_cdn?: Maybe<Scalars['String']>;
  preferred_repository?: Maybe<Scalars['String']>;
  reference_website?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
  /** An array relationship */
  scripts: Array<Dependency_Scripts>;
  /** An aggregate relationship */
  scripts_aggregate: Dependency_Scripts_Aggregate;
  type_and_version: Scalars['String'];
  updated_at: Scalars['timestamptz'];
  updated_onchain_at: Scalars['timestamptz'];
};


/** columns and relationships of "dependencies_metadata" */
export type Dependencies_MetadataAdditional_CdnsArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Cdns_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};


/** columns and relationships of "dependencies_metadata" */
export type Dependencies_MetadataAdditional_Cdns_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Cdns_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};


/** columns and relationships of "dependencies_metadata" */
export type Dependencies_MetadataAdditional_RepositoriesArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Repositories_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};


/** columns and relationships of "dependencies_metadata" */
export type Dependencies_MetadataAdditional_Repositories_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Repositories_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};


/** columns and relationships of "dependencies_metadata" */
export type Dependencies_MetadataScriptsArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Scripts_Order_By>>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};


/** columns and relationships of "dependencies_metadata" */
export type Dependencies_MetadataScripts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Scripts_Order_By>>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};

/** aggregated selection of "dependencies_metadata" */
export type Dependencies_Metadata_Aggregate = {
  __typename?: 'dependencies_metadata_aggregate';
  aggregate?: Maybe<Dependencies_Metadata_Aggregate_Fields>;
  nodes: Array<Dependencies_Metadata>;
};

export type Dependencies_Metadata_Aggregate_Bool_Exp = {
  count?: InputMaybe<Dependencies_Metadata_Aggregate_Bool_Exp_Count>;
};

export type Dependencies_Metadata_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "dependencies_metadata" */
export type Dependencies_Metadata_Aggregate_Fields = {
  __typename?: 'dependencies_metadata_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Dependencies_Metadata_Max_Fields>;
  min?: Maybe<Dependencies_Metadata_Min_Fields>;
};


/** aggregate fields of "dependencies_metadata" */
export type Dependencies_Metadata_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "dependencies_metadata" */
export type Dependencies_Metadata_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Dependencies_Metadata_Max_Order_By>;
  min?: InputMaybe<Dependencies_Metadata_Min_Order_By>;
};

/** input type for inserting array relation for remote table "dependencies_metadata" */
export type Dependencies_Metadata_Arr_Rel_Insert_Input = {
  data: Array<Dependencies_Metadata_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Dependencies_Metadata_On_Conflict>;
};

/** Boolean expression to filter rows from the table "dependencies_metadata". All fields are combined with a logical 'AND'. */
export type Dependencies_Metadata_Bool_Exp = {
  _and?: InputMaybe<Array<Dependencies_Metadata_Bool_Exp>>;
  _not?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
  _or?: InputMaybe<Array<Dependencies_Metadata_Bool_Exp>>;
  additional_cdns?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
  additional_cdns_aggregate?: InputMaybe<Dependency_Additional_Cdns_Aggregate_Bool_Exp>;
  additional_repositories?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
  additional_repositories_aggregate?: InputMaybe<Dependency_Additional_Repositories_Aggregate_Bool_Exp>;
  dependency_registry?: InputMaybe<Dependency_Registries_Bool_Exp>;
  dependency_registry_address?: InputMaybe<String_Comparison_Exp>;
  preferred_cdn?: InputMaybe<String_Comparison_Exp>;
  preferred_repository?: InputMaybe<String_Comparison_Exp>;
  reference_website?: InputMaybe<String_Comparison_Exp>;
  script?: InputMaybe<String_Comparison_Exp>;
  scripts?: InputMaybe<Dependency_Scripts_Bool_Exp>;
  scripts_aggregate?: InputMaybe<Dependency_Scripts_Aggregate_Bool_Exp>;
  type_and_version?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  updated_onchain_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "dependencies_metadata" */
export enum Dependencies_Metadata_Constraint {
  /** unique or primary key constraint on columns "type_and_version" */
  DependenciesMetadataPkey = 'dependencies_metadata_pkey'
}

/** input type for inserting data into table "dependencies_metadata" */
export type Dependencies_Metadata_Insert_Input = {
  additional_cdns?: InputMaybe<Dependency_Additional_Cdns_Arr_Rel_Insert_Input>;
  additional_repositories?: InputMaybe<Dependency_Additional_Repositories_Arr_Rel_Insert_Input>;
  dependency_registry?: InputMaybe<Dependency_Registries_Obj_Rel_Insert_Input>;
  dependency_registry_address?: InputMaybe<Scalars['String']>;
  preferred_cdn?: InputMaybe<Scalars['String']>;
  preferred_repository?: InputMaybe<Scalars['String']>;
  reference_website?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  scripts?: InputMaybe<Dependency_Scripts_Arr_Rel_Insert_Input>;
  type_and_version?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamptz']>;
  updated_onchain_at?: InputMaybe<Scalars['timestamptz']>;
};

/** aggregate max on columns */
export type Dependencies_Metadata_Max_Fields = {
  __typename?: 'dependencies_metadata_max_fields';
  dependency_registry_address?: Maybe<Scalars['String']>;
  preferred_cdn?: Maybe<Scalars['String']>;
  preferred_repository?: Maybe<Scalars['String']>;
  reference_website?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
  type_and_version?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamptz']>;
  updated_onchain_at?: Maybe<Scalars['timestamptz']>;
};

/** order by max() on columns of table "dependencies_metadata" */
export type Dependencies_Metadata_Max_Order_By = {
  dependency_registry_address?: InputMaybe<Order_By>;
  preferred_cdn?: InputMaybe<Order_By>;
  preferred_repository?: InputMaybe<Order_By>;
  reference_website?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
  type_and_version?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  updated_onchain_at?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Dependencies_Metadata_Min_Fields = {
  __typename?: 'dependencies_metadata_min_fields';
  dependency_registry_address?: Maybe<Scalars['String']>;
  preferred_cdn?: Maybe<Scalars['String']>;
  preferred_repository?: Maybe<Scalars['String']>;
  reference_website?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
  type_and_version?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamptz']>;
  updated_onchain_at?: Maybe<Scalars['timestamptz']>;
};

/** order by min() on columns of table "dependencies_metadata" */
export type Dependencies_Metadata_Min_Order_By = {
  dependency_registry_address?: InputMaybe<Order_By>;
  preferred_cdn?: InputMaybe<Order_By>;
  preferred_repository?: InputMaybe<Order_By>;
  reference_website?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
  type_and_version?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  updated_onchain_at?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "dependencies_metadata" */
export type Dependencies_Metadata_Mutation_Response = {
  __typename?: 'dependencies_metadata_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Dependencies_Metadata>;
};

/** input type for inserting object relation for remote table "dependencies_metadata" */
export type Dependencies_Metadata_Obj_Rel_Insert_Input = {
  data: Dependencies_Metadata_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Dependencies_Metadata_On_Conflict>;
};

/** on_conflict condition type for table "dependencies_metadata" */
export type Dependencies_Metadata_On_Conflict = {
  constraint: Dependencies_Metadata_Constraint;
  update_columns?: Array<Dependencies_Metadata_Update_Column>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};

/** Ordering options when selecting data from "dependencies_metadata". */
export type Dependencies_Metadata_Order_By = {
  additional_cdns_aggregate?: InputMaybe<Dependency_Additional_Cdns_Aggregate_Order_By>;
  additional_repositories_aggregate?: InputMaybe<Dependency_Additional_Repositories_Aggregate_Order_By>;
  dependency_registry?: InputMaybe<Dependency_Registries_Order_By>;
  dependency_registry_address?: InputMaybe<Order_By>;
  preferred_cdn?: InputMaybe<Order_By>;
  preferred_repository?: InputMaybe<Order_By>;
  reference_website?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
  scripts_aggregate?: InputMaybe<Dependency_Scripts_Aggregate_Order_By>;
  type_and_version?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  updated_onchain_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: dependencies_metadata */
export type Dependencies_Metadata_Pk_Columns_Input = {
  type_and_version: Scalars['String'];
};

/** select columns of table "dependencies_metadata" */
export enum Dependencies_Metadata_Select_Column {
  /** column name */
  DependencyRegistryAddress = 'dependency_registry_address',
  /** column name */
  PreferredCdn = 'preferred_cdn',
  /** column name */
  PreferredRepository = 'preferred_repository',
  /** column name */
  ReferenceWebsite = 'reference_website',
  /** column name */
  Script = 'script',
  /** column name */
  TypeAndVersion = 'type_and_version',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  UpdatedOnchainAt = 'updated_onchain_at'
}

/** input type for updating data in table "dependencies_metadata" */
export type Dependencies_Metadata_Set_Input = {
  dependency_registry_address?: InputMaybe<Scalars['String']>;
  preferred_cdn?: InputMaybe<Scalars['String']>;
  preferred_repository?: InputMaybe<Scalars['String']>;
  reference_website?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  type_and_version?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamptz']>;
  updated_onchain_at?: InputMaybe<Scalars['timestamptz']>;
};

/** Streaming cursor of the table "dependencies_metadata" */
export type Dependencies_Metadata_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Dependencies_Metadata_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Dependencies_Metadata_Stream_Cursor_Value_Input = {
  dependency_registry_address?: InputMaybe<Scalars['String']>;
  preferred_cdn?: InputMaybe<Scalars['String']>;
  preferred_repository?: InputMaybe<Scalars['String']>;
  reference_website?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  type_and_version?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamptz']>;
  updated_onchain_at?: InputMaybe<Scalars['timestamptz']>;
};

/** update columns of table "dependencies_metadata" */
export enum Dependencies_Metadata_Update_Column {
  /** column name */
  DependencyRegistryAddress = 'dependency_registry_address',
  /** column name */
  PreferredCdn = 'preferred_cdn',
  /** column name */
  PreferredRepository = 'preferred_repository',
  /** column name */
  ReferenceWebsite = 'reference_website',
  /** column name */
  Script = 'script',
  /** column name */
  TypeAndVersion = 'type_and_version',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  UpdatedOnchainAt = 'updated_onchain_at'
}

export type Dependencies_Metadata_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Dependencies_Metadata_Set_Input>;
  /** filter the rows which have to be updated */
  where: Dependencies_Metadata_Bool_Exp;
};

/** columns and relationships of "dependency_additional_cdns" */
export type Dependency_Additional_Cdns = {
  __typename?: 'dependency_additional_cdns';
  cdn: Scalars['String'];
  /** An object relationship */
  dependency: Dependencies_Metadata;
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};

/** aggregated selection of "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Aggregate = {
  __typename?: 'dependency_additional_cdns_aggregate';
  aggregate?: Maybe<Dependency_Additional_Cdns_Aggregate_Fields>;
  nodes: Array<Dependency_Additional_Cdns>;
};

export type Dependency_Additional_Cdns_Aggregate_Bool_Exp = {
  count?: InputMaybe<Dependency_Additional_Cdns_Aggregate_Bool_Exp_Count>;
};

export type Dependency_Additional_Cdns_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Aggregate_Fields = {
  __typename?: 'dependency_additional_cdns_aggregate_fields';
  avg?: Maybe<Dependency_Additional_Cdns_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Dependency_Additional_Cdns_Max_Fields>;
  min?: Maybe<Dependency_Additional_Cdns_Min_Fields>;
  stddev?: Maybe<Dependency_Additional_Cdns_Stddev_Fields>;
  stddev_pop?: Maybe<Dependency_Additional_Cdns_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Dependency_Additional_Cdns_Stddev_Samp_Fields>;
  sum?: Maybe<Dependency_Additional_Cdns_Sum_Fields>;
  var_pop?: Maybe<Dependency_Additional_Cdns_Var_Pop_Fields>;
  var_samp?: Maybe<Dependency_Additional_Cdns_Var_Samp_Fields>;
  variance?: Maybe<Dependency_Additional_Cdns_Variance_Fields>;
};


/** aggregate fields of "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Aggregate_Order_By = {
  avg?: InputMaybe<Dependency_Additional_Cdns_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Dependency_Additional_Cdns_Max_Order_By>;
  min?: InputMaybe<Dependency_Additional_Cdns_Min_Order_By>;
  stddev?: InputMaybe<Dependency_Additional_Cdns_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Dependency_Additional_Cdns_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Dependency_Additional_Cdns_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Dependency_Additional_Cdns_Sum_Order_By>;
  var_pop?: InputMaybe<Dependency_Additional_Cdns_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Dependency_Additional_Cdns_Var_Samp_Order_By>;
  variance?: InputMaybe<Dependency_Additional_Cdns_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Arr_Rel_Insert_Input = {
  data: Array<Dependency_Additional_Cdns_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Dependency_Additional_Cdns_On_Conflict>;
};

/** aggregate avg on columns */
export type Dependency_Additional_Cdns_Avg_Fields = {
  __typename?: 'dependency_additional_cdns_avg_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Avg_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "dependency_additional_cdns". All fields are combined with a logical 'AND'. */
export type Dependency_Additional_Cdns_Bool_Exp = {
  _and?: InputMaybe<Array<Dependency_Additional_Cdns_Bool_Exp>>;
  _not?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
  _or?: InputMaybe<Array<Dependency_Additional_Cdns_Bool_Exp>>;
  cdn?: InputMaybe<String_Comparison_Exp>;
  dependency?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
  dependency_type_and_version?: InputMaybe<String_Comparison_Exp>;
  index?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "dependency_additional_cdns" */
export enum Dependency_Additional_Cdns_Constraint {
  /** unique or primary key constraint on columns "index", "dependency_type_and_version" */
  DependencyAdditionalCdnsPkey = 'dependency_additional_cdns_pkey'
}

/** input type for incrementing numeric columns in table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Inc_Input = {
  index?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Insert_Input = {
  cdn?: InputMaybe<Scalars['String']>;
  dependency?: InputMaybe<Dependencies_Metadata_Obj_Rel_Insert_Input>;
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
};

/** aggregate max on columns */
export type Dependency_Additional_Cdns_Max_Fields = {
  __typename?: 'dependency_additional_cdns_max_fields';
  cdn?: Maybe<Scalars['String']>;
  dependency_type_and_version?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
};

/** order by max() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Max_Order_By = {
  cdn?: InputMaybe<Order_By>;
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Dependency_Additional_Cdns_Min_Fields = {
  __typename?: 'dependency_additional_cdns_min_fields';
  cdn?: Maybe<Scalars['String']>;
  dependency_type_and_version?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
};

/** order by min() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Min_Order_By = {
  cdn?: InputMaybe<Order_By>;
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Mutation_Response = {
  __typename?: 'dependency_additional_cdns_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Dependency_Additional_Cdns>;
};

/** on_conflict condition type for table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_On_Conflict = {
  constraint: Dependency_Additional_Cdns_Constraint;
  update_columns?: Array<Dependency_Additional_Cdns_Update_Column>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};

/** Ordering options when selecting data from "dependency_additional_cdns". */
export type Dependency_Additional_Cdns_Order_By = {
  cdn?: InputMaybe<Order_By>;
  dependency?: InputMaybe<Dependencies_Metadata_Order_By>;
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
};

/** primary key columns input for table: dependency_additional_cdns */
export type Dependency_Additional_Cdns_Pk_Columns_Input = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};

/** select columns of table "dependency_additional_cdns" */
export enum Dependency_Additional_Cdns_Select_Column {
  /** column name */
  Cdn = 'cdn',
  /** column name */
  DependencyTypeAndVersion = 'dependency_type_and_version',
  /** column name */
  Index = 'index'
}

/** input type for updating data in table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Set_Input = {
  cdn?: InputMaybe<Scalars['String']>;
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
};

/** aggregate stddev on columns */
export type Dependency_Additional_Cdns_Stddev_Fields = {
  __typename?: 'dependency_additional_cdns_stddev_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Stddev_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Dependency_Additional_Cdns_Stddev_Pop_Fields = {
  __typename?: 'dependency_additional_cdns_stddev_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Stddev_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Dependency_Additional_Cdns_Stddev_Samp_Fields = {
  __typename?: 'dependency_additional_cdns_stddev_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Stddev_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Dependency_Additional_Cdns_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Dependency_Additional_Cdns_Stream_Cursor_Value_Input = {
  cdn?: InputMaybe<Scalars['String']>;
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
};

/** aggregate sum on columns */
export type Dependency_Additional_Cdns_Sum_Fields = {
  __typename?: 'dependency_additional_cdns_sum_fields';
  index?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Sum_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** update columns of table "dependency_additional_cdns" */
export enum Dependency_Additional_Cdns_Update_Column {
  /** column name */
  Cdn = 'cdn',
  /** column name */
  DependencyTypeAndVersion = 'dependency_type_and_version',
  /** column name */
  Index = 'index'
}

export type Dependency_Additional_Cdns_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Dependency_Additional_Cdns_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Dependency_Additional_Cdns_Set_Input>;
  /** filter the rows which have to be updated */
  where: Dependency_Additional_Cdns_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Dependency_Additional_Cdns_Var_Pop_Fields = {
  __typename?: 'dependency_additional_cdns_var_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Var_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Dependency_Additional_Cdns_Var_Samp_Fields = {
  __typename?: 'dependency_additional_cdns_var_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Var_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Dependency_Additional_Cdns_Variance_Fields = {
  __typename?: 'dependency_additional_cdns_variance_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "dependency_additional_cdns" */
export type Dependency_Additional_Cdns_Variance_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** columns and relationships of "dependency_additional_repositories" */
export type Dependency_Additional_Repositories = {
  __typename?: 'dependency_additional_repositories';
  /** An object relationship */
  dependency: Dependencies_Metadata;
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
  repository: Scalars['String'];
};

/** aggregated selection of "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Aggregate = {
  __typename?: 'dependency_additional_repositories_aggregate';
  aggregate?: Maybe<Dependency_Additional_Repositories_Aggregate_Fields>;
  nodes: Array<Dependency_Additional_Repositories>;
};

export type Dependency_Additional_Repositories_Aggregate_Bool_Exp = {
  count?: InputMaybe<Dependency_Additional_Repositories_Aggregate_Bool_Exp_Count>;
};

export type Dependency_Additional_Repositories_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Aggregate_Fields = {
  __typename?: 'dependency_additional_repositories_aggregate_fields';
  avg?: Maybe<Dependency_Additional_Repositories_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Dependency_Additional_Repositories_Max_Fields>;
  min?: Maybe<Dependency_Additional_Repositories_Min_Fields>;
  stddev?: Maybe<Dependency_Additional_Repositories_Stddev_Fields>;
  stddev_pop?: Maybe<Dependency_Additional_Repositories_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Dependency_Additional_Repositories_Stddev_Samp_Fields>;
  sum?: Maybe<Dependency_Additional_Repositories_Sum_Fields>;
  var_pop?: Maybe<Dependency_Additional_Repositories_Var_Pop_Fields>;
  var_samp?: Maybe<Dependency_Additional_Repositories_Var_Samp_Fields>;
  variance?: Maybe<Dependency_Additional_Repositories_Variance_Fields>;
};


/** aggregate fields of "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Aggregate_Order_By = {
  avg?: InputMaybe<Dependency_Additional_Repositories_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Dependency_Additional_Repositories_Max_Order_By>;
  min?: InputMaybe<Dependency_Additional_Repositories_Min_Order_By>;
  stddev?: InputMaybe<Dependency_Additional_Repositories_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Dependency_Additional_Repositories_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Dependency_Additional_Repositories_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Dependency_Additional_Repositories_Sum_Order_By>;
  var_pop?: InputMaybe<Dependency_Additional_Repositories_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Dependency_Additional_Repositories_Var_Samp_Order_By>;
  variance?: InputMaybe<Dependency_Additional_Repositories_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Arr_Rel_Insert_Input = {
  data: Array<Dependency_Additional_Repositories_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Dependency_Additional_Repositories_On_Conflict>;
};

/** aggregate avg on columns */
export type Dependency_Additional_Repositories_Avg_Fields = {
  __typename?: 'dependency_additional_repositories_avg_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Avg_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "dependency_additional_repositories". All fields are combined with a logical 'AND'. */
export type Dependency_Additional_Repositories_Bool_Exp = {
  _and?: InputMaybe<Array<Dependency_Additional_Repositories_Bool_Exp>>;
  _not?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
  _or?: InputMaybe<Array<Dependency_Additional_Repositories_Bool_Exp>>;
  dependency?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
  dependency_type_and_version?: InputMaybe<String_Comparison_Exp>;
  index?: InputMaybe<Int_Comparison_Exp>;
  repository?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "dependency_additional_repositories" */
export enum Dependency_Additional_Repositories_Constraint {
  /** unique or primary key constraint on columns "index", "dependency_type_and_version" */
  DependencyAdditionalRepositoriesPkey = 'dependency_additional_repositories_pkey'
}

/** input type for incrementing numeric columns in table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Inc_Input = {
  index?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Insert_Input = {
  dependency?: InputMaybe<Dependencies_Metadata_Obj_Rel_Insert_Input>;
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  repository?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Dependency_Additional_Repositories_Max_Fields = {
  __typename?: 'dependency_additional_repositories_max_fields';
  dependency_type_and_version?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  repository?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Max_Order_By = {
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  repository?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Dependency_Additional_Repositories_Min_Fields = {
  __typename?: 'dependency_additional_repositories_min_fields';
  dependency_type_and_version?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  repository?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Min_Order_By = {
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  repository?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Mutation_Response = {
  __typename?: 'dependency_additional_repositories_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Dependency_Additional_Repositories>;
};

/** on_conflict condition type for table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_On_Conflict = {
  constraint: Dependency_Additional_Repositories_Constraint;
  update_columns?: Array<Dependency_Additional_Repositories_Update_Column>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};

/** Ordering options when selecting data from "dependency_additional_repositories". */
export type Dependency_Additional_Repositories_Order_By = {
  dependency?: InputMaybe<Dependencies_Metadata_Order_By>;
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  repository?: InputMaybe<Order_By>;
};

/** primary key columns input for table: dependency_additional_repositories */
export type Dependency_Additional_Repositories_Pk_Columns_Input = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};

/** select columns of table "dependency_additional_repositories" */
export enum Dependency_Additional_Repositories_Select_Column {
  /** column name */
  DependencyTypeAndVersion = 'dependency_type_and_version',
  /** column name */
  Index = 'index',
  /** column name */
  Repository = 'repository'
}

/** input type for updating data in table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Set_Input = {
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  repository?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Dependency_Additional_Repositories_Stddev_Fields = {
  __typename?: 'dependency_additional_repositories_stddev_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Stddev_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Dependency_Additional_Repositories_Stddev_Pop_Fields = {
  __typename?: 'dependency_additional_repositories_stddev_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Stddev_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Dependency_Additional_Repositories_Stddev_Samp_Fields = {
  __typename?: 'dependency_additional_repositories_stddev_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Stddev_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Dependency_Additional_Repositories_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Dependency_Additional_Repositories_Stream_Cursor_Value_Input = {
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  repository?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Dependency_Additional_Repositories_Sum_Fields = {
  __typename?: 'dependency_additional_repositories_sum_fields';
  index?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Sum_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** update columns of table "dependency_additional_repositories" */
export enum Dependency_Additional_Repositories_Update_Column {
  /** column name */
  DependencyTypeAndVersion = 'dependency_type_and_version',
  /** column name */
  Index = 'index',
  /** column name */
  Repository = 'repository'
}

export type Dependency_Additional_Repositories_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Dependency_Additional_Repositories_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Dependency_Additional_Repositories_Set_Input>;
  /** filter the rows which have to be updated */
  where: Dependency_Additional_Repositories_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Dependency_Additional_Repositories_Var_Pop_Fields = {
  __typename?: 'dependency_additional_repositories_var_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Var_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Dependency_Additional_Repositories_Var_Samp_Fields = {
  __typename?: 'dependency_additional_repositories_var_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Var_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Dependency_Additional_Repositories_Variance_Fields = {
  __typename?: 'dependency_additional_repositories_variance_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "dependency_additional_repositories" */
export type Dependency_Additional_Repositories_Variance_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** columns and relationships of "dependency_registries" */
export type Dependency_Registries = {
  __typename?: 'dependency_registries';
  address: Scalars['String'];
  /** An array relationship */
  dependencies: Array<Dependencies_Metadata>;
  /** An aggregate relationship */
  dependencies_aggregate: Dependencies_Metadata_Aggregate;
  owner: Scalars['String'];
  /** An array relationship */
  supported_core_contracts: Array<Contracts_Metadata>;
  /** An aggregate relationship */
  supported_core_contracts_aggregate: Contracts_Metadata_Aggregate;
  updated_at: Scalars['timestamptz'];
  updated_onchain_at: Scalars['timestamptz'];
};


/** columns and relationships of "dependency_registries" */
export type Dependency_RegistriesDependenciesArgs = {
  distinct_on?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependencies_Metadata_Order_By>>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};


/** columns and relationships of "dependency_registries" */
export type Dependency_RegistriesDependencies_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependencies_Metadata_Order_By>>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};


/** columns and relationships of "dependency_registries" */
export type Dependency_RegistriesSupported_Core_ContractsArgs = {
  distinct_on?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contracts_Metadata_Order_By>>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};


/** columns and relationships of "dependency_registries" */
export type Dependency_RegistriesSupported_Core_Contracts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contracts_Metadata_Order_By>>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};

/** aggregated selection of "dependency_registries" */
export type Dependency_Registries_Aggregate = {
  __typename?: 'dependency_registries_aggregate';
  aggregate?: Maybe<Dependency_Registries_Aggregate_Fields>;
  nodes: Array<Dependency_Registries>;
};

/** aggregate fields of "dependency_registries" */
export type Dependency_Registries_Aggregate_Fields = {
  __typename?: 'dependency_registries_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Dependency_Registries_Max_Fields>;
  min?: Maybe<Dependency_Registries_Min_Fields>;
};


/** aggregate fields of "dependency_registries" */
export type Dependency_Registries_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Dependency_Registries_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "dependency_registries". All fields are combined with a logical 'AND'. */
export type Dependency_Registries_Bool_Exp = {
  _and?: InputMaybe<Array<Dependency_Registries_Bool_Exp>>;
  _not?: InputMaybe<Dependency_Registries_Bool_Exp>;
  _or?: InputMaybe<Array<Dependency_Registries_Bool_Exp>>;
  address?: InputMaybe<String_Comparison_Exp>;
  dependencies?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
  dependencies_aggregate?: InputMaybe<Dependencies_Metadata_Aggregate_Bool_Exp>;
  owner?: InputMaybe<String_Comparison_Exp>;
  supported_core_contracts?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  supported_core_contracts_aggregate?: InputMaybe<Contracts_Metadata_Aggregate_Bool_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  updated_onchain_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "dependency_registries" */
export enum Dependency_Registries_Constraint {
  /** unique or primary key constraint on columns "address" */
  DependencyRegistriesPkey = 'dependency_registries_pkey'
}

/** input type for inserting data into table "dependency_registries" */
export type Dependency_Registries_Insert_Input = {
  address?: InputMaybe<Scalars['String']>;
  dependencies?: InputMaybe<Dependencies_Metadata_Arr_Rel_Insert_Input>;
  owner?: InputMaybe<Scalars['String']>;
  supported_core_contracts?: InputMaybe<Contracts_Metadata_Arr_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars['timestamptz']>;
  updated_onchain_at?: InputMaybe<Scalars['timestamptz']>;
};

/** aggregate max on columns */
export type Dependency_Registries_Max_Fields = {
  __typename?: 'dependency_registries_max_fields';
  address?: Maybe<Scalars['String']>;
  owner?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamptz']>;
  updated_onchain_at?: Maybe<Scalars['timestamptz']>;
};

/** aggregate min on columns */
export type Dependency_Registries_Min_Fields = {
  __typename?: 'dependency_registries_min_fields';
  address?: Maybe<Scalars['String']>;
  owner?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamptz']>;
  updated_onchain_at?: Maybe<Scalars['timestamptz']>;
};

/** response of any mutation on the table "dependency_registries" */
export type Dependency_Registries_Mutation_Response = {
  __typename?: 'dependency_registries_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Dependency_Registries>;
};

/** input type for inserting object relation for remote table "dependency_registries" */
export type Dependency_Registries_Obj_Rel_Insert_Input = {
  data: Dependency_Registries_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Dependency_Registries_On_Conflict>;
};

/** on_conflict condition type for table "dependency_registries" */
export type Dependency_Registries_On_Conflict = {
  constraint: Dependency_Registries_Constraint;
  update_columns?: Array<Dependency_Registries_Update_Column>;
  where?: InputMaybe<Dependency_Registries_Bool_Exp>;
};

/** Ordering options when selecting data from "dependency_registries". */
export type Dependency_Registries_Order_By = {
  address?: InputMaybe<Order_By>;
  dependencies_aggregate?: InputMaybe<Dependencies_Metadata_Aggregate_Order_By>;
  owner?: InputMaybe<Order_By>;
  supported_core_contracts_aggregate?: InputMaybe<Contracts_Metadata_Aggregate_Order_By>;
  updated_at?: InputMaybe<Order_By>;
  updated_onchain_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: dependency_registries */
export type Dependency_Registries_Pk_Columns_Input = {
  address: Scalars['String'];
};

/** select columns of table "dependency_registries" */
export enum Dependency_Registries_Select_Column {
  /** column name */
  Address = 'address',
  /** column name */
  Owner = 'owner',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  UpdatedOnchainAt = 'updated_onchain_at'
}

/** input type for updating data in table "dependency_registries" */
export type Dependency_Registries_Set_Input = {
  address?: InputMaybe<Scalars['String']>;
  owner?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamptz']>;
  updated_onchain_at?: InputMaybe<Scalars['timestamptz']>;
};

/** Streaming cursor of the table "dependency_registries" */
export type Dependency_Registries_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Dependency_Registries_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Dependency_Registries_Stream_Cursor_Value_Input = {
  address?: InputMaybe<Scalars['String']>;
  owner?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamptz']>;
  updated_onchain_at?: InputMaybe<Scalars['timestamptz']>;
};

/** update columns of table "dependency_registries" */
export enum Dependency_Registries_Update_Column {
  /** column name */
  Address = 'address',
  /** column name */
  Owner = 'owner',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  UpdatedOnchainAt = 'updated_onchain_at'
}

export type Dependency_Registries_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Dependency_Registries_Set_Input>;
  /** filter the rows which have to be updated */
  where: Dependency_Registries_Bool_Exp;
};

/** columns and relationships of "dependency_scripts" */
export type Dependency_Scripts = {
  __typename?: 'dependency_scripts';
  address: Scalars['String'];
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
  script: Scalars['String'];
};

/** aggregated selection of "dependency_scripts" */
export type Dependency_Scripts_Aggregate = {
  __typename?: 'dependency_scripts_aggregate';
  aggregate?: Maybe<Dependency_Scripts_Aggregate_Fields>;
  nodes: Array<Dependency_Scripts>;
};

export type Dependency_Scripts_Aggregate_Bool_Exp = {
  count?: InputMaybe<Dependency_Scripts_Aggregate_Bool_Exp_Count>;
};

export type Dependency_Scripts_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Dependency_Scripts_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "dependency_scripts" */
export type Dependency_Scripts_Aggregate_Fields = {
  __typename?: 'dependency_scripts_aggregate_fields';
  avg?: Maybe<Dependency_Scripts_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Dependency_Scripts_Max_Fields>;
  min?: Maybe<Dependency_Scripts_Min_Fields>;
  stddev?: Maybe<Dependency_Scripts_Stddev_Fields>;
  stddev_pop?: Maybe<Dependency_Scripts_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Dependency_Scripts_Stddev_Samp_Fields>;
  sum?: Maybe<Dependency_Scripts_Sum_Fields>;
  var_pop?: Maybe<Dependency_Scripts_Var_Pop_Fields>;
  var_samp?: Maybe<Dependency_Scripts_Var_Samp_Fields>;
  variance?: Maybe<Dependency_Scripts_Variance_Fields>;
};


/** aggregate fields of "dependency_scripts" */
export type Dependency_Scripts_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "dependency_scripts" */
export type Dependency_Scripts_Aggregate_Order_By = {
  avg?: InputMaybe<Dependency_Scripts_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Dependency_Scripts_Max_Order_By>;
  min?: InputMaybe<Dependency_Scripts_Min_Order_By>;
  stddev?: InputMaybe<Dependency_Scripts_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Dependency_Scripts_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Dependency_Scripts_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Dependency_Scripts_Sum_Order_By>;
  var_pop?: InputMaybe<Dependency_Scripts_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Dependency_Scripts_Var_Samp_Order_By>;
  variance?: InputMaybe<Dependency_Scripts_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "dependency_scripts" */
export type Dependency_Scripts_Arr_Rel_Insert_Input = {
  data: Array<Dependency_Scripts_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Dependency_Scripts_On_Conflict>;
};

/** aggregate avg on columns */
export type Dependency_Scripts_Avg_Fields = {
  __typename?: 'dependency_scripts_avg_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Avg_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "dependency_scripts". All fields are combined with a logical 'AND'. */
export type Dependency_Scripts_Bool_Exp = {
  _and?: InputMaybe<Array<Dependency_Scripts_Bool_Exp>>;
  _not?: InputMaybe<Dependency_Scripts_Bool_Exp>;
  _or?: InputMaybe<Array<Dependency_Scripts_Bool_Exp>>;
  address?: InputMaybe<String_Comparison_Exp>;
  dependency_type_and_version?: InputMaybe<String_Comparison_Exp>;
  index?: InputMaybe<Int_Comparison_Exp>;
  script?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "dependency_scripts" */
export enum Dependency_Scripts_Constraint {
  /** unique or primary key constraint on columns "index", "dependency_type_and_version" */
  DependencyScriptsPkey = 'dependency_scripts_pkey'
}

/** input type for incrementing numeric columns in table "dependency_scripts" */
export type Dependency_Scripts_Inc_Input = {
  index?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "dependency_scripts" */
export type Dependency_Scripts_Insert_Input = {
  address?: InputMaybe<Scalars['String']>;
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  script?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Dependency_Scripts_Max_Fields = {
  __typename?: 'dependency_scripts_max_fields';
  address?: Maybe<Scalars['String']>;
  dependency_type_and_version?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  script?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Max_Order_By = {
  address?: InputMaybe<Order_By>;
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Dependency_Scripts_Min_Fields = {
  __typename?: 'dependency_scripts_min_fields';
  address?: Maybe<Scalars['String']>;
  dependency_type_and_version?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  script?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Min_Order_By = {
  address?: InputMaybe<Order_By>;
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "dependency_scripts" */
export type Dependency_Scripts_Mutation_Response = {
  __typename?: 'dependency_scripts_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Dependency_Scripts>;
};

/** on_conflict condition type for table "dependency_scripts" */
export type Dependency_Scripts_On_Conflict = {
  constraint: Dependency_Scripts_Constraint;
  update_columns?: Array<Dependency_Scripts_Update_Column>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};

/** Ordering options when selecting data from "dependency_scripts". */
export type Dependency_Scripts_Order_By = {
  address?: InputMaybe<Order_By>;
  dependency_type_and_version?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
};

/** primary key columns input for table: dependency_scripts */
export type Dependency_Scripts_Pk_Columns_Input = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};

/** select columns of table "dependency_scripts" */
export enum Dependency_Scripts_Select_Column {
  /** column name */
  Address = 'address',
  /** column name */
  DependencyTypeAndVersion = 'dependency_type_and_version',
  /** column name */
  Index = 'index',
  /** column name */
  Script = 'script'
}

/** input type for updating data in table "dependency_scripts" */
export type Dependency_Scripts_Set_Input = {
  address?: InputMaybe<Scalars['String']>;
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  script?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Dependency_Scripts_Stddev_Fields = {
  __typename?: 'dependency_scripts_stddev_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Stddev_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Dependency_Scripts_Stddev_Pop_Fields = {
  __typename?: 'dependency_scripts_stddev_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Stddev_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Dependency_Scripts_Stddev_Samp_Fields = {
  __typename?: 'dependency_scripts_stddev_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Stddev_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "dependency_scripts" */
export type Dependency_Scripts_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Dependency_Scripts_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Dependency_Scripts_Stream_Cursor_Value_Input = {
  address?: InputMaybe<Scalars['String']>;
  dependency_type_and_version?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  script?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Dependency_Scripts_Sum_Fields = {
  __typename?: 'dependency_scripts_sum_fields';
  index?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Sum_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** update columns of table "dependency_scripts" */
export enum Dependency_Scripts_Update_Column {
  /** column name */
  Address = 'address',
  /** column name */
  DependencyTypeAndVersion = 'dependency_type_and_version',
  /** column name */
  Index = 'index',
  /** column name */
  Script = 'script'
}

export type Dependency_Scripts_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Dependency_Scripts_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Dependency_Scripts_Set_Input>;
  /** filter the rows which have to be updated */
  where: Dependency_Scripts_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Dependency_Scripts_Var_Pop_Fields = {
  __typename?: 'dependency_scripts_var_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Var_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Dependency_Scripts_Var_Samp_Fields = {
  __typename?: 'dependency_scripts_var_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Var_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Dependency_Scripts_Variance_Fields = {
  __typename?: 'dependency_scripts_variance_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "dependency_scripts" */
export type Dependency_Scripts_Variance_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** columns and relationships of "entity_tags" */
export type Entity_Tags = {
  __typename?: 'entity_tags';
  id: Scalars['Int'];
  /** An object relationship */
  project?: Maybe<Projects_Metadata>;
  project_id?: Maybe<Scalars['String']>;
  /** An object relationship */
  tag?: Maybe<Tags>;
  tag_name: Scalars['String'];
  /** An object relationship */
  user?: Maybe<Users>;
  user_address?: Maybe<Scalars['String']>;
};

/** aggregated selection of "entity_tags" */
export type Entity_Tags_Aggregate = {
  __typename?: 'entity_tags_aggregate';
  aggregate?: Maybe<Entity_Tags_Aggregate_Fields>;
  nodes: Array<Entity_Tags>;
};

export type Entity_Tags_Aggregate_Bool_Exp = {
  count?: InputMaybe<Entity_Tags_Aggregate_Bool_Exp_Count>;
};

export type Entity_Tags_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Entity_Tags_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "entity_tags" */
export type Entity_Tags_Aggregate_Fields = {
  __typename?: 'entity_tags_aggregate_fields';
  avg?: Maybe<Entity_Tags_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Entity_Tags_Max_Fields>;
  min?: Maybe<Entity_Tags_Min_Fields>;
  stddev?: Maybe<Entity_Tags_Stddev_Fields>;
  stddev_pop?: Maybe<Entity_Tags_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Entity_Tags_Stddev_Samp_Fields>;
  sum?: Maybe<Entity_Tags_Sum_Fields>;
  var_pop?: Maybe<Entity_Tags_Var_Pop_Fields>;
  var_samp?: Maybe<Entity_Tags_Var_Samp_Fields>;
  variance?: Maybe<Entity_Tags_Variance_Fields>;
};


/** aggregate fields of "entity_tags" */
export type Entity_Tags_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "entity_tags" */
export type Entity_Tags_Aggregate_Order_By = {
  avg?: InputMaybe<Entity_Tags_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Entity_Tags_Max_Order_By>;
  min?: InputMaybe<Entity_Tags_Min_Order_By>;
  stddev?: InputMaybe<Entity_Tags_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Entity_Tags_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Entity_Tags_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Entity_Tags_Sum_Order_By>;
  var_pop?: InputMaybe<Entity_Tags_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Entity_Tags_Var_Samp_Order_By>;
  variance?: InputMaybe<Entity_Tags_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "entity_tags" */
export type Entity_Tags_Arr_Rel_Insert_Input = {
  data: Array<Entity_Tags_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Entity_Tags_On_Conflict>;
};

/** aggregate avg on columns */
export type Entity_Tags_Avg_Fields = {
  __typename?: 'entity_tags_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "entity_tags" */
export type Entity_Tags_Avg_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "entity_tags". All fields are combined with a logical 'AND'. */
export type Entity_Tags_Bool_Exp = {
  _and?: InputMaybe<Array<Entity_Tags_Bool_Exp>>;
  _not?: InputMaybe<Entity_Tags_Bool_Exp>;
  _or?: InputMaybe<Array<Entity_Tags_Bool_Exp>>;
  id?: InputMaybe<Int_Comparison_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
  tag?: InputMaybe<Tags_Bool_Exp>;
  tag_name?: InputMaybe<String_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_address?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "entity_tags" */
export enum Entity_Tags_Constraint {
  /** unique or primary key constraint on columns "id" */
  EntityTagsPkey = 'entity_tags_pkey'
}

/** input type for incrementing numeric columns in table "entity_tags" */
export type Entity_Tags_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "entity_tags" */
export type Entity_Tags_Insert_Input = {
  id?: InputMaybe<Scalars['Int']>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
  tag?: InputMaybe<Tags_Obj_Rel_Insert_Input>;
  tag_name?: InputMaybe<Scalars['String']>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Entity_Tags_Max_Fields = {
  __typename?: 'entity_tags_max_fields';
  id?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
  tag_name?: Maybe<Scalars['String']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "entity_tags" */
export type Entity_Tags_Max_Order_By = {
  id?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  tag_name?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Entity_Tags_Min_Fields = {
  __typename?: 'entity_tags_min_fields';
  id?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
  tag_name?: Maybe<Scalars['String']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "entity_tags" */
export type Entity_Tags_Min_Order_By = {
  id?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  tag_name?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "entity_tags" */
export type Entity_Tags_Mutation_Response = {
  __typename?: 'entity_tags_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Entity_Tags>;
};

/** on_conflict condition type for table "entity_tags" */
export type Entity_Tags_On_Conflict = {
  constraint: Entity_Tags_Constraint;
  update_columns?: Array<Entity_Tags_Update_Column>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};

/** Ordering options when selecting data from "entity_tags". */
export type Entity_Tags_Order_By = {
  id?: InputMaybe<Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
  tag?: InputMaybe<Tags_Order_By>;
  tag_name?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** primary key columns input for table: entity_tags */
export type Entity_Tags_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** select columns of table "entity_tags" */
export enum Entity_Tags_Select_Column {
  /** column name */
  Id = 'id',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  TagName = 'tag_name',
  /** column name */
  UserAddress = 'user_address'
}

/** input type for updating data in table "entity_tags" */
export type Entity_Tags_Set_Input = {
  id?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
  tag_name?: InputMaybe<Scalars['String']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Entity_Tags_Stddev_Fields = {
  __typename?: 'entity_tags_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "entity_tags" */
export type Entity_Tags_Stddev_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Entity_Tags_Stddev_Pop_Fields = {
  __typename?: 'entity_tags_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "entity_tags" */
export type Entity_Tags_Stddev_Pop_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Entity_Tags_Stddev_Samp_Fields = {
  __typename?: 'entity_tags_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "entity_tags" */
export type Entity_Tags_Stddev_Samp_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "entity_tags" */
export type Entity_Tags_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Entity_Tags_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Entity_Tags_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
  tag_name?: InputMaybe<Scalars['String']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Entity_Tags_Sum_Fields = {
  __typename?: 'entity_tags_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "entity_tags" */
export type Entity_Tags_Sum_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** update columns of table "entity_tags" */
export enum Entity_Tags_Update_Column {
  /** column name */
  Id = 'id',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  TagName = 'tag_name',
  /** column name */
  UserAddress = 'user_address'
}

export type Entity_Tags_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Entity_Tags_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Entity_Tags_Set_Input>;
  /** filter the rows which have to be updated */
  where: Entity_Tags_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Entity_Tags_Var_Pop_Fields = {
  __typename?: 'entity_tags_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "entity_tags" */
export type Entity_Tags_Var_Pop_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Entity_Tags_Var_Samp_Fields = {
  __typename?: 'entity_tags_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "entity_tags" */
export type Entity_Tags_Var_Samp_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Entity_Tags_Variance_Fields = {
  __typename?: 'entity_tags_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "entity_tags" */
export type Entity_Tags_Variance_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** columns and relationships of "favorites" */
export type Favorites = {
  __typename?: 'favorites';
  favorited_project_id?: Maybe<Scalars['String']>;
  favorited_token_id?: Maybe<Scalars['String']>;
  /** An object relationship */
  favorited_user?: Maybe<Users>;
  favorited_user_address?: Maybe<Scalars['String']>;
  id: Scalars['Int'];
  /** An object relationship */
  project_metadata?: Maybe<Projects_Metadata>;
  /** An object relationship */
  token_metadata?: Maybe<Tokens_Metadata>;
  /** An object relationship */
  user: Users;
  user_public_address: Scalars['String'];
};

/** aggregated selection of "favorites" */
export type Favorites_Aggregate = {
  __typename?: 'favorites_aggregate';
  aggregate?: Maybe<Favorites_Aggregate_Fields>;
  nodes: Array<Favorites>;
};

export type Favorites_Aggregate_Bool_Exp = {
  count?: InputMaybe<Favorites_Aggregate_Bool_Exp_Count>;
};

export type Favorites_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Favorites_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Favorites_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "favorites" */
export type Favorites_Aggregate_Fields = {
  __typename?: 'favorites_aggregate_fields';
  avg?: Maybe<Favorites_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Favorites_Max_Fields>;
  min?: Maybe<Favorites_Min_Fields>;
  stddev?: Maybe<Favorites_Stddev_Fields>;
  stddev_pop?: Maybe<Favorites_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Favorites_Stddev_Samp_Fields>;
  sum?: Maybe<Favorites_Sum_Fields>;
  var_pop?: Maybe<Favorites_Var_Pop_Fields>;
  var_samp?: Maybe<Favorites_Var_Samp_Fields>;
  variance?: Maybe<Favorites_Variance_Fields>;
};


/** aggregate fields of "favorites" */
export type Favorites_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Favorites_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "favorites" */
export type Favorites_Aggregate_Order_By = {
  avg?: InputMaybe<Favorites_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Favorites_Max_Order_By>;
  min?: InputMaybe<Favorites_Min_Order_By>;
  stddev?: InputMaybe<Favorites_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Favorites_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Favorites_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Favorites_Sum_Order_By>;
  var_pop?: InputMaybe<Favorites_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Favorites_Var_Samp_Order_By>;
  variance?: InputMaybe<Favorites_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "favorites" */
export type Favorites_Arr_Rel_Insert_Input = {
  data: Array<Favorites_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Favorites_On_Conflict>;
};

/** aggregate avg on columns */
export type Favorites_Avg_Fields = {
  __typename?: 'favorites_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "favorites" */
export type Favorites_Avg_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "favorites". All fields are combined with a logical 'AND'. */
export type Favorites_Bool_Exp = {
  _and?: InputMaybe<Array<Favorites_Bool_Exp>>;
  _not?: InputMaybe<Favorites_Bool_Exp>;
  _or?: InputMaybe<Array<Favorites_Bool_Exp>>;
  favorited_project_id?: InputMaybe<String_Comparison_Exp>;
  favorited_token_id?: InputMaybe<String_Comparison_Exp>;
  favorited_user?: InputMaybe<Users_Bool_Exp>;
  favorited_user_address?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Int_Comparison_Exp>;
  project_metadata?: InputMaybe<Projects_Metadata_Bool_Exp>;
  token_metadata?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_public_address?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "favorites" */
export enum Favorites_Constraint {
  /** unique or primary key constraint on columns "id" */
  FavoritesIdKey = 'favorites_id_key',
  /** unique or primary key constraint on columns "id" */
  FavoritesPkey = 'favorites_pkey'
}

/** input type for incrementing numeric columns in table "favorites" */
export type Favorites_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "favorites" */
export type Favorites_Insert_Input = {
  favorited_project_id?: InputMaybe<Scalars['String']>;
  favorited_token_id?: InputMaybe<Scalars['String']>;
  favorited_user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  favorited_user_address?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  project_metadata?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  token_metadata?: InputMaybe<Tokens_Metadata_Obj_Rel_Insert_Input>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_public_address?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Favorites_Max_Fields = {
  __typename?: 'favorites_max_fields';
  favorited_project_id?: Maybe<Scalars['String']>;
  favorited_token_id?: Maybe<Scalars['String']>;
  favorited_user_address?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  user_public_address?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "favorites" */
export type Favorites_Max_Order_By = {
  favorited_project_id?: InputMaybe<Order_By>;
  favorited_token_id?: InputMaybe<Order_By>;
  favorited_user_address?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  user_public_address?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Favorites_Min_Fields = {
  __typename?: 'favorites_min_fields';
  favorited_project_id?: Maybe<Scalars['String']>;
  favorited_token_id?: Maybe<Scalars['String']>;
  favorited_user_address?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  user_public_address?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "favorites" */
export type Favorites_Min_Order_By = {
  favorited_project_id?: InputMaybe<Order_By>;
  favorited_token_id?: InputMaybe<Order_By>;
  favorited_user_address?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  user_public_address?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "favorites" */
export type Favorites_Mutation_Response = {
  __typename?: 'favorites_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Favorites>;
};

/** on_conflict condition type for table "favorites" */
export type Favorites_On_Conflict = {
  constraint: Favorites_Constraint;
  update_columns?: Array<Favorites_Update_Column>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};

/** Ordering options when selecting data from "favorites". */
export type Favorites_Order_By = {
  favorited_project_id?: InputMaybe<Order_By>;
  favorited_token_id?: InputMaybe<Order_By>;
  favorited_user?: InputMaybe<Users_Order_By>;
  favorited_user_address?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  project_metadata?: InputMaybe<Projects_Metadata_Order_By>;
  token_metadata?: InputMaybe<Tokens_Metadata_Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_public_address?: InputMaybe<Order_By>;
};

/** primary key columns input for table: favorites */
export type Favorites_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** select columns of table "favorites" */
export enum Favorites_Select_Column {
  /** column name */
  FavoritedProjectId = 'favorited_project_id',
  /** column name */
  FavoritedTokenId = 'favorited_token_id',
  /** column name */
  FavoritedUserAddress = 'favorited_user_address',
  /** column name */
  Id = 'id',
  /** column name */
  UserPublicAddress = 'user_public_address'
}

/** input type for updating data in table "favorites" */
export type Favorites_Set_Input = {
  favorited_project_id?: InputMaybe<Scalars['String']>;
  favorited_token_id?: InputMaybe<Scalars['String']>;
  favorited_user_address?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  user_public_address?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Favorites_Stddev_Fields = {
  __typename?: 'favorites_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "favorites" */
export type Favorites_Stddev_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Favorites_Stddev_Pop_Fields = {
  __typename?: 'favorites_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "favorites" */
export type Favorites_Stddev_Pop_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Favorites_Stddev_Samp_Fields = {
  __typename?: 'favorites_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "favorites" */
export type Favorites_Stddev_Samp_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "favorites" */
export type Favorites_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Favorites_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Favorites_Stream_Cursor_Value_Input = {
  favorited_project_id?: InputMaybe<Scalars['String']>;
  favorited_token_id?: InputMaybe<Scalars['String']>;
  favorited_user_address?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  user_public_address?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Favorites_Sum_Fields = {
  __typename?: 'favorites_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "favorites" */
export type Favorites_Sum_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** update columns of table "favorites" */
export enum Favorites_Update_Column {
  /** column name */
  FavoritedProjectId = 'favorited_project_id',
  /** column name */
  FavoritedTokenId = 'favorited_token_id',
  /** column name */
  FavoritedUserAddress = 'favorited_user_address',
  /** column name */
  Id = 'id',
  /** column name */
  UserPublicAddress = 'user_public_address'
}

export type Favorites_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Favorites_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Favorites_Set_Input>;
  /** filter the rows which have to be updated */
  where: Favorites_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Favorites_Var_Pop_Fields = {
  __typename?: 'favorites_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "favorites" */
export type Favorites_Var_Pop_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Favorites_Var_Samp_Fields = {
  __typename?: 'favorites_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "favorites" */
export type Favorites_Var_Samp_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Favorites_Variance_Fields = {
  __typename?: 'favorites_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "favorites" */
export type Favorites_Variance_Order_By = {
  id?: InputMaybe<Order_By>;
};

/** columns and relationships of "feature_field_values_counts" */
export type Feature_Field_Values_Counts = {
  __typename?: 'feature_field_values_counts';
  count: Scalars['bigint'];
  value: Scalars['String'];
};

/** aggregated selection of "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Aggregate = {
  __typename?: 'feature_field_values_counts_aggregate';
  aggregate?: Maybe<Feature_Field_Values_Counts_Aggregate_Fields>;
  nodes: Array<Feature_Field_Values_Counts>;
};

/** aggregate fields of "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Aggregate_Fields = {
  __typename?: 'feature_field_values_counts_aggregate_fields';
  avg?: Maybe<Feature_Field_Values_Counts_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Feature_Field_Values_Counts_Max_Fields>;
  min?: Maybe<Feature_Field_Values_Counts_Min_Fields>;
  stddev?: Maybe<Feature_Field_Values_Counts_Stddev_Fields>;
  stddev_pop?: Maybe<Feature_Field_Values_Counts_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Feature_Field_Values_Counts_Stddev_Samp_Fields>;
  sum?: Maybe<Feature_Field_Values_Counts_Sum_Fields>;
  var_pop?: Maybe<Feature_Field_Values_Counts_Var_Pop_Fields>;
  var_samp?: Maybe<Feature_Field_Values_Counts_Var_Samp_Fields>;
  variance?: Maybe<Feature_Field_Values_Counts_Variance_Fields>;
};


/** aggregate fields of "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Feature_Field_Values_Counts_Avg_Fields = {
  __typename?: 'feature_field_values_counts_avg_fields';
  count?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "feature_field_values_counts". All fields are combined with a logical 'AND'. */
export type Feature_Field_Values_Counts_Bool_Exp = {
  _and?: InputMaybe<Array<Feature_Field_Values_Counts_Bool_Exp>>;
  _not?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
  _or?: InputMaybe<Array<Feature_Field_Values_Counts_Bool_Exp>>;
  count?: InputMaybe<Bigint_Comparison_Exp>;
  value?: InputMaybe<String_Comparison_Exp>;
};

/** input type for incrementing numeric columns in table "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Inc_Input = {
  count?: InputMaybe<Scalars['bigint']>;
};

/** input type for inserting data into table "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Insert_Input = {
  count?: InputMaybe<Scalars['bigint']>;
  value?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Feature_Field_Values_Counts_Max_Fields = {
  __typename?: 'feature_field_values_counts_max_fields';
  count?: Maybe<Scalars['bigint']>;
  value?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Feature_Field_Values_Counts_Min_Fields = {
  __typename?: 'feature_field_values_counts_min_fields';
  count?: Maybe<Scalars['bigint']>;
  value?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Mutation_Response = {
  __typename?: 'feature_field_values_counts_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Feature_Field_Values_Counts>;
};

/** Ordering options when selecting data from "feature_field_values_counts". */
export type Feature_Field_Values_Counts_Order_By = {
  count?: InputMaybe<Order_By>;
  value?: InputMaybe<Order_By>;
};

/** select columns of table "feature_field_values_counts" */
export enum Feature_Field_Values_Counts_Select_Column {
  /** column name */
  Count = 'count',
  /** column name */
  Value = 'value'
}

/** input type for updating data in table "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Set_Input = {
  count?: InputMaybe<Scalars['bigint']>;
  value?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Feature_Field_Values_Counts_Stddev_Fields = {
  __typename?: 'feature_field_values_counts_stddev_fields';
  count?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Feature_Field_Values_Counts_Stddev_Pop_Fields = {
  __typename?: 'feature_field_values_counts_stddev_pop_fields';
  count?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Feature_Field_Values_Counts_Stddev_Samp_Fields = {
  __typename?: 'feature_field_values_counts_stddev_samp_fields';
  count?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "feature_field_values_counts" */
export type Feature_Field_Values_Counts_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Feature_Field_Values_Counts_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Feature_Field_Values_Counts_Stream_Cursor_Value_Input = {
  count?: InputMaybe<Scalars['bigint']>;
  value?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Feature_Field_Values_Counts_Sum_Fields = {
  __typename?: 'feature_field_values_counts_sum_fields';
  count?: Maybe<Scalars['bigint']>;
};

export type Feature_Field_Values_Counts_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Feature_Field_Values_Counts_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Feature_Field_Values_Counts_Set_Input>;
  /** filter the rows which have to be updated */
  where: Feature_Field_Values_Counts_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Feature_Field_Values_Counts_Var_Pop_Fields = {
  __typename?: 'feature_field_values_counts_var_pop_fields';
  count?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Feature_Field_Values_Counts_Var_Samp_Fields = {
  __typename?: 'feature_field_values_counts_var_samp_fields';
  count?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Feature_Field_Values_Counts_Variance_Fields = {
  __typename?: 'feature_field_values_counts_variance_fields';
  count?: Maybe<Scalars['Float']>;
};

/** columns and relationships of "feature_flags" */
export type Feature_Flags = {
  __typename?: 'feature_flags';
  address_allowlist?: Maybe<Scalars['String']>;
  flag_name: Scalars['String'];
  globally_enabled: Scalars['Boolean'];
};

/** aggregated selection of "feature_flags" */
export type Feature_Flags_Aggregate = {
  __typename?: 'feature_flags_aggregate';
  aggregate?: Maybe<Feature_Flags_Aggregate_Fields>;
  nodes: Array<Feature_Flags>;
};

/** aggregate fields of "feature_flags" */
export type Feature_Flags_Aggregate_Fields = {
  __typename?: 'feature_flags_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Feature_Flags_Max_Fields>;
  min?: Maybe<Feature_Flags_Min_Fields>;
};


/** aggregate fields of "feature_flags" */
export type Feature_Flags_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Feature_Flags_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "feature_flags". All fields are combined with a logical 'AND'. */
export type Feature_Flags_Bool_Exp = {
  _and?: InputMaybe<Array<Feature_Flags_Bool_Exp>>;
  _not?: InputMaybe<Feature_Flags_Bool_Exp>;
  _or?: InputMaybe<Array<Feature_Flags_Bool_Exp>>;
  address_allowlist?: InputMaybe<String_Comparison_Exp>;
  flag_name?: InputMaybe<String_Comparison_Exp>;
  globally_enabled?: InputMaybe<Boolean_Comparison_Exp>;
};

/** unique or primary key constraints on table "feature_flags" */
export enum Feature_Flags_Constraint {
  /** unique or primary key constraint on columns "flag_name" */
  FeatureFlagsPkey = 'feature_flags_pkey'
}

/** input type for inserting data into table "feature_flags" */
export type Feature_Flags_Insert_Input = {
  address_allowlist?: InputMaybe<Scalars['String']>;
  flag_name?: InputMaybe<Scalars['String']>;
  globally_enabled?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate max on columns */
export type Feature_Flags_Max_Fields = {
  __typename?: 'feature_flags_max_fields';
  address_allowlist?: Maybe<Scalars['String']>;
  flag_name?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Feature_Flags_Min_Fields = {
  __typename?: 'feature_flags_min_fields';
  address_allowlist?: Maybe<Scalars['String']>;
  flag_name?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "feature_flags" */
export type Feature_Flags_Mutation_Response = {
  __typename?: 'feature_flags_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Feature_Flags>;
};

/** on_conflict condition type for table "feature_flags" */
export type Feature_Flags_On_Conflict = {
  constraint: Feature_Flags_Constraint;
  update_columns?: Array<Feature_Flags_Update_Column>;
  where?: InputMaybe<Feature_Flags_Bool_Exp>;
};

/** Ordering options when selecting data from "feature_flags". */
export type Feature_Flags_Order_By = {
  address_allowlist?: InputMaybe<Order_By>;
  flag_name?: InputMaybe<Order_By>;
  globally_enabled?: InputMaybe<Order_By>;
};

/** primary key columns input for table: feature_flags */
export type Feature_Flags_Pk_Columns_Input = {
  flag_name: Scalars['String'];
};

/** select columns of table "feature_flags" */
export enum Feature_Flags_Select_Column {
  /** column name */
  AddressAllowlist = 'address_allowlist',
  /** column name */
  FlagName = 'flag_name',
  /** column name */
  GloballyEnabled = 'globally_enabled'
}

/** input type for updating data in table "feature_flags" */
export type Feature_Flags_Set_Input = {
  address_allowlist?: InputMaybe<Scalars['String']>;
  flag_name?: InputMaybe<Scalars['String']>;
  globally_enabled?: InputMaybe<Scalars['Boolean']>;
};

/** Streaming cursor of the table "feature_flags" */
export type Feature_Flags_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Feature_Flags_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Feature_Flags_Stream_Cursor_Value_Input = {
  address_allowlist?: InputMaybe<Scalars['String']>;
  flag_name?: InputMaybe<Scalars['String']>;
  globally_enabled?: InputMaybe<Scalars['Boolean']>;
};

/** update columns of table "feature_flags" */
export enum Feature_Flags_Update_Column {
  /** column name */
  AddressAllowlist = 'address_allowlist',
  /** column name */
  FlagName = 'flag_name',
  /** column name */
  GloballyEnabled = 'globally_enabled'
}

export type Feature_Flags_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Feature_Flags_Set_Input>;
  /** filter the rows which have to be updated */
  where: Feature_Flags_Bool_Exp;
};

export type Featured_Token_Projects_Metadata_Args = {
  seed?: InputMaybe<Scalars['float8']>;
};

export type Filter_Tokens_Metadata_By_Features_Args = {
  path?: InputMaybe<Scalars['jsonpath']>;
};

/** Boolean expression to compare columns of type "float8". All fields are combined with logical 'AND'. */
export type Float8_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['float8']>;
  _gt?: InputMaybe<Scalars['float8']>;
  _gte?: InputMaybe<Scalars['float8']>;
  _in?: InputMaybe<Array<Scalars['float8']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['float8']>;
  _lte?: InputMaybe<Scalars['float8']>;
  _neq?: InputMaybe<Scalars['float8']>;
  _nin?: InputMaybe<Array<Scalars['float8']>>;
};

export type Get_Projects_Metadata_Feature_Field_Value_Counts_Args = {
  _feature_field?: InputMaybe<Scalars['String']>;
  _project_id?: InputMaybe<Scalars['String']>;
};

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars['jsonb']>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars['jsonb']>;
  _eq?: InputMaybe<Scalars['jsonb']>;
  _gt?: InputMaybe<Scalars['jsonb']>;
  _gte?: InputMaybe<Scalars['jsonb']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars['String']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars['String']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars['String']>>;
  _in?: InputMaybe<Array<Scalars['jsonb']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['jsonb']>;
  _lte?: InputMaybe<Scalars['jsonb']>;
  _neq?: InputMaybe<Scalars['jsonb']>;
  _nin?: InputMaybe<Array<Scalars['jsonb']>>;
};

export type List_Projects_Metadata_Random_Args = {
  seed?: InputMaybe<Scalars['seed_float']>;
};

/** columns and relationships of "media" */
export type Media = {
  __typename?: 'media';
  bucket_name: Scalars['String'];
  /** A computed field, executes function "media_extension" */
  extension?: Maybe<Scalars['String']>;
  file_path: Scalars['String'];
  id: Scalars['Int'];
  metadata?: Maybe<Scalars['jsonb']>;
  owner_id?: Maybe<Scalars['String']>;
  /** A computed field, executes function "media_url" */
  url?: Maybe<Scalars['String']>;
};


/** columns and relationships of "media" */
export type MediaMetadataArgs = {
  path?: InputMaybe<Scalars['String']>;
};

/** aggregated selection of "media" */
export type Media_Aggregate = {
  __typename?: 'media_aggregate';
  aggregate?: Maybe<Media_Aggregate_Fields>;
  nodes: Array<Media>;
};

/** aggregate fields of "media" */
export type Media_Aggregate_Fields = {
  __typename?: 'media_aggregate_fields';
  avg?: Maybe<Media_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Media_Max_Fields>;
  min?: Maybe<Media_Min_Fields>;
  stddev?: Maybe<Media_Stddev_Fields>;
  stddev_pop?: Maybe<Media_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Media_Stddev_Samp_Fields>;
  sum?: Maybe<Media_Sum_Fields>;
  var_pop?: Maybe<Media_Var_Pop_Fields>;
  var_samp?: Maybe<Media_Var_Samp_Fields>;
  variance?: Maybe<Media_Variance_Fields>;
};


/** aggregate fields of "media" */
export type Media_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Media_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Media_Append_Input = {
  metadata?: InputMaybe<Scalars['jsonb']>;
};

/** aggregate avg on columns */
export type Media_Avg_Fields = {
  __typename?: 'media_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "media". All fields are combined with a logical 'AND'. */
export type Media_Bool_Exp = {
  _and?: InputMaybe<Array<Media_Bool_Exp>>;
  _not?: InputMaybe<Media_Bool_Exp>;
  _or?: InputMaybe<Array<Media_Bool_Exp>>;
  bucket_name?: InputMaybe<String_Comparison_Exp>;
  extension?: InputMaybe<String_Comparison_Exp>;
  file_path?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Int_Comparison_Exp>;
  metadata?: InputMaybe<Jsonb_Comparison_Exp>;
  owner_id?: InputMaybe<String_Comparison_Exp>;
  url?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "media" */
export enum Media_Constraint {
  /** unique or primary key constraint on columns "file_path", "bucket_name" */
  MediaBucketNameFilePathKey = 'media_bucket_name_file_path_key',
  /** unique or primary key constraint on columns "id" */
  MediaPkey = 'media_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Media_Delete_At_Path_Input = {
  metadata?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Media_Delete_Elem_Input = {
  metadata?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Media_Delete_Key_Input = {
  metadata?: InputMaybe<Scalars['String']>;
};

/** input type for incrementing numeric columns in table "media" */
export type Media_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "media" */
export type Media_Insert_Input = {
  bucket_name?: InputMaybe<Scalars['String']>;
  file_path?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  metadata?: InputMaybe<Scalars['jsonb']>;
  owner_id?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Media_Max_Fields = {
  __typename?: 'media_max_fields';
  bucket_name?: Maybe<Scalars['String']>;
  file_path?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  owner_id?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Media_Min_Fields = {
  __typename?: 'media_min_fields';
  bucket_name?: Maybe<Scalars['String']>;
  file_path?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  owner_id?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "media" */
export type Media_Mutation_Response = {
  __typename?: 'media_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Media>;
};

/** input type for inserting object relation for remote table "media" */
export type Media_Obj_Rel_Insert_Input = {
  data: Media_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Media_On_Conflict>;
};

/** on_conflict condition type for table "media" */
export type Media_On_Conflict = {
  constraint: Media_Constraint;
  update_columns?: Array<Media_Update_Column>;
  where?: InputMaybe<Media_Bool_Exp>;
};

/** Ordering options when selecting data from "media". */
export type Media_Order_By = {
  bucket_name?: InputMaybe<Order_By>;
  extension?: InputMaybe<Order_By>;
  file_path?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  metadata?: InputMaybe<Order_By>;
  owner_id?: InputMaybe<Order_By>;
  url?: InputMaybe<Order_By>;
};

/** primary key columns input for table: media */
export type Media_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Media_Prepend_Input = {
  metadata?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "media" */
export enum Media_Select_Column {
  /** column name */
  BucketName = 'bucket_name',
  /** column name */
  FilePath = 'file_path',
  /** column name */
  Id = 'id',
  /** column name */
  Metadata = 'metadata',
  /** column name */
  OwnerId = 'owner_id'
}

/** input type for updating data in table "media" */
export type Media_Set_Input = {
  bucket_name?: InputMaybe<Scalars['String']>;
  file_path?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  metadata?: InputMaybe<Scalars['jsonb']>;
  owner_id?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Media_Stddev_Fields = {
  __typename?: 'media_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Media_Stddev_Pop_Fields = {
  __typename?: 'media_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Media_Stddev_Samp_Fields = {
  __typename?: 'media_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "media" */
export type Media_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Media_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Media_Stream_Cursor_Value_Input = {
  bucket_name?: InputMaybe<Scalars['String']>;
  file_path?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  metadata?: InputMaybe<Scalars['jsonb']>;
  owner_id?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Media_Sum_Fields = {
  __typename?: 'media_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** update columns of table "media" */
export enum Media_Update_Column {
  /** column name */
  BucketName = 'bucket_name',
  /** column name */
  FilePath = 'file_path',
  /** column name */
  Id = 'id',
  /** column name */
  Metadata = 'metadata',
  /** column name */
  OwnerId = 'owner_id'
}

export type Media_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Media_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Media_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Media_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Media_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Media_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Media_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Media_Set_Input>;
  /** filter the rows which have to be updated */
  where: Media_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Media_Var_Pop_Fields = {
  __typename?: 'media_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Media_Var_Samp_Fields = {
  __typename?: 'media_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Media_Variance_Fields = {
  __typename?: 'media_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

/** columns and relationships of "minter_filters_metadata" */
export type Minter_Filters_Metadata = {
  __typename?: 'minter_filters_metadata';
  address: Scalars['String'];
  /** An array relationship */
  allowed_minters: Array<Minters_Metadata>;
  /** An aggregate relationship */
  allowed_minters_aggregate: Minters_Metadata_Aggregate;
};


/** columns and relationships of "minter_filters_metadata" */
export type Minter_Filters_MetadataAllowed_MintersArgs = {
  distinct_on?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minters_Metadata_Order_By>>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};


/** columns and relationships of "minter_filters_metadata" */
export type Minter_Filters_MetadataAllowed_Minters_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minters_Metadata_Order_By>>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};

/** aggregated selection of "minter_filters_metadata" */
export type Minter_Filters_Metadata_Aggregate = {
  __typename?: 'minter_filters_metadata_aggregate';
  aggregate?: Maybe<Minter_Filters_Metadata_Aggregate_Fields>;
  nodes: Array<Minter_Filters_Metadata>;
};

/** aggregate fields of "minter_filters_metadata" */
export type Minter_Filters_Metadata_Aggregate_Fields = {
  __typename?: 'minter_filters_metadata_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Minter_Filters_Metadata_Max_Fields>;
  min?: Maybe<Minter_Filters_Metadata_Min_Fields>;
};


/** aggregate fields of "minter_filters_metadata" */
export type Minter_Filters_Metadata_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Minter_Filters_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "minter_filters_metadata". All fields are combined with a logical 'AND'. */
export type Minter_Filters_Metadata_Bool_Exp = {
  _and?: InputMaybe<Array<Minter_Filters_Metadata_Bool_Exp>>;
  _not?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
  _or?: InputMaybe<Array<Minter_Filters_Metadata_Bool_Exp>>;
  address?: InputMaybe<String_Comparison_Exp>;
  allowed_minters?: InputMaybe<Minters_Metadata_Bool_Exp>;
  allowed_minters_aggregate?: InputMaybe<Minters_Metadata_Aggregate_Bool_Exp>;
};

/** unique or primary key constraints on table "minter_filters_metadata" */
export enum Minter_Filters_Metadata_Constraint {
  /** unique or primary key constraint on columns "address" */
  MinterFiltersMetadataAddressKey = 'minter_filters_metadata_address_key',
  /** unique or primary key constraint on columns "address" */
  MinterFiltersMetadataPkey = 'minter_filters_metadata_pkey'
}

/** input type for inserting data into table "minter_filters_metadata" */
export type Minter_Filters_Metadata_Insert_Input = {
  address?: InputMaybe<Scalars['String']>;
  allowed_minters?: InputMaybe<Minters_Metadata_Arr_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Minter_Filters_Metadata_Max_Fields = {
  __typename?: 'minter_filters_metadata_max_fields';
  address?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Minter_Filters_Metadata_Min_Fields = {
  __typename?: 'minter_filters_metadata_min_fields';
  address?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "minter_filters_metadata" */
export type Minter_Filters_Metadata_Mutation_Response = {
  __typename?: 'minter_filters_metadata_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Minter_Filters_Metadata>;
};

/** input type for inserting object relation for remote table "minter_filters_metadata" */
export type Minter_Filters_Metadata_Obj_Rel_Insert_Input = {
  data: Minter_Filters_Metadata_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Minter_Filters_Metadata_On_Conflict>;
};

/** on_conflict condition type for table "minter_filters_metadata" */
export type Minter_Filters_Metadata_On_Conflict = {
  constraint: Minter_Filters_Metadata_Constraint;
  update_columns?: Array<Minter_Filters_Metadata_Update_Column>;
  where?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
};

/** Ordering options when selecting data from "minter_filters_metadata". */
export type Minter_Filters_Metadata_Order_By = {
  address?: InputMaybe<Order_By>;
  allowed_minters_aggregate?: InputMaybe<Minters_Metadata_Aggregate_Order_By>;
};

/** primary key columns input for table: minter_filters_metadata */
export type Minter_Filters_Metadata_Pk_Columns_Input = {
  address: Scalars['String'];
};

/** select columns of table "minter_filters_metadata" */
export enum Minter_Filters_Metadata_Select_Column {
  /** column name */
  Address = 'address'
}

/** input type for updating data in table "minter_filters_metadata" */
export type Minter_Filters_Metadata_Set_Input = {
  address?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "minter_filters_metadata" */
export type Minter_Filters_Metadata_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Minter_Filters_Metadata_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Minter_Filters_Metadata_Stream_Cursor_Value_Input = {
  address?: InputMaybe<Scalars['String']>;
};

/** update columns of table "minter_filters_metadata" */
export enum Minter_Filters_Metadata_Update_Column {
  /** column name */
  Address = 'address'
}

export type Minter_Filters_Metadata_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Minter_Filters_Metadata_Set_Input>;
  /** filter the rows which have to be updated */
  where: Minter_Filters_Metadata_Bool_Exp;
};

/** columns and relationships of "minter_type_names" */
export type Minter_Type_Names = {
  __typename?: 'minter_type_names';
  name: Scalars['String'];
};

/** aggregated selection of "minter_type_names" */
export type Minter_Type_Names_Aggregate = {
  __typename?: 'minter_type_names_aggregate';
  aggregate?: Maybe<Minter_Type_Names_Aggregate_Fields>;
  nodes: Array<Minter_Type_Names>;
};

/** aggregate fields of "minter_type_names" */
export type Minter_Type_Names_Aggregate_Fields = {
  __typename?: 'minter_type_names_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Minter_Type_Names_Max_Fields>;
  min?: Maybe<Minter_Type_Names_Min_Fields>;
};


/** aggregate fields of "minter_type_names" */
export type Minter_Type_Names_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Minter_Type_Names_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "minter_type_names". All fields are combined with a logical 'AND'. */
export type Minter_Type_Names_Bool_Exp = {
  _and?: InputMaybe<Array<Minter_Type_Names_Bool_Exp>>;
  _not?: InputMaybe<Minter_Type_Names_Bool_Exp>;
  _or?: InputMaybe<Array<Minter_Type_Names_Bool_Exp>>;
  name?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "minter_type_names" */
export enum Minter_Type_Names_Constraint {
  /** unique or primary key constraint on columns "name" */
  MinterTypeNamesPkey = 'minter_type_names_pkey'
}

export enum Minter_Type_Names_Enum {
  MinterDaExpSettlementV0 = 'MinterDAExpSettlementV0',
  MinterDaExpV0 = 'MinterDAExpV0',
  MinterDaExpV1 = 'MinterDAExpV1',
  MinterDaExpV2 = 'MinterDAExpV2',
  MinterDaLinV0 = 'MinterDALinV0',
  MinterDaLinV1 = 'MinterDALinV1',
  MinterDaLinV2 = 'MinterDALinV2',
  MinterDaLinV3 = 'MinterDALinV3',
  MinterHolderV0 = 'MinterHolderV0',
  MinterHolderV1 = 'MinterHolderV1',
  MinterHolderV2 = 'MinterHolderV2',
  MinterMerkleV0 = 'MinterMerkleV0',
  MinterMerkleV1 = 'MinterMerkleV1',
  MinterMerkleV2 = 'MinterMerkleV2',
  MinterMerkleV3 = 'MinterMerkleV3',
  MinterSetPriceErc20V0 = 'MinterSetPriceERC20V0',
  MinterSetPriceErc20V1 = 'MinterSetPriceERC20V1',
  MinterSetPriceErc20V2 = 'MinterSetPriceERC20V2',
  MinterSetPriceV0 = 'MinterSetPriceV0',
  MinterSetPriceV1 = 'MinterSetPriceV1',
  MinterSetPriceV2 = 'MinterSetPriceV2',
  MinterSetPriceV4 = 'MinterSetPriceV4'
}

/** Boolean expression to compare columns of type "minter_type_names_enum". All fields are combined with logical 'AND'. */
export type Minter_Type_Names_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Minter_Type_Names_Enum>;
  _in?: InputMaybe<Array<Minter_Type_Names_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Minter_Type_Names_Enum>;
  _nin?: InputMaybe<Array<Minter_Type_Names_Enum>>;
};

/** input type for inserting data into table "minter_type_names" */
export type Minter_Type_Names_Insert_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Minter_Type_Names_Max_Fields = {
  __typename?: 'minter_type_names_max_fields';
  name?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Minter_Type_Names_Min_Fields = {
  __typename?: 'minter_type_names_min_fields';
  name?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "minter_type_names" */
export type Minter_Type_Names_Mutation_Response = {
  __typename?: 'minter_type_names_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Minter_Type_Names>;
};

/** on_conflict condition type for table "minter_type_names" */
export type Minter_Type_Names_On_Conflict = {
  constraint: Minter_Type_Names_Constraint;
  update_columns?: Array<Minter_Type_Names_Update_Column>;
  where?: InputMaybe<Minter_Type_Names_Bool_Exp>;
};

/** Ordering options when selecting data from "minter_type_names". */
export type Minter_Type_Names_Order_By = {
  name?: InputMaybe<Order_By>;
};

/** primary key columns input for table: minter_type_names */
export type Minter_Type_Names_Pk_Columns_Input = {
  name: Scalars['String'];
};

/** select columns of table "minter_type_names" */
export enum Minter_Type_Names_Select_Column {
  /** column name */
  Name = 'name'
}

/** input type for updating data in table "minter_type_names" */
export type Minter_Type_Names_Set_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "minter_type_names" */
export type Minter_Type_Names_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Minter_Type_Names_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Minter_Type_Names_Stream_Cursor_Value_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** update columns of table "minter_type_names" */
export enum Minter_Type_Names_Update_Column {
  /** column name */
  Name = 'name'
}

export type Minter_Type_Names_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Minter_Type_Names_Set_Input>;
  /** filter the rows which have to be updated */
  where: Minter_Type_Names_Bool_Exp;
};

/** columns and relationships of "minter_types" */
export type Minter_Types = {
  __typename?: 'minter_types';
  description_template: Scalars['String'];
  label?: Maybe<Scalars['String']>;
  type: Minter_Type_Names_Enum;
  /** A computed field, executes function "minter_type_unversioned" */
  unversioned_type?: Maybe<Scalars['String']>;
  /** A computed field, executes function "minter_type_version_number" */
  version_number?: Maybe<Scalars['Int']>;
};

/** aggregated selection of "minter_types" */
export type Minter_Types_Aggregate = {
  __typename?: 'minter_types_aggregate';
  aggregate?: Maybe<Minter_Types_Aggregate_Fields>;
  nodes: Array<Minter_Types>;
};

/** aggregate fields of "minter_types" */
export type Minter_Types_Aggregate_Fields = {
  __typename?: 'minter_types_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Minter_Types_Max_Fields>;
  min?: Maybe<Minter_Types_Min_Fields>;
};


/** aggregate fields of "minter_types" */
export type Minter_Types_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Minter_Types_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "minter_types". All fields are combined with a logical 'AND'. */
export type Minter_Types_Bool_Exp = {
  _and?: InputMaybe<Array<Minter_Types_Bool_Exp>>;
  _not?: InputMaybe<Minter_Types_Bool_Exp>;
  _or?: InputMaybe<Array<Minter_Types_Bool_Exp>>;
  description_template?: InputMaybe<String_Comparison_Exp>;
  label?: InputMaybe<String_Comparison_Exp>;
  type?: InputMaybe<Minter_Type_Names_Enum_Comparison_Exp>;
  unversioned_type?: InputMaybe<String_Comparison_Exp>;
  version_number?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "minter_types" */
export enum Minter_Types_Constraint {
  /** unique or primary key constraint on columns "type" */
  MinterTypesPkey = 'minter_types_pkey',
  /** unique or primary key constraint on columns "type" */
  MinterTypesTypeKey = 'minter_types_type_key'
}

/** input type for inserting data into table "minter_types" */
export type Minter_Types_Insert_Input = {
  description_template?: InputMaybe<Scalars['String']>;
  label?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<Minter_Type_Names_Enum>;
};

/** aggregate max on columns */
export type Minter_Types_Max_Fields = {
  __typename?: 'minter_types_max_fields';
  description_template?: Maybe<Scalars['String']>;
  label?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Minter_Types_Min_Fields = {
  __typename?: 'minter_types_min_fields';
  description_template?: Maybe<Scalars['String']>;
  label?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "minter_types" */
export type Minter_Types_Mutation_Response = {
  __typename?: 'minter_types_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Minter_Types>;
};

/** input type for inserting object relation for remote table "minter_types" */
export type Minter_Types_Obj_Rel_Insert_Input = {
  data: Minter_Types_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Minter_Types_On_Conflict>;
};

/** on_conflict condition type for table "minter_types" */
export type Minter_Types_On_Conflict = {
  constraint: Minter_Types_Constraint;
  update_columns?: Array<Minter_Types_Update_Column>;
  where?: InputMaybe<Minter_Types_Bool_Exp>;
};

/** Ordering options when selecting data from "minter_types". */
export type Minter_Types_Order_By = {
  description_template?: InputMaybe<Order_By>;
  label?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  unversioned_type?: InputMaybe<Order_By>;
  version_number?: InputMaybe<Order_By>;
};

/** primary key columns input for table: minter_types */
export type Minter_Types_Pk_Columns_Input = {
  type: Minter_Type_Names_Enum;
};

/** select columns of table "minter_types" */
export enum Minter_Types_Select_Column {
  /** column name */
  DescriptionTemplate = 'description_template',
  /** column name */
  Label = 'label',
  /** column name */
  Type = 'type'
}

/** input type for updating data in table "minter_types" */
export type Minter_Types_Set_Input = {
  description_template?: InputMaybe<Scalars['String']>;
  label?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<Minter_Type_Names_Enum>;
};

/** Streaming cursor of the table "minter_types" */
export type Minter_Types_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Minter_Types_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Minter_Types_Stream_Cursor_Value_Input = {
  description_template?: InputMaybe<Scalars['String']>;
  label?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<Minter_Type_Names_Enum>;
};

/** update columns of table "minter_types" */
export enum Minter_Types_Update_Column {
  /** column name */
  DescriptionTemplate = 'description_template',
  /** column name */
  Label = 'label',
  /** column name */
  Type = 'type'
}

export type Minter_Types_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Minter_Types_Set_Input>;
  /** filter the rows which have to be updated */
  where: Minter_Types_Bool_Exp;
};

/** columns and relationships of "minters_metadata" */
export type Minters_Metadata = {
  __typename?: 'minters_metadata';
  address: Scalars['String'];
  /** An object relationship */
  core_contract?: Maybe<Contracts_Metadata>;
  core_contract_address: Scalars['String'];
  extra_minter_details?: Maybe<Scalars['jsonb']>;
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
  /** An object relationship */
  minter_filter?: Maybe<Minter_Filters_Metadata>;
  minter_filter_address: Scalars['String'];
  minter_type: Minter_Type_Names_Enum;
  /** An array relationship */
  receipts: Array<Receipt_Metadata>;
  /** An aggregate relationship */
  receipts_aggregate: Receipt_Metadata_Aggregate;
  /** An object relationship */
  type?: Maybe<Minter_Types>;
};


/** columns and relationships of "minters_metadata" */
export type Minters_MetadataExtra_Minter_DetailsArgs = {
  path?: InputMaybe<Scalars['String']>;
};


/** columns and relationships of "minters_metadata" */
export type Minters_MetadataReceiptsArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


/** columns and relationships of "minters_metadata" */
export type Minters_MetadataReceipts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};

/** aggregated selection of "minters_metadata" */
export type Minters_Metadata_Aggregate = {
  __typename?: 'minters_metadata_aggregate';
  aggregate?: Maybe<Minters_Metadata_Aggregate_Fields>;
  nodes: Array<Minters_Metadata>;
};

export type Minters_Metadata_Aggregate_Bool_Exp = {
  count?: InputMaybe<Minters_Metadata_Aggregate_Bool_Exp_Count>;
};

export type Minters_Metadata_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Minters_Metadata_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "minters_metadata" */
export type Minters_Metadata_Aggregate_Fields = {
  __typename?: 'minters_metadata_aggregate_fields';
  avg?: Maybe<Minters_Metadata_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Minters_Metadata_Max_Fields>;
  min?: Maybe<Minters_Metadata_Min_Fields>;
  stddev?: Maybe<Minters_Metadata_Stddev_Fields>;
  stddev_pop?: Maybe<Minters_Metadata_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Minters_Metadata_Stddev_Samp_Fields>;
  sum?: Maybe<Minters_Metadata_Sum_Fields>;
  var_pop?: Maybe<Minters_Metadata_Var_Pop_Fields>;
  var_samp?: Maybe<Minters_Metadata_Var_Samp_Fields>;
  variance?: Maybe<Minters_Metadata_Variance_Fields>;
};


/** aggregate fields of "minters_metadata" */
export type Minters_Metadata_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "minters_metadata" */
export type Minters_Metadata_Aggregate_Order_By = {
  avg?: InputMaybe<Minters_Metadata_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Minters_Metadata_Max_Order_By>;
  min?: InputMaybe<Minters_Metadata_Min_Order_By>;
  stddev?: InputMaybe<Minters_Metadata_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Minters_Metadata_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Minters_Metadata_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Minters_Metadata_Sum_Order_By>;
  var_pop?: InputMaybe<Minters_Metadata_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Minters_Metadata_Var_Samp_Order_By>;
  variance?: InputMaybe<Minters_Metadata_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Minters_Metadata_Append_Input = {
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
};

/** input type for inserting array relation for remote table "minters_metadata" */
export type Minters_Metadata_Arr_Rel_Insert_Input = {
  data: Array<Minters_Metadata_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Minters_Metadata_On_Conflict>;
};

/** aggregate avg on columns */
export type Minters_Metadata_Avg_Fields = {
  __typename?: 'minters_metadata_avg_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Float']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "minters_metadata" */
export type Minters_Metadata_Avg_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "minters_metadata". All fields are combined with a logical 'AND'. */
export type Minters_Metadata_Bool_Exp = {
  _and?: InputMaybe<Array<Minters_Metadata_Bool_Exp>>;
  _not?: InputMaybe<Minters_Metadata_Bool_Exp>;
  _or?: InputMaybe<Array<Minters_Metadata_Bool_Exp>>;
  address?: InputMaybe<String_Comparison_Exp>;
  core_contract?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  core_contract_address?: InputMaybe<String_Comparison_Exp>;
  extra_minter_details?: InputMaybe<Jsonb_Comparison_Exp>;
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Int_Comparison_Exp>;
  minimum_auction_length_in_seconds?: InputMaybe<Int_Comparison_Exp>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Int_Comparison_Exp>;
  minter_filter?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
  minter_filter_address?: InputMaybe<String_Comparison_Exp>;
  minter_type?: InputMaybe<Minter_Type_Names_Enum_Comparison_Exp>;
  receipts?: InputMaybe<Receipt_Metadata_Bool_Exp>;
  receipts_aggregate?: InputMaybe<Receipt_Metadata_Aggregate_Bool_Exp>;
  type?: InputMaybe<Minter_Types_Bool_Exp>;
};

/** unique or primary key constraints on table "minters_metadata" */
export enum Minters_Metadata_Constraint {
  /** unique or primary key constraint on columns "address" */
  MintersMetadataPkey = 'minters_metadata_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Minters_Metadata_Delete_At_Path_Input = {
  extra_minter_details?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Minters_Metadata_Delete_Elem_Input = {
  extra_minter_details?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Minters_Metadata_Delete_Key_Input = {
  extra_minter_details?: InputMaybe<Scalars['String']>;
};

/** input type for incrementing numeric columns in table "minters_metadata" */
export type Minters_Metadata_Inc_Input = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "minters_metadata" */
export type Minters_Metadata_Insert_Input = {
  address?: InputMaybe<Scalars['String']>;
  core_contract?: InputMaybe<Contracts_Metadata_Obj_Rel_Insert_Input>;
  core_contract_address?: InputMaybe<Scalars['String']>;
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
  minter_filter?: InputMaybe<Minter_Filters_Metadata_Obj_Rel_Insert_Input>;
  minter_filter_address?: InputMaybe<Scalars['String']>;
  minter_type?: InputMaybe<Minter_Type_Names_Enum>;
  receipts?: InputMaybe<Receipt_Metadata_Arr_Rel_Insert_Input>;
  type?: InputMaybe<Minter_Types_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Minters_Metadata_Max_Fields = {
  __typename?: 'minters_metadata_max_fields';
  address?: Maybe<Scalars['String']>;
  core_contract_address?: Maybe<Scalars['String']>;
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
  minter_filter_address?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "minters_metadata" */
export type Minters_Metadata_Max_Order_By = {
  address?: InputMaybe<Order_By>;
  core_contract_address?: InputMaybe<Order_By>;
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minter_filter_address?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Minters_Metadata_Min_Fields = {
  __typename?: 'minters_metadata_min_fields';
  address?: Maybe<Scalars['String']>;
  core_contract_address?: Maybe<Scalars['String']>;
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
  minter_filter_address?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "minters_metadata" */
export type Minters_Metadata_Min_Order_By = {
  address?: InputMaybe<Order_By>;
  core_contract_address?: InputMaybe<Order_By>;
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minter_filter_address?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "minters_metadata" */
export type Minters_Metadata_Mutation_Response = {
  __typename?: 'minters_metadata_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Minters_Metadata>;
};

/** input type for inserting object relation for remote table "minters_metadata" */
export type Minters_Metadata_Obj_Rel_Insert_Input = {
  data: Minters_Metadata_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Minters_Metadata_On_Conflict>;
};

/** on_conflict condition type for table "minters_metadata" */
export type Minters_Metadata_On_Conflict = {
  constraint: Minters_Metadata_Constraint;
  update_columns?: Array<Minters_Metadata_Update_Column>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};

/** Ordering options when selecting data from "minters_metadata". */
export type Minters_Metadata_Order_By = {
  address?: InputMaybe<Order_By>;
  core_contract?: InputMaybe<Contracts_Metadata_Order_By>;
  core_contract_address?: InputMaybe<Order_By>;
  extra_minter_details?: InputMaybe<Order_By>;
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minter_filter?: InputMaybe<Minter_Filters_Metadata_Order_By>;
  minter_filter_address?: InputMaybe<Order_By>;
  minter_type?: InputMaybe<Order_By>;
  receipts_aggregate?: InputMaybe<Receipt_Metadata_Aggregate_Order_By>;
  type?: InputMaybe<Minter_Types_Order_By>;
};

/** primary key columns input for table: minters_metadata */
export type Minters_Metadata_Pk_Columns_Input = {
  address: Scalars['String'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Minters_Metadata_Prepend_Input = {
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "minters_metadata" */
export enum Minters_Metadata_Select_Column {
  /** column name */
  Address = 'address',
  /** column name */
  CoreContractAddress = 'core_contract_address',
  /** column name */
  ExtraMinterDetails = 'extra_minter_details',
  /** column name */
  MaximumPriceDecayHalfLifeInSeconds = 'maximum_price_decay_half_life_in_seconds',
  /** column name */
  MinimumAuctionLengthInSeconds = 'minimum_auction_length_in_seconds',
  /** column name */
  MinimumPriceDecayHalfLifeInSeconds = 'minimum_price_decay_half_life_in_seconds',
  /** column name */
  MinterFilterAddress = 'minter_filter_address',
  /** column name */
  MinterType = 'minter_type'
}

/** input type for updating data in table "minters_metadata" */
export type Minters_Metadata_Set_Input = {
  address?: InputMaybe<Scalars['String']>;
  core_contract_address?: InputMaybe<Scalars['String']>;
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
  minter_filter_address?: InputMaybe<Scalars['String']>;
  minter_type?: InputMaybe<Minter_Type_Names_Enum>;
};

/** aggregate stddev on columns */
export type Minters_Metadata_Stddev_Fields = {
  __typename?: 'minters_metadata_stddev_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Float']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "minters_metadata" */
export type Minters_Metadata_Stddev_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Minters_Metadata_Stddev_Pop_Fields = {
  __typename?: 'minters_metadata_stddev_pop_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Float']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "minters_metadata" */
export type Minters_Metadata_Stddev_Pop_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Minters_Metadata_Stddev_Samp_Fields = {
  __typename?: 'minters_metadata_stddev_samp_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Float']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "minters_metadata" */
export type Minters_Metadata_Stddev_Samp_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "minters_metadata" */
export type Minters_Metadata_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Minters_Metadata_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Minters_Metadata_Stream_Cursor_Value_Input = {
  address?: InputMaybe<Scalars['String']>;
  core_contract_address?: InputMaybe<Scalars['String']>;
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: InputMaybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Scalars['Int']>;
  minter_filter_address?: InputMaybe<Scalars['String']>;
  minter_type?: InputMaybe<Minter_Type_Names_Enum>;
};

/** aggregate sum on columns */
export type Minters_Metadata_Sum_Fields = {
  __typename?: 'minters_metadata_sum_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Int']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "minters_metadata" */
export type Minters_Metadata_Sum_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** update columns of table "minters_metadata" */
export enum Minters_Metadata_Update_Column {
  /** column name */
  Address = 'address',
  /** column name */
  CoreContractAddress = 'core_contract_address',
  /** column name */
  ExtraMinterDetails = 'extra_minter_details',
  /** column name */
  MaximumPriceDecayHalfLifeInSeconds = 'maximum_price_decay_half_life_in_seconds',
  /** column name */
  MinimumAuctionLengthInSeconds = 'minimum_auction_length_in_seconds',
  /** column name */
  MinimumPriceDecayHalfLifeInSeconds = 'minimum_price_decay_half_life_in_seconds',
  /** column name */
  MinterFilterAddress = 'minter_filter_address',
  /** column name */
  MinterType = 'minter_type'
}

export type Minters_Metadata_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Minters_Metadata_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Minters_Metadata_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Minters_Metadata_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Minters_Metadata_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Minters_Metadata_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Minters_Metadata_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Minters_Metadata_Set_Input>;
  /** filter the rows which have to be updated */
  where: Minters_Metadata_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Minters_Metadata_Var_Pop_Fields = {
  __typename?: 'minters_metadata_var_pop_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Float']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "minters_metadata" */
export type Minters_Metadata_Var_Pop_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Minters_Metadata_Var_Samp_Fields = {
  __typename?: 'minters_metadata_var_samp_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Float']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "minters_metadata" */
export type Minters_Metadata_Var_Samp_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Minters_Metadata_Variance_Fields = {
  __typename?: 'minters_metadata_variance_fields';
  maximum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
  minimum_auction_length_in_seconds?: Maybe<Scalars['Float']>;
  minimum_price_decay_half_life_in_seconds?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "minters_metadata" */
export type Minters_Metadata_Variance_Order_By = {
  maximum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
  minimum_auction_length_in_seconds?: InputMaybe<Order_By>;
  minimum_price_decay_half_life_in_seconds?: InputMaybe<Order_By>;
};

/** mutation root */
export type Mutation_Root = {
  __typename?: 'mutation_root';
  authenticate?: Maybe<AuthenticateOutput>;
  createApplication: Scalars['uuid'];
  /** delete data from the table: "categories" */
  delete_categories?: Maybe<Categories_Mutation_Response>;
  /** delete single row from the table: "categories" */
  delete_categories_by_pk?: Maybe<Categories>;
  /** delete data from the table: "contract_allowlistings" */
  delete_contract_allowlistings?: Maybe<Contract_Allowlistings_Mutation_Response>;
  /** delete single row from the table: "contract_allowlistings" */
  delete_contract_allowlistings_by_pk?: Maybe<Contract_Allowlistings>;
  /** delete data from the table: "contract_type_names" */
  delete_contract_type_names?: Maybe<Contract_Type_Names_Mutation_Response>;
  /** delete single row from the table: "contract_type_names" */
  delete_contract_type_names_by_pk?: Maybe<Contract_Type_Names>;
  /** delete data from the table: "contract_types" */
  delete_contract_types?: Maybe<Contract_Types_Mutation_Response>;
  /** delete single row from the table: "contract_types" */
  delete_contract_types_by_pk?: Maybe<Contract_Types>;
  /** delete data from the table: "contracts_metadata" */
  delete_contracts_metadata?: Maybe<Contracts_Metadata_Mutation_Response>;
  /** delete single row from the table: "contracts_metadata" */
  delete_contracts_metadata_by_pk?: Maybe<Contracts_Metadata>;
  /** delete data from the table: "curation_statuses" */
  delete_curation_statuses?: Maybe<Curation_Statuses_Mutation_Response>;
  /** delete single row from the table: "curation_statuses" */
  delete_curation_statuses_by_pk?: Maybe<Curation_Statuses>;
  /** delete data from the table: "dependencies_metadata" */
  delete_dependencies_metadata?: Maybe<Dependencies_Metadata_Mutation_Response>;
  /** delete single row from the table: "dependencies_metadata" */
  delete_dependencies_metadata_by_pk?: Maybe<Dependencies_Metadata>;
  /** delete data from the table: "dependency_additional_cdns" */
  delete_dependency_additional_cdns?: Maybe<Dependency_Additional_Cdns_Mutation_Response>;
  /** delete single row from the table: "dependency_additional_cdns" */
  delete_dependency_additional_cdns_by_pk?: Maybe<Dependency_Additional_Cdns>;
  /** delete data from the table: "dependency_additional_repositories" */
  delete_dependency_additional_repositories?: Maybe<Dependency_Additional_Repositories_Mutation_Response>;
  /** delete single row from the table: "dependency_additional_repositories" */
  delete_dependency_additional_repositories_by_pk?: Maybe<Dependency_Additional_Repositories>;
  /** delete data from the table: "dependency_registries" */
  delete_dependency_registries?: Maybe<Dependency_Registries_Mutation_Response>;
  /** delete single row from the table: "dependency_registries" */
  delete_dependency_registries_by_pk?: Maybe<Dependency_Registries>;
  /** delete data from the table: "dependency_scripts" */
  delete_dependency_scripts?: Maybe<Dependency_Scripts_Mutation_Response>;
  /** delete single row from the table: "dependency_scripts" */
  delete_dependency_scripts_by_pk?: Maybe<Dependency_Scripts>;
  /** delete data from the table: "entity_tags" */
  delete_entity_tags?: Maybe<Entity_Tags_Mutation_Response>;
  /** delete single row from the table: "entity_tags" */
  delete_entity_tags_by_pk?: Maybe<Entity_Tags>;
  /** delete data from the table: "favorites" */
  delete_favorites?: Maybe<Favorites_Mutation_Response>;
  /** delete single row from the table: "favorites" */
  delete_favorites_by_pk?: Maybe<Favorites>;
  /** delete data from the table: "feature_field_values_counts" */
  delete_feature_field_values_counts?: Maybe<Feature_Field_Values_Counts_Mutation_Response>;
  /** delete data from the table: "feature_flags" */
  delete_feature_flags?: Maybe<Feature_Flags_Mutation_Response>;
  /** delete single row from the table: "feature_flags" */
  delete_feature_flags_by_pk?: Maybe<Feature_Flags>;
  /** delete data from the table: "media" */
  delete_media?: Maybe<Media_Mutation_Response>;
  /** delete single row from the table: "media" */
  delete_media_by_pk?: Maybe<Media>;
  /** delete data from the table: "minter_filters_metadata" */
  delete_minter_filters_metadata?: Maybe<Minter_Filters_Metadata_Mutation_Response>;
  /** delete single row from the table: "minter_filters_metadata" */
  delete_minter_filters_metadata_by_pk?: Maybe<Minter_Filters_Metadata>;
  /** delete data from the table: "minter_type_names" */
  delete_minter_type_names?: Maybe<Minter_Type_Names_Mutation_Response>;
  /** delete single row from the table: "minter_type_names" */
  delete_minter_type_names_by_pk?: Maybe<Minter_Type_Names>;
  /** delete data from the table: "minter_types" */
  delete_minter_types?: Maybe<Minter_Types_Mutation_Response>;
  /** delete single row from the table: "minter_types" */
  delete_minter_types_by_pk?: Maybe<Minter_Types>;
  /** delete data from the table: "minters_metadata" */
  delete_minters_metadata?: Maybe<Minters_Metadata_Mutation_Response>;
  /** delete single row from the table: "minters_metadata" */
  delete_minters_metadata_by_pk?: Maybe<Minters_Metadata>;
  /** delete data from the table: "notifications" */
  delete_notifications?: Maybe<Notifications_Mutation_Response>;
  /** delete single row from the table: "notifications" */
  delete_notifications_by_pk?: Maybe<Notifications>;
  /** delete data from the table: "project_external_asset_dependencies" */
  delete_project_external_asset_dependencies?: Maybe<Project_External_Asset_Dependencies_Mutation_Response>;
  /** delete single row from the table: "project_external_asset_dependencies" */
  delete_project_external_asset_dependencies_by_pk?: Maybe<Project_External_Asset_Dependencies>;
  /** delete data from the table: "project_external_asset_dependency_types" */
  delete_project_external_asset_dependency_types?: Maybe<Project_External_Asset_Dependency_Types_Mutation_Response>;
  /** delete single row from the table: "project_external_asset_dependency_types" */
  delete_project_external_asset_dependency_types_by_pk?: Maybe<Project_External_Asset_Dependency_Types>;
  /** delete data from the table: "project_minter_configurations" */
  delete_project_minter_configurations?: Maybe<Project_Minter_Configurations_Mutation_Response>;
  /** delete single row from the table: "project_minter_configurations" */
  delete_project_minter_configurations_by_pk?: Maybe<Project_Minter_Configurations>;
  /** delete data from the table: "project_scripts" */
  delete_project_scripts?: Maybe<Project_Scripts_Mutation_Response>;
  /** delete single row from the table: "project_scripts" */
  delete_project_scripts_by_pk?: Maybe<Project_Scripts>;
  /** delete data from the table: "project_series" */
  delete_project_series?: Maybe<Project_Series_Mutation_Response>;
  /** delete single row from the table: "project_series" */
  delete_project_series_by_pk?: Maybe<Project_Series>;
  /** delete data from the table: "project_vertical_categories" */
  delete_project_vertical_categories?: Maybe<Project_Vertical_Categories_Mutation_Response>;
  /** delete single row from the table: "project_vertical_categories" */
  delete_project_vertical_categories_by_pk?: Maybe<Project_Vertical_Categories>;
  /** delete data from the table: "project_verticals" */
  delete_project_verticals?: Maybe<Project_Verticals_Mutation_Response>;
  /** delete single row from the table: "project_verticals" */
  delete_project_verticals_by_pk?: Maybe<Project_Verticals>;
  /** delete data from the table: "projects_features" */
  delete_projects_features?: Maybe<Projects_Features_Mutation_Response>;
  /** delete single row from the table: "projects_features" */
  delete_projects_features_by_pk?: Maybe<Projects_Features>;
  /** delete data from the table: "projects_features_private" */
  delete_projects_features_private?: Maybe<Projects_Features_Private_Mutation_Response>;
  /** delete data from the table: "projects_metadata" */
  delete_projects_metadata?: Maybe<Projects_Metadata_Mutation_Response>;
  /** delete single row from the table: "projects_metadata" */
  delete_projects_metadata_by_pk?: Maybe<Projects_Metadata>;
  /** delete data from the table: "proposed_artist_addresses_and_splits" */
  delete_proposed_artist_addresses_and_splits?: Maybe<Proposed_Artist_Addresses_And_Splits_Mutation_Response>;
  /** delete single row from the table: "proposed_artist_addresses_and_splits" */
  delete_proposed_artist_addresses_and_splits_by_pk?: Maybe<Proposed_Artist_Addresses_And_Splits>;
  /** delete data from the table: "receipt_metadata" */
  delete_receipt_metadata?: Maybe<Receipt_Metadata_Mutation_Response>;
  /** delete single row from the table: "receipt_metadata" */
  delete_receipt_metadata_by_pk?: Maybe<Receipt_Metadata>;
  /** delete data from the table: "screenings" */
  delete_screenings?: Maybe<Screenings_Mutation_Response>;
  /** delete single row from the table: "screenings" */
  delete_screenings_by_pk?: Maybe<Screenings>;
  /** delete data from the table: "sync_status" */
  delete_sync_status?: Maybe<Sync_Status_Mutation_Response>;
  /** delete single row from the table: "sync_status" */
  delete_sync_status_by_pk?: Maybe<Sync_Status>;
  /** delete data from the table: "tag_groupings" */
  delete_tag_groupings?: Maybe<Tag_Groupings_Mutation_Response>;
  /** delete single row from the table: "tag_groupings" */
  delete_tag_groupings_by_pk?: Maybe<Tag_Groupings>;
  /** delete data from the table: "tag_status" */
  delete_tag_status?: Maybe<Tag_Status_Mutation_Response>;
  /** delete single row from the table: "tag_status" */
  delete_tag_status_by_pk?: Maybe<Tag_Status>;
  /** delete data from the table: "tag_types" */
  delete_tag_types?: Maybe<Tag_Types_Mutation_Response>;
  /** delete single row from the table: "tag_types" */
  delete_tag_types_by_pk?: Maybe<Tag_Types>;
  /** delete data from the table: "tags" */
  delete_tags?: Maybe<Tags_Mutation_Response>;
  /** delete single row from the table: "tags" */
  delete_tags_by_pk?: Maybe<Tags>;
  /** delete data from the table: "terms_of_service" */
  delete_terms_of_service?: Maybe<Terms_Of_Service_Mutation_Response>;
  /** delete single row from the table: "terms_of_service" */
  delete_terms_of_service_by_pk?: Maybe<Terms_Of_Service>;
  /** delete data from the table: "tokens_metadata" */
  delete_tokens_metadata?: Maybe<Tokens_Metadata_Mutation_Response>;
  /** delete single row from the table: "tokens_metadata" */
  delete_tokens_metadata_by_pk?: Maybe<Tokens_Metadata>;
  /** delete data from the table: "user_profiles" */
  delete_user_profiles?: Maybe<User_Profiles_Mutation_Response>;
  /** delete single row from the table: "user_profiles" */
  delete_user_profiles_by_pk?: Maybe<User_Profiles>;
  /** delete data from the table: "users" */
  delete_users?: Maybe<Users_Mutation_Response>;
  /** delete single row from the table: "users" */
  delete_users_by_pk?: Maybe<Users>;
  /** delete data from the table: "verticals" */
  delete_verticals?: Maybe<Verticals_Mutation_Response>;
  /** delete single row from the table: "verticals" */
  delete_verticals_by_pk?: Maybe<Verticals>;
  /** delete data from the table: "webflow_artist_info" */
  delete_webflow_artist_info?: Maybe<Webflow_Artist_Info_Mutation_Response>;
  /** delete single row from the table: "webflow_artist_info" */
  delete_webflow_artist_info_by_pk?: Maybe<Webflow_Artist_Info>;
  /** delete data from the table: "webflow_spectrum_articles" */
  delete_webflow_spectrum_articles?: Maybe<Webflow_Spectrum_Articles_Mutation_Response>;
  /** delete single row from the table: "webflow_spectrum_articles" */
  delete_webflow_spectrum_articles_by_pk?: Maybe<Webflow_Spectrum_Articles>;
  /** insert data into the table: "categories" */
  insert_categories?: Maybe<Categories_Mutation_Response>;
  /** insert a single row into the table: "categories" */
  insert_categories_one?: Maybe<Categories>;
  /** insert data into the table: "contract_allowlistings" */
  insert_contract_allowlistings?: Maybe<Contract_Allowlistings_Mutation_Response>;
  /** insert a single row into the table: "contract_allowlistings" */
  insert_contract_allowlistings_one?: Maybe<Contract_Allowlistings>;
  /** insert data into the table: "contract_type_names" */
  insert_contract_type_names?: Maybe<Contract_Type_Names_Mutation_Response>;
  /** insert a single row into the table: "contract_type_names" */
  insert_contract_type_names_one?: Maybe<Contract_Type_Names>;
  /** insert data into the table: "contract_types" */
  insert_contract_types?: Maybe<Contract_Types_Mutation_Response>;
  /** insert a single row into the table: "contract_types" */
  insert_contract_types_one?: Maybe<Contract_Types>;
  /** insert data into the table: "contracts_metadata" */
  insert_contracts_metadata?: Maybe<Contracts_Metadata_Mutation_Response>;
  /** insert a single row into the table: "contracts_metadata" */
  insert_contracts_metadata_one?: Maybe<Contracts_Metadata>;
  /** insert data into the table: "curation_statuses" */
  insert_curation_statuses?: Maybe<Curation_Statuses_Mutation_Response>;
  /** insert a single row into the table: "curation_statuses" */
  insert_curation_statuses_one?: Maybe<Curation_Statuses>;
  /** insert data into the table: "dependencies_metadata" */
  insert_dependencies_metadata?: Maybe<Dependencies_Metadata_Mutation_Response>;
  /** insert a single row into the table: "dependencies_metadata" */
  insert_dependencies_metadata_one?: Maybe<Dependencies_Metadata>;
  /** insert data into the table: "dependency_additional_cdns" */
  insert_dependency_additional_cdns?: Maybe<Dependency_Additional_Cdns_Mutation_Response>;
  /** insert a single row into the table: "dependency_additional_cdns" */
  insert_dependency_additional_cdns_one?: Maybe<Dependency_Additional_Cdns>;
  /** insert data into the table: "dependency_additional_repositories" */
  insert_dependency_additional_repositories?: Maybe<Dependency_Additional_Repositories_Mutation_Response>;
  /** insert a single row into the table: "dependency_additional_repositories" */
  insert_dependency_additional_repositories_one?: Maybe<Dependency_Additional_Repositories>;
  /** insert data into the table: "dependency_registries" */
  insert_dependency_registries?: Maybe<Dependency_Registries_Mutation_Response>;
  /** insert a single row into the table: "dependency_registries" */
  insert_dependency_registries_one?: Maybe<Dependency_Registries>;
  /** insert data into the table: "dependency_scripts" */
  insert_dependency_scripts?: Maybe<Dependency_Scripts_Mutation_Response>;
  /** insert a single row into the table: "dependency_scripts" */
  insert_dependency_scripts_one?: Maybe<Dependency_Scripts>;
  /** insert data into the table: "entity_tags" */
  insert_entity_tags?: Maybe<Entity_Tags_Mutation_Response>;
  /** insert a single row into the table: "entity_tags" */
  insert_entity_tags_one?: Maybe<Entity_Tags>;
  /** insert data into the table: "favorites" */
  insert_favorites?: Maybe<Favorites_Mutation_Response>;
  /** insert a single row into the table: "favorites" */
  insert_favorites_one?: Maybe<Favorites>;
  /** insert data into the table: "feature_field_values_counts" */
  insert_feature_field_values_counts?: Maybe<Feature_Field_Values_Counts_Mutation_Response>;
  /** insert a single row into the table: "feature_field_values_counts" */
  insert_feature_field_values_counts_one?: Maybe<Feature_Field_Values_Counts>;
  /** insert data into the table: "feature_flags" */
  insert_feature_flags?: Maybe<Feature_Flags_Mutation_Response>;
  /** insert a single row into the table: "feature_flags" */
  insert_feature_flags_one?: Maybe<Feature_Flags>;
  /** insert data into the table: "media" */
  insert_media?: Maybe<Media_Mutation_Response>;
  /** insert a single row into the table: "media" */
  insert_media_one?: Maybe<Media>;
  /** insert data into the table: "minter_filters_metadata" */
  insert_minter_filters_metadata?: Maybe<Minter_Filters_Metadata_Mutation_Response>;
  /** insert a single row into the table: "minter_filters_metadata" */
  insert_minter_filters_metadata_one?: Maybe<Minter_Filters_Metadata>;
  /** insert data into the table: "minter_type_names" */
  insert_minter_type_names?: Maybe<Minter_Type_Names_Mutation_Response>;
  /** insert a single row into the table: "minter_type_names" */
  insert_minter_type_names_one?: Maybe<Minter_Type_Names>;
  /** insert data into the table: "minter_types" */
  insert_minter_types?: Maybe<Minter_Types_Mutation_Response>;
  /** insert a single row into the table: "minter_types" */
  insert_minter_types_one?: Maybe<Minter_Types>;
  /** insert data into the table: "minters_metadata" */
  insert_minters_metadata?: Maybe<Minters_Metadata_Mutation_Response>;
  /** insert a single row into the table: "minters_metadata" */
  insert_minters_metadata_one?: Maybe<Minters_Metadata>;
  /** insert data into the table: "notifications" */
  insert_notifications?: Maybe<Notifications_Mutation_Response>;
  /** insert a single row into the table: "notifications" */
  insert_notifications_one?: Maybe<Notifications>;
  /** insert data into the table: "project_external_asset_dependencies" */
  insert_project_external_asset_dependencies?: Maybe<Project_External_Asset_Dependencies_Mutation_Response>;
  /** insert a single row into the table: "project_external_asset_dependencies" */
  insert_project_external_asset_dependencies_one?: Maybe<Project_External_Asset_Dependencies>;
  /** insert data into the table: "project_external_asset_dependency_types" */
  insert_project_external_asset_dependency_types?: Maybe<Project_External_Asset_Dependency_Types_Mutation_Response>;
  /** insert a single row into the table: "project_external_asset_dependency_types" */
  insert_project_external_asset_dependency_types_one?: Maybe<Project_External_Asset_Dependency_Types>;
  /** insert data into the table: "project_minter_configurations" */
  insert_project_minter_configurations?: Maybe<Project_Minter_Configurations_Mutation_Response>;
  /** insert a single row into the table: "project_minter_configurations" */
  insert_project_minter_configurations_one?: Maybe<Project_Minter_Configurations>;
  /** insert data into the table: "project_scripts" */
  insert_project_scripts?: Maybe<Project_Scripts_Mutation_Response>;
  /** insert a single row into the table: "project_scripts" */
  insert_project_scripts_one?: Maybe<Project_Scripts>;
  /** insert data into the table: "project_series" */
  insert_project_series?: Maybe<Project_Series_Mutation_Response>;
  /** insert a single row into the table: "project_series" */
  insert_project_series_one?: Maybe<Project_Series>;
  /** insert data into the table: "project_vertical_categories" */
  insert_project_vertical_categories?: Maybe<Project_Vertical_Categories_Mutation_Response>;
  /** insert a single row into the table: "project_vertical_categories" */
  insert_project_vertical_categories_one?: Maybe<Project_Vertical_Categories>;
  /** insert data into the table: "project_verticals" */
  insert_project_verticals?: Maybe<Project_Verticals_Mutation_Response>;
  /** insert a single row into the table: "project_verticals" */
  insert_project_verticals_one?: Maybe<Project_Verticals>;
  /** insert data into the table: "projects_features" */
  insert_projects_features?: Maybe<Projects_Features_Mutation_Response>;
  /** insert a single row into the table: "projects_features" */
  insert_projects_features_one?: Maybe<Projects_Features>;
  /** insert data into the table: "projects_features_private" */
  insert_projects_features_private?: Maybe<Projects_Features_Private_Mutation_Response>;
  /** insert a single row into the table: "projects_features_private" */
  insert_projects_features_private_one?: Maybe<Projects_Features_Private>;
  /** insert data into the table: "projects_metadata" */
  insert_projects_metadata?: Maybe<Projects_Metadata_Mutation_Response>;
  /** insert a single row into the table: "projects_metadata" */
  insert_projects_metadata_one?: Maybe<Projects_Metadata>;
  /** insert data into the table: "proposed_artist_addresses_and_splits" */
  insert_proposed_artist_addresses_and_splits?: Maybe<Proposed_Artist_Addresses_And_Splits_Mutation_Response>;
  /** insert a single row into the table: "proposed_artist_addresses_and_splits" */
  insert_proposed_artist_addresses_and_splits_one?: Maybe<Proposed_Artist_Addresses_And_Splits>;
  /** insert data into the table: "receipt_metadata" */
  insert_receipt_metadata?: Maybe<Receipt_Metadata_Mutation_Response>;
  /** insert a single row into the table: "receipt_metadata" */
  insert_receipt_metadata_one?: Maybe<Receipt_Metadata>;
  /** insert data into the table: "screenings" */
  insert_screenings?: Maybe<Screenings_Mutation_Response>;
  /** insert a single row into the table: "screenings" */
  insert_screenings_one?: Maybe<Screenings>;
  /** insert data into the table: "sync_status" */
  insert_sync_status?: Maybe<Sync_Status_Mutation_Response>;
  /** insert a single row into the table: "sync_status" */
  insert_sync_status_one?: Maybe<Sync_Status>;
  /** insert data into the table: "tag_groupings" */
  insert_tag_groupings?: Maybe<Tag_Groupings_Mutation_Response>;
  /** insert a single row into the table: "tag_groupings" */
  insert_tag_groupings_one?: Maybe<Tag_Groupings>;
  /** insert data into the table: "tag_status" */
  insert_tag_status?: Maybe<Tag_Status_Mutation_Response>;
  /** insert a single row into the table: "tag_status" */
  insert_tag_status_one?: Maybe<Tag_Status>;
  /** insert data into the table: "tag_types" */
  insert_tag_types?: Maybe<Tag_Types_Mutation_Response>;
  /** insert a single row into the table: "tag_types" */
  insert_tag_types_one?: Maybe<Tag_Types>;
  /** insert data into the table: "tags" */
  insert_tags?: Maybe<Tags_Mutation_Response>;
  /** insert a single row into the table: "tags" */
  insert_tags_one?: Maybe<Tags>;
  /** insert data into the table: "terms_of_service" */
  insert_terms_of_service?: Maybe<Terms_Of_Service_Mutation_Response>;
  /** insert a single row into the table: "terms_of_service" */
  insert_terms_of_service_one?: Maybe<Terms_Of_Service>;
  /** insert data into the table: "tokens_metadata" */
  insert_tokens_metadata?: Maybe<Tokens_Metadata_Mutation_Response>;
  /** insert a single row into the table: "tokens_metadata" */
  insert_tokens_metadata_one?: Maybe<Tokens_Metadata>;
  /** insert data into the table: "user_profiles" */
  insert_user_profiles?: Maybe<User_Profiles_Mutation_Response>;
  /** insert a single row into the table: "user_profiles" */
  insert_user_profiles_one?: Maybe<User_Profiles>;
  /** insert data into the table: "users" */
  insert_users?: Maybe<Users_Mutation_Response>;
  /** insert a single row into the table: "users" */
  insert_users_one?: Maybe<Users>;
  /** insert data into the table: "verticals" */
  insert_verticals?: Maybe<Verticals_Mutation_Response>;
  /** insert a single row into the table: "verticals" */
  insert_verticals_one?: Maybe<Verticals>;
  /** insert data into the table: "webflow_artist_info" */
  insert_webflow_artist_info?: Maybe<Webflow_Artist_Info_Mutation_Response>;
  /** insert a single row into the table: "webflow_artist_info" */
  insert_webflow_artist_info_one?: Maybe<Webflow_Artist_Info>;
  /** insert data into the table: "webflow_spectrum_articles" */
  insert_webflow_spectrum_articles?: Maybe<Webflow_Spectrum_Articles_Mutation_Response>;
  /** insert a single row into the table: "webflow_spectrum_articles" */
  insert_webflow_spectrum_articles_one?: Maybe<Webflow_Spectrum_Articles>;
  updateFeatures?: Maybe<UpdateFeaturesScriptOutput>;
  updateProjectMedia?: Maybe<UpdateProjectMediaScriptOutput>;
  updateTokenMedia?: Maybe<UpdateTokenMediaScriptOutput>;
  /** update data of the table: "categories" */
  update_categories?: Maybe<Categories_Mutation_Response>;
  /** update single row of the table: "categories" */
  update_categories_by_pk?: Maybe<Categories>;
  /** update multiples rows of table: "categories" */
  update_categories_many?: Maybe<Array<Maybe<Categories_Mutation_Response>>>;
  /** update data of the table: "contract_allowlistings" */
  update_contract_allowlistings?: Maybe<Contract_Allowlistings_Mutation_Response>;
  /** update single row of the table: "contract_allowlistings" */
  update_contract_allowlistings_by_pk?: Maybe<Contract_Allowlistings>;
  /** update multiples rows of table: "contract_allowlistings" */
  update_contract_allowlistings_many?: Maybe<Array<Maybe<Contract_Allowlistings_Mutation_Response>>>;
  /** update data of the table: "contract_type_names" */
  update_contract_type_names?: Maybe<Contract_Type_Names_Mutation_Response>;
  /** update single row of the table: "contract_type_names" */
  update_contract_type_names_by_pk?: Maybe<Contract_Type_Names>;
  /** update multiples rows of table: "contract_type_names" */
  update_contract_type_names_many?: Maybe<Array<Maybe<Contract_Type_Names_Mutation_Response>>>;
  /** update data of the table: "contract_types" */
  update_contract_types?: Maybe<Contract_Types_Mutation_Response>;
  /** update single row of the table: "contract_types" */
  update_contract_types_by_pk?: Maybe<Contract_Types>;
  /** update multiples rows of table: "contract_types" */
  update_contract_types_many?: Maybe<Array<Maybe<Contract_Types_Mutation_Response>>>;
  /** update data of the table: "contracts_metadata" */
  update_contracts_metadata?: Maybe<Contracts_Metadata_Mutation_Response>;
  /** update single row of the table: "contracts_metadata" */
  update_contracts_metadata_by_pk?: Maybe<Contracts_Metadata>;
  /** update multiples rows of table: "contracts_metadata" */
  update_contracts_metadata_many?: Maybe<Array<Maybe<Contracts_Metadata_Mutation_Response>>>;
  /** update data of the table: "curation_statuses" */
  update_curation_statuses?: Maybe<Curation_Statuses_Mutation_Response>;
  /** update single row of the table: "curation_statuses" */
  update_curation_statuses_by_pk?: Maybe<Curation_Statuses>;
  /** update multiples rows of table: "curation_statuses" */
  update_curation_statuses_many?: Maybe<Array<Maybe<Curation_Statuses_Mutation_Response>>>;
  /** update data of the table: "dependencies_metadata" */
  update_dependencies_metadata?: Maybe<Dependencies_Metadata_Mutation_Response>;
  /** update single row of the table: "dependencies_metadata" */
  update_dependencies_metadata_by_pk?: Maybe<Dependencies_Metadata>;
  /** update multiples rows of table: "dependencies_metadata" */
  update_dependencies_metadata_many?: Maybe<Array<Maybe<Dependencies_Metadata_Mutation_Response>>>;
  /** update data of the table: "dependency_additional_cdns" */
  update_dependency_additional_cdns?: Maybe<Dependency_Additional_Cdns_Mutation_Response>;
  /** update single row of the table: "dependency_additional_cdns" */
  update_dependency_additional_cdns_by_pk?: Maybe<Dependency_Additional_Cdns>;
  /** update multiples rows of table: "dependency_additional_cdns" */
  update_dependency_additional_cdns_many?: Maybe<Array<Maybe<Dependency_Additional_Cdns_Mutation_Response>>>;
  /** update data of the table: "dependency_additional_repositories" */
  update_dependency_additional_repositories?: Maybe<Dependency_Additional_Repositories_Mutation_Response>;
  /** update single row of the table: "dependency_additional_repositories" */
  update_dependency_additional_repositories_by_pk?: Maybe<Dependency_Additional_Repositories>;
  /** update multiples rows of table: "dependency_additional_repositories" */
  update_dependency_additional_repositories_many?: Maybe<Array<Maybe<Dependency_Additional_Repositories_Mutation_Response>>>;
  /** update data of the table: "dependency_registries" */
  update_dependency_registries?: Maybe<Dependency_Registries_Mutation_Response>;
  /** update single row of the table: "dependency_registries" */
  update_dependency_registries_by_pk?: Maybe<Dependency_Registries>;
  /** update multiples rows of table: "dependency_registries" */
  update_dependency_registries_many?: Maybe<Array<Maybe<Dependency_Registries_Mutation_Response>>>;
  /** update data of the table: "dependency_scripts" */
  update_dependency_scripts?: Maybe<Dependency_Scripts_Mutation_Response>;
  /** update single row of the table: "dependency_scripts" */
  update_dependency_scripts_by_pk?: Maybe<Dependency_Scripts>;
  /** update multiples rows of table: "dependency_scripts" */
  update_dependency_scripts_many?: Maybe<Array<Maybe<Dependency_Scripts_Mutation_Response>>>;
  /** update data of the table: "entity_tags" */
  update_entity_tags?: Maybe<Entity_Tags_Mutation_Response>;
  /** update single row of the table: "entity_tags" */
  update_entity_tags_by_pk?: Maybe<Entity_Tags>;
  /** update multiples rows of table: "entity_tags" */
  update_entity_tags_many?: Maybe<Array<Maybe<Entity_Tags_Mutation_Response>>>;
  /** update data of the table: "favorites" */
  update_favorites?: Maybe<Favorites_Mutation_Response>;
  /** update single row of the table: "favorites" */
  update_favorites_by_pk?: Maybe<Favorites>;
  /** update multiples rows of table: "favorites" */
  update_favorites_many?: Maybe<Array<Maybe<Favorites_Mutation_Response>>>;
  /** update data of the table: "feature_field_values_counts" */
  update_feature_field_values_counts?: Maybe<Feature_Field_Values_Counts_Mutation_Response>;
  /** update multiples rows of table: "feature_field_values_counts" */
  update_feature_field_values_counts_many?: Maybe<Array<Maybe<Feature_Field_Values_Counts_Mutation_Response>>>;
  /** update data of the table: "feature_flags" */
  update_feature_flags?: Maybe<Feature_Flags_Mutation_Response>;
  /** update single row of the table: "feature_flags" */
  update_feature_flags_by_pk?: Maybe<Feature_Flags>;
  /** update multiples rows of table: "feature_flags" */
  update_feature_flags_many?: Maybe<Array<Maybe<Feature_Flags_Mutation_Response>>>;
  /** update data of the table: "media" */
  update_media?: Maybe<Media_Mutation_Response>;
  /** update single row of the table: "media" */
  update_media_by_pk?: Maybe<Media>;
  /** update multiples rows of table: "media" */
  update_media_many?: Maybe<Array<Maybe<Media_Mutation_Response>>>;
  /** update data of the table: "minter_filters_metadata" */
  update_minter_filters_metadata?: Maybe<Minter_Filters_Metadata_Mutation_Response>;
  /** update single row of the table: "minter_filters_metadata" */
  update_minter_filters_metadata_by_pk?: Maybe<Minter_Filters_Metadata>;
  /** update multiples rows of table: "minter_filters_metadata" */
  update_minter_filters_metadata_many?: Maybe<Array<Maybe<Minter_Filters_Metadata_Mutation_Response>>>;
  /** update data of the table: "minter_type_names" */
  update_minter_type_names?: Maybe<Minter_Type_Names_Mutation_Response>;
  /** update single row of the table: "minter_type_names" */
  update_minter_type_names_by_pk?: Maybe<Minter_Type_Names>;
  /** update multiples rows of table: "minter_type_names" */
  update_minter_type_names_many?: Maybe<Array<Maybe<Minter_Type_Names_Mutation_Response>>>;
  /** update data of the table: "minter_types" */
  update_minter_types?: Maybe<Minter_Types_Mutation_Response>;
  /** update single row of the table: "minter_types" */
  update_minter_types_by_pk?: Maybe<Minter_Types>;
  /** update multiples rows of table: "minter_types" */
  update_minter_types_many?: Maybe<Array<Maybe<Minter_Types_Mutation_Response>>>;
  /** update data of the table: "minters_metadata" */
  update_minters_metadata?: Maybe<Minters_Metadata_Mutation_Response>;
  /** update single row of the table: "minters_metadata" */
  update_minters_metadata_by_pk?: Maybe<Minters_Metadata>;
  /** update multiples rows of table: "minters_metadata" */
  update_minters_metadata_many?: Maybe<Array<Maybe<Minters_Metadata_Mutation_Response>>>;
  /** update data of the table: "notifications" */
  update_notifications?: Maybe<Notifications_Mutation_Response>;
  /** update single row of the table: "notifications" */
  update_notifications_by_pk?: Maybe<Notifications>;
  /** update multiples rows of table: "notifications" */
  update_notifications_many?: Maybe<Array<Maybe<Notifications_Mutation_Response>>>;
  /** update data of the table: "project_external_asset_dependencies" */
  update_project_external_asset_dependencies?: Maybe<Project_External_Asset_Dependencies_Mutation_Response>;
  /** update single row of the table: "project_external_asset_dependencies" */
  update_project_external_asset_dependencies_by_pk?: Maybe<Project_External_Asset_Dependencies>;
  /** update multiples rows of table: "project_external_asset_dependencies" */
  update_project_external_asset_dependencies_many?: Maybe<Array<Maybe<Project_External_Asset_Dependencies_Mutation_Response>>>;
  /** update data of the table: "project_external_asset_dependency_types" */
  update_project_external_asset_dependency_types?: Maybe<Project_External_Asset_Dependency_Types_Mutation_Response>;
  /** update single row of the table: "project_external_asset_dependency_types" */
  update_project_external_asset_dependency_types_by_pk?: Maybe<Project_External_Asset_Dependency_Types>;
  /** update multiples rows of table: "project_external_asset_dependency_types" */
  update_project_external_asset_dependency_types_many?: Maybe<Array<Maybe<Project_External_Asset_Dependency_Types_Mutation_Response>>>;
  /** update data of the table: "project_minter_configurations" */
  update_project_minter_configurations?: Maybe<Project_Minter_Configurations_Mutation_Response>;
  /** update single row of the table: "project_minter_configurations" */
  update_project_minter_configurations_by_pk?: Maybe<Project_Minter_Configurations>;
  /** update multiples rows of table: "project_minter_configurations" */
  update_project_minter_configurations_many?: Maybe<Array<Maybe<Project_Minter_Configurations_Mutation_Response>>>;
  /** update data of the table: "project_scripts" */
  update_project_scripts?: Maybe<Project_Scripts_Mutation_Response>;
  /** update single row of the table: "project_scripts" */
  update_project_scripts_by_pk?: Maybe<Project_Scripts>;
  /** update multiples rows of table: "project_scripts" */
  update_project_scripts_many?: Maybe<Array<Maybe<Project_Scripts_Mutation_Response>>>;
  /** update data of the table: "project_series" */
  update_project_series?: Maybe<Project_Series_Mutation_Response>;
  /** update single row of the table: "project_series" */
  update_project_series_by_pk?: Maybe<Project_Series>;
  /** update multiples rows of table: "project_series" */
  update_project_series_many?: Maybe<Array<Maybe<Project_Series_Mutation_Response>>>;
  /** update data of the table: "project_vertical_categories" */
  update_project_vertical_categories?: Maybe<Project_Vertical_Categories_Mutation_Response>;
  /** update single row of the table: "project_vertical_categories" */
  update_project_vertical_categories_by_pk?: Maybe<Project_Vertical_Categories>;
  /** update multiples rows of table: "project_vertical_categories" */
  update_project_vertical_categories_many?: Maybe<Array<Maybe<Project_Vertical_Categories_Mutation_Response>>>;
  /** update data of the table: "project_verticals" */
  update_project_verticals?: Maybe<Project_Verticals_Mutation_Response>;
  /** update single row of the table: "project_verticals" */
  update_project_verticals_by_pk?: Maybe<Project_Verticals>;
  /** update multiples rows of table: "project_verticals" */
  update_project_verticals_many?: Maybe<Array<Maybe<Project_Verticals_Mutation_Response>>>;
  /** update data of the table: "projects_features" */
  update_projects_features?: Maybe<Projects_Features_Mutation_Response>;
  /** update single row of the table: "projects_features" */
  update_projects_features_by_pk?: Maybe<Projects_Features>;
  /** update multiples rows of table: "projects_features" */
  update_projects_features_many?: Maybe<Array<Maybe<Projects_Features_Mutation_Response>>>;
  /** update data of the table: "projects_features_private" */
  update_projects_features_private?: Maybe<Projects_Features_Private_Mutation_Response>;
  /** update multiples rows of table: "projects_features_private" */
  update_projects_features_private_many?: Maybe<Array<Maybe<Projects_Features_Private_Mutation_Response>>>;
  /** update data of the table: "projects_metadata" */
  update_projects_metadata?: Maybe<Projects_Metadata_Mutation_Response>;
  /** update single row of the table: "projects_metadata" */
  update_projects_metadata_by_pk?: Maybe<Projects_Metadata>;
  /** update multiples rows of table: "projects_metadata" */
  update_projects_metadata_many?: Maybe<Array<Maybe<Projects_Metadata_Mutation_Response>>>;
  /** update data of the table: "proposed_artist_addresses_and_splits" */
  update_proposed_artist_addresses_and_splits?: Maybe<Proposed_Artist_Addresses_And_Splits_Mutation_Response>;
  /** update single row of the table: "proposed_artist_addresses_and_splits" */
  update_proposed_artist_addresses_and_splits_by_pk?: Maybe<Proposed_Artist_Addresses_And_Splits>;
  /** update multiples rows of table: "proposed_artist_addresses_and_splits" */
  update_proposed_artist_addresses_and_splits_many?: Maybe<Array<Maybe<Proposed_Artist_Addresses_And_Splits_Mutation_Response>>>;
  /** update data of the table: "receipt_metadata" */
  update_receipt_metadata?: Maybe<Receipt_Metadata_Mutation_Response>;
  /** update single row of the table: "receipt_metadata" */
  update_receipt_metadata_by_pk?: Maybe<Receipt_Metadata>;
  /** update multiples rows of table: "receipt_metadata" */
  update_receipt_metadata_many?: Maybe<Array<Maybe<Receipt_Metadata_Mutation_Response>>>;
  /** update data of the table: "screenings" */
  update_screenings?: Maybe<Screenings_Mutation_Response>;
  /** update single row of the table: "screenings" */
  update_screenings_by_pk?: Maybe<Screenings>;
  /** update multiples rows of table: "screenings" */
  update_screenings_many?: Maybe<Array<Maybe<Screenings_Mutation_Response>>>;
  /** update data of the table: "sync_status" */
  update_sync_status?: Maybe<Sync_Status_Mutation_Response>;
  /** update single row of the table: "sync_status" */
  update_sync_status_by_pk?: Maybe<Sync_Status>;
  /** update multiples rows of table: "sync_status" */
  update_sync_status_many?: Maybe<Array<Maybe<Sync_Status_Mutation_Response>>>;
  /** update data of the table: "tag_groupings" */
  update_tag_groupings?: Maybe<Tag_Groupings_Mutation_Response>;
  /** update single row of the table: "tag_groupings" */
  update_tag_groupings_by_pk?: Maybe<Tag_Groupings>;
  /** update multiples rows of table: "tag_groupings" */
  update_tag_groupings_many?: Maybe<Array<Maybe<Tag_Groupings_Mutation_Response>>>;
  /** update data of the table: "tag_status" */
  update_tag_status?: Maybe<Tag_Status_Mutation_Response>;
  /** update single row of the table: "tag_status" */
  update_tag_status_by_pk?: Maybe<Tag_Status>;
  /** update multiples rows of table: "tag_status" */
  update_tag_status_many?: Maybe<Array<Maybe<Tag_Status_Mutation_Response>>>;
  /** update data of the table: "tag_types" */
  update_tag_types?: Maybe<Tag_Types_Mutation_Response>;
  /** update single row of the table: "tag_types" */
  update_tag_types_by_pk?: Maybe<Tag_Types>;
  /** update multiples rows of table: "tag_types" */
  update_tag_types_many?: Maybe<Array<Maybe<Tag_Types_Mutation_Response>>>;
  /** update data of the table: "tags" */
  update_tags?: Maybe<Tags_Mutation_Response>;
  /** update single row of the table: "tags" */
  update_tags_by_pk?: Maybe<Tags>;
  /** update multiples rows of table: "tags" */
  update_tags_many?: Maybe<Array<Maybe<Tags_Mutation_Response>>>;
  /** update data of the table: "terms_of_service" */
  update_terms_of_service?: Maybe<Terms_Of_Service_Mutation_Response>;
  /** update single row of the table: "terms_of_service" */
  update_terms_of_service_by_pk?: Maybe<Terms_Of_Service>;
  /** update multiples rows of table: "terms_of_service" */
  update_terms_of_service_many?: Maybe<Array<Maybe<Terms_Of_Service_Mutation_Response>>>;
  /** update data of the table: "tokens_metadata" */
  update_tokens_metadata?: Maybe<Tokens_Metadata_Mutation_Response>;
  /** update single row of the table: "tokens_metadata" */
  update_tokens_metadata_by_pk?: Maybe<Tokens_Metadata>;
  /** update multiples rows of table: "tokens_metadata" */
  update_tokens_metadata_many?: Maybe<Array<Maybe<Tokens_Metadata_Mutation_Response>>>;
  /** update data of the table: "user_profiles" */
  update_user_profiles?: Maybe<User_Profiles_Mutation_Response>;
  /** update single row of the table: "user_profiles" */
  update_user_profiles_by_pk?: Maybe<User_Profiles>;
  /** update multiples rows of table: "user_profiles" */
  update_user_profiles_many?: Maybe<Array<Maybe<User_Profiles_Mutation_Response>>>;
  /** update data of the table: "users" */
  update_users?: Maybe<Users_Mutation_Response>;
  /** update single row of the table: "users" */
  update_users_by_pk?: Maybe<Users>;
  /** update multiples rows of table: "users" */
  update_users_many?: Maybe<Array<Maybe<Users_Mutation_Response>>>;
  /** update data of the table: "verticals" */
  update_verticals?: Maybe<Verticals_Mutation_Response>;
  /** update single row of the table: "verticals" */
  update_verticals_by_pk?: Maybe<Verticals>;
  /** update multiples rows of table: "verticals" */
  update_verticals_many?: Maybe<Array<Maybe<Verticals_Mutation_Response>>>;
  /** update data of the table: "webflow_artist_info" */
  update_webflow_artist_info?: Maybe<Webflow_Artist_Info_Mutation_Response>;
  /** update single row of the table: "webflow_artist_info" */
  update_webflow_artist_info_by_pk?: Maybe<Webflow_Artist_Info>;
  /** update multiples rows of table: "webflow_artist_info" */
  update_webflow_artist_info_many?: Maybe<Array<Maybe<Webflow_Artist_Info_Mutation_Response>>>;
  /** update data of the table: "webflow_spectrum_articles" */
  update_webflow_spectrum_articles?: Maybe<Webflow_Spectrum_Articles_Mutation_Response>;
  /** update single row of the table: "webflow_spectrum_articles" */
  update_webflow_spectrum_articles_by_pk?: Maybe<Webflow_Spectrum_Articles>;
  /** update multiples rows of table: "webflow_spectrum_articles" */
  update_webflow_spectrum_articles_many?: Maybe<Array<Maybe<Webflow_Spectrum_Articles_Mutation_Response>>>;
};


/** mutation root */
export type Mutation_RootAuthenticateArgs = {
  input: AuthenticateInput;
};


/** mutation root */
export type Mutation_RootCreateApplicationArgs = {
  formData?: InputMaybe<CreateApplicationInput>;
};


/** mutation root */
export type Mutation_RootDelete_CategoriesArgs = {
  where: Categories_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Categories_By_PkArgs = {
  name: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Contract_AllowlistingsArgs = {
  where: Contract_Allowlistings_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Contract_Allowlistings_By_PkArgs = {
  contract_address: Scalars['String'];
  user_address: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Contract_Type_NamesArgs = {
  where: Contract_Type_Names_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Contract_Type_Names_By_PkArgs = {
  name: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Contract_TypesArgs = {
  where: Contract_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Contract_Types_By_PkArgs = {
  type: Contract_Type_Names_Enum;
};


/** mutation root */
export type Mutation_RootDelete_Contracts_MetadataArgs = {
  where: Contracts_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Contracts_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Curation_StatusesArgs = {
  where: Curation_Statuses_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Curation_Statuses_By_PkArgs = {
  value: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Dependencies_MetadataArgs = {
  where: Dependencies_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Dependencies_Metadata_By_PkArgs = {
  type_and_version: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Dependency_Additional_CdnsArgs = {
  where: Dependency_Additional_Cdns_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Dependency_Additional_Cdns_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Dependency_Additional_RepositoriesArgs = {
  where: Dependency_Additional_Repositories_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Dependency_Additional_Repositories_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Dependency_RegistriesArgs = {
  where: Dependency_Registries_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Dependency_Registries_By_PkArgs = {
  address: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Dependency_ScriptsArgs = {
  where: Dependency_Scripts_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Dependency_Scripts_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Entity_TagsArgs = {
  where: Entity_Tags_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Entity_Tags_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_FavoritesArgs = {
  where: Favorites_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Favorites_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Feature_Field_Values_CountsArgs = {
  where: Feature_Field_Values_Counts_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Feature_FlagsArgs = {
  where: Feature_Flags_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Feature_Flags_By_PkArgs = {
  flag_name: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_MediaArgs = {
  where: Media_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Media_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Minter_Filters_MetadataArgs = {
  where: Minter_Filters_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Minter_Filters_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Minter_Type_NamesArgs = {
  where: Minter_Type_Names_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Minter_Type_Names_By_PkArgs = {
  name: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Minter_TypesArgs = {
  where: Minter_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Minter_Types_By_PkArgs = {
  type: Minter_Type_Names_Enum;
};


/** mutation root */
export type Mutation_RootDelete_Minters_MetadataArgs = {
  where: Minters_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Minters_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_NotificationsArgs = {
  where: Notifications_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Notifications_By_PkArgs = {
  trigger_key: Scalars['String'];
  trigger_time: Scalars['timestamptz'];
  user_address: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Project_External_Asset_DependenciesArgs = {
  where: Project_External_Asset_Dependencies_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Project_External_Asset_Dependencies_By_PkArgs = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Project_External_Asset_Dependency_TypesArgs = {
  where: Project_External_Asset_Dependency_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Project_External_Asset_Dependency_Types_By_PkArgs = {
  type: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Project_Minter_ConfigurationsArgs = {
  where: Project_Minter_Configurations_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Project_Minter_Configurations_By_PkArgs = {
  id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Project_ScriptsArgs = {
  where: Project_Scripts_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Project_Scripts_By_PkArgs = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Project_SeriesArgs = {
  where: Project_Series_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Project_Series_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Project_Vertical_CategoriesArgs = {
  where: Project_Vertical_Categories_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Project_Vertical_Categories_By_PkArgs = {
  name: Categories_Enum;
};


/** mutation root */
export type Mutation_RootDelete_Project_VerticalsArgs = {
  where: Project_Verticals_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Project_Verticals_By_PkArgs = {
  name: Verticals_Enum;
};


/** mutation root */
export type Mutation_RootDelete_Projects_FeaturesArgs = {
  where: Projects_Features_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Projects_Features_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Projects_Features_PrivateArgs = {
  where: Projects_Features_Private_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Projects_MetadataArgs = {
  where: Projects_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Projects_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Proposed_Artist_Addresses_And_SplitsArgs = {
  where: Proposed_Artist_Addresses_And_Splits_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Proposed_Artist_Addresses_And_Splits_By_PkArgs = {
  project_id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Receipt_MetadataArgs = {
  where: Receipt_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Receipt_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_ScreeningsArgs = {
  where: Screenings_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Screenings_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Sync_StatusArgs = {
  where: Sync_Status_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Sync_Status_By_PkArgs = {
  id: Scalars['Boolean'];
};


/** mutation root */
export type Mutation_RootDelete_Tag_GroupingsArgs = {
  where: Tag_Groupings_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Tag_Groupings_By_PkArgs = {
  name: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Tag_StatusArgs = {
  where: Tag_Status_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Tag_Status_By_PkArgs = {
  value: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Tag_TypesArgs = {
  where: Tag_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Tag_Types_By_PkArgs = {
  value: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_TagsArgs = {
  where: Tags_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Tags_By_PkArgs = {
  name: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Terms_Of_ServiceArgs = {
  where: Terms_Of_Service_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Terms_Of_Service_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_Tokens_MetadataArgs = {
  where: Tokens_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Tokens_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_User_ProfilesArgs = {
  where: User_Profiles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_User_Profiles_By_PkArgs = {
  id: Scalars['Int'];
};


/** mutation root */
export type Mutation_RootDelete_UsersArgs = {
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Users_By_PkArgs = {
  public_address: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_VerticalsArgs = {
  where: Verticals_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Verticals_By_PkArgs = {
  name: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Webflow_Artist_InfoArgs = {
  where: Webflow_Artist_Info_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Webflow_Artist_Info_By_PkArgs = {
  webflow_item_id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootDelete_Webflow_Spectrum_ArticlesArgs = {
  where: Webflow_Spectrum_Articles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Webflow_Spectrum_Articles_By_PkArgs = {
  webflow_item_id: Scalars['String'];
};


/** mutation root */
export type Mutation_RootInsert_CategoriesArgs = {
  objects: Array<Categories_Insert_Input>;
  on_conflict?: InputMaybe<Categories_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Categories_OneArgs = {
  object: Categories_Insert_Input;
  on_conflict?: InputMaybe<Categories_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contract_AllowlistingsArgs = {
  objects: Array<Contract_Allowlistings_Insert_Input>;
  on_conflict?: InputMaybe<Contract_Allowlistings_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contract_Allowlistings_OneArgs = {
  object: Contract_Allowlistings_Insert_Input;
  on_conflict?: InputMaybe<Contract_Allowlistings_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contract_Type_NamesArgs = {
  objects: Array<Contract_Type_Names_Insert_Input>;
  on_conflict?: InputMaybe<Contract_Type_Names_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contract_Type_Names_OneArgs = {
  object: Contract_Type_Names_Insert_Input;
  on_conflict?: InputMaybe<Contract_Type_Names_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contract_TypesArgs = {
  objects: Array<Contract_Types_Insert_Input>;
  on_conflict?: InputMaybe<Contract_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contract_Types_OneArgs = {
  object: Contract_Types_Insert_Input;
  on_conflict?: InputMaybe<Contract_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contracts_MetadataArgs = {
  objects: Array<Contracts_Metadata_Insert_Input>;
  on_conflict?: InputMaybe<Contracts_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Contracts_Metadata_OneArgs = {
  object: Contracts_Metadata_Insert_Input;
  on_conflict?: InputMaybe<Contracts_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Curation_StatusesArgs = {
  objects: Array<Curation_Statuses_Insert_Input>;
  on_conflict?: InputMaybe<Curation_Statuses_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Curation_Statuses_OneArgs = {
  object: Curation_Statuses_Insert_Input;
  on_conflict?: InputMaybe<Curation_Statuses_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependencies_MetadataArgs = {
  objects: Array<Dependencies_Metadata_Insert_Input>;
  on_conflict?: InputMaybe<Dependencies_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependencies_Metadata_OneArgs = {
  object: Dependencies_Metadata_Insert_Input;
  on_conflict?: InputMaybe<Dependencies_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_Additional_CdnsArgs = {
  objects: Array<Dependency_Additional_Cdns_Insert_Input>;
  on_conflict?: InputMaybe<Dependency_Additional_Cdns_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_Additional_Cdns_OneArgs = {
  object: Dependency_Additional_Cdns_Insert_Input;
  on_conflict?: InputMaybe<Dependency_Additional_Cdns_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_Additional_RepositoriesArgs = {
  objects: Array<Dependency_Additional_Repositories_Insert_Input>;
  on_conflict?: InputMaybe<Dependency_Additional_Repositories_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_Additional_Repositories_OneArgs = {
  object: Dependency_Additional_Repositories_Insert_Input;
  on_conflict?: InputMaybe<Dependency_Additional_Repositories_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_RegistriesArgs = {
  objects: Array<Dependency_Registries_Insert_Input>;
  on_conflict?: InputMaybe<Dependency_Registries_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_Registries_OneArgs = {
  object: Dependency_Registries_Insert_Input;
  on_conflict?: InputMaybe<Dependency_Registries_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_ScriptsArgs = {
  objects: Array<Dependency_Scripts_Insert_Input>;
  on_conflict?: InputMaybe<Dependency_Scripts_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Dependency_Scripts_OneArgs = {
  object: Dependency_Scripts_Insert_Input;
  on_conflict?: InputMaybe<Dependency_Scripts_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Entity_TagsArgs = {
  objects: Array<Entity_Tags_Insert_Input>;
  on_conflict?: InputMaybe<Entity_Tags_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Entity_Tags_OneArgs = {
  object: Entity_Tags_Insert_Input;
  on_conflict?: InputMaybe<Entity_Tags_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_FavoritesArgs = {
  objects: Array<Favorites_Insert_Input>;
  on_conflict?: InputMaybe<Favorites_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Favorites_OneArgs = {
  object: Favorites_Insert_Input;
  on_conflict?: InputMaybe<Favorites_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Feature_Field_Values_CountsArgs = {
  objects: Array<Feature_Field_Values_Counts_Insert_Input>;
};


/** mutation root */
export type Mutation_RootInsert_Feature_Field_Values_Counts_OneArgs = {
  object: Feature_Field_Values_Counts_Insert_Input;
};


/** mutation root */
export type Mutation_RootInsert_Feature_FlagsArgs = {
  objects: Array<Feature_Flags_Insert_Input>;
  on_conflict?: InputMaybe<Feature_Flags_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Feature_Flags_OneArgs = {
  object: Feature_Flags_Insert_Input;
  on_conflict?: InputMaybe<Feature_Flags_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_MediaArgs = {
  objects: Array<Media_Insert_Input>;
  on_conflict?: InputMaybe<Media_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Media_OneArgs = {
  object: Media_Insert_Input;
  on_conflict?: InputMaybe<Media_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minter_Filters_MetadataArgs = {
  objects: Array<Minter_Filters_Metadata_Insert_Input>;
  on_conflict?: InputMaybe<Minter_Filters_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minter_Filters_Metadata_OneArgs = {
  object: Minter_Filters_Metadata_Insert_Input;
  on_conflict?: InputMaybe<Minter_Filters_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minter_Type_NamesArgs = {
  objects: Array<Minter_Type_Names_Insert_Input>;
  on_conflict?: InputMaybe<Minter_Type_Names_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minter_Type_Names_OneArgs = {
  object: Minter_Type_Names_Insert_Input;
  on_conflict?: InputMaybe<Minter_Type_Names_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minter_TypesArgs = {
  objects: Array<Minter_Types_Insert_Input>;
  on_conflict?: InputMaybe<Minter_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minter_Types_OneArgs = {
  object: Minter_Types_Insert_Input;
  on_conflict?: InputMaybe<Minter_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minters_MetadataArgs = {
  objects: Array<Minters_Metadata_Insert_Input>;
  on_conflict?: InputMaybe<Minters_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Minters_Metadata_OneArgs = {
  object: Minters_Metadata_Insert_Input;
  on_conflict?: InputMaybe<Minters_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_NotificationsArgs = {
  objects: Array<Notifications_Insert_Input>;
  on_conflict?: InputMaybe<Notifications_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Notifications_OneArgs = {
  object: Notifications_Insert_Input;
  on_conflict?: InputMaybe<Notifications_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_External_Asset_DependenciesArgs = {
  objects: Array<Project_External_Asset_Dependencies_Insert_Input>;
  on_conflict?: InputMaybe<Project_External_Asset_Dependencies_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_External_Asset_Dependencies_OneArgs = {
  object: Project_External_Asset_Dependencies_Insert_Input;
  on_conflict?: InputMaybe<Project_External_Asset_Dependencies_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_External_Asset_Dependency_TypesArgs = {
  objects: Array<Project_External_Asset_Dependency_Types_Insert_Input>;
  on_conflict?: InputMaybe<Project_External_Asset_Dependency_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_External_Asset_Dependency_Types_OneArgs = {
  object: Project_External_Asset_Dependency_Types_Insert_Input;
  on_conflict?: InputMaybe<Project_External_Asset_Dependency_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_Minter_ConfigurationsArgs = {
  objects: Array<Project_Minter_Configurations_Insert_Input>;
  on_conflict?: InputMaybe<Project_Minter_Configurations_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_Minter_Configurations_OneArgs = {
  object: Project_Minter_Configurations_Insert_Input;
  on_conflict?: InputMaybe<Project_Minter_Configurations_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_ScriptsArgs = {
  objects: Array<Project_Scripts_Insert_Input>;
  on_conflict?: InputMaybe<Project_Scripts_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_Scripts_OneArgs = {
  object: Project_Scripts_Insert_Input;
  on_conflict?: InputMaybe<Project_Scripts_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_SeriesArgs = {
  objects: Array<Project_Series_Insert_Input>;
  on_conflict?: InputMaybe<Project_Series_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_Series_OneArgs = {
  object: Project_Series_Insert_Input;
  on_conflict?: InputMaybe<Project_Series_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_Vertical_CategoriesArgs = {
  objects: Array<Project_Vertical_Categories_Insert_Input>;
  on_conflict?: InputMaybe<Project_Vertical_Categories_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_Vertical_Categories_OneArgs = {
  object: Project_Vertical_Categories_Insert_Input;
  on_conflict?: InputMaybe<Project_Vertical_Categories_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_VerticalsArgs = {
  objects: Array<Project_Verticals_Insert_Input>;
  on_conflict?: InputMaybe<Project_Verticals_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Project_Verticals_OneArgs = {
  object: Project_Verticals_Insert_Input;
  on_conflict?: InputMaybe<Project_Verticals_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Projects_FeaturesArgs = {
  objects: Array<Projects_Features_Insert_Input>;
  on_conflict?: InputMaybe<Projects_Features_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Projects_Features_OneArgs = {
  object: Projects_Features_Insert_Input;
  on_conflict?: InputMaybe<Projects_Features_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Projects_Features_PrivateArgs = {
  objects: Array<Projects_Features_Private_Insert_Input>;
};


/** mutation root */
export type Mutation_RootInsert_Projects_Features_Private_OneArgs = {
  object: Projects_Features_Private_Insert_Input;
};


/** mutation root */
export type Mutation_RootInsert_Projects_MetadataArgs = {
  objects: Array<Projects_Metadata_Insert_Input>;
  on_conflict?: InputMaybe<Projects_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Projects_Metadata_OneArgs = {
  object: Projects_Metadata_Insert_Input;
  on_conflict?: InputMaybe<Projects_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Proposed_Artist_Addresses_And_SplitsArgs = {
  objects: Array<Proposed_Artist_Addresses_And_Splits_Insert_Input>;
  on_conflict?: InputMaybe<Proposed_Artist_Addresses_And_Splits_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Proposed_Artist_Addresses_And_Splits_OneArgs = {
  object: Proposed_Artist_Addresses_And_Splits_Insert_Input;
  on_conflict?: InputMaybe<Proposed_Artist_Addresses_And_Splits_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Receipt_MetadataArgs = {
  objects: Array<Receipt_Metadata_Insert_Input>;
  on_conflict?: InputMaybe<Receipt_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Receipt_Metadata_OneArgs = {
  object: Receipt_Metadata_Insert_Input;
  on_conflict?: InputMaybe<Receipt_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_ScreeningsArgs = {
  objects: Array<Screenings_Insert_Input>;
  on_conflict?: InputMaybe<Screenings_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Screenings_OneArgs = {
  object: Screenings_Insert_Input;
  on_conflict?: InputMaybe<Screenings_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Sync_StatusArgs = {
  objects: Array<Sync_Status_Insert_Input>;
  on_conflict?: InputMaybe<Sync_Status_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Sync_Status_OneArgs = {
  object: Sync_Status_Insert_Input;
  on_conflict?: InputMaybe<Sync_Status_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tag_GroupingsArgs = {
  objects: Array<Tag_Groupings_Insert_Input>;
  on_conflict?: InputMaybe<Tag_Groupings_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tag_Groupings_OneArgs = {
  object: Tag_Groupings_Insert_Input;
  on_conflict?: InputMaybe<Tag_Groupings_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tag_StatusArgs = {
  objects: Array<Tag_Status_Insert_Input>;
  on_conflict?: InputMaybe<Tag_Status_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tag_Status_OneArgs = {
  object: Tag_Status_Insert_Input;
  on_conflict?: InputMaybe<Tag_Status_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tag_TypesArgs = {
  objects: Array<Tag_Types_Insert_Input>;
  on_conflict?: InputMaybe<Tag_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tag_Types_OneArgs = {
  object: Tag_Types_Insert_Input;
  on_conflict?: InputMaybe<Tag_Types_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_TagsArgs = {
  objects: Array<Tags_Insert_Input>;
  on_conflict?: InputMaybe<Tags_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tags_OneArgs = {
  object: Tags_Insert_Input;
  on_conflict?: InputMaybe<Tags_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Terms_Of_ServiceArgs = {
  objects: Array<Terms_Of_Service_Insert_Input>;
  on_conflict?: InputMaybe<Terms_Of_Service_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Terms_Of_Service_OneArgs = {
  object: Terms_Of_Service_Insert_Input;
  on_conflict?: InputMaybe<Terms_Of_Service_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tokens_MetadataArgs = {
  objects: Array<Tokens_Metadata_Insert_Input>;
  on_conflict?: InputMaybe<Tokens_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Tokens_Metadata_OneArgs = {
  object: Tokens_Metadata_Insert_Input;
  on_conflict?: InputMaybe<Tokens_Metadata_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_User_ProfilesArgs = {
  objects: Array<User_Profiles_Insert_Input>;
  on_conflict?: InputMaybe<User_Profiles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_User_Profiles_OneArgs = {
  object: User_Profiles_Insert_Input;
  on_conflict?: InputMaybe<User_Profiles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_UsersArgs = {
  objects: Array<Users_Insert_Input>;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_OneArgs = {
  object: Users_Insert_Input;
  on_conflict?: InputMaybe<Users_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_VerticalsArgs = {
  objects: Array<Verticals_Insert_Input>;
  on_conflict?: InputMaybe<Verticals_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Verticals_OneArgs = {
  object: Verticals_Insert_Input;
  on_conflict?: InputMaybe<Verticals_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Webflow_Artist_InfoArgs = {
  objects: Array<Webflow_Artist_Info_Insert_Input>;
  on_conflict?: InputMaybe<Webflow_Artist_Info_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Webflow_Artist_Info_OneArgs = {
  object: Webflow_Artist_Info_Insert_Input;
  on_conflict?: InputMaybe<Webflow_Artist_Info_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Webflow_Spectrum_ArticlesArgs = {
  objects: Array<Webflow_Spectrum_Articles_Insert_Input>;
  on_conflict?: InputMaybe<Webflow_Spectrum_Articles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Webflow_Spectrum_Articles_OneArgs = {
  object: Webflow_Spectrum_Articles_Insert_Input;
  on_conflict?: InputMaybe<Webflow_Spectrum_Articles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootUpdateFeaturesArgs = {
  featureFields: Scalars['jsonb'];
  featuresScript: Scalars['String'];
  projectId: Scalars['String'];
};


/** mutation root */
export type Mutation_RootUpdateProjectMediaArgs = {
  features?: InputMaybe<Scalars['Boolean']>;
  projectId: Scalars['String'];
  render?: InputMaybe<Scalars['Boolean']>;
};


/** mutation root */
export type Mutation_RootUpdateTokenMediaArgs = {
  tokenIds?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** mutation root */
export type Mutation_RootUpdate_CategoriesArgs = {
  _set?: InputMaybe<Categories_Set_Input>;
  where: Categories_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Categories_By_PkArgs = {
  _set?: InputMaybe<Categories_Set_Input>;
  pk_columns: Categories_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Categories_ManyArgs = {
  updates: Array<Categories_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_AllowlistingsArgs = {
  _set?: InputMaybe<Contract_Allowlistings_Set_Input>;
  where: Contract_Allowlistings_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_Allowlistings_By_PkArgs = {
  _set?: InputMaybe<Contract_Allowlistings_Set_Input>;
  pk_columns: Contract_Allowlistings_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_Allowlistings_ManyArgs = {
  updates: Array<Contract_Allowlistings_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_Type_NamesArgs = {
  _set?: InputMaybe<Contract_Type_Names_Set_Input>;
  where: Contract_Type_Names_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_Type_Names_By_PkArgs = {
  _set?: InputMaybe<Contract_Type_Names_Set_Input>;
  pk_columns: Contract_Type_Names_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_Type_Names_ManyArgs = {
  updates: Array<Contract_Type_Names_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_TypesArgs = {
  _append?: InputMaybe<Contract_Types_Append_Input>;
  _delete_at_path?: InputMaybe<Contract_Types_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Contract_Types_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Contract_Types_Delete_Key_Input>;
  _prepend?: InputMaybe<Contract_Types_Prepend_Input>;
  _set?: InputMaybe<Contract_Types_Set_Input>;
  where: Contract_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_Types_By_PkArgs = {
  _append?: InputMaybe<Contract_Types_Append_Input>;
  _delete_at_path?: InputMaybe<Contract_Types_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Contract_Types_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Contract_Types_Delete_Key_Input>;
  _prepend?: InputMaybe<Contract_Types_Prepend_Input>;
  _set?: InputMaybe<Contract_Types_Set_Input>;
  pk_columns: Contract_Types_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Contract_Types_ManyArgs = {
  updates: Array<Contract_Types_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Contracts_MetadataArgs = {
  _inc?: InputMaybe<Contracts_Metadata_Inc_Input>;
  _set?: InputMaybe<Contracts_Metadata_Set_Input>;
  where: Contracts_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Contracts_Metadata_By_PkArgs = {
  _inc?: InputMaybe<Contracts_Metadata_Inc_Input>;
  _set?: InputMaybe<Contracts_Metadata_Set_Input>;
  pk_columns: Contracts_Metadata_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Contracts_Metadata_ManyArgs = {
  updates: Array<Contracts_Metadata_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Curation_StatusesArgs = {
  _set?: InputMaybe<Curation_Statuses_Set_Input>;
  where: Curation_Statuses_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Curation_Statuses_By_PkArgs = {
  _set?: InputMaybe<Curation_Statuses_Set_Input>;
  pk_columns: Curation_Statuses_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Curation_Statuses_ManyArgs = {
  updates: Array<Curation_Statuses_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Dependencies_MetadataArgs = {
  _set?: InputMaybe<Dependencies_Metadata_Set_Input>;
  where: Dependencies_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Dependencies_Metadata_By_PkArgs = {
  _set?: InputMaybe<Dependencies_Metadata_Set_Input>;
  pk_columns: Dependencies_Metadata_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Dependencies_Metadata_ManyArgs = {
  updates: Array<Dependencies_Metadata_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Additional_CdnsArgs = {
  _inc?: InputMaybe<Dependency_Additional_Cdns_Inc_Input>;
  _set?: InputMaybe<Dependency_Additional_Cdns_Set_Input>;
  where: Dependency_Additional_Cdns_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Additional_Cdns_By_PkArgs = {
  _inc?: InputMaybe<Dependency_Additional_Cdns_Inc_Input>;
  _set?: InputMaybe<Dependency_Additional_Cdns_Set_Input>;
  pk_columns: Dependency_Additional_Cdns_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Additional_Cdns_ManyArgs = {
  updates: Array<Dependency_Additional_Cdns_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Additional_RepositoriesArgs = {
  _inc?: InputMaybe<Dependency_Additional_Repositories_Inc_Input>;
  _set?: InputMaybe<Dependency_Additional_Repositories_Set_Input>;
  where: Dependency_Additional_Repositories_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Additional_Repositories_By_PkArgs = {
  _inc?: InputMaybe<Dependency_Additional_Repositories_Inc_Input>;
  _set?: InputMaybe<Dependency_Additional_Repositories_Set_Input>;
  pk_columns: Dependency_Additional_Repositories_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Additional_Repositories_ManyArgs = {
  updates: Array<Dependency_Additional_Repositories_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_RegistriesArgs = {
  _set?: InputMaybe<Dependency_Registries_Set_Input>;
  where: Dependency_Registries_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Registries_By_PkArgs = {
  _set?: InputMaybe<Dependency_Registries_Set_Input>;
  pk_columns: Dependency_Registries_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Registries_ManyArgs = {
  updates: Array<Dependency_Registries_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_ScriptsArgs = {
  _inc?: InputMaybe<Dependency_Scripts_Inc_Input>;
  _set?: InputMaybe<Dependency_Scripts_Set_Input>;
  where: Dependency_Scripts_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Scripts_By_PkArgs = {
  _inc?: InputMaybe<Dependency_Scripts_Inc_Input>;
  _set?: InputMaybe<Dependency_Scripts_Set_Input>;
  pk_columns: Dependency_Scripts_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Dependency_Scripts_ManyArgs = {
  updates: Array<Dependency_Scripts_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Entity_TagsArgs = {
  _inc?: InputMaybe<Entity_Tags_Inc_Input>;
  _set?: InputMaybe<Entity_Tags_Set_Input>;
  where: Entity_Tags_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Entity_Tags_By_PkArgs = {
  _inc?: InputMaybe<Entity_Tags_Inc_Input>;
  _set?: InputMaybe<Entity_Tags_Set_Input>;
  pk_columns: Entity_Tags_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Entity_Tags_ManyArgs = {
  updates: Array<Entity_Tags_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_FavoritesArgs = {
  _inc?: InputMaybe<Favorites_Inc_Input>;
  _set?: InputMaybe<Favorites_Set_Input>;
  where: Favorites_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Favorites_By_PkArgs = {
  _inc?: InputMaybe<Favorites_Inc_Input>;
  _set?: InputMaybe<Favorites_Set_Input>;
  pk_columns: Favorites_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Favorites_ManyArgs = {
  updates: Array<Favorites_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Feature_Field_Values_CountsArgs = {
  _inc?: InputMaybe<Feature_Field_Values_Counts_Inc_Input>;
  _set?: InputMaybe<Feature_Field_Values_Counts_Set_Input>;
  where: Feature_Field_Values_Counts_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Feature_Field_Values_Counts_ManyArgs = {
  updates: Array<Feature_Field_Values_Counts_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Feature_FlagsArgs = {
  _set?: InputMaybe<Feature_Flags_Set_Input>;
  where: Feature_Flags_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Feature_Flags_By_PkArgs = {
  _set?: InputMaybe<Feature_Flags_Set_Input>;
  pk_columns: Feature_Flags_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Feature_Flags_ManyArgs = {
  updates: Array<Feature_Flags_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_MediaArgs = {
  _append?: InputMaybe<Media_Append_Input>;
  _delete_at_path?: InputMaybe<Media_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Media_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Media_Delete_Key_Input>;
  _inc?: InputMaybe<Media_Inc_Input>;
  _prepend?: InputMaybe<Media_Prepend_Input>;
  _set?: InputMaybe<Media_Set_Input>;
  where: Media_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Media_By_PkArgs = {
  _append?: InputMaybe<Media_Append_Input>;
  _delete_at_path?: InputMaybe<Media_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Media_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Media_Delete_Key_Input>;
  _inc?: InputMaybe<Media_Inc_Input>;
  _prepend?: InputMaybe<Media_Prepend_Input>;
  _set?: InputMaybe<Media_Set_Input>;
  pk_columns: Media_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Media_ManyArgs = {
  updates: Array<Media_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Filters_MetadataArgs = {
  _set?: InputMaybe<Minter_Filters_Metadata_Set_Input>;
  where: Minter_Filters_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Filters_Metadata_By_PkArgs = {
  _set?: InputMaybe<Minter_Filters_Metadata_Set_Input>;
  pk_columns: Minter_Filters_Metadata_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Filters_Metadata_ManyArgs = {
  updates: Array<Minter_Filters_Metadata_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Type_NamesArgs = {
  _set?: InputMaybe<Minter_Type_Names_Set_Input>;
  where: Minter_Type_Names_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Type_Names_By_PkArgs = {
  _set?: InputMaybe<Minter_Type_Names_Set_Input>;
  pk_columns: Minter_Type_Names_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Type_Names_ManyArgs = {
  updates: Array<Minter_Type_Names_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_TypesArgs = {
  _set?: InputMaybe<Minter_Types_Set_Input>;
  where: Minter_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Types_By_PkArgs = {
  _set?: InputMaybe<Minter_Types_Set_Input>;
  pk_columns: Minter_Types_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Minter_Types_ManyArgs = {
  updates: Array<Minter_Types_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Minters_MetadataArgs = {
  _append?: InputMaybe<Minters_Metadata_Append_Input>;
  _delete_at_path?: InputMaybe<Minters_Metadata_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Minters_Metadata_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Minters_Metadata_Delete_Key_Input>;
  _inc?: InputMaybe<Minters_Metadata_Inc_Input>;
  _prepend?: InputMaybe<Minters_Metadata_Prepend_Input>;
  _set?: InputMaybe<Minters_Metadata_Set_Input>;
  where: Minters_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Minters_Metadata_By_PkArgs = {
  _append?: InputMaybe<Minters_Metadata_Append_Input>;
  _delete_at_path?: InputMaybe<Minters_Metadata_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Minters_Metadata_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Minters_Metadata_Delete_Key_Input>;
  _inc?: InputMaybe<Minters_Metadata_Inc_Input>;
  _prepend?: InputMaybe<Minters_Metadata_Prepend_Input>;
  _set?: InputMaybe<Minters_Metadata_Set_Input>;
  pk_columns: Minters_Metadata_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Minters_Metadata_ManyArgs = {
  updates: Array<Minters_Metadata_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_NotificationsArgs = {
  _inc?: InputMaybe<Notifications_Inc_Input>;
  _set?: InputMaybe<Notifications_Set_Input>;
  where: Notifications_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Notifications_By_PkArgs = {
  _inc?: InputMaybe<Notifications_Inc_Input>;
  _set?: InputMaybe<Notifications_Set_Input>;
  pk_columns: Notifications_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Notifications_ManyArgs = {
  updates: Array<Notifications_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Project_External_Asset_DependenciesArgs = {
  _inc?: InputMaybe<Project_External_Asset_Dependencies_Inc_Input>;
  _set?: InputMaybe<Project_External_Asset_Dependencies_Set_Input>;
  where: Project_External_Asset_Dependencies_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Project_External_Asset_Dependencies_By_PkArgs = {
  _inc?: InputMaybe<Project_External_Asset_Dependencies_Inc_Input>;
  _set?: InputMaybe<Project_External_Asset_Dependencies_Set_Input>;
  pk_columns: Project_External_Asset_Dependencies_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Project_External_Asset_Dependencies_ManyArgs = {
  updates: Array<Project_External_Asset_Dependencies_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Project_External_Asset_Dependency_TypesArgs = {
  _set?: InputMaybe<Project_External_Asset_Dependency_Types_Set_Input>;
  where: Project_External_Asset_Dependency_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Project_External_Asset_Dependency_Types_By_PkArgs = {
  _set?: InputMaybe<Project_External_Asset_Dependency_Types_Set_Input>;
  pk_columns: Project_External_Asset_Dependency_Types_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Project_External_Asset_Dependency_Types_ManyArgs = {
  updates: Array<Project_External_Asset_Dependency_Types_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Minter_ConfigurationsArgs = {
  _append?: InputMaybe<Project_Minter_Configurations_Append_Input>;
  _delete_at_path?: InputMaybe<Project_Minter_Configurations_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Project_Minter_Configurations_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Project_Minter_Configurations_Delete_Key_Input>;
  _prepend?: InputMaybe<Project_Minter_Configurations_Prepend_Input>;
  _set?: InputMaybe<Project_Minter_Configurations_Set_Input>;
  where: Project_Minter_Configurations_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Minter_Configurations_By_PkArgs = {
  _append?: InputMaybe<Project_Minter_Configurations_Append_Input>;
  _delete_at_path?: InputMaybe<Project_Minter_Configurations_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Project_Minter_Configurations_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Project_Minter_Configurations_Delete_Key_Input>;
  _prepend?: InputMaybe<Project_Minter_Configurations_Prepend_Input>;
  _set?: InputMaybe<Project_Minter_Configurations_Set_Input>;
  pk_columns: Project_Minter_Configurations_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Minter_Configurations_ManyArgs = {
  updates: Array<Project_Minter_Configurations_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Project_ScriptsArgs = {
  _inc?: InputMaybe<Project_Scripts_Inc_Input>;
  _set?: InputMaybe<Project_Scripts_Set_Input>;
  where: Project_Scripts_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Scripts_By_PkArgs = {
  _inc?: InputMaybe<Project_Scripts_Inc_Input>;
  _set?: InputMaybe<Project_Scripts_Set_Input>;
  pk_columns: Project_Scripts_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Scripts_ManyArgs = {
  updates: Array<Project_Scripts_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Project_SeriesArgs = {
  _inc?: InputMaybe<Project_Series_Inc_Input>;
  _set?: InputMaybe<Project_Series_Set_Input>;
  where: Project_Series_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Series_By_PkArgs = {
  _inc?: InputMaybe<Project_Series_Inc_Input>;
  _set?: InputMaybe<Project_Series_Set_Input>;
  pk_columns: Project_Series_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Series_ManyArgs = {
  updates: Array<Project_Series_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Vertical_CategoriesArgs = {
  _set?: InputMaybe<Project_Vertical_Categories_Set_Input>;
  where: Project_Vertical_Categories_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Vertical_Categories_By_PkArgs = {
  _set?: InputMaybe<Project_Vertical_Categories_Set_Input>;
  pk_columns: Project_Vertical_Categories_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Vertical_Categories_ManyArgs = {
  updates: Array<Project_Vertical_Categories_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Project_VerticalsArgs = {
  _set?: InputMaybe<Project_Verticals_Set_Input>;
  where: Project_Verticals_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Verticals_By_PkArgs = {
  _set?: InputMaybe<Project_Verticals_Set_Input>;
  pk_columns: Project_Verticals_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Project_Verticals_ManyArgs = {
  updates: Array<Project_Verticals_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_FeaturesArgs = {
  _append?: InputMaybe<Projects_Features_Append_Input>;
  _delete_at_path?: InputMaybe<Projects_Features_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Projects_Features_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Projects_Features_Delete_Key_Input>;
  _inc?: InputMaybe<Projects_Features_Inc_Input>;
  _prepend?: InputMaybe<Projects_Features_Prepend_Input>;
  _set?: InputMaybe<Projects_Features_Set_Input>;
  where: Projects_Features_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_Features_By_PkArgs = {
  _append?: InputMaybe<Projects_Features_Append_Input>;
  _delete_at_path?: InputMaybe<Projects_Features_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Projects_Features_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Projects_Features_Delete_Key_Input>;
  _inc?: InputMaybe<Projects_Features_Inc_Input>;
  _prepend?: InputMaybe<Projects_Features_Prepend_Input>;
  _set?: InputMaybe<Projects_Features_Set_Input>;
  pk_columns: Projects_Features_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_Features_ManyArgs = {
  updates: Array<Projects_Features_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_Features_PrivateArgs = {
  _inc?: InputMaybe<Projects_Features_Private_Inc_Input>;
  _set?: InputMaybe<Projects_Features_Private_Set_Input>;
  where: Projects_Features_Private_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_Features_Private_ManyArgs = {
  updates: Array<Projects_Features_Private_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_MetadataArgs = {
  _append?: InputMaybe<Projects_Metadata_Append_Input>;
  _delete_at_path?: InputMaybe<Projects_Metadata_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Projects_Metadata_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Projects_Metadata_Delete_Key_Input>;
  _inc?: InputMaybe<Projects_Metadata_Inc_Input>;
  _prepend?: InputMaybe<Projects_Metadata_Prepend_Input>;
  _set?: InputMaybe<Projects_Metadata_Set_Input>;
  where: Projects_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_Metadata_By_PkArgs = {
  _append?: InputMaybe<Projects_Metadata_Append_Input>;
  _delete_at_path?: InputMaybe<Projects_Metadata_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Projects_Metadata_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Projects_Metadata_Delete_Key_Input>;
  _inc?: InputMaybe<Projects_Metadata_Inc_Input>;
  _prepend?: InputMaybe<Projects_Metadata_Prepend_Input>;
  _set?: InputMaybe<Projects_Metadata_Set_Input>;
  pk_columns: Projects_Metadata_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Projects_Metadata_ManyArgs = {
  updates: Array<Projects_Metadata_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Proposed_Artist_Addresses_And_SplitsArgs = {
  _inc?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Inc_Input>;
  _set?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Set_Input>;
  where: Proposed_Artist_Addresses_And_Splits_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Proposed_Artist_Addresses_And_Splits_By_PkArgs = {
  _inc?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Inc_Input>;
  _set?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Set_Input>;
  pk_columns: Proposed_Artist_Addresses_And_Splits_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Proposed_Artist_Addresses_And_Splits_ManyArgs = {
  updates: Array<Proposed_Artist_Addresses_And_Splits_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Receipt_MetadataArgs = {
  _set?: InputMaybe<Receipt_Metadata_Set_Input>;
  where: Receipt_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Receipt_Metadata_By_PkArgs = {
  _set?: InputMaybe<Receipt_Metadata_Set_Input>;
  pk_columns: Receipt_Metadata_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Receipt_Metadata_ManyArgs = {
  updates: Array<Receipt_Metadata_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_ScreeningsArgs = {
  _inc?: InputMaybe<Screenings_Inc_Input>;
  _set?: InputMaybe<Screenings_Set_Input>;
  where: Screenings_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Screenings_By_PkArgs = {
  _inc?: InputMaybe<Screenings_Inc_Input>;
  _set?: InputMaybe<Screenings_Set_Input>;
  pk_columns: Screenings_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Screenings_ManyArgs = {
  updates: Array<Screenings_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Sync_StatusArgs = {
  _set?: InputMaybe<Sync_Status_Set_Input>;
  where: Sync_Status_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Sync_Status_By_PkArgs = {
  _set?: InputMaybe<Sync_Status_Set_Input>;
  pk_columns: Sync_Status_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Sync_Status_ManyArgs = {
  updates: Array<Sync_Status_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_GroupingsArgs = {
  _set?: InputMaybe<Tag_Groupings_Set_Input>;
  where: Tag_Groupings_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_Groupings_By_PkArgs = {
  _set?: InputMaybe<Tag_Groupings_Set_Input>;
  pk_columns: Tag_Groupings_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_Groupings_ManyArgs = {
  updates: Array<Tag_Groupings_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_StatusArgs = {
  _set?: InputMaybe<Tag_Status_Set_Input>;
  where: Tag_Status_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_Status_By_PkArgs = {
  _set?: InputMaybe<Tag_Status_Set_Input>;
  pk_columns: Tag_Status_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_Status_ManyArgs = {
  updates: Array<Tag_Status_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_TypesArgs = {
  _set?: InputMaybe<Tag_Types_Set_Input>;
  where: Tag_Types_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_Types_By_PkArgs = {
  _set?: InputMaybe<Tag_Types_Set_Input>;
  pk_columns: Tag_Types_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Tag_Types_ManyArgs = {
  updates: Array<Tag_Types_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_TagsArgs = {
  _set?: InputMaybe<Tags_Set_Input>;
  where: Tags_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Tags_By_PkArgs = {
  _set?: InputMaybe<Tags_Set_Input>;
  pk_columns: Tags_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Tags_ManyArgs = {
  updates: Array<Tags_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Terms_Of_ServiceArgs = {
  _inc?: InputMaybe<Terms_Of_Service_Inc_Input>;
  _set?: InputMaybe<Terms_Of_Service_Set_Input>;
  where: Terms_Of_Service_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Terms_Of_Service_By_PkArgs = {
  _inc?: InputMaybe<Terms_Of_Service_Inc_Input>;
  _set?: InputMaybe<Terms_Of_Service_Set_Input>;
  pk_columns: Terms_Of_Service_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Terms_Of_Service_ManyArgs = {
  updates: Array<Terms_Of_Service_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Tokens_MetadataArgs = {
  _append?: InputMaybe<Tokens_Metadata_Append_Input>;
  _delete_at_path?: InputMaybe<Tokens_Metadata_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Tokens_Metadata_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Tokens_Metadata_Delete_Key_Input>;
  _inc?: InputMaybe<Tokens_Metadata_Inc_Input>;
  _prepend?: InputMaybe<Tokens_Metadata_Prepend_Input>;
  _set?: InputMaybe<Tokens_Metadata_Set_Input>;
  where: Tokens_Metadata_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Tokens_Metadata_By_PkArgs = {
  _append?: InputMaybe<Tokens_Metadata_Append_Input>;
  _delete_at_path?: InputMaybe<Tokens_Metadata_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Tokens_Metadata_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Tokens_Metadata_Delete_Key_Input>;
  _inc?: InputMaybe<Tokens_Metadata_Inc_Input>;
  _prepend?: InputMaybe<Tokens_Metadata_Prepend_Input>;
  _set?: InputMaybe<Tokens_Metadata_Set_Input>;
  pk_columns: Tokens_Metadata_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Tokens_Metadata_ManyArgs = {
  updates: Array<Tokens_Metadata_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_User_ProfilesArgs = {
  _inc?: InputMaybe<User_Profiles_Inc_Input>;
  _set?: InputMaybe<User_Profiles_Set_Input>;
  where: User_Profiles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_User_Profiles_By_PkArgs = {
  _inc?: InputMaybe<User_Profiles_Inc_Input>;
  _set?: InputMaybe<User_Profiles_Set_Input>;
  pk_columns: User_Profiles_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_User_Profiles_ManyArgs = {
  updates: Array<User_Profiles_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_UsersArgs = {
  _inc?: InputMaybe<Users_Inc_Input>;
  _set?: InputMaybe<Users_Set_Input>;
  where: Users_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Users_By_PkArgs = {
  _inc?: InputMaybe<Users_Inc_Input>;
  _set?: InputMaybe<Users_Set_Input>;
  pk_columns: Users_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Users_ManyArgs = {
  updates: Array<Users_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_VerticalsArgs = {
  _set?: InputMaybe<Verticals_Set_Input>;
  where: Verticals_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Verticals_By_PkArgs = {
  _set?: InputMaybe<Verticals_Set_Input>;
  pk_columns: Verticals_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Verticals_ManyArgs = {
  updates: Array<Verticals_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Webflow_Artist_InfoArgs = {
  _append?: InputMaybe<Webflow_Artist_Info_Append_Input>;
  _delete_at_path?: InputMaybe<Webflow_Artist_Info_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Webflow_Artist_Info_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Webflow_Artist_Info_Delete_Key_Input>;
  _prepend?: InputMaybe<Webflow_Artist_Info_Prepend_Input>;
  _set?: InputMaybe<Webflow_Artist_Info_Set_Input>;
  where: Webflow_Artist_Info_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Webflow_Artist_Info_By_PkArgs = {
  _append?: InputMaybe<Webflow_Artist_Info_Append_Input>;
  _delete_at_path?: InputMaybe<Webflow_Artist_Info_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Webflow_Artist_Info_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Webflow_Artist_Info_Delete_Key_Input>;
  _prepend?: InputMaybe<Webflow_Artist_Info_Prepend_Input>;
  _set?: InputMaybe<Webflow_Artist_Info_Set_Input>;
  pk_columns: Webflow_Artist_Info_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Webflow_Artist_Info_ManyArgs = {
  updates: Array<Webflow_Artist_Info_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Webflow_Spectrum_ArticlesArgs = {
  _append?: InputMaybe<Webflow_Spectrum_Articles_Append_Input>;
  _delete_at_path?: InputMaybe<Webflow_Spectrum_Articles_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Webflow_Spectrum_Articles_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Webflow_Spectrum_Articles_Delete_Key_Input>;
  _prepend?: InputMaybe<Webflow_Spectrum_Articles_Prepend_Input>;
  _set?: InputMaybe<Webflow_Spectrum_Articles_Set_Input>;
  where: Webflow_Spectrum_Articles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Webflow_Spectrum_Articles_By_PkArgs = {
  _append?: InputMaybe<Webflow_Spectrum_Articles_Append_Input>;
  _delete_at_path?: InputMaybe<Webflow_Spectrum_Articles_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Webflow_Spectrum_Articles_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Webflow_Spectrum_Articles_Delete_Key_Input>;
  _prepend?: InputMaybe<Webflow_Spectrum_Articles_Prepend_Input>;
  _set?: InputMaybe<Webflow_Spectrum_Articles_Set_Input>;
  pk_columns: Webflow_Spectrum_Articles_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Webflow_Spectrum_Articles_ManyArgs = {
  updates: Array<Webflow_Spectrum_Articles_Updates>;
};

/** columns and relationships of "notifications" */
export type Notifications = {
  __typename?: 'notifications';
  action_text?: Maybe<Scalars['String']>;
  action_url?: Maybe<Scalars['String']>;
  body?: Maybe<Scalars['String']>;
  dismissed: Scalars['Boolean'];
  /** An object relationship */
  image?: Maybe<Media>;
  image_id?: Maybe<Scalars['Int']>;
  title: Scalars['String'];
  trigger_key: Scalars['String'];
  trigger_time: Scalars['timestamptz'];
  /** An object relationship */
  user: Users;
  user_address: Scalars['String'];
};

/** aggregated selection of "notifications" */
export type Notifications_Aggregate = {
  __typename?: 'notifications_aggregate';
  aggregate?: Maybe<Notifications_Aggregate_Fields>;
  nodes: Array<Notifications>;
};

export type Notifications_Aggregate_Bool_Exp = {
  bool_and?: InputMaybe<Notifications_Aggregate_Bool_Exp_Bool_And>;
  bool_or?: InputMaybe<Notifications_Aggregate_Bool_Exp_Bool_Or>;
  count?: InputMaybe<Notifications_Aggregate_Bool_Exp_Count>;
};

export type Notifications_Aggregate_Bool_Exp_Bool_And = {
  arguments: Notifications_Select_Column_Notifications_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Notifications_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Notifications_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Notifications_Select_Column_Notifications_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Notifications_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Notifications_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Notifications_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Notifications_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "notifications" */
export type Notifications_Aggregate_Fields = {
  __typename?: 'notifications_aggregate_fields';
  avg?: Maybe<Notifications_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Notifications_Max_Fields>;
  min?: Maybe<Notifications_Min_Fields>;
  stddev?: Maybe<Notifications_Stddev_Fields>;
  stddev_pop?: Maybe<Notifications_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Notifications_Stddev_Samp_Fields>;
  sum?: Maybe<Notifications_Sum_Fields>;
  var_pop?: Maybe<Notifications_Var_Pop_Fields>;
  var_samp?: Maybe<Notifications_Var_Samp_Fields>;
  variance?: Maybe<Notifications_Variance_Fields>;
};


/** aggregate fields of "notifications" */
export type Notifications_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Notifications_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "notifications" */
export type Notifications_Aggregate_Order_By = {
  avg?: InputMaybe<Notifications_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Notifications_Max_Order_By>;
  min?: InputMaybe<Notifications_Min_Order_By>;
  stddev?: InputMaybe<Notifications_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Notifications_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Notifications_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Notifications_Sum_Order_By>;
  var_pop?: InputMaybe<Notifications_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Notifications_Var_Samp_Order_By>;
  variance?: InputMaybe<Notifications_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "notifications" */
export type Notifications_Arr_Rel_Insert_Input = {
  data: Array<Notifications_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Notifications_On_Conflict>;
};

/** aggregate avg on columns */
export type Notifications_Avg_Fields = {
  __typename?: 'notifications_avg_fields';
  image_id?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "notifications" */
export type Notifications_Avg_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "notifications". All fields are combined with a logical 'AND'. */
export type Notifications_Bool_Exp = {
  _and?: InputMaybe<Array<Notifications_Bool_Exp>>;
  _not?: InputMaybe<Notifications_Bool_Exp>;
  _or?: InputMaybe<Array<Notifications_Bool_Exp>>;
  action_text?: InputMaybe<String_Comparison_Exp>;
  action_url?: InputMaybe<String_Comparison_Exp>;
  body?: InputMaybe<String_Comparison_Exp>;
  dismissed?: InputMaybe<Boolean_Comparison_Exp>;
  image?: InputMaybe<Media_Bool_Exp>;
  image_id?: InputMaybe<Int_Comparison_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  trigger_key?: InputMaybe<String_Comparison_Exp>;
  trigger_time?: InputMaybe<Timestamptz_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_address?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "notifications" */
export enum Notifications_Constraint {
  /** unique or primary key constraint on columns "trigger_key", "user_address", "trigger_time" */
  NotificationsPkey = 'notifications_pkey'
}

/** input type for incrementing numeric columns in table "notifications" */
export type Notifications_Inc_Input = {
  image_id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "notifications" */
export type Notifications_Insert_Input = {
  action_text?: InputMaybe<Scalars['String']>;
  action_url?: InputMaybe<Scalars['String']>;
  body?: InputMaybe<Scalars['String']>;
  dismissed?: InputMaybe<Scalars['Boolean']>;
  image?: InputMaybe<Media_Obj_Rel_Insert_Input>;
  image_id?: InputMaybe<Scalars['Int']>;
  title?: InputMaybe<Scalars['String']>;
  trigger_key?: InputMaybe<Scalars['String']>;
  trigger_time?: InputMaybe<Scalars['timestamptz']>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Notifications_Max_Fields = {
  __typename?: 'notifications_max_fields';
  action_text?: Maybe<Scalars['String']>;
  action_url?: Maybe<Scalars['String']>;
  body?: Maybe<Scalars['String']>;
  image_id?: Maybe<Scalars['Int']>;
  title?: Maybe<Scalars['String']>;
  trigger_key?: Maybe<Scalars['String']>;
  trigger_time?: Maybe<Scalars['timestamptz']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "notifications" */
export type Notifications_Max_Order_By = {
  action_text?: InputMaybe<Order_By>;
  action_url?: InputMaybe<Order_By>;
  body?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  trigger_key?: InputMaybe<Order_By>;
  trigger_time?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Notifications_Min_Fields = {
  __typename?: 'notifications_min_fields';
  action_text?: Maybe<Scalars['String']>;
  action_url?: Maybe<Scalars['String']>;
  body?: Maybe<Scalars['String']>;
  image_id?: Maybe<Scalars['Int']>;
  title?: Maybe<Scalars['String']>;
  trigger_key?: Maybe<Scalars['String']>;
  trigger_time?: Maybe<Scalars['timestamptz']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "notifications" */
export type Notifications_Min_Order_By = {
  action_text?: InputMaybe<Order_By>;
  action_url?: InputMaybe<Order_By>;
  body?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  trigger_key?: InputMaybe<Order_By>;
  trigger_time?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "notifications" */
export type Notifications_Mutation_Response = {
  __typename?: 'notifications_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Notifications>;
};

/** on_conflict condition type for table "notifications" */
export type Notifications_On_Conflict = {
  constraint: Notifications_Constraint;
  update_columns?: Array<Notifications_Update_Column>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};

/** Ordering options when selecting data from "notifications". */
export type Notifications_Order_By = {
  action_text?: InputMaybe<Order_By>;
  action_url?: InputMaybe<Order_By>;
  body?: InputMaybe<Order_By>;
  dismissed?: InputMaybe<Order_By>;
  image?: InputMaybe<Media_Order_By>;
  image_id?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  trigger_key?: InputMaybe<Order_By>;
  trigger_time?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** primary key columns input for table: notifications */
export type Notifications_Pk_Columns_Input = {
  trigger_key: Scalars['String'];
  trigger_time: Scalars['timestamptz'];
  user_address: Scalars['String'];
};

/** select columns of table "notifications" */
export enum Notifications_Select_Column {
  /** column name */
  ActionText = 'action_text',
  /** column name */
  ActionUrl = 'action_url',
  /** column name */
  Body = 'body',
  /** column name */
  Dismissed = 'dismissed',
  /** column name */
  ImageId = 'image_id',
  /** column name */
  Title = 'title',
  /** column name */
  TriggerKey = 'trigger_key',
  /** column name */
  TriggerTime = 'trigger_time',
  /** column name */
  UserAddress = 'user_address'
}

/** select "notifications_aggregate_bool_exp_bool_and_arguments_columns" columns of table "notifications" */
export enum Notifications_Select_Column_Notifications_Aggregate_Bool_Exp_Bool_And_Arguments_Columns {
  /** column name */
  Dismissed = 'dismissed'
}

/** select "notifications_aggregate_bool_exp_bool_or_arguments_columns" columns of table "notifications" */
export enum Notifications_Select_Column_Notifications_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns {
  /** column name */
  Dismissed = 'dismissed'
}

/** input type for updating data in table "notifications" */
export type Notifications_Set_Input = {
  action_text?: InputMaybe<Scalars['String']>;
  action_url?: InputMaybe<Scalars['String']>;
  body?: InputMaybe<Scalars['String']>;
  dismissed?: InputMaybe<Scalars['Boolean']>;
  image_id?: InputMaybe<Scalars['Int']>;
  title?: InputMaybe<Scalars['String']>;
  trigger_key?: InputMaybe<Scalars['String']>;
  trigger_time?: InputMaybe<Scalars['timestamptz']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Notifications_Stddev_Fields = {
  __typename?: 'notifications_stddev_fields';
  image_id?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "notifications" */
export type Notifications_Stddev_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Notifications_Stddev_Pop_Fields = {
  __typename?: 'notifications_stddev_pop_fields';
  image_id?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "notifications" */
export type Notifications_Stddev_Pop_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Notifications_Stddev_Samp_Fields = {
  __typename?: 'notifications_stddev_samp_fields';
  image_id?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "notifications" */
export type Notifications_Stddev_Samp_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "notifications" */
export type Notifications_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Notifications_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Notifications_Stream_Cursor_Value_Input = {
  action_text?: InputMaybe<Scalars['String']>;
  action_url?: InputMaybe<Scalars['String']>;
  body?: InputMaybe<Scalars['String']>;
  dismissed?: InputMaybe<Scalars['Boolean']>;
  image_id?: InputMaybe<Scalars['Int']>;
  title?: InputMaybe<Scalars['String']>;
  trigger_key?: InputMaybe<Scalars['String']>;
  trigger_time?: InputMaybe<Scalars['timestamptz']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Notifications_Sum_Fields = {
  __typename?: 'notifications_sum_fields';
  image_id?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "notifications" */
export type Notifications_Sum_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** update columns of table "notifications" */
export enum Notifications_Update_Column {
  /** column name */
  ActionText = 'action_text',
  /** column name */
  ActionUrl = 'action_url',
  /** column name */
  Body = 'body',
  /** column name */
  Dismissed = 'dismissed',
  /** column name */
  ImageId = 'image_id',
  /** column name */
  Title = 'title',
  /** column name */
  TriggerKey = 'trigger_key',
  /** column name */
  TriggerTime = 'trigger_time',
  /** column name */
  UserAddress = 'user_address'
}

export type Notifications_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Notifications_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Notifications_Set_Input>;
  /** filter the rows which have to be updated */
  where: Notifications_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Notifications_Var_Pop_Fields = {
  __typename?: 'notifications_var_pop_fields';
  image_id?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "notifications" */
export type Notifications_Var_Pop_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Notifications_Var_Samp_Fields = {
  __typename?: 'notifications_var_samp_fields';
  image_id?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "notifications" */
export type Notifications_Var_Samp_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Notifications_Variance_Fields = {
  __typename?: 'notifications_variance_fields';
  image_id?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "notifications" */
export type Notifications_Variance_Order_By = {
  image_id?: InputMaybe<Order_By>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['numeric']>;
  _gt?: InputMaybe<Scalars['numeric']>;
  _gte?: InputMaybe<Scalars['numeric']>;
  _in?: InputMaybe<Array<Scalars['numeric']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['numeric']>;
  _lte?: InputMaybe<Scalars['numeric']>;
  _neq?: InputMaybe<Scalars['numeric']>;
  _nin?: InputMaybe<Array<Scalars['numeric']>>;
};

/** column ordering options */
export enum Order_By {
  /** in ascending order, nulls last */
  Asc = 'asc',
  /** in ascending order, nulls first */
  AscNullsFirst = 'asc_nulls_first',
  /** in ascending order, nulls last */
  AscNullsLast = 'asc_nulls_last',
  /** in descending order, nulls first */
  Desc = 'desc',
  /** in descending order, nulls first */
  DescNullsFirst = 'desc_nulls_first',
  /** in descending order, nulls last */
  DescNullsLast = 'desc_nulls_last'
}

/** columns and relationships of "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies = {
  __typename?: 'project_external_asset_dependencies';
  cid: Scalars['String'];
  dependency_type: Project_External_Asset_Dependency_Types_Enum;
  index: Scalars['Int'];
  /** An object relationship */
  project: Projects_Metadata;
  project_id: Scalars['String'];
};

/** aggregated selection of "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Aggregate = {
  __typename?: 'project_external_asset_dependencies_aggregate';
  aggregate?: Maybe<Project_External_Asset_Dependencies_Aggregate_Fields>;
  nodes: Array<Project_External_Asset_Dependencies>;
};

export type Project_External_Asset_Dependencies_Aggregate_Bool_Exp = {
  count?: InputMaybe<Project_External_Asset_Dependencies_Aggregate_Bool_Exp_Count>;
};

export type Project_External_Asset_Dependencies_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Aggregate_Fields = {
  __typename?: 'project_external_asset_dependencies_aggregate_fields';
  avg?: Maybe<Project_External_Asset_Dependencies_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Project_External_Asset_Dependencies_Max_Fields>;
  min?: Maybe<Project_External_Asset_Dependencies_Min_Fields>;
  stddev?: Maybe<Project_External_Asset_Dependencies_Stddev_Fields>;
  stddev_pop?: Maybe<Project_External_Asset_Dependencies_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Project_External_Asset_Dependencies_Stddev_Samp_Fields>;
  sum?: Maybe<Project_External_Asset_Dependencies_Sum_Fields>;
  var_pop?: Maybe<Project_External_Asset_Dependencies_Var_Pop_Fields>;
  var_samp?: Maybe<Project_External_Asset_Dependencies_Var_Samp_Fields>;
  variance?: Maybe<Project_External_Asset_Dependencies_Variance_Fields>;
};


/** aggregate fields of "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Aggregate_Order_By = {
  avg?: InputMaybe<Project_External_Asset_Dependencies_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Project_External_Asset_Dependencies_Max_Order_By>;
  min?: InputMaybe<Project_External_Asset_Dependencies_Min_Order_By>;
  stddev?: InputMaybe<Project_External_Asset_Dependencies_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Project_External_Asset_Dependencies_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Project_External_Asset_Dependencies_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Project_External_Asset_Dependencies_Sum_Order_By>;
  var_pop?: InputMaybe<Project_External_Asset_Dependencies_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Project_External_Asset_Dependencies_Var_Samp_Order_By>;
  variance?: InputMaybe<Project_External_Asset_Dependencies_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Arr_Rel_Insert_Input = {
  data: Array<Project_External_Asset_Dependencies_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Project_External_Asset_Dependencies_On_Conflict>;
};

/** aggregate avg on columns */
export type Project_External_Asset_Dependencies_Avg_Fields = {
  __typename?: 'project_external_asset_dependencies_avg_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Avg_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "project_external_asset_dependencies". All fields are combined with a logical 'AND'. */
export type Project_External_Asset_Dependencies_Bool_Exp = {
  _and?: InputMaybe<Array<Project_External_Asset_Dependencies_Bool_Exp>>;
  _not?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
  _or?: InputMaybe<Array<Project_External_Asset_Dependencies_Bool_Exp>>;
  cid?: InputMaybe<String_Comparison_Exp>;
  dependency_type?: InputMaybe<Project_External_Asset_Dependency_Types_Enum_Comparison_Exp>;
  index?: InputMaybe<Int_Comparison_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "project_external_asset_dependencies" */
export enum Project_External_Asset_Dependencies_Constraint {
  /** unique or primary key constraint on columns "index", "project_id" */
  ProjectExternalAssetDependenciesPkey = 'project_external_asset_dependencies_pkey'
}

/** input type for incrementing numeric columns in table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Inc_Input = {
  index?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Insert_Input = {
  cid?: InputMaybe<Scalars['String']>;
  dependency_type?: InputMaybe<Project_External_Asset_Dependency_Types_Enum>;
  index?: InputMaybe<Scalars['Int']>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Project_External_Asset_Dependencies_Max_Fields = {
  __typename?: 'project_external_asset_dependencies_max_fields';
  cid?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Max_Order_By = {
  cid?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Project_External_Asset_Dependencies_Min_Fields = {
  __typename?: 'project_external_asset_dependencies_min_fields';
  cid?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Min_Order_By = {
  cid?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Mutation_Response = {
  __typename?: 'project_external_asset_dependencies_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Project_External_Asset_Dependencies>;
};

/** on_conflict condition type for table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_On_Conflict = {
  constraint: Project_External_Asset_Dependencies_Constraint;
  update_columns?: Array<Project_External_Asset_Dependencies_Update_Column>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};

/** Ordering options when selecting data from "project_external_asset_dependencies". */
export type Project_External_Asset_Dependencies_Order_By = {
  cid?: InputMaybe<Order_By>;
  dependency_type?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: project_external_asset_dependencies */
export type Project_External_Asset_Dependencies_Pk_Columns_Input = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};

/** select columns of table "project_external_asset_dependencies" */
export enum Project_External_Asset_Dependencies_Select_Column {
  /** column name */
  Cid = 'cid',
  /** column name */
  DependencyType = 'dependency_type',
  /** column name */
  Index = 'index',
  /** column name */
  ProjectId = 'project_id'
}

/** input type for updating data in table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Set_Input = {
  cid?: InputMaybe<Scalars['String']>;
  dependency_type?: InputMaybe<Project_External_Asset_Dependency_Types_Enum>;
  index?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Project_External_Asset_Dependencies_Stddev_Fields = {
  __typename?: 'project_external_asset_dependencies_stddev_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Stddev_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Project_External_Asset_Dependencies_Stddev_Pop_Fields = {
  __typename?: 'project_external_asset_dependencies_stddev_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Stddev_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Project_External_Asset_Dependencies_Stddev_Samp_Fields = {
  __typename?: 'project_external_asset_dependencies_stddev_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Stddev_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Project_External_Asset_Dependencies_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Project_External_Asset_Dependencies_Stream_Cursor_Value_Input = {
  cid?: InputMaybe<Scalars['String']>;
  dependency_type?: InputMaybe<Project_External_Asset_Dependency_Types_Enum>;
  index?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Project_External_Asset_Dependencies_Sum_Fields = {
  __typename?: 'project_external_asset_dependencies_sum_fields';
  index?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Sum_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** update columns of table "project_external_asset_dependencies" */
export enum Project_External_Asset_Dependencies_Update_Column {
  /** column name */
  Cid = 'cid',
  /** column name */
  DependencyType = 'dependency_type',
  /** column name */
  Index = 'index',
  /** column name */
  ProjectId = 'project_id'
}

export type Project_External_Asset_Dependencies_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Project_External_Asset_Dependencies_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Project_External_Asset_Dependencies_Set_Input>;
  /** filter the rows which have to be updated */
  where: Project_External_Asset_Dependencies_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Project_External_Asset_Dependencies_Var_Pop_Fields = {
  __typename?: 'project_external_asset_dependencies_var_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Var_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Project_External_Asset_Dependencies_Var_Samp_Fields = {
  __typename?: 'project_external_asset_dependencies_var_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Var_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Project_External_Asset_Dependencies_Variance_Fields = {
  __typename?: 'project_external_asset_dependencies_variance_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "project_external_asset_dependencies" */
export type Project_External_Asset_Dependencies_Variance_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** columns and relationships of "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types = {
  __typename?: 'project_external_asset_dependency_types';
  type: Scalars['String'];
};

/** aggregated selection of "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_Aggregate = {
  __typename?: 'project_external_asset_dependency_types_aggregate';
  aggregate?: Maybe<Project_External_Asset_Dependency_Types_Aggregate_Fields>;
  nodes: Array<Project_External_Asset_Dependency_Types>;
};

/** aggregate fields of "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_Aggregate_Fields = {
  __typename?: 'project_external_asset_dependency_types_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Project_External_Asset_Dependency_Types_Max_Fields>;
  min?: Maybe<Project_External_Asset_Dependency_Types_Min_Fields>;
};


/** aggregate fields of "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "project_external_asset_dependency_types". All fields are combined with a logical 'AND'. */
export type Project_External_Asset_Dependency_Types_Bool_Exp = {
  _and?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Bool_Exp>>;
  _not?: InputMaybe<Project_External_Asset_Dependency_Types_Bool_Exp>;
  _or?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Bool_Exp>>;
  type?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "project_external_asset_dependency_types" */
export enum Project_External_Asset_Dependency_Types_Constraint {
  /** unique or primary key constraint on columns "type" */
  ProjectExternalAssetDependencyTypesPkey = 'project_external_asset_dependency_types_pkey'
}

export enum Project_External_Asset_Dependency_Types_Enum {
  Arweave = 'ARWEAVE',
  Ipfs = 'IPFS'
}

/** Boolean expression to compare columns of type "project_external_asset_dependency_types_enum". All fields are combined with logical 'AND'. */
export type Project_External_Asset_Dependency_Types_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Project_External_Asset_Dependency_Types_Enum>;
  _in?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Project_External_Asset_Dependency_Types_Enum>;
  _nin?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Enum>>;
};

/** input type for inserting data into table "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_Insert_Input = {
  type?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Project_External_Asset_Dependency_Types_Max_Fields = {
  __typename?: 'project_external_asset_dependency_types_max_fields';
  type?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Project_External_Asset_Dependency_Types_Min_Fields = {
  __typename?: 'project_external_asset_dependency_types_min_fields';
  type?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_Mutation_Response = {
  __typename?: 'project_external_asset_dependency_types_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Project_External_Asset_Dependency_Types>;
};

/** on_conflict condition type for table "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_On_Conflict = {
  constraint: Project_External_Asset_Dependency_Types_Constraint;
  update_columns?: Array<Project_External_Asset_Dependency_Types_Update_Column>;
  where?: InputMaybe<Project_External_Asset_Dependency_Types_Bool_Exp>;
};

/** Ordering options when selecting data from "project_external_asset_dependency_types". */
export type Project_External_Asset_Dependency_Types_Order_By = {
  type?: InputMaybe<Order_By>;
};

/** primary key columns input for table: project_external_asset_dependency_types */
export type Project_External_Asset_Dependency_Types_Pk_Columns_Input = {
  type: Scalars['String'];
};

/** select columns of table "project_external_asset_dependency_types" */
export enum Project_External_Asset_Dependency_Types_Select_Column {
  /** column name */
  Type = 'type'
}

/** input type for updating data in table "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_Set_Input = {
  type?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "project_external_asset_dependency_types" */
export type Project_External_Asset_Dependency_Types_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Project_External_Asset_Dependency_Types_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Project_External_Asset_Dependency_Types_Stream_Cursor_Value_Input = {
  type?: InputMaybe<Scalars['String']>;
};

/** update columns of table "project_external_asset_dependency_types" */
export enum Project_External_Asset_Dependency_Types_Update_Column {
  /** column name */
  Type = 'type'
}

export type Project_External_Asset_Dependency_Types_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Project_External_Asset_Dependency_Types_Set_Input>;
  /** filter the rows which have to be updated */
  where: Project_External_Asset_Dependency_Types_Bool_Exp;
};

/** columns and relationships of "project_minter_configurations" */
export type Project_Minter_Configurations = {
  __typename?: 'project_minter_configurations';
  /** A computed field, executes function "approximate_exp_da_end_time" */
  approximate_exp_da_end_time?: Maybe<Scalars['timestamptz']>;
  base_price?: Maybe<Scalars['String']>;
  currency_address: Scalars['String'];
  currency_symbol: Scalars['String'];
  end_time?: Maybe<Scalars['timestamptz']>;
  extra_minter_details?: Maybe<Scalars['jsonb']>;
  half_life_in_seconds?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  /** An object relationship */
  minter?: Maybe<Minters_Metadata>;
  minter_id: Scalars['String'];
  offchain_extra_minter_details?: Maybe<Scalars['jsonb']>;
  price_is_configured: Scalars['Boolean'];
  /** An object relationship */
  project?: Maybe<Projects_Metadata>;
  project_id: Scalars['String'];
  purchase_to_disabled: Scalars['Boolean'];
  start_price?: Maybe<Scalars['String']>;
  start_time?: Maybe<Scalars['timestamptz']>;
};


/** columns and relationships of "project_minter_configurations" */
export type Project_Minter_ConfigurationsExtra_Minter_DetailsArgs = {
  path?: InputMaybe<Scalars['String']>;
};


/** columns and relationships of "project_minter_configurations" */
export type Project_Minter_ConfigurationsOffchain_Extra_Minter_DetailsArgs = {
  path?: InputMaybe<Scalars['String']>;
};

/** aggregated selection of "project_minter_configurations" */
export type Project_Minter_Configurations_Aggregate = {
  __typename?: 'project_minter_configurations_aggregate';
  aggregate?: Maybe<Project_Minter_Configurations_Aggregate_Fields>;
  nodes: Array<Project_Minter_Configurations>;
};

/** aggregate fields of "project_minter_configurations" */
export type Project_Minter_Configurations_Aggregate_Fields = {
  __typename?: 'project_minter_configurations_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Project_Minter_Configurations_Max_Fields>;
  min?: Maybe<Project_Minter_Configurations_Min_Fields>;
};


/** aggregate fields of "project_minter_configurations" */
export type Project_Minter_Configurations_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Project_Minter_Configurations_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Project_Minter_Configurations_Append_Input = {
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  offchain_extra_minter_details?: InputMaybe<Scalars['jsonb']>;
};

/** Boolean expression to filter rows from the table "project_minter_configurations". All fields are combined with a logical 'AND'. */
export type Project_Minter_Configurations_Bool_Exp = {
  _and?: InputMaybe<Array<Project_Minter_Configurations_Bool_Exp>>;
  _not?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
  _or?: InputMaybe<Array<Project_Minter_Configurations_Bool_Exp>>;
  approximate_exp_da_end_time?: InputMaybe<Timestamptz_Comparison_Exp>;
  base_price?: InputMaybe<String_Comparison_Exp>;
  currency_address?: InputMaybe<String_Comparison_Exp>;
  currency_symbol?: InputMaybe<String_Comparison_Exp>;
  end_time?: InputMaybe<Timestamptz_Comparison_Exp>;
  extra_minter_details?: InputMaybe<Jsonb_Comparison_Exp>;
  half_life_in_seconds?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<String_Comparison_Exp>;
  minter?: InputMaybe<Minters_Metadata_Bool_Exp>;
  minter_id?: InputMaybe<String_Comparison_Exp>;
  offchain_extra_minter_details?: InputMaybe<Jsonb_Comparison_Exp>;
  price_is_configured?: InputMaybe<Boolean_Comparison_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
  purchase_to_disabled?: InputMaybe<Boolean_Comparison_Exp>;
  start_price?: InputMaybe<String_Comparison_Exp>;
  start_time?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "project_minter_configurations" */
export enum Project_Minter_Configurations_Constraint {
  /** unique or primary key constraint on columns "id" */
  ProjectMinterConfigurationsPkey = 'project_minter_configurations_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Project_Minter_Configurations_Delete_At_Path_Input = {
  extra_minter_details?: InputMaybe<Array<Scalars['String']>>;
  offchain_extra_minter_details?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Project_Minter_Configurations_Delete_Elem_Input = {
  extra_minter_details?: InputMaybe<Scalars['Int']>;
  offchain_extra_minter_details?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Project_Minter_Configurations_Delete_Key_Input = {
  extra_minter_details?: InputMaybe<Scalars['String']>;
  offchain_extra_minter_details?: InputMaybe<Scalars['String']>;
};

/** input type for inserting data into table "project_minter_configurations" */
export type Project_Minter_Configurations_Insert_Input = {
  base_price?: InputMaybe<Scalars['String']>;
  currency_address?: InputMaybe<Scalars['String']>;
  currency_symbol?: InputMaybe<Scalars['String']>;
  end_time?: InputMaybe<Scalars['timestamptz']>;
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  half_life_in_seconds?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['String']>;
  minter?: InputMaybe<Minters_Metadata_Obj_Rel_Insert_Input>;
  minter_id?: InputMaybe<Scalars['String']>;
  offchain_extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  price_is_configured?: InputMaybe<Scalars['Boolean']>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
  purchase_to_disabled?: InputMaybe<Scalars['Boolean']>;
  start_price?: InputMaybe<Scalars['String']>;
  start_time?: InputMaybe<Scalars['timestamptz']>;
};

/** aggregate max on columns */
export type Project_Minter_Configurations_Max_Fields = {
  __typename?: 'project_minter_configurations_max_fields';
  base_price?: Maybe<Scalars['String']>;
  currency_address?: Maybe<Scalars['String']>;
  currency_symbol?: Maybe<Scalars['String']>;
  end_time?: Maybe<Scalars['timestamptz']>;
  half_life_in_seconds?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['String']>;
  minter_id?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  start_price?: Maybe<Scalars['String']>;
  start_time?: Maybe<Scalars['timestamptz']>;
};

/** aggregate min on columns */
export type Project_Minter_Configurations_Min_Fields = {
  __typename?: 'project_minter_configurations_min_fields';
  base_price?: Maybe<Scalars['String']>;
  currency_address?: Maybe<Scalars['String']>;
  currency_symbol?: Maybe<Scalars['String']>;
  end_time?: Maybe<Scalars['timestamptz']>;
  half_life_in_seconds?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['String']>;
  minter_id?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  start_price?: Maybe<Scalars['String']>;
  start_time?: Maybe<Scalars['timestamptz']>;
};

/** response of any mutation on the table "project_minter_configurations" */
export type Project_Minter_Configurations_Mutation_Response = {
  __typename?: 'project_minter_configurations_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Project_Minter_Configurations>;
};

/** input type for inserting object relation for remote table "project_minter_configurations" */
export type Project_Minter_Configurations_Obj_Rel_Insert_Input = {
  data: Project_Minter_Configurations_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Project_Minter_Configurations_On_Conflict>;
};

/** on_conflict condition type for table "project_minter_configurations" */
export type Project_Minter_Configurations_On_Conflict = {
  constraint: Project_Minter_Configurations_Constraint;
  update_columns?: Array<Project_Minter_Configurations_Update_Column>;
  where?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
};

/** Ordering options when selecting data from "project_minter_configurations". */
export type Project_Minter_Configurations_Order_By = {
  approximate_exp_da_end_time?: InputMaybe<Order_By>;
  base_price?: InputMaybe<Order_By>;
  currency_address?: InputMaybe<Order_By>;
  currency_symbol?: InputMaybe<Order_By>;
  end_time?: InputMaybe<Order_By>;
  extra_minter_details?: InputMaybe<Order_By>;
  half_life_in_seconds?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  minter?: InputMaybe<Minters_Metadata_Order_By>;
  minter_id?: InputMaybe<Order_By>;
  offchain_extra_minter_details?: InputMaybe<Order_By>;
  price_is_configured?: InputMaybe<Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
  purchase_to_disabled?: InputMaybe<Order_By>;
  start_price?: InputMaybe<Order_By>;
  start_time?: InputMaybe<Order_By>;
};

/** primary key columns input for table: project_minter_configurations */
export type Project_Minter_Configurations_Pk_Columns_Input = {
  id: Scalars['String'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Project_Minter_Configurations_Prepend_Input = {
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  offchain_extra_minter_details?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "project_minter_configurations" */
export enum Project_Minter_Configurations_Select_Column {
  /** column name */
  BasePrice = 'base_price',
  /** column name */
  CurrencyAddress = 'currency_address',
  /** column name */
  CurrencySymbol = 'currency_symbol',
  /** column name */
  EndTime = 'end_time',
  /** column name */
  ExtraMinterDetails = 'extra_minter_details',
  /** column name */
  HalfLifeInSeconds = 'half_life_in_seconds',
  /** column name */
  Id = 'id',
  /** column name */
  MinterId = 'minter_id',
  /** column name */
  OffchainExtraMinterDetails = 'offchain_extra_minter_details',
  /** column name */
  PriceIsConfigured = 'price_is_configured',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  PurchaseToDisabled = 'purchase_to_disabled',
  /** column name */
  StartPrice = 'start_price',
  /** column name */
  StartTime = 'start_time'
}

/** input type for updating data in table "project_minter_configurations" */
export type Project_Minter_Configurations_Set_Input = {
  base_price?: InputMaybe<Scalars['String']>;
  currency_address?: InputMaybe<Scalars['String']>;
  currency_symbol?: InputMaybe<Scalars['String']>;
  end_time?: InputMaybe<Scalars['timestamptz']>;
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  half_life_in_seconds?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['String']>;
  minter_id?: InputMaybe<Scalars['String']>;
  offchain_extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  price_is_configured?: InputMaybe<Scalars['Boolean']>;
  project_id?: InputMaybe<Scalars['String']>;
  purchase_to_disabled?: InputMaybe<Scalars['Boolean']>;
  start_price?: InputMaybe<Scalars['String']>;
  start_time?: InputMaybe<Scalars['timestamptz']>;
};

/** Streaming cursor of the table "project_minter_configurations" */
export type Project_Minter_Configurations_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Project_Minter_Configurations_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Project_Minter_Configurations_Stream_Cursor_Value_Input = {
  base_price?: InputMaybe<Scalars['String']>;
  currency_address?: InputMaybe<Scalars['String']>;
  currency_symbol?: InputMaybe<Scalars['String']>;
  end_time?: InputMaybe<Scalars['timestamptz']>;
  extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  half_life_in_seconds?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['String']>;
  minter_id?: InputMaybe<Scalars['String']>;
  offchain_extra_minter_details?: InputMaybe<Scalars['jsonb']>;
  price_is_configured?: InputMaybe<Scalars['Boolean']>;
  project_id?: InputMaybe<Scalars['String']>;
  purchase_to_disabled?: InputMaybe<Scalars['Boolean']>;
  start_price?: InputMaybe<Scalars['String']>;
  start_time?: InputMaybe<Scalars['timestamptz']>;
};

/** update columns of table "project_minter_configurations" */
export enum Project_Minter_Configurations_Update_Column {
  /** column name */
  BasePrice = 'base_price',
  /** column name */
  CurrencyAddress = 'currency_address',
  /** column name */
  CurrencySymbol = 'currency_symbol',
  /** column name */
  EndTime = 'end_time',
  /** column name */
  ExtraMinterDetails = 'extra_minter_details',
  /** column name */
  HalfLifeInSeconds = 'half_life_in_seconds',
  /** column name */
  Id = 'id',
  /** column name */
  MinterId = 'minter_id',
  /** column name */
  OffchainExtraMinterDetails = 'offchain_extra_minter_details',
  /** column name */
  PriceIsConfigured = 'price_is_configured',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  PurchaseToDisabled = 'purchase_to_disabled',
  /** column name */
  StartPrice = 'start_price',
  /** column name */
  StartTime = 'start_time'
}

export type Project_Minter_Configurations_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Project_Minter_Configurations_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Project_Minter_Configurations_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Project_Minter_Configurations_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Project_Minter_Configurations_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Project_Minter_Configurations_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Project_Minter_Configurations_Set_Input>;
  /** filter the rows which have to be updated */
  where: Project_Minter_Configurations_Bool_Exp;
};

/** columns and relationships of "project_scripts" */
export type Project_Scripts = {
  __typename?: 'project_scripts';
  index: Scalars['Int'];
  /** An object relationship */
  project?: Maybe<Projects_Metadata>;
  project_id: Scalars['String'];
  script: Scalars['String'];
};

/** aggregated selection of "project_scripts" */
export type Project_Scripts_Aggregate = {
  __typename?: 'project_scripts_aggregate';
  aggregate?: Maybe<Project_Scripts_Aggregate_Fields>;
  nodes: Array<Project_Scripts>;
};

export type Project_Scripts_Aggregate_Bool_Exp = {
  count?: InputMaybe<Project_Scripts_Aggregate_Bool_Exp_Count>;
};

export type Project_Scripts_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Project_Scripts_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "project_scripts" */
export type Project_Scripts_Aggregate_Fields = {
  __typename?: 'project_scripts_aggregate_fields';
  avg?: Maybe<Project_Scripts_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Project_Scripts_Max_Fields>;
  min?: Maybe<Project_Scripts_Min_Fields>;
  stddev?: Maybe<Project_Scripts_Stddev_Fields>;
  stddev_pop?: Maybe<Project_Scripts_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Project_Scripts_Stddev_Samp_Fields>;
  sum?: Maybe<Project_Scripts_Sum_Fields>;
  var_pop?: Maybe<Project_Scripts_Var_Pop_Fields>;
  var_samp?: Maybe<Project_Scripts_Var_Samp_Fields>;
  variance?: Maybe<Project_Scripts_Variance_Fields>;
};


/** aggregate fields of "project_scripts" */
export type Project_Scripts_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "project_scripts" */
export type Project_Scripts_Aggregate_Order_By = {
  avg?: InputMaybe<Project_Scripts_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Project_Scripts_Max_Order_By>;
  min?: InputMaybe<Project_Scripts_Min_Order_By>;
  stddev?: InputMaybe<Project_Scripts_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Project_Scripts_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Project_Scripts_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Project_Scripts_Sum_Order_By>;
  var_pop?: InputMaybe<Project_Scripts_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Project_Scripts_Var_Samp_Order_By>;
  variance?: InputMaybe<Project_Scripts_Variance_Order_By>;
};

/** input type for inserting array relation for remote table "project_scripts" */
export type Project_Scripts_Arr_Rel_Insert_Input = {
  data: Array<Project_Scripts_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Project_Scripts_On_Conflict>;
};

/** aggregate avg on columns */
export type Project_Scripts_Avg_Fields = {
  __typename?: 'project_scripts_avg_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "project_scripts" */
export type Project_Scripts_Avg_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "project_scripts". All fields are combined with a logical 'AND'. */
export type Project_Scripts_Bool_Exp = {
  _and?: InputMaybe<Array<Project_Scripts_Bool_Exp>>;
  _not?: InputMaybe<Project_Scripts_Bool_Exp>;
  _or?: InputMaybe<Array<Project_Scripts_Bool_Exp>>;
  index?: InputMaybe<Int_Comparison_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
  script?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "project_scripts" */
export enum Project_Scripts_Constraint {
  /** unique or primary key constraint on columns "index", "project_id" */
  ProjectScriptsPkey = 'project_scripts_pkey'
}

/** input type for incrementing numeric columns in table "project_scripts" */
export type Project_Scripts_Inc_Input = {
  index?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "project_scripts" */
export type Project_Scripts_Insert_Input = {
  index?: InputMaybe<Scalars['Int']>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Project_Scripts_Max_Fields = {
  __typename?: 'project_scripts_max_fields';
  index?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "project_scripts" */
export type Project_Scripts_Max_Order_By = {
  index?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Project_Scripts_Min_Fields = {
  __typename?: 'project_scripts_min_fields';
  index?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "project_scripts" */
export type Project_Scripts_Min_Order_By = {
  index?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "project_scripts" */
export type Project_Scripts_Mutation_Response = {
  __typename?: 'project_scripts_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Project_Scripts>;
};

/** on_conflict condition type for table "project_scripts" */
export type Project_Scripts_On_Conflict = {
  constraint: Project_Scripts_Constraint;
  update_columns?: Array<Project_Scripts_Update_Column>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};

/** Ordering options when selecting data from "project_scripts". */
export type Project_Scripts_Order_By = {
  index?: InputMaybe<Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
};

/** primary key columns input for table: project_scripts */
export type Project_Scripts_Pk_Columns_Input = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};

/** select columns of table "project_scripts" */
export enum Project_Scripts_Select_Column {
  /** column name */
  Index = 'index',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  Script = 'script'
}

/** input type for updating data in table "project_scripts" */
export type Project_Scripts_Set_Input = {
  index?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Project_Scripts_Stddev_Fields = {
  __typename?: 'project_scripts_stddev_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "project_scripts" */
export type Project_Scripts_Stddev_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Project_Scripts_Stddev_Pop_Fields = {
  __typename?: 'project_scripts_stddev_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "project_scripts" */
export type Project_Scripts_Stddev_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Project_Scripts_Stddev_Samp_Fields = {
  __typename?: 'project_scripts_stddev_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "project_scripts" */
export type Project_Scripts_Stddev_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "project_scripts" */
export type Project_Scripts_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Project_Scripts_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Project_Scripts_Stream_Cursor_Value_Input = {
  index?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Project_Scripts_Sum_Fields = {
  __typename?: 'project_scripts_sum_fields';
  index?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "project_scripts" */
export type Project_Scripts_Sum_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** update columns of table "project_scripts" */
export enum Project_Scripts_Update_Column {
  /** column name */
  Index = 'index',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  Script = 'script'
}

export type Project_Scripts_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Project_Scripts_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Project_Scripts_Set_Input>;
  /** filter the rows which have to be updated */
  where: Project_Scripts_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Project_Scripts_Var_Pop_Fields = {
  __typename?: 'project_scripts_var_pop_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "project_scripts" */
export type Project_Scripts_Var_Pop_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Project_Scripts_Var_Samp_Fields = {
  __typename?: 'project_scripts_var_samp_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "project_scripts" */
export type Project_Scripts_Var_Samp_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Project_Scripts_Variance_Fields = {
  __typename?: 'project_scripts_variance_fields';
  index?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "project_scripts" */
export type Project_Scripts_Variance_Order_By = {
  index?: InputMaybe<Order_By>;
};

/** columns and relationships of "project_series" */
export type Project_Series = {
  __typename?: 'project_series';
  id: Scalars['Int'];
  /** An array relationship */
  projects: Array<Projects_Metadata>;
  /** An aggregate relationship */
  projects_aggregate: Projects_Metadata_Aggregate;
};


/** columns and relationships of "project_series" */
export type Project_SeriesProjectsArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


/** columns and relationships of "project_series" */
export type Project_SeriesProjects_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};

/** aggregated selection of "project_series" */
export type Project_Series_Aggregate = {
  __typename?: 'project_series_aggregate';
  aggregate?: Maybe<Project_Series_Aggregate_Fields>;
  nodes: Array<Project_Series>;
};

/** aggregate fields of "project_series" */
export type Project_Series_Aggregate_Fields = {
  __typename?: 'project_series_aggregate_fields';
  avg?: Maybe<Project_Series_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Project_Series_Max_Fields>;
  min?: Maybe<Project_Series_Min_Fields>;
  stddev?: Maybe<Project_Series_Stddev_Fields>;
  stddev_pop?: Maybe<Project_Series_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Project_Series_Stddev_Samp_Fields>;
  sum?: Maybe<Project_Series_Sum_Fields>;
  var_pop?: Maybe<Project_Series_Var_Pop_Fields>;
  var_samp?: Maybe<Project_Series_Var_Samp_Fields>;
  variance?: Maybe<Project_Series_Variance_Fields>;
};


/** aggregate fields of "project_series" */
export type Project_Series_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Project_Series_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Project_Series_Avg_Fields = {
  __typename?: 'project_series_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "project_series". All fields are combined with a logical 'AND'. */
export type Project_Series_Bool_Exp = {
  _and?: InputMaybe<Array<Project_Series_Bool_Exp>>;
  _not?: InputMaybe<Project_Series_Bool_Exp>;
  _or?: InputMaybe<Array<Project_Series_Bool_Exp>>;
  id?: InputMaybe<Int_Comparison_Exp>;
  projects?: InputMaybe<Projects_Metadata_Bool_Exp>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp>;
};

/** unique or primary key constraints on table "project_series" */
export enum Project_Series_Constraint {
  /** unique or primary key constraint on columns "id" */
  ProjectSeriesPkey = 'project_series_pkey'
}

/** input type for incrementing numeric columns in table "project_series" */
export type Project_Series_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "project_series" */
export type Project_Series_Insert_Input = {
  id?: InputMaybe<Scalars['Int']>;
  projects?: InputMaybe<Projects_Metadata_Arr_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Project_Series_Max_Fields = {
  __typename?: 'project_series_max_fields';
  id?: Maybe<Scalars['Int']>;
};

/** aggregate min on columns */
export type Project_Series_Min_Fields = {
  __typename?: 'project_series_min_fields';
  id?: Maybe<Scalars['Int']>;
};

/** response of any mutation on the table "project_series" */
export type Project_Series_Mutation_Response = {
  __typename?: 'project_series_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Project_Series>;
};

/** input type for inserting object relation for remote table "project_series" */
export type Project_Series_Obj_Rel_Insert_Input = {
  data: Project_Series_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Project_Series_On_Conflict>;
};

/** on_conflict condition type for table "project_series" */
export type Project_Series_On_Conflict = {
  constraint: Project_Series_Constraint;
  update_columns?: Array<Project_Series_Update_Column>;
  where?: InputMaybe<Project_Series_Bool_Exp>;
};

/** Ordering options when selecting data from "project_series". */
export type Project_Series_Order_By = {
  id?: InputMaybe<Order_By>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Order_By>;
};

/** primary key columns input for table: project_series */
export type Project_Series_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** select columns of table "project_series" */
export enum Project_Series_Select_Column {
  /** column name */
  Id = 'id'
}

/** input type for updating data in table "project_series" */
export type Project_Series_Set_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** aggregate stddev on columns */
export type Project_Series_Stddev_Fields = {
  __typename?: 'project_series_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Project_Series_Stddev_Pop_Fields = {
  __typename?: 'project_series_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Project_Series_Stddev_Samp_Fields = {
  __typename?: 'project_series_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "project_series" */
export type Project_Series_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Project_Series_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Project_Series_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** aggregate sum on columns */
export type Project_Series_Sum_Fields = {
  __typename?: 'project_series_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** update columns of table "project_series" */
export enum Project_Series_Update_Column {
  /** column name */
  Id = 'id'
}

export type Project_Series_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Project_Series_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Project_Series_Set_Input>;
  /** filter the rows which have to be updated */
  where: Project_Series_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Project_Series_Var_Pop_Fields = {
  __typename?: 'project_series_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Project_Series_Var_Samp_Fields = {
  __typename?: 'project_series_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Project_Series_Variance_Fields = {
  __typename?: 'project_series_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

/** columns and relationships of "project_vertical_categories" */
export type Project_Vertical_Categories = {
  __typename?: 'project_vertical_categories';
  /** An object relationship */
  category: Categories;
  hosted: Scalars['Boolean'];
  is_artblocks?: Maybe<Scalars['Boolean']>;
  name: Categories_Enum;
  /** An array relationship */
  verticals: Array<Project_Verticals>;
  /** An aggregate relationship */
  verticals_aggregate: Project_Verticals_Aggregate;
};


/** columns and relationships of "project_vertical_categories" */
export type Project_Vertical_CategoriesVerticalsArgs = {
  distinct_on?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Verticals_Order_By>>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};


/** columns and relationships of "project_vertical_categories" */
export type Project_Vertical_CategoriesVerticals_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Verticals_Order_By>>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};

/** aggregated selection of "project_vertical_categories" */
export type Project_Vertical_Categories_Aggregate = {
  __typename?: 'project_vertical_categories_aggregate';
  aggregate?: Maybe<Project_Vertical_Categories_Aggregate_Fields>;
  nodes: Array<Project_Vertical_Categories>;
};

/** aggregate fields of "project_vertical_categories" */
export type Project_Vertical_Categories_Aggregate_Fields = {
  __typename?: 'project_vertical_categories_aggregate_fields';
  count: Scalars['Int'];
};


/** aggregate fields of "project_vertical_categories" */
export type Project_Vertical_Categories_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Project_Vertical_Categories_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "project_vertical_categories". All fields are combined with a logical 'AND'. */
export type Project_Vertical_Categories_Bool_Exp = {
  _and?: InputMaybe<Array<Project_Vertical_Categories_Bool_Exp>>;
  _not?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
  _or?: InputMaybe<Array<Project_Vertical_Categories_Bool_Exp>>;
  category?: InputMaybe<Categories_Bool_Exp>;
  hosted?: InputMaybe<Boolean_Comparison_Exp>;
  is_artblocks?: InputMaybe<Boolean_Comparison_Exp>;
  name?: InputMaybe<Categories_Enum_Comparison_Exp>;
  verticals?: InputMaybe<Project_Verticals_Bool_Exp>;
  verticals_aggregate?: InputMaybe<Project_Verticals_Aggregate_Bool_Exp>;
};

/** unique or primary key constraints on table "project_vertical_categories" */
export enum Project_Vertical_Categories_Constraint {
  /** unique or primary key constraint on columns "name" */
  ProjectVerticalCategoriesPkey = 'project_vertical_categories_pkey'
}

/** input type for inserting data into table "project_vertical_categories" */
export type Project_Vertical_Categories_Insert_Input = {
  category?: InputMaybe<Categories_Obj_Rel_Insert_Input>;
  hosted?: InputMaybe<Scalars['Boolean']>;
  is_artblocks?: InputMaybe<Scalars['Boolean']>;
  name?: InputMaybe<Categories_Enum>;
  verticals?: InputMaybe<Project_Verticals_Arr_Rel_Insert_Input>;
};

/** response of any mutation on the table "project_vertical_categories" */
export type Project_Vertical_Categories_Mutation_Response = {
  __typename?: 'project_vertical_categories_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Project_Vertical_Categories>;
};

/** input type for inserting object relation for remote table "project_vertical_categories" */
export type Project_Vertical_Categories_Obj_Rel_Insert_Input = {
  data: Project_Vertical_Categories_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Project_Vertical_Categories_On_Conflict>;
};

/** on_conflict condition type for table "project_vertical_categories" */
export type Project_Vertical_Categories_On_Conflict = {
  constraint: Project_Vertical_Categories_Constraint;
  update_columns?: Array<Project_Vertical_Categories_Update_Column>;
  where?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
};

/** Ordering options when selecting data from "project_vertical_categories". */
export type Project_Vertical_Categories_Order_By = {
  category?: InputMaybe<Categories_Order_By>;
  hosted?: InputMaybe<Order_By>;
  is_artblocks?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  verticals_aggregate?: InputMaybe<Project_Verticals_Aggregate_Order_By>;
};

/** primary key columns input for table: project_vertical_categories */
export type Project_Vertical_Categories_Pk_Columns_Input = {
  name: Categories_Enum;
};

/** select columns of table "project_vertical_categories" */
export enum Project_Vertical_Categories_Select_Column {
  /** column name */
  Hosted = 'hosted',
  /** column name */
  IsArtblocks = 'is_artblocks',
  /** column name */
  Name = 'name'
}

/** input type for updating data in table "project_vertical_categories" */
export type Project_Vertical_Categories_Set_Input = {
  hosted?: InputMaybe<Scalars['Boolean']>;
  is_artblocks?: InputMaybe<Scalars['Boolean']>;
  name?: InputMaybe<Categories_Enum>;
};

/** Streaming cursor of the table "project_vertical_categories" */
export type Project_Vertical_Categories_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Project_Vertical_Categories_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Project_Vertical_Categories_Stream_Cursor_Value_Input = {
  hosted?: InputMaybe<Scalars['Boolean']>;
  is_artblocks?: InputMaybe<Scalars['Boolean']>;
  name?: InputMaybe<Categories_Enum>;
};

/** update columns of table "project_vertical_categories" */
export enum Project_Vertical_Categories_Update_Column {
  /** column name */
  Hosted = 'hosted',
  /** column name */
  IsArtblocks = 'is_artblocks',
  /** column name */
  Name = 'name'
}

export type Project_Vertical_Categories_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Project_Vertical_Categories_Set_Input>;
  /** filter the rows which have to be updated */
  where: Project_Vertical_Categories_Bool_Exp;
};

/** columns and relationships of "project_verticals" */
export type Project_Verticals = {
  __typename?: 'project_verticals';
  active: Scalars['Boolean'];
  /** An object relationship */
  category: Project_Vertical_Categories;
  category_name: Scalars['String'];
  description?: Maybe<Scalars['String']>;
  display_name: Scalars['String'];
  name: Verticals_Enum;
  /** An array relationship */
  projects: Array<Projects_Metadata>;
  /** An aggregate relationship */
  projects_aggregate: Projects_Metadata_Aggregate;
  /** An object relationship */
  vertical: Verticals;
};


/** columns and relationships of "project_verticals" */
export type Project_VerticalsProjectsArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


/** columns and relationships of "project_verticals" */
export type Project_VerticalsProjects_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};

/** aggregated selection of "project_verticals" */
export type Project_Verticals_Aggregate = {
  __typename?: 'project_verticals_aggregate';
  aggregate?: Maybe<Project_Verticals_Aggregate_Fields>;
  nodes: Array<Project_Verticals>;
};

export type Project_Verticals_Aggregate_Bool_Exp = {
  bool_and?: InputMaybe<Project_Verticals_Aggregate_Bool_Exp_Bool_And>;
  bool_or?: InputMaybe<Project_Verticals_Aggregate_Bool_Exp_Bool_Or>;
  count?: InputMaybe<Project_Verticals_Aggregate_Bool_Exp_Count>;
};

export type Project_Verticals_Aggregate_Bool_Exp_Bool_And = {
  arguments: Project_Verticals_Select_Column_Project_Verticals_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Project_Verticals_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Project_Verticals_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Project_Verticals_Select_Column_Project_Verticals_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Project_Verticals_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Project_Verticals_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Project_Verticals_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "project_verticals" */
export type Project_Verticals_Aggregate_Fields = {
  __typename?: 'project_verticals_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Project_Verticals_Max_Fields>;
  min?: Maybe<Project_Verticals_Min_Fields>;
};


/** aggregate fields of "project_verticals" */
export type Project_Verticals_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "project_verticals" */
export type Project_Verticals_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Project_Verticals_Max_Order_By>;
  min?: InputMaybe<Project_Verticals_Min_Order_By>;
};

/** input type for inserting array relation for remote table "project_verticals" */
export type Project_Verticals_Arr_Rel_Insert_Input = {
  data: Array<Project_Verticals_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Project_Verticals_On_Conflict>;
};

/** Boolean expression to filter rows from the table "project_verticals". All fields are combined with a logical 'AND'. */
export type Project_Verticals_Bool_Exp = {
  _and?: InputMaybe<Array<Project_Verticals_Bool_Exp>>;
  _not?: InputMaybe<Project_Verticals_Bool_Exp>;
  _or?: InputMaybe<Array<Project_Verticals_Bool_Exp>>;
  active?: InputMaybe<Boolean_Comparison_Exp>;
  category?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
  category_name?: InputMaybe<String_Comparison_Exp>;
  description?: InputMaybe<String_Comparison_Exp>;
  display_name?: InputMaybe<String_Comparison_Exp>;
  name?: InputMaybe<Verticals_Enum_Comparison_Exp>;
  projects?: InputMaybe<Projects_Metadata_Bool_Exp>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp>;
  vertical?: InputMaybe<Verticals_Bool_Exp>;
};

/** unique or primary key constraints on table "project_verticals" */
export enum Project_Verticals_Constraint {
  /** unique or primary key constraint on columns "name" */
  ProjectVerticalsPkey = 'project_verticals_pkey'
}

/** input type for inserting data into table "project_verticals" */
export type Project_Verticals_Insert_Input = {
  active?: InputMaybe<Scalars['Boolean']>;
  category?: InputMaybe<Project_Vertical_Categories_Obj_Rel_Insert_Input>;
  category_name?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  display_name?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Verticals_Enum>;
  projects?: InputMaybe<Projects_Metadata_Arr_Rel_Insert_Input>;
  vertical?: InputMaybe<Verticals_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Project_Verticals_Max_Fields = {
  __typename?: 'project_verticals_max_fields';
  category_name?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  display_name?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "project_verticals" */
export type Project_Verticals_Max_Order_By = {
  category_name?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  display_name?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Project_Verticals_Min_Fields = {
  __typename?: 'project_verticals_min_fields';
  category_name?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  display_name?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "project_verticals" */
export type Project_Verticals_Min_Order_By = {
  category_name?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  display_name?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "project_verticals" */
export type Project_Verticals_Mutation_Response = {
  __typename?: 'project_verticals_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Project_Verticals>;
};

/** input type for inserting object relation for remote table "project_verticals" */
export type Project_Verticals_Obj_Rel_Insert_Input = {
  data: Project_Verticals_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Project_Verticals_On_Conflict>;
};

/** on_conflict condition type for table "project_verticals" */
export type Project_Verticals_On_Conflict = {
  constraint: Project_Verticals_Constraint;
  update_columns?: Array<Project_Verticals_Update_Column>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};

/** Ordering options when selecting data from "project_verticals". */
export type Project_Verticals_Order_By = {
  active?: InputMaybe<Order_By>;
  category?: InputMaybe<Project_Vertical_Categories_Order_By>;
  category_name?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  display_name?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  projects_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Order_By>;
  vertical?: InputMaybe<Verticals_Order_By>;
};

/** primary key columns input for table: project_verticals */
export type Project_Verticals_Pk_Columns_Input = {
  name: Verticals_Enum;
};

/** select columns of table "project_verticals" */
export enum Project_Verticals_Select_Column {
  /** column name */
  Active = 'active',
  /** column name */
  CategoryName = 'category_name',
  /** column name */
  Description = 'description',
  /** column name */
  DisplayName = 'display_name',
  /** column name */
  Name = 'name'
}

/** select "project_verticals_aggregate_bool_exp_bool_and_arguments_columns" columns of table "project_verticals" */
export enum Project_Verticals_Select_Column_Project_Verticals_Aggregate_Bool_Exp_Bool_And_Arguments_Columns {
  /** column name */
  Active = 'active'
}

/** select "project_verticals_aggregate_bool_exp_bool_or_arguments_columns" columns of table "project_verticals" */
export enum Project_Verticals_Select_Column_Project_Verticals_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns {
  /** column name */
  Active = 'active'
}

/** input type for updating data in table "project_verticals" */
export type Project_Verticals_Set_Input = {
  active?: InputMaybe<Scalars['Boolean']>;
  category_name?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  display_name?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Verticals_Enum>;
};

/** Streaming cursor of the table "project_verticals" */
export type Project_Verticals_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Project_Verticals_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Project_Verticals_Stream_Cursor_Value_Input = {
  active?: InputMaybe<Scalars['Boolean']>;
  category_name?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  display_name?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Verticals_Enum>;
};

/** update columns of table "project_verticals" */
export enum Project_Verticals_Update_Column {
  /** column name */
  Active = 'active',
  /** column name */
  CategoryName = 'category_name',
  /** column name */
  Description = 'description',
  /** column name */
  DisplayName = 'display_name',
  /** column name */
  Name = 'name'
}

export type Project_Verticals_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Project_Verticals_Set_Input>;
  /** filter the rows which have to be updated */
  where: Project_Verticals_Bool_Exp;
};

/** columns and relationships of "projects_features" */
export type Projects_Features = {
  __typename?: 'projects_features';
  enable_artist_update_after_completion: Scalars['Boolean'];
  feature_fields?: Maybe<Scalars['jsonb']>;
  feature_fields_counts?: Maybe<Scalars['jsonb']>;
  features_script?: Maybe<Scalars['String']>;
  id: Scalars['Int'];
  /** An object relationship */
  private_data?: Maybe<Projects_Features_Private>;
  /** An object relationship */
  project: Projects_Metadata;
  project_id: Scalars['String'];
};


/** columns and relationships of "projects_features" */
export type Projects_FeaturesFeature_FieldsArgs = {
  path?: InputMaybe<Scalars['String']>;
};


/** columns and relationships of "projects_features" */
export type Projects_FeaturesFeature_Fields_CountsArgs = {
  path?: InputMaybe<Scalars['String']>;
};

/** aggregated selection of "projects_features" */
export type Projects_Features_Aggregate = {
  __typename?: 'projects_features_aggregate';
  aggregate?: Maybe<Projects_Features_Aggregate_Fields>;
  nodes: Array<Projects_Features>;
};

/** aggregate fields of "projects_features" */
export type Projects_Features_Aggregate_Fields = {
  __typename?: 'projects_features_aggregate_fields';
  avg?: Maybe<Projects_Features_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Projects_Features_Max_Fields>;
  min?: Maybe<Projects_Features_Min_Fields>;
  stddev?: Maybe<Projects_Features_Stddev_Fields>;
  stddev_pop?: Maybe<Projects_Features_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Projects_Features_Stddev_Samp_Fields>;
  sum?: Maybe<Projects_Features_Sum_Fields>;
  var_pop?: Maybe<Projects_Features_Var_Pop_Fields>;
  var_samp?: Maybe<Projects_Features_Var_Samp_Fields>;
  variance?: Maybe<Projects_Features_Variance_Fields>;
};


/** aggregate fields of "projects_features" */
export type Projects_Features_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Projects_Features_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Projects_Features_Append_Input = {
  feature_fields?: InputMaybe<Scalars['jsonb']>;
  feature_fields_counts?: InputMaybe<Scalars['jsonb']>;
};

/** aggregate avg on columns */
export type Projects_Features_Avg_Fields = {
  __typename?: 'projects_features_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "projects_features". All fields are combined with a logical 'AND'. */
export type Projects_Features_Bool_Exp = {
  _and?: InputMaybe<Array<Projects_Features_Bool_Exp>>;
  _not?: InputMaybe<Projects_Features_Bool_Exp>;
  _or?: InputMaybe<Array<Projects_Features_Bool_Exp>>;
  enable_artist_update_after_completion?: InputMaybe<Boolean_Comparison_Exp>;
  feature_fields?: InputMaybe<Jsonb_Comparison_Exp>;
  feature_fields_counts?: InputMaybe<Jsonb_Comparison_Exp>;
  features_script?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Int_Comparison_Exp>;
  private_data?: InputMaybe<Projects_Features_Private_Bool_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "projects_features" */
export enum Projects_Features_Constraint {
  /** unique or primary key constraint on columns "id" */
  ProjectsFeaturesPkey = 'projects_features_pkey',
  /** unique or primary key constraint on columns "project_id" */
  ProjectsFeaturesProjectIdKey = 'projects_features_project_id_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Projects_Features_Delete_At_Path_Input = {
  feature_fields?: InputMaybe<Array<Scalars['String']>>;
  feature_fields_counts?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Projects_Features_Delete_Elem_Input = {
  feature_fields?: InputMaybe<Scalars['Int']>;
  feature_fields_counts?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Projects_Features_Delete_Key_Input = {
  feature_fields?: InputMaybe<Scalars['String']>;
  feature_fields_counts?: InputMaybe<Scalars['String']>;
};

/** input type for incrementing numeric columns in table "projects_features" */
export type Projects_Features_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "projects_features" */
export type Projects_Features_Insert_Input = {
  enable_artist_update_after_completion?: InputMaybe<Scalars['Boolean']>;
  feature_fields?: InputMaybe<Scalars['jsonb']>;
  feature_fields_counts?: InputMaybe<Scalars['jsonb']>;
  features_script?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  private_data?: InputMaybe<Projects_Features_Private_Obj_Rel_Insert_Input>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Projects_Features_Max_Fields = {
  __typename?: 'projects_features_max_fields';
  features_script?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Projects_Features_Min_Fields = {
  __typename?: 'projects_features_min_fields';
  features_script?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  project_id?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "projects_features" */
export type Projects_Features_Mutation_Response = {
  __typename?: 'projects_features_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Projects_Features>;
};

/** input type for inserting object relation for remote table "projects_features" */
export type Projects_Features_Obj_Rel_Insert_Input = {
  data: Projects_Features_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Projects_Features_On_Conflict>;
};

/** on_conflict condition type for table "projects_features" */
export type Projects_Features_On_Conflict = {
  constraint: Projects_Features_Constraint;
  update_columns?: Array<Projects_Features_Update_Column>;
  where?: InputMaybe<Projects_Features_Bool_Exp>;
};

/** Ordering options when selecting data from "projects_features". */
export type Projects_Features_Order_By = {
  enable_artist_update_after_completion?: InputMaybe<Order_By>;
  feature_fields?: InputMaybe<Order_By>;
  feature_fields_counts?: InputMaybe<Order_By>;
  features_script?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  private_data?: InputMaybe<Projects_Features_Private_Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: projects_features */
export type Projects_Features_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Projects_Features_Prepend_Input = {
  feature_fields?: InputMaybe<Scalars['jsonb']>;
  feature_fields_counts?: InputMaybe<Scalars['jsonb']>;
};

/** columns and relationships of "projects_features_private" */
export type Projects_Features_Private = {
  __typename?: 'projects_features_private';
  features_script?: Maybe<Scalars['String']>;
  /** An object relationship */
  project_features?: Maybe<Projects_Features>;
  project_features_id?: Maybe<Scalars['Int']>;
};

/** aggregated selection of "projects_features_private" */
export type Projects_Features_Private_Aggregate = {
  __typename?: 'projects_features_private_aggregate';
  aggregate?: Maybe<Projects_Features_Private_Aggregate_Fields>;
  nodes: Array<Projects_Features_Private>;
};

/** aggregate fields of "projects_features_private" */
export type Projects_Features_Private_Aggregate_Fields = {
  __typename?: 'projects_features_private_aggregate_fields';
  avg?: Maybe<Projects_Features_Private_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Projects_Features_Private_Max_Fields>;
  min?: Maybe<Projects_Features_Private_Min_Fields>;
  stddev?: Maybe<Projects_Features_Private_Stddev_Fields>;
  stddev_pop?: Maybe<Projects_Features_Private_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Projects_Features_Private_Stddev_Samp_Fields>;
  sum?: Maybe<Projects_Features_Private_Sum_Fields>;
  var_pop?: Maybe<Projects_Features_Private_Var_Pop_Fields>;
  var_samp?: Maybe<Projects_Features_Private_Var_Samp_Fields>;
  variance?: Maybe<Projects_Features_Private_Variance_Fields>;
};


/** aggregate fields of "projects_features_private" */
export type Projects_Features_Private_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Projects_Features_Private_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Projects_Features_Private_Avg_Fields = {
  __typename?: 'projects_features_private_avg_fields';
  project_features_id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "projects_features_private". All fields are combined with a logical 'AND'. */
export type Projects_Features_Private_Bool_Exp = {
  _and?: InputMaybe<Array<Projects_Features_Private_Bool_Exp>>;
  _not?: InputMaybe<Projects_Features_Private_Bool_Exp>;
  _or?: InputMaybe<Array<Projects_Features_Private_Bool_Exp>>;
  features_script?: InputMaybe<String_Comparison_Exp>;
  project_features?: InputMaybe<Projects_Features_Bool_Exp>;
  project_features_id?: InputMaybe<Int_Comparison_Exp>;
};

/** input type for incrementing numeric columns in table "projects_features_private" */
export type Projects_Features_Private_Inc_Input = {
  project_features_id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "projects_features_private" */
export type Projects_Features_Private_Insert_Input = {
  features_script?: InputMaybe<Scalars['String']>;
  project_features?: InputMaybe<Projects_Features_Obj_Rel_Insert_Input>;
  project_features_id?: InputMaybe<Scalars['Int']>;
};

/** aggregate max on columns */
export type Projects_Features_Private_Max_Fields = {
  __typename?: 'projects_features_private_max_fields';
  features_script?: Maybe<Scalars['String']>;
  project_features_id?: Maybe<Scalars['Int']>;
};

/** aggregate min on columns */
export type Projects_Features_Private_Min_Fields = {
  __typename?: 'projects_features_private_min_fields';
  features_script?: Maybe<Scalars['String']>;
  project_features_id?: Maybe<Scalars['Int']>;
};

/** response of any mutation on the table "projects_features_private" */
export type Projects_Features_Private_Mutation_Response = {
  __typename?: 'projects_features_private_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Projects_Features_Private>;
};

/** input type for inserting object relation for remote table "projects_features_private" */
export type Projects_Features_Private_Obj_Rel_Insert_Input = {
  data: Projects_Features_Private_Insert_Input;
};

/** Ordering options when selecting data from "projects_features_private". */
export type Projects_Features_Private_Order_By = {
  features_script?: InputMaybe<Order_By>;
  project_features?: InputMaybe<Projects_Features_Order_By>;
  project_features_id?: InputMaybe<Order_By>;
};

/** select columns of table "projects_features_private" */
export enum Projects_Features_Private_Select_Column {
  /** column name */
  FeaturesScript = 'features_script',
  /** column name */
  ProjectFeaturesId = 'project_features_id'
}

/** input type for updating data in table "projects_features_private" */
export type Projects_Features_Private_Set_Input = {
  features_script?: InputMaybe<Scalars['String']>;
  project_features_id?: InputMaybe<Scalars['Int']>;
};

/** aggregate stddev on columns */
export type Projects_Features_Private_Stddev_Fields = {
  __typename?: 'projects_features_private_stddev_fields';
  project_features_id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Projects_Features_Private_Stddev_Pop_Fields = {
  __typename?: 'projects_features_private_stddev_pop_fields';
  project_features_id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Projects_Features_Private_Stddev_Samp_Fields = {
  __typename?: 'projects_features_private_stddev_samp_fields';
  project_features_id?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "projects_features_private" */
export type Projects_Features_Private_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Projects_Features_Private_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Projects_Features_Private_Stream_Cursor_Value_Input = {
  features_script?: InputMaybe<Scalars['String']>;
  project_features_id?: InputMaybe<Scalars['Int']>;
};

/** aggregate sum on columns */
export type Projects_Features_Private_Sum_Fields = {
  __typename?: 'projects_features_private_sum_fields';
  project_features_id?: Maybe<Scalars['Int']>;
};

export type Projects_Features_Private_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Projects_Features_Private_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Projects_Features_Private_Set_Input>;
  /** filter the rows which have to be updated */
  where: Projects_Features_Private_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Projects_Features_Private_Var_Pop_Fields = {
  __typename?: 'projects_features_private_var_pop_fields';
  project_features_id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Projects_Features_Private_Var_Samp_Fields = {
  __typename?: 'projects_features_private_var_samp_fields';
  project_features_id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Projects_Features_Private_Variance_Fields = {
  __typename?: 'projects_features_private_variance_fields';
  project_features_id?: Maybe<Scalars['Float']>;
};

/** select columns of table "projects_features" */
export enum Projects_Features_Select_Column {
  /** column name */
  EnableArtistUpdateAfterCompletion = 'enable_artist_update_after_completion',
  /** column name */
  FeatureFields = 'feature_fields',
  /** column name */
  FeatureFieldsCounts = 'feature_fields_counts',
  /** column name */
  FeaturesScript = 'features_script',
  /** column name */
  Id = 'id',
  /** column name */
  ProjectId = 'project_id'
}

/** input type for updating data in table "projects_features" */
export type Projects_Features_Set_Input = {
  enable_artist_update_after_completion?: InputMaybe<Scalars['Boolean']>;
  feature_fields?: InputMaybe<Scalars['jsonb']>;
  feature_fields_counts?: InputMaybe<Scalars['jsonb']>;
  features_script?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Projects_Features_Stddev_Fields = {
  __typename?: 'projects_features_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Projects_Features_Stddev_Pop_Fields = {
  __typename?: 'projects_features_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Projects_Features_Stddev_Samp_Fields = {
  __typename?: 'projects_features_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "projects_features" */
export type Projects_Features_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Projects_Features_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Projects_Features_Stream_Cursor_Value_Input = {
  enable_artist_update_after_completion?: InputMaybe<Scalars['Boolean']>;
  feature_fields?: InputMaybe<Scalars['jsonb']>;
  feature_fields_counts?: InputMaybe<Scalars['jsonb']>;
  features_script?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Projects_Features_Sum_Fields = {
  __typename?: 'projects_features_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** update columns of table "projects_features" */
export enum Projects_Features_Update_Column {
  /** column name */
  EnableArtistUpdateAfterCompletion = 'enable_artist_update_after_completion',
  /** column name */
  FeatureFields = 'feature_fields',
  /** column name */
  FeatureFieldsCounts = 'feature_fields_counts',
  /** column name */
  FeaturesScript = 'features_script',
  /** column name */
  Id = 'id',
  /** column name */
  ProjectId = 'project_id'
}

export type Projects_Features_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Projects_Features_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Projects_Features_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Projects_Features_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Projects_Features_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Projects_Features_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Projects_Features_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Projects_Features_Set_Input>;
  /** filter the rows which have to be updated */
  where: Projects_Features_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Projects_Features_Var_Pop_Fields = {
  __typename?: 'projects_features_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Projects_Features_Var_Samp_Fields = {
  __typename?: 'projects_features_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Projects_Features_Variance_Fields = {
  __typename?: 'projects_features_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

/** columns and relationships of "projects_metadata" */
export type Projects_Metadata = {
  __typename?: 'projects_metadata';
  activated_at?: Maybe<Scalars['timestamptz']>;
  active: Scalars['Boolean'];
  additional_payee?: Maybe<Scalars['String']>;
  additional_payee_percentage?: Maybe<Scalars['Int']>;
  additional_payee_secondary_sales_address?: Maybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Int']>;
  /** An object relationship */
  artist: Users;
  artist_address: Scalars['String'];
  artist_display_notes?: Maybe<Scalars['String']>;
  artist_featured_token_id?: Maybe<Scalars['String']>;
  artist_interview?: Maybe<Scalars['String']>;
  artist_name?: Maybe<Scalars['String']>;
  aspect_ratio: Scalars['numeric'];
  base_uri?: Maybe<Scalars['String']>;
  charitable_giving_details?: Maybe<Scalars['String']>;
  complete: Scalars['Boolean'];
  /** A computed field, executes function "completed_at" */
  completed_at?: Maybe<Scalars['timestamptz']>;
  /** An object relationship */
  contract: Contracts_Metadata;
  contract_address: Scalars['String'];
  creative_credit?: Maybe<Scalars['String']>;
  curation_status: Curation_Statuses_Enum;
  /** A computed field, executes function "curation_status_display" */
  curation_status_display?: Maybe<Scalars['String']>;
  curation_status_override?: Maybe<Curation_Statuses_Enum>;
  currency_address?: Maybe<Scalars['String']>;
  currency_decimals?: Maybe<Scalars['Int']>;
  currency_symbol?: Maybe<Scalars['String']>;
  /** An object relationship */
  dependency?: Maybe<Dependencies_Metadata>;
  description?: Maybe<Scalars['String']>;
  disable_auto_image_format?: Maybe<Scalars['Boolean']>;
  disable_sample_generator: Scalars['Boolean'];
  display_static: Scalars['Boolean'];
  /** An array relationship */
  external_asset_dependencies: Array<Project_External_Asset_Dependencies>;
  /** An aggregate relationship */
  external_asset_dependencies_aggregate: Project_External_Asset_Dependencies_Aggregate;
  external_asset_dependencies_locked?: Maybe<Scalars['Boolean']>;
  /** A computed field, executes function "project_external_asset_dependency_count" */
  external_asset_dependency_count?: Maybe<Scalars['bigint']>;
  /** A computed field, executes function "project_favorited_by_user" */
  favorited_by_user?: Maybe<Scalars['Boolean']>;
  /** An array relationship */
  favorites: Array<Favorites>;
  /** An aggregate relationship */
  favorites_aggregate: Favorites_Aggregate;
  /** A computed field, executes function "project_featured_token" */
  featured_token?: Maybe<Array<Tokens_Metadata>>;
  /** An object relationship */
  features?: Maybe<Projects_Features>;
  /** A computed field, executes function "first_token_minted_at" */
  first_token_minted_at?: Maybe<Scalars['timestamptz']>;
  /** A computed field, executes function "project_heritage_status" */
  heritage_curation_status?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  index?: Maybe<Scalars['Int']>;
  /** A computed field, executes function "project_invocations" */
  invocations?: Maybe<Scalars['bigint']>;
  ipfs_hash?: Maybe<Scalars['String']>;
  /** A computed field, executes function "project_is_flagship" */
  is_artblocks?: Maybe<Scalars['Boolean']>;
  license?: Maybe<Scalars['String']>;
  link_to_license?: Maybe<Scalars['String']>;
  /** A computed field, executes function "calc_locked" */
  locked?: Maybe<Scalars['Boolean']>;
  locked_pre_v3?: Maybe<Scalars['Boolean']>;
  /** A computed field, executes function "project_lowest_listing" */
  lowest_listing?: Maybe<Scalars['float8']>;
  max_invocations: Scalars['Int'];
  /** An object relationship */
  minter_configuration?: Maybe<Project_Minter_Configurations>;
  minter_configuration_id?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  open_for_review: Scalars['Boolean'];
  paused: Scalars['Boolean'];
  price_per_token_in_wei?: Maybe<Scalars['String']>;
  project?: Maybe<Project>;
  project_id: Scalars['String'];
  /** An object relationship */
  proposed_artist_addresses_and_split?: Maybe<Proposed_Artist_Addresses_And_Splits>;
  proposed_artists_and_splits_id?: Maybe<Scalars['String']>;
  /** An array relationship */
  receipts: Array<Receipt_Metadata>;
  /** An aggregate relationship */
  receipts_aggregate: Receipt_Metadata_Aggregate;
  /** A computed field, executes function "project_render_complete" */
  render_complete?: Maybe<Scalars['Boolean']>;
  render_delay?: Maybe<Scalars['Int']>;
  render_with_gpu?: Maybe<Scalars['Boolean']>;
  royalty_percentage?: Maybe<Scalars['Int']>;
  sales_notes?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
  /** A computed field, executes function "project_script_count" */
  script_count?: Maybe<Scalars['bigint']>;
  script_json?: Maybe<Scalars['jsonb']>;
  script_type_and_version?: Maybe<Scalars['String']>;
  /** An array relationship */
  scripts: Array<Project_Scripts>;
  /** An aggregate relationship */
  scripts_aggregate: Project_Scripts_Aggregate;
  /** A computed field, executes function "second_token_minted_at" */
  second_token_minted_at?: Maybe<Scalars['timestamptz']>;
  /** An object relationship */
  series?: Maybe<Project_Series>;
  series_id?: Maybe<Scalars['Int']>;
  start_datetime?: Maybe<Scalars['timestamptz']>;
  /** An array relationship */
  tags: Array<Entity_Tags>;
  /** An aggregate relationship */
  tags_aggregate: Entity_Tags_Aggregate;
  /** An array relationship */
  tokens: Array<Tokens_Metadata>;
  /** An aggregate relationship */
  tokens_aggregate: Tokens_Metadata_Aggregate;
  updated_at?: Maybe<Scalars['timestamp']>;
  /** A computed field, executes function "user_is_artist" */
  user_is_artist?: Maybe<Scalars['Boolean']>;
  /** An object relationship */
  vertical: Project_Verticals;
  vertical_name: Scalars['String'];
  video_duration?: Maybe<Scalars['Int']>;
  video_fps?: Maybe<Scalars['Int']>;
  video_render_delay?: Maybe<Scalars['Int']>;
  website?: Maybe<Scalars['String']>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataExternal_Asset_DependenciesArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependencies_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataExternal_Asset_Dependencies_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependencies_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataFavoritesArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataFavorites_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataFeatured_TokenArgs = {
  args: Featured_Token_Projects_Metadata_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataProjectArgs = {
  block?: InputMaybe<Block_Height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataReceiptsArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataReceipts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataScript_JsonArgs = {
  path?: InputMaybe<Scalars['String']>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataScriptsArgs = {
  distinct_on?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Scripts_Order_By>>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataScripts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Scripts_Order_By>>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataTagsArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataTags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataTokensArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


/** columns and relationships of "projects_metadata" */
export type Projects_MetadataTokens_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};

/** aggregated selection of "projects_metadata" */
export type Projects_Metadata_Aggregate = {
  __typename?: 'projects_metadata_aggregate';
  aggregate?: Maybe<Projects_Metadata_Aggregate_Fields>;
  nodes: Array<Projects_Metadata>;
};

export type Projects_Metadata_Aggregate_Bool_Exp = {
  bool_and?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp_Bool_And>;
  bool_or?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp_Bool_Or>;
  count?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp_Count>;
};

export type Projects_Metadata_Aggregate_Bool_Exp_Bool_And = {
  arguments: Projects_Metadata_Select_Column_Projects_Metadata_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Projects_Metadata_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Projects_Metadata_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Projects_Metadata_Select_Column_Projects_Metadata_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Projects_Metadata_Bool_Exp>;
  predicate: Boolean_Comparison_Exp;
};

export type Projects_Metadata_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Projects_Metadata_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "projects_metadata" */
export type Projects_Metadata_Aggregate_Fields = {
  __typename?: 'projects_metadata_aggregate_fields';
  avg?: Maybe<Projects_Metadata_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Projects_Metadata_Max_Fields>;
  min?: Maybe<Projects_Metadata_Min_Fields>;
  stddev?: Maybe<Projects_Metadata_Stddev_Fields>;
  stddev_pop?: Maybe<Projects_Metadata_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Projects_Metadata_Stddev_Samp_Fields>;
  sum?: Maybe<Projects_Metadata_Sum_Fields>;
  var_pop?: Maybe<Projects_Metadata_Var_Pop_Fields>;
  var_samp?: Maybe<Projects_Metadata_Var_Samp_Fields>;
  variance?: Maybe<Projects_Metadata_Variance_Fields>;
};


/** aggregate fields of "projects_metadata" */
export type Projects_Metadata_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "projects_metadata" */
export type Projects_Metadata_Aggregate_Order_By = {
  avg?: InputMaybe<Projects_Metadata_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Projects_Metadata_Max_Order_By>;
  min?: InputMaybe<Projects_Metadata_Min_Order_By>;
  stddev?: InputMaybe<Projects_Metadata_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Projects_Metadata_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Projects_Metadata_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Projects_Metadata_Sum_Order_By>;
  var_pop?: InputMaybe<Projects_Metadata_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Projects_Metadata_Var_Samp_Order_By>;
  variance?: InputMaybe<Projects_Metadata_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Projects_Metadata_Append_Input = {
  script_json?: InputMaybe<Scalars['jsonb']>;
};

/** input type for inserting array relation for remote table "projects_metadata" */
export type Projects_Metadata_Arr_Rel_Insert_Input = {
  data: Array<Projects_Metadata_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Projects_Metadata_On_Conflict>;
};

/** aggregate avg on columns */
export type Projects_Metadata_Avg_Fields = {
  __typename?: 'projects_metadata_avg_fields';
  additional_payee_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
  aspect_ratio?: Maybe<Scalars['Float']>;
  currency_decimals?: Maybe<Scalars['Float']>;
  index?: Maybe<Scalars['Float']>;
  max_invocations?: Maybe<Scalars['Float']>;
  render_delay?: Maybe<Scalars['Float']>;
  royalty_percentage?: Maybe<Scalars['Float']>;
  series_id?: Maybe<Scalars['Float']>;
  video_duration?: Maybe<Scalars['Float']>;
  video_fps?: Maybe<Scalars['Float']>;
  video_render_delay?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "projects_metadata" */
export type Projects_Metadata_Avg_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "projects_metadata". All fields are combined with a logical 'AND'. */
export type Projects_Metadata_Bool_Exp = {
  _and?: InputMaybe<Array<Projects_Metadata_Bool_Exp>>;
  _not?: InputMaybe<Projects_Metadata_Bool_Exp>;
  _or?: InputMaybe<Array<Projects_Metadata_Bool_Exp>>;
  activated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  active?: InputMaybe<Boolean_Comparison_Exp>;
  additional_payee?: InputMaybe<String_Comparison_Exp>;
  additional_payee_percentage?: InputMaybe<Int_Comparison_Exp>;
  additional_payee_secondary_sales_address?: InputMaybe<String_Comparison_Exp>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Int_Comparison_Exp>;
  artist?: InputMaybe<Users_Bool_Exp>;
  artist_address?: InputMaybe<String_Comparison_Exp>;
  artist_display_notes?: InputMaybe<String_Comparison_Exp>;
  artist_featured_token_id?: InputMaybe<String_Comparison_Exp>;
  artist_interview?: InputMaybe<String_Comparison_Exp>;
  artist_name?: InputMaybe<String_Comparison_Exp>;
  aspect_ratio?: InputMaybe<Numeric_Comparison_Exp>;
  base_uri?: InputMaybe<String_Comparison_Exp>;
  charitable_giving_details?: InputMaybe<String_Comparison_Exp>;
  complete?: InputMaybe<Boolean_Comparison_Exp>;
  completed_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  contract?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  contract_address?: InputMaybe<String_Comparison_Exp>;
  creative_credit?: InputMaybe<String_Comparison_Exp>;
  curation_status?: InputMaybe<Curation_Statuses_Enum_Comparison_Exp>;
  curation_status_display?: InputMaybe<String_Comparison_Exp>;
  curation_status_override?: InputMaybe<Curation_Statuses_Enum_Comparison_Exp>;
  currency_address?: InputMaybe<String_Comparison_Exp>;
  currency_decimals?: InputMaybe<Int_Comparison_Exp>;
  currency_symbol?: InputMaybe<String_Comparison_Exp>;
  dependency?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
  description?: InputMaybe<String_Comparison_Exp>;
  disable_auto_image_format?: InputMaybe<Boolean_Comparison_Exp>;
  disable_sample_generator?: InputMaybe<Boolean_Comparison_Exp>;
  display_static?: InputMaybe<Boolean_Comparison_Exp>;
  external_asset_dependencies?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
  external_asset_dependencies_aggregate?: InputMaybe<Project_External_Asset_Dependencies_Aggregate_Bool_Exp>;
  external_asset_dependencies_locked?: InputMaybe<Boolean_Comparison_Exp>;
  external_asset_dependency_count?: InputMaybe<Bigint_Comparison_Exp>;
  favorited_by_user?: InputMaybe<Boolean_Comparison_Exp>;
  favorites?: InputMaybe<Favorites_Bool_Exp>;
  favorites_aggregate?: InputMaybe<Favorites_Aggregate_Bool_Exp>;
  features?: InputMaybe<Projects_Features_Bool_Exp>;
  first_token_minted_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  heritage_curation_status?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<String_Comparison_Exp>;
  index?: InputMaybe<Int_Comparison_Exp>;
  invocations?: InputMaybe<Bigint_Comparison_Exp>;
  ipfs_hash?: InputMaybe<String_Comparison_Exp>;
  is_artblocks?: InputMaybe<Boolean_Comparison_Exp>;
  license?: InputMaybe<String_Comparison_Exp>;
  link_to_license?: InputMaybe<String_Comparison_Exp>;
  locked?: InputMaybe<Boolean_Comparison_Exp>;
  locked_pre_v3?: InputMaybe<Boolean_Comparison_Exp>;
  lowest_listing?: InputMaybe<Float8_Comparison_Exp>;
  max_invocations?: InputMaybe<Int_Comparison_Exp>;
  minter_configuration?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
  minter_configuration_id?: InputMaybe<String_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  open_for_review?: InputMaybe<Boolean_Comparison_Exp>;
  paused?: InputMaybe<Boolean_Comparison_Exp>;
  price_per_token_in_wei?: InputMaybe<String_Comparison_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
  proposed_artist_addresses_and_split?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
  proposed_artists_and_splits_id?: InputMaybe<String_Comparison_Exp>;
  receipts?: InputMaybe<Receipt_Metadata_Bool_Exp>;
  receipts_aggregate?: InputMaybe<Receipt_Metadata_Aggregate_Bool_Exp>;
  render_complete?: InputMaybe<Boolean_Comparison_Exp>;
  render_delay?: InputMaybe<Int_Comparison_Exp>;
  render_with_gpu?: InputMaybe<Boolean_Comparison_Exp>;
  royalty_percentage?: InputMaybe<Int_Comparison_Exp>;
  sales_notes?: InputMaybe<String_Comparison_Exp>;
  script?: InputMaybe<String_Comparison_Exp>;
  script_count?: InputMaybe<Bigint_Comparison_Exp>;
  script_json?: InputMaybe<Jsonb_Comparison_Exp>;
  script_type_and_version?: InputMaybe<String_Comparison_Exp>;
  scripts?: InputMaybe<Project_Scripts_Bool_Exp>;
  scripts_aggregate?: InputMaybe<Project_Scripts_Aggregate_Bool_Exp>;
  second_token_minted_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  series?: InputMaybe<Project_Series_Bool_Exp>;
  series_id?: InputMaybe<Int_Comparison_Exp>;
  start_datetime?: InputMaybe<Timestamptz_Comparison_Exp>;
  tags?: InputMaybe<Entity_Tags_Bool_Exp>;
  tags_aggregate?: InputMaybe<Entity_Tags_Aggregate_Bool_Exp>;
  tokens?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  tokens_aggregate?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp>;
  updated_at?: InputMaybe<Timestamp_Comparison_Exp>;
  user_is_artist?: InputMaybe<Boolean_Comparison_Exp>;
  vertical?: InputMaybe<Project_Verticals_Bool_Exp>;
  vertical_name?: InputMaybe<String_Comparison_Exp>;
  video_duration?: InputMaybe<Int_Comparison_Exp>;
  video_fps?: InputMaybe<Int_Comparison_Exp>;
  video_render_delay?: InputMaybe<Int_Comparison_Exp>;
  website?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "projects_metadata" */
export enum Projects_Metadata_Constraint {
  /** unique or primary key constraint on columns "id" */
  ProjectsMetaPkey = 'projects_meta_pkey',
  /** unique or primary key constraint on columns "project_id", "contract_address" */
  ProjectsMetadataProjectIdContractAddressKey = 'projects_metadata_project_id_contract_address_key',
  /** unique or primary key constraint on columns "proposed_artists_and_splits_id" */
  ProjectsMetadataProposedArtistsAndSplitsIdKey = 'projects_metadata_proposed_artists_and_splits_id_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Projects_Metadata_Delete_At_Path_Input = {
  script_json?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Projects_Metadata_Delete_Elem_Input = {
  script_json?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Projects_Metadata_Delete_Key_Input = {
  script_json?: InputMaybe<Scalars['String']>;
};

/** input type for incrementing numeric columns in table "projects_metadata" */
export type Projects_Metadata_Inc_Input = {
  additional_payee_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
  aspect_ratio?: InputMaybe<Scalars['numeric']>;
  currency_decimals?: InputMaybe<Scalars['Int']>;
  index?: InputMaybe<Scalars['Int']>;
  max_invocations?: InputMaybe<Scalars['Int']>;
  render_delay?: InputMaybe<Scalars['Int']>;
  royalty_percentage?: InputMaybe<Scalars['Int']>;
  series_id?: InputMaybe<Scalars['Int']>;
  video_duration?: InputMaybe<Scalars['Int']>;
  video_fps?: InputMaybe<Scalars['Int']>;
  video_render_delay?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "projects_metadata" */
export type Projects_Metadata_Insert_Input = {
  activated_at?: InputMaybe<Scalars['timestamptz']>;
  active?: InputMaybe<Scalars['Boolean']>;
  additional_payee?: InputMaybe<Scalars['String']>;
  additional_payee_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales_address?: InputMaybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
  artist?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  artist_address?: InputMaybe<Scalars['String']>;
  artist_display_notes?: InputMaybe<Scalars['String']>;
  artist_featured_token_id?: InputMaybe<Scalars['String']>;
  artist_interview?: InputMaybe<Scalars['String']>;
  artist_name?: InputMaybe<Scalars['String']>;
  aspect_ratio?: InputMaybe<Scalars['numeric']>;
  base_uri?: InputMaybe<Scalars['String']>;
  charitable_giving_details?: InputMaybe<Scalars['String']>;
  complete?: InputMaybe<Scalars['Boolean']>;
  contract?: InputMaybe<Contracts_Metadata_Obj_Rel_Insert_Input>;
  contract_address?: InputMaybe<Scalars['String']>;
  creative_credit?: InputMaybe<Scalars['String']>;
  curation_status?: InputMaybe<Curation_Statuses_Enum>;
  curation_status_override?: InputMaybe<Curation_Statuses_Enum>;
  currency_address?: InputMaybe<Scalars['String']>;
  currency_decimals?: InputMaybe<Scalars['Int']>;
  currency_symbol?: InputMaybe<Scalars['String']>;
  dependency?: InputMaybe<Dependencies_Metadata_Obj_Rel_Insert_Input>;
  description?: InputMaybe<Scalars['String']>;
  disable_auto_image_format?: InputMaybe<Scalars['Boolean']>;
  disable_sample_generator?: InputMaybe<Scalars['Boolean']>;
  display_static?: InputMaybe<Scalars['Boolean']>;
  external_asset_dependencies?: InputMaybe<Project_External_Asset_Dependencies_Arr_Rel_Insert_Input>;
  external_asset_dependencies_locked?: InputMaybe<Scalars['Boolean']>;
  favorites?: InputMaybe<Favorites_Arr_Rel_Insert_Input>;
  features?: InputMaybe<Projects_Features_Obj_Rel_Insert_Input>;
  id?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  ipfs_hash?: InputMaybe<Scalars['String']>;
  license?: InputMaybe<Scalars['String']>;
  link_to_license?: InputMaybe<Scalars['String']>;
  locked_pre_v3?: InputMaybe<Scalars['Boolean']>;
  max_invocations?: InputMaybe<Scalars['Int']>;
  minter_configuration?: InputMaybe<Project_Minter_Configurations_Obj_Rel_Insert_Input>;
  minter_configuration_id?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  open_for_review?: InputMaybe<Scalars['Boolean']>;
  paused?: InputMaybe<Scalars['Boolean']>;
  price_per_token_in_wei?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
  proposed_artist_addresses_and_split?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Obj_Rel_Insert_Input>;
  proposed_artists_and_splits_id?: InputMaybe<Scalars['String']>;
  receipts?: InputMaybe<Receipt_Metadata_Arr_Rel_Insert_Input>;
  render_delay?: InputMaybe<Scalars['Int']>;
  render_with_gpu?: InputMaybe<Scalars['Boolean']>;
  royalty_percentage?: InputMaybe<Scalars['Int']>;
  sales_notes?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  script_json?: InputMaybe<Scalars['jsonb']>;
  script_type_and_version?: InputMaybe<Scalars['String']>;
  scripts?: InputMaybe<Project_Scripts_Arr_Rel_Insert_Input>;
  series?: InputMaybe<Project_Series_Obj_Rel_Insert_Input>;
  series_id?: InputMaybe<Scalars['Int']>;
  start_datetime?: InputMaybe<Scalars['timestamptz']>;
  tags?: InputMaybe<Entity_Tags_Arr_Rel_Insert_Input>;
  tokens?: InputMaybe<Tokens_Metadata_Arr_Rel_Insert_Input>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
  vertical?: InputMaybe<Project_Verticals_Obj_Rel_Insert_Input>;
  vertical_name?: InputMaybe<Scalars['String']>;
  video_duration?: InputMaybe<Scalars['Int']>;
  video_fps?: InputMaybe<Scalars['Int']>;
  video_render_delay?: InputMaybe<Scalars['Int']>;
  website?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Projects_Metadata_Max_Fields = {
  __typename?: 'projects_metadata_max_fields';
  activated_at?: Maybe<Scalars['timestamptz']>;
  additional_payee?: Maybe<Scalars['String']>;
  additional_payee_percentage?: Maybe<Scalars['Int']>;
  additional_payee_secondary_sales_address?: Maybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Int']>;
  artist_address?: Maybe<Scalars['String']>;
  artist_display_notes?: Maybe<Scalars['String']>;
  artist_featured_token_id?: Maybe<Scalars['String']>;
  artist_interview?: Maybe<Scalars['String']>;
  artist_name?: Maybe<Scalars['String']>;
  aspect_ratio?: Maybe<Scalars['numeric']>;
  base_uri?: Maybe<Scalars['String']>;
  charitable_giving_details?: Maybe<Scalars['String']>;
  contract_address?: Maybe<Scalars['String']>;
  creative_credit?: Maybe<Scalars['String']>;
  currency_address?: Maybe<Scalars['String']>;
  currency_decimals?: Maybe<Scalars['Int']>;
  currency_symbol?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  ipfs_hash?: Maybe<Scalars['String']>;
  license?: Maybe<Scalars['String']>;
  link_to_license?: Maybe<Scalars['String']>;
  max_invocations?: Maybe<Scalars['Int']>;
  minter_configuration_id?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  price_per_token_in_wei?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  proposed_artists_and_splits_id?: Maybe<Scalars['String']>;
  render_delay?: Maybe<Scalars['Int']>;
  royalty_percentage?: Maybe<Scalars['Int']>;
  sales_notes?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
  script_type_and_version?: Maybe<Scalars['String']>;
  series_id?: Maybe<Scalars['Int']>;
  start_datetime?: Maybe<Scalars['timestamptz']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  vertical_name?: Maybe<Scalars['String']>;
  video_duration?: Maybe<Scalars['Int']>;
  video_fps?: Maybe<Scalars['Int']>;
  video_render_delay?: Maybe<Scalars['Int']>;
  website?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "projects_metadata" */
export type Projects_Metadata_Max_Order_By = {
  activated_at?: InputMaybe<Order_By>;
  additional_payee?: InputMaybe<Order_By>;
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_address?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  artist_address?: InputMaybe<Order_By>;
  artist_display_notes?: InputMaybe<Order_By>;
  artist_featured_token_id?: InputMaybe<Order_By>;
  artist_interview?: InputMaybe<Order_By>;
  artist_name?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  base_uri?: InputMaybe<Order_By>;
  charitable_giving_details?: InputMaybe<Order_By>;
  contract_address?: InputMaybe<Order_By>;
  creative_credit?: InputMaybe<Order_By>;
  currency_address?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  currency_symbol?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  ipfs_hash?: InputMaybe<Order_By>;
  license?: InputMaybe<Order_By>;
  link_to_license?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  minter_configuration_id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  price_per_token_in_wei?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  proposed_artists_and_splits_id?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  sales_notes?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
  script_type_and_version?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  start_datetime?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  vertical_name?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
  website?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Projects_Metadata_Min_Fields = {
  __typename?: 'projects_metadata_min_fields';
  activated_at?: Maybe<Scalars['timestamptz']>;
  additional_payee?: Maybe<Scalars['String']>;
  additional_payee_percentage?: Maybe<Scalars['Int']>;
  additional_payee_secondary_sales_address?: Maybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Int']>;
  artist_address?: Maybe<Scalars['String']>;
  artist_display_notes?: Maybe<Scalars['String']>;
  artist_featured_token_id?: Maybe<Scalars['String']>;
  artist_interview?: Maybe<Scalars['String']>;
  artist_name?: Maybe<Scalars['String']>;
  aspect_ratio?: Maybe<Scalars['numeric']>;
  base_uri?: Maybe<Scalars['String']>;
  charitable_giving_details?: Maybe<Scalars['String']>;
  contract_address?: Maybe<Scalars['String']>;
  creative_credit?: Maybe<Scalars['String']>;
  currency_address?: Maybe<Scalars['String']>;
  currency_decimals?: Maybe<Scalars['Int']>;
  currency_symbol?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['String']>;
  index?: Maybe<Scalars['Int']>;
  ipfs_hash?: Maybe<Scalars['String']>;
  license?: Maybe<Scalars['String']>;
  link_to_license?: Maybe<Scalars['String']>;
  max_invocations?: Maybe<Scalars['Int']>;
  minter_configuration_id?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  price_per_token_in_wei?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  proposed_artists_and_splits_id?: Maybe<Scalars['String']>;
  render_delay?: Maybe<Scalars['Int']>;
  royalty_percentage?: Maybe<Scalars['Int']>;
  sales_notes?: Maybe<Scalars['String']>;
  script?: Maybe<Scalars['String']>;
  script_type_and_version?: Maybe<Scalars['String']>;
  series_id?: Maybe<Scalars['Int']>;
  start_datetime?: Maybe<Scalars['timestamptz']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  vertical_name?: Maybe<Scalars['String']>;
  video_duration?: Maybe<Scalars['Int']>;
  video_fps?: Maybe<Scalars['Int']>;
  video_render_delay?: Maybe<Scalars['Int']>;
  website?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "projects_metadata" */
export type Projects_Metadata_Min_Order_By = {
  activated_at?: InputMaybe<Order_By>;
  additional_payee?: InputMaybe<Order_By>;
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_address?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  artist_address?: InputMaybe<Order_By>;
  artist_display_notes?: InputMaybe<Order_By>;
  artist_featured_token_id?: InputMaybe<Order_By>;
  artist_interview?: InputMaybe<Order_By>;
  artist_name?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  base_uri?: InputMaybe<Order_By>;
  charitable_giving_details?: InputMaybe<Order_By>;
  contract_address?: InputMaybe<Order_By>;
  creative_credit?: InputMaybe<Order_By>;
  currency_address?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  currency_symbol?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  ipfs_hash?: InputMaybe<Order_By>;
  license?: InputMaybe<Order_By>;
  link_to_license?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  minter_configuration_id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  price_per_token_in_wei?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  proposed_artists_and_splits_id?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  sales_notes?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
  script_type_and_version?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  start_datetime?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  vertical_name?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
  website?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "projects_metadata" */
export type Projects_Metadata_Mutation_Response = {
  __typename?: 'projects_metadata_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Projects_Metadata>;
};

/** input type for inserting object relation for remote table "projects_metadata" */
export type Projects_Metadata_Obj_Rel_Insert_Input = {
  data: Projects_Metadata_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Projects_Metadata_On_Conflict>;
};

/** on_conflict condition type for table "projects_metadata" */
export type Projects_Metadata_On_Conflict = {
  constraint: Projects_Metadata_Constraint;
  update_columns?: Array<Projects_Metadata_Update_Column>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};

/** Ordering options when selecting data from "projects_metadata". */
export type Projects_Metadata_Order_By = {
  activated_at?: InputMaybe<Order_By>;
  active?: InputMaybe<Order_By>;
  additional_payee?: InputMaybe<Order_By>;
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_address?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  artist?: InputMaybe<Users_Order_By>;
  artist_address?: InputMaybe<Order_By>;
  artist_display_notes?: InputMaybe<Order_By>;
  artist_featured_token_id?: InputMaybe<Order_By>;
  artist_interview?: InputMaybe<Order_By>;
  artist_name?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  base_uri?: InputMaybe<Order_By>;
  charitable_giving_details?: InputMaybe<Order_By>;
  complete?: InputMaybe<Order_By>;
  completed_at?: InputMaybe<Order_By>;
  contract?: InputMaybe<Contracts_Metadata_Order_By>;
  contract_address?: InputMaybe<Order_By>;
  creative_credit?: InputMaybe<Order_By>;
  curation_status?: InputMaybe<Order_By>;
  curation_status_display?: InputMaybe<Order_By>;
  curation_status_override?: InputMaybe<Order_By>;
  currency_address?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  currency_symbol?: InputMaybe<Order_By>;
  dependency?: InputMaybe<Dependencies_Metadata_Order_By>;
  description?: InputMaybe<Order_By>;
  disable_auto_image_format?: InputMaybe<Order_By>;
  disable_sample_generator?: InputMaybe<Order_By>;
  display_static?: InputMaybe<Order_By>;
  external_asset_dependencies_aggregate?: InputMaybe<Project_External_Asset_Dependencies_Aggregate_Order_By>;
  external_asset_dependencies_locked?: InputMaybe<Order_By>;
  external_asset_dependency_count?: InputMaybe<Order_By>;
  favorited_by_user?: InputMaybe<Order_By>;
  favorites_aggregate?: InputMaybe<Favorites_Aggregate_Order_By>;
  features?: InputMaybe<Projects_Features_Order_By>;
  first_token_minted_at?: InputMaybe<Order_By>;
  heritage_curation_status?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  invocations?: InputMaybe<Order_By>;
  ipfs_hash?: InputMaybe<Order_By>;
  is_artblocks?: InputMaybe<Order_By>;
  license?: InputMaybe<Order_By>;
  link_to_license?: InputMaybe<Order_By>;
  locked?: InputMaybe<Order_By>;
  locked_pre_v3?: InputMaybe<Order_By>;
  lowest_listing?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  minter_configuration?: InputMaybe<Project_Minter_Configurations_Order_By>;
  minter_configuration_id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  open_for_review?: InputMaybe<Order_By>;
  paused?: InputMaybe<Order_By>;
  price_per_token_in_wei?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  proposed_artist_addresses_and_split?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Order_By>;
  proposed_artists_and_splits_id?: InputMaybe<Order_By>;
  receipts_aggregate?: InputMaybe<Receipt_Metadata_Aggregate_Order_By>;
  render_complete?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  render_with_gpu?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  sales_notes?: InputMaybe<Order_By>;
  script?: InputMaybe<Order_By>;
  script_count?: InputMaybe<Order_By>;
  script_json?: InputMaybe<Order_By>;
  script_type_and_version?: InputMaybe<Order_By>;
  scripts_aggregate?: InputMaybe<Project_Scripts_Aggregate_Order_By>;
  second_token_minted_at?: InputMaybe<Order_By>;
  series?: InputMaybe<Project_Series_Order_By>;
  series_id?: InputMaybe<Order_By>;
  start_datetime?: InputMaybe<Order_By>;
  tags_aggregate?: InputMaybe<Entity_Tags_Aggregate_Order_By>;
  tokens_aggregate?: InputMaybe<Tokens_Metadata_Aggregate_Order_By>;
  updated_at?: InputMaybe<Order_By>;
  user_is_artist?: InputMaybe<Order_By>;
  vertical?: InputMaybe<Project_Verticals_Order_By>;
  vertical_name?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
  website?: InputMaybe<Order_By>;
};

/** primary key columns input for table: projects_metadata */
export type Projects_Metadata_Pk_Columns_Input = {
  id: Scalars['String'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Projects_Metadata_Prepend_Input = {
  script_json?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "projects_metadata" */
export enum Projects_Metadata_Select_Column {
  /** column name */
  ActivatedAt = 'activated_at',
  /** column name */
  Active = 'active',
  /** column name */
  AdditionalPayee = 'additional_payee',
  /** column name */
  AdditionalPayeePercentage = 'additional_payee_percentage',
  /** column name */
  AdditionalPayeeSecondarySalesAddress = 'additional_payee_secondary_sales_address',
  /** column name */
  AdditionalPayeeSecondarySalesPercentage = 'additional_payee_secondary_sales_percentage',
  /** column name */
  ArtistAddress = 'artist_address',
  /** column name */
  ArtistDisplayNotes = 'artist_display_notes',
  /** column name */
  ArtistFeaturedTokenId = 'artist_featured_token_id',
  /** column name */
  ArtistInterview = 'artist_interview',
  /** column name */
  ArtistName = 'artist_name',
  /** column name */
  AspectRatio = 'aspect_ratio',
  /** column name */
  BaseUri = 'base_uri',
  /** column name */
  CharitableGivingDetails = 'charitable_giving_details',
  /** column name */
  Complete = 'complete',
  /** column name */
  ContractAddress = 'contract_address',
  /** column name */
  CreativeCredit = 'creative_credit',
  /** column name */
  CurationStatus = 'curation_status',
  /** column name */
  CurationStatusOverride = 'curation_status_override',
  /** column name */
  CurrencyAddress = 'currency_address',
  /** column name */
  CurrencyDecimals = 'currency_decimals',
  /** column name */
  CurrencySymbol = 'currency_symbol',
  /** column name */
  Description = 'description',
  /** column name */
  DisableAutoImageFormat = 'disable_auto_image_format',
  /** column name */
  DisableSampleGenerator = 'disable_sample_generator',
  /** column name */
  DisplayStatic = 'display_static',
  /** column name */
  ExternalAssetDependenciesLocked = 'external_asset_dependencies_locked',
  /** column name */
  Id = 'id',
  /** column name */
  Index = 'index',
  /** column name */
  IpfsHash = 'ipfs_hash',
  /** column name */
  License = 'license',
  /** column name */
  LinkToLicense = 'link_to_license',
  /** column name */
  LockedPreV3 = 'locked_pre_v3',
  /** column name */
  MaxInvocations = 'max_invocations',
  /** column name */
  MinterConfigurationId = 'minter_configuration_id',
  /** column name */
  Name = 'name',
  /** column name */
  OpenForReview = 'open_for_review',
  /** column name */
  Paused = 'paused',
  /** column name */
  PricePerTokenInWei = 'price_per_token_in_wei',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  ProposedArtistsAndSplitsId = 'proposed_artists_and_splits_id',
  /** column name */
  RenderDelay = 'render_delay',
  /** column name */
  RenderWithGpu = 'render_with_gpu',
  /** column name */
  RoyaltyPercentage = 'royalty_percentage',
  /** column name */
  SalesNotes = 'sales_notes',
  /** column name */
  Script = 'script',
  /** column name */
  ScriptJson = 'script_json',
  /** column name */
  ScriptTypeAndVersion = 'script_type_and_version',
  /** column name */
  SeriesId = 'series_id',
  /** column name */
  StartDatetime = 'start_datetime',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VerticalName = 'vertical_name',
  /** column name */
  VideoDuration = 'video_duration',
  /** column name */
  VideoFps = 'video_fps',
  /** column name */
  VideoRenderDelay = 'video_render_delay',
  /** column name */
  Website = 'website'
}

/** select "projects_metadata_aggregate_bool_exp_bool_and_arguments_columns" columns of table "projects_metadata" */
export enum Projects_Metadata_Select_Column_Projects_Metadata_Aggregate_Bool_Exp_Bool_And_Arguments_Columns {
  /** column name */
  Active = 'active',
  /** column name */
  Complete = 'complete',
  /** column name */
  DisableAutoImageFormat = 'disable_auto_image_format',
  /** column name */
  DisableSampleGenerator = 'disable_sample_generator',
  /** column name */
  DisplayStatic = 'display_static',
  /** column name */
  ExternalAssetDependenciesLocked = 'external_asset_dependencies_locked',
  /** column name */
  LockedPreV3 = 'locked_pre_v3',
  /** column name */
  OpenForReview = 'open_for_review',
  /** column name */
  Paused = 'paused',
  /** column name */
  RenderWithGpu = 'render_with_gpu'
}

/** select "projects_metadata_aggregate_bool_exp_bool_or_arguments_columns" columns of table "projects_metadata" */
export enum Projects_Metadata_Select_Column_Projects_Metadata_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns {
  /** column name */
  Active = 'active',
  /** column name */
  Complete = 'complete',
  /** column name */
  DisableAutoImageFormat = 'disable_auto_image_format',
  /** column name */
  DisableSampleGenerator = 'disable_sample_generator',
  /** column name */
  DisplayStatic = 'display_static',
  /** column name */
  ExternalAssetDependenciesLocked = 'external_asset_dependencies_locked',
  /** column name */
  LockedPreV3 = 'locked_pre_v3',
  /** column name */
  OpenForReview = 'open_for_review',
  /** column name */
  Paused = 'paused',
  /** column name */
  RenderWithGpu = 'render_with_gpu'
}

/** input type for updating data in table "projects_metadata" */
export type Projects_Metadata_Set_Input = {
  activated_at?: InputMaybe<Scalars['timestamptz']>;
  active?: InputMaybe<Scalars['Boolean']>;
  additional_payee?: InputMaybe<Scalars['String']>;
  additional_payee_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales_address?: InputMaybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
  artist_address?: InputMaybe<Scalars['String']>;
  artist_display_notes?: InputMaybe<Scalars['String']>;
  artist_featured_token_id?: InputMaybe<Scalars['String']>;
  artist_interview?: InputMaybe<Scalars['String']>;
  artist_name?: InputMaybe<Scalars['String']>;
  aspect_ratio?: InputMaybe<Scalars['numeric']>;
  base_uri?: InputMaybe<Scalars['String']>;
  charitable_giving_details?: InputMaybe<Scalars['String']>;
  complete?: InputMaybe<Scalars['Boolean']>;
  contract_address?: InputMaybe<Scalars['String']>;
  creative_credit?: InputMaybe<Scalars['String']>;
  curation_status?: InputMaybe<Curation_Statuses_Enum>;
  curation_status_override?: InputMaybe<Curation_Statuses_Enum>;
  currency_address?: InputMaybe<Scalars['String']>;
  currency_decimals?: InputMaybe<Scalars['Int']>;
  currency_symbol?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  disable_auto_image_format?: InputMaybe<Scalars['Boolean']>;
  disable_sample_generator?: InputMaybe<Scalars['Boolean']>;
  display_static?: InputMaybe<Scalars['Boolean']>;
  external_asset_dependencies_locked?: InputMaybe<Scalars['Boolean']>;
  id?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  ipfs_hash?: InputMaybe<Scalars['String']>;
  license?: InputMaybe<Scalars['String']>;
  link_to_license?: InputMaybe<Scalars['String']>;
  locked_pre_v3?: InputMaybe<Scalars['Boolean']>;
  max_invocations?: InputMaybe<Scalars['Int']>;
  minter_configuration_id?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  open_for_review?: InputMaybe<Scalars['Boolean']>;
  paused?: InputMaybe<Scalars['Boolean']>;
  price_per_token_in_wei?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
  proposed_artists_and_splits_id?: InputMaybe<Scalars['String']>;
  render_delay?: InputMaybe<Scalars['Int']>;
  render_with_gpu?: InputMaybe<Scalars['Boolean']>;
  royalty_percentage?: InputMaybe<Scalars['Int']>;
  sales_notes?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  script_json?: InputMaybe<Scalars['jsonb']>;
  script_type_and_version?: InputMaybe<Scalars['String']>;
  series_id?: InputMaybe<Scalars['Int']>;
  start_datetime?: InputMaybe<Scalars['timestamptz']>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
  vertical_name?: InputMaybe<Scalars['String']>;
  video_duration?: InputMaybe<Scalars['Int']>;
  video_fps?: InputMaybe<Scalars['Int']>;
  video_render_delay?: InputMaybe<Scalars['Int']>;
  website?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Projects_Metadata_Stddev_Fields = {
  __typename?: 'projects_metadata_stddev_fields';
  additional_payee_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
  aspect_ratio?: Maybe<Scalars['Float']>;
  currency_decimals?: Maybe<Scalars['Float']>;
  index?: Maybe<Scalars['Float']>;
  max_invocations?: Maybe<Scalars['Float']>;
  render_delay?: Maybe<Scalars['Float']>;
  royalty_percentage?: Maybe<Scalars['Float']>;
  series_id?: Maybe<Scalars['Float']>;
  video_duration?: Maybe<Scalars['Float']>;
  video_fps?: Maybe<Scalars['Float']>;
  video_render_delay?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "projects_metadata" */
export type Projects_Metadata_Stddev_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Projects_Metadata_Stddev_Pop_Fields = {
  __typename?: 'projects_metadata_stddev_pop_fields';
  additional_payee_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
  aspect_ratio?: Maybe<Scalars['Float']>;
  currency_decimals?: Maybe<Scalars['Float']>;
  index?: Maybe<Scalars['Float']>;
  max_invocations?: Maybe<Scalars['Float']>;
  render_delay?: Maybe<Scalars['Float']>;
  royalty_percentage?: Maybe<Scalars['Float']>;
  series_id?: Maybe<Scalars['Float']>;
  video_duration?: Maybe<Scalars['Float']>;
  video_fps?: Maybe<Scalars['Float']>;
  video_render_delay?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "projects_metadata" */
export type Projects_Metadata_Stddev_Pop_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Projects_Metadata_Stddev_Samp_Fields = {
  __typename?: 'projects_metadata_stddev_samp_fields';
  additional_payee_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
  aspect_ratio?: Maybe<Scalars['Float']>;
  currency_decimals?: Maybe<Scalars['Float']>;
  index?: Maybe<Scalars['Float']>;
  max_invocations?: Maybe<Scalars['Float']>;
  render_delay?: Maybe<Scalars['Float']>;
  royalty_percentage?: Maybe<Scalars['Float']>;
  series_id?: Maybe<Scalars['Float']>;
  video_duration?: Maybe<Scalars['Float']>;
  video_fps?: Maybe<Scalars['Float']>;
  video_render_delay?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "projects_metadata" */
export type Projects_Metadata_Stddev_Samp_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "projects_metadata" */
export type Projects_Metadata_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Projects_Metadata_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Projects_Metadata_Stream_Cursor_Value_Input = {
  activated_at?: InputMaybe<Scalars['timestamptz']>;
  active?: InputMaybe<Scalars['Boolean']>;
  additional_payee?: InputMaybe<Scalars['String']>;
  additional_payee_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales_address?: InputMaybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
  artist_address?: InputMaybe<Scalars['String']>;
  artist_display_notes?: InputMaybe<Scalars['String']>;
  artist_featured_token_id?: InputMaybe<Scalars['String']>;
  artist_interview?: InputMaybe<Scalars['String']>;
  artist_name?: InputMaybe<Scalars['String']>;
  aspect_ratio?: InputMaybe<Scalars['numeric']>;
  base_uri?: InputMaybe<Scalars['String']>;
  charitable_giving_details?: InputMaybe<Scalars['String']>;
  complete?: InputMaybe<Scalars['Boolean']>;
  contract_address?: InputMaybe<Scalars['String']>;
  creative_credit?: InputMaybe<Scalars['String']>;
  curation_status?: InputMaybe<Curation_Statuses_Enum>;
  curation_status_override?: InputMaybe<Curation_Statuses_Enum>;
  currency_address?: InputMaybe<Scalars['String']>;
  currency_decimals?: InputMaybe<Scalars['Int']>;
  currency_symbol?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  disable_auto_image_format?: InputMaybe<Scalars['Boolean']>;
  disable_sample_generator?: InputMaybe<Scalars['Boolean']>;
  display_static?: InputMaybe<Scalars['Boolean']>;
  external_asset_dependencies_locked?: InputMaybe<Scalars['Boolean']>;
  id?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['Int']>;
  ipfs_hash?: InputMaybe<Scalars['String']>;
  license?: InputMaybe<Scalars['String']>;
  link_to_license?: InputMaybe<Scalars['String']>;
  locked_pre_v3?: InputMaybe<Scalars['Boolean']>;
  max_invocations?: InputMaybe<Scalars['Int']>;
  minter_configuration_id?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  open_for_review?: InputMaybe<Scalars['Boolean']>;
  paused?: InputMaybe<Scalars['Boolean']>;
  price_per_token_in_wei?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
  proposed_artists_and_splits_id?: InputMaybe<Scalars['String']>;
  render_delay?: InputMaybe<Scalars['Int']>;
  render_with_gpu?: InputMaybe<Scalars['Boolean']>;
  royalty_percentage?: InputMaybe<Scalars['Int']>;
  sales_notes?: InputMaybe<Scalars['String']>;
  script?: InputMaybe<Scalars['String']>;
  script_json?: InputMaybe<Scalars['jsonb']>;
  script_type_and_version?: InputMaybe<Scalars['String']>;
  series_id?: InputMaybe<Scalars['Int']>;
  start_datetime?: InputMaybe<Scalars['timestamptz']>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
  vertical_name?: InputMaybe<Scalars['String']>;
  video_duration?: InputMaybe<Scalars['Int']>;
  video_fps?: InputMaybe<Scalars['Int']>;
  video_render_delay?: InputMaybe<Scalars['Int']>;
  website?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Projects_Metadata_Sum_Fields = {
  __typename?: 'projects_metadata_sum_fields';
  additional_payee_percentage?: Maybe<Scalars['Int']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Int']>;
  aspect_ratio?: Maybe<Scalars['numeric']>;
  currency_decimals?: Maybe<Scalars['Int']>;
  index?: Maybe<Scalars['Int']>;
  max_invocations?: Maybe<Scalars['Int']>;
  render_delay?: Maybe<Scalars['Int']>;
  royalty_percentage?: Maybe<Scalars['Int']>;
  series_id?: Maybe<Scalars['Int']>;
  video_duration?: Maybe<Scalars['Int']>;
  video_fps?: Maybe<Scalars['Int']>;
  video_render_delay?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "projects_metadata" */
export type Projects_Metadata_Sum_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** update columns of table "projects_metadata" */
export enum Projects_Metadata_Update_Column {
  /** column name */
  ActivatedAt = 'activated_at',
  /** column name */
  Active = 'active',
  /** column name */
  AdditionalPayee = 'additional_payee',
  /** column name */
  AdditionalPayeePercentage = 'additional_payee_percentage',
  /** column name */
  AdditionalPayeeSecondarySalesAddress = 'additional_payee_secondary_sales_address',
  /** column name */
  AdditionalPayeeSecondarySalesPercentage = 'additional_payee_secondary_sales_percentage',
  /** column name */
  ArtistAddress = 'artist_address',
  /** column name */
  ArtistDisplayNotes = 'artist_display_notes',
  /** column name */
  ArtistFeaturedTokenId = 'artist_featured_token_id',
  /** column name */
  ArtistInterview = 'artist_interview',
  /** column name */
  ArtistName = 'artist_name',
  /** column name */
  AspectRatio = 'aspect_ratio',
  /** column name */
  BaseUri = 'base_uri',
  /** column name */
  CharitableGivingDetails = 'charitable_giving_details',
  /** column name */
  Complete = 'complete',
  /** column name */
  ContractAddress = 'contract_address',
  /** column name */
  CreativeCredit = 'creative_credit',
  /** column name */
  CurationStatus = 'curation_status',
  /** column name */
  CurationStatusOverride = 'curation_status_override',
  /** column name */
  CurrencyAddress = 'currency_address',
  /** column name */
  CurrencyDecimals = 'currency_decimals',
  /** column name */
  CurrencySymbol = 'currency_symbol',
  /** column name */
  Description = 'description',
  /** column name */
  DisableAutoImageFormat = 'disable_auto_image_format',
  /** column name */
  DisableSampleGenerator = 'disable_sample_generator',
  /** column name */
  DisplayStatic = 'display_static',
  /** column name */
  ExternalAssetDependenciesLocked = 'external_asset_dependencies_locked',
  /** column name */
  Id = 'id',
  /** column name */
  Index = 'index',
  /** column name */
  IpfsHash = 'ipfs_hash',
  /** column name */
  License = 'license',
  /** column name */
  LinkToLicense = 'link_to_license',
  /** column name */
  LockedPreV3 = 'locked_pre_v3',
  /** column name */
  MaxInvocations = 'max_invocations',
  /** column name */
  MinterConfigurationId = 'minter_configuration_id',
  /** column name */
  Name = 'name',
  /** column name */
  OpenForReview = 'open_for_review',
  /** column name */
  Paused = 'paused',
  /** column name */
  PricePerTokenInWei = 'price_per_token_in_wei',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  ProposedArtistsAndSplitsId = 'proposed_artists_and_splits_id',
  /** column name */
  RenderDelay = 'render_delay',
  /** column name */
  RenderWithGpu = 'render_with_gpu',
  /** column name */
  RoyaltyPercentage = 'royalty_percentage',
  /** column name */
  SalesNotes = 'sales_notes',
  /** column name */
  Script = 'script',
  /** column name */
  ScriptJson = 'script_json',
  /** column name */
  ScriptTypeAndVersion = 'script_type_and_version',
  /** column name */
  SeriesId = 'series_id',
  /** column name */
  StartDatetime = 'start_datetime',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VerticalName = 'vertical_name',
  /** column name */
  VideoDuration = 'video_duration',
  /** column name */
  VideoFps = 'video_fps',
  /** column name */
  VideoRenderDelay = 'video_render_delay',
  /** column name */
  Website = 'website'
}

export type Projects_Metadata_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Projects_Metadata_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Projects_Metadata_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Projects_Metadata_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Projects_Metadata_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Projects_Metadata_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Projects_Metadata_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Projects_Metadata_Set_Input>;
  /** filter the rows which have to be updated */
  where: Projects_Metadata_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Projects_Metadata_Var_Pop_Fields = {
  __typename?: 'projects_metadata_var_pop_fields';
  additional_payee_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
  aspect_ratio?: Maybe<Scalars['Float']>;
  currency_decimals?: Maybe<Scalars['Float']>;
  index?: Maybe<Scalars['Float']>;
  max_invocations?: Maybe<Scalars['Float']>;
  render_delay?: Maybe<Scalars['Float']>;
  royalty_percentage?: Maybe<Scalars['Float']>;
  series_id?: Maybe<Scalars['Float']>;
  video_duration?: Maybe<Scalars['Float']>;
  video_fps?: Maybe<Scalars['Float']>;
  video_render_delay?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "projects_metadata" */
export type Projects_Metadata_Var_Pop_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Projects_Metadata_Var_Samp_Fields = {
  __typename?: 'projects_metadata_var_samp_fields';
  additional_payee_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
  aspect_ratio?: Maybe<Scalars['Float']>;
  currency_decimals?: Maybe<Scalars['Float']>;
  index?: Maybe<Scalars['Float']>;
  max_invocations?: Maybe<Scalars['Float']>;
  render_delay?: Maybe<Scalars['Float']>;
  royalty_percentage?: Maybe<Scalars['Float']>;
  series_id?: Maybe<Scalars['Float']>;
  video_duration?: Maybe<Scalars['Float']>;
  video_fps?: Maybe<Scalars['Float']>;
  video_render_delay?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "projects_metadata" */
export type Projects_Metadata_Var_Samp_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Projects_Metadata_Variance_Fields = {
  __typename?: 'projects_metadata_variance_fields';
  additional_payee_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
  aspect_ratio?: Maybe<Scalars['Float']>;
  currency_decimals?: Maybe<Scalars['Float']>;
  index?: Maybe<Scalars['Float']>;
  max_invocations?: Maybe<Scalars['Float']>;
  render_delay?: Maybe<Scalars['Float']>;
  royalty_percentage?: Maybe<Scalars['Float']>;
  series_id?: Maybe<Scalars['Float']>;
  video_duration?: Maybe<Scalars['Float']>;
  video_fps?: Maybe<Scalars['Float']>;
  video_render_delay?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "projects_metadata" */
export type Projects_Metadata_Variance_Order_By = {
  additional_payee_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  aspect_ratio?: InputMaybe<Order_By>;
  currency_decimals?: InputMaybe<Order_By>;
  index?: InputMaybe<Order_By>;
  max_invocations?: InputMaybe<Order_By>;
  render_delay?: InputMaybe<Order_By>;
  royalty_percentage?: InputMaybe<Order_By>;
  series_id?: InputMaybe<Order_By>;
  video_duration?: InputMaybe<Order_By>;
  video_fps?: InputMaybe<Order_By>;
  video_render_delay?: InputMaybe<Order_By>;
};

/** Currently proposed artist and address splits */
export type Proposed_Artist_Addresses_And_Splits = {
  __typename?: 'proposed_artist_addresses_and_splits';
  additional_payee_primary_sales: Scalars['String'];
  additional_payee_primary_sales_percentage: Scalars['Int'];
  additional_payee_secondary_sales: Scalars['String'];
  additional_payee_secondary_sales_percentage: Scalars['Int'];
  artist_address: Scalars['String'];
  /** An object relationship */
  project: Projects_Metadata;
  project_id: Scalars['String'];
};

/** aggregated selection of "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Aggregate = {
  __typename?: 'proposed_artist_addresses_and_splits_aggregate';
  aggregate?: Maybe<Proposed_Artist_Addresses_And_Splits_Aggregate_Fields>;
  nodes: Array<Proposed_Artist_Addresses_And_Splits>;
};

/** aggregate fields of "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Aggregate_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_aggregate_fields';
  avg?: Maybe<Proposed_Artist_Addresses_And_Splits_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Proposed_Artist_Addresses_And_Splits_Max_Fields>;
  min?: Maybe<Proposed_Artist_Addresses_And_Splits_Min_Fields>;
  stddev?: Maybe<Proposed_Artist_Addresses_And_Splits_Stddev_Fields>;
  stddev_pop?: Maybe<Proposed_Artist_Addresses_And_Splits_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Proposed_Artist_Addresses_And_Splits_Stddev_Samp_Fields>;
  sum?: Maybe<Proposed_Artist_Addresses_And_Splits_Sum_Fields>;
  var_pop?: Maybe<Proposed_Artist_Addresses_And_Splits_Var_Pop_Fields>;
  var_samp?: Maybe<Proposed_Artist_Addresses_And_Splits_Var_Samp_Fields>;
  variance?: Maybe<Proposed_Artist_Addresses_And_Splits_Variance_Fields>;
};


/** aggregate fields of "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Proposed_Artist_Addresses_And_Splits_Avg_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_avg_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "proposed_artist_addresses_and_splits". All fields are combined with a logical 'AND'. */
export type Proposed_Artist_Addresses_And_Splits_Bool_Exp = {
  _and?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Bool_Exp>>;
  _not?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
  _or?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Bool_Exp>>;
  additional_payee_primary_sales?: InputMaybe<String_Comparison_Exp>;
  additional_payee_primary_sales_percentage?: InputMaybe<Int_Comparison_Exp>;
  additional_payee_secondary_sales?: InputMaybe<String_Comparison_Exp>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Int_Comparison_Exp>;
  artist_address?: InputMaybe<String_Comparison_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "proposed_artist_addresses_and_splits" */
export enum Proposed_Artist_Addresses_And_Splits_Constraint {
  /** unique or primary key constraint on columns "project_id" */
  ProposedArtistAddressesAndSplitsPkey = 'proposed_artist_addresses_and_splits_pkey'
}

/** input type for incrementing numeric columns in table "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Inc_Input = {
  additional_payee_primary_sales_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Insert_Input = {
  additional_payee_primary_sales?: InputMaybe<Scalars['String']>;
  additional_payee_primary_sales_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales?: InputMaybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
  artist_address?: InputMaybe<Scalars['String']>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Proposed_Artist_Addresses_And_Splits_Max_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_max_fields';
  additional_payee_primary_sales?: Maybe<Scalars['String']>;
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Int']>;
  additional_payee_secondary_sales?: Maybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Int']>;
  artist_address?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Proposed_Artist_Addresses_And_Splits_Min_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_min_fields';
  additional_payee_primary_sales?: Maybe<Scalars['String']>;
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Int']>;
  additional_payee_secondary_sales?: Maybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Int']>;
  artist_address?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Mutation_Response = {
  __typename?: 'proposed_artist_addresses_and_splits_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Proposed_Artist_Addresses_And_Splits>;
};

/** input type for inserting object relation for remote table "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Obj_Rel_Insert_Input = {
  data: Proposed_Artist_Addresses_And_Splits_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Proposed_Artist_Addresses_And_Splits_On_Conflict>;
};

/** on_conflict condition type for table "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_On_Conflict = {
  constraint: Proposed_Artist_Addresses_And_Splits_Constraint;
  update_columns?: Array<Proposed_Artist_Addresses_And_Splits_Update_Column>;
  where?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
};

/** Ordering options when selecting data from "proposed_artist_addresses_and_splits". */
export type Proposed_Artist_Addresses_And_Splits_Order_By = {
  additional_payee_primary_sales?: InputMaybe<Order_By>;
  additional_payee_primary_sales_percentage?: InputMaybe<Order_By>;
  additional_payee_secondary_sales?: InputMaybe<Order_By>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Order_By>;
  artist_address?: InputMaybe<Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: proposed_artist_addresses_and_splits */
export type Proposed_Artist_Addresses_And_Splits_Pk_Columns_Input = {
  project_id: Scalars['String'];
};

/** select columns of table "proposed_artist_addresses_and_splits" */
export enum Proposed_Artist_Addresses_And_Splits_Select_Column {
  /** column name */
  AdditionalPayeePrimarySales = 'additional_payee_primary_sales',
  /** column name */
  AdditionalPayeePrimarySalesPercentage = 'additional_payee_primary_sales_percentage',
  /** column name */
  AdditionalPayeeSecondarySales = 'additional_payee_secondary_sales',
  /** column name */
  AdditionalPayeeSecondarySalesPercentage = 'additional_payee_secondary_sales_percentage',
  /** column name */
  ArtistAddress = 'artist_address',
  /** column name */
  ProjectId = 'project_id'
}

/** input type for updating data in table "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Set_Input = {
  additional_payee_primary_sales?: InputMaybe<Scalars['String']>;
  additional_payee_primary_sales_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales?: InputMaybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
  artist_address?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Proposed_Artist_Addresses_And_Splits_Stddev_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_stddev_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Proposed_Artist_Addresses_And_Splits_Stddev_Pop_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_stddev_pop_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Proposed_Artist_Addresses_And_Splits_Stddev_Samp_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_stddev_samp_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "proposed_artist_addresses_and_splits" */
export type Proposed_Artist_Addresses_And_Splits_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Proposed_Artist_Addresses_And_Splits_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Proposed_Artist_Addresses_And_Splits_Stream_Cursor_Value_Input = {
  additional_payee_primary_sales?: InputMaybe<Scalars['String']>;
  additional_payee_primary_sales_percentage?: InputMaybe<Scalars['Int']>;
  additional_payee_secondary_sales?: InputMaybe<Scalars['String']>;
  additional_payee_secondary_sales_percentage?: InputMaybe<Scalars['Int']>;
  artist_address?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Proposed_Artist_Addresses_And_Splits_Sum_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_sum_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Int']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Int']>;
};

/** update columns of table "proposed_artist_addresses_and_splits" */
export enum Proposed_Artist_Addresses_And_Splits_Update_Column {
  /** column name */
  AdditionalPayeePrimarySales = 'additional_payee_primary_sales',
  /** column name */
  AdditionalPayeePrimarySalesPercentage = 'additional_payee_primary_sales_percentage',
  /** column name */
  AdditionalPayeeSecondarySales = 'additional_payee_secondary_sales',
  /** column name */
  AdditionalPayeeSecondarySalesPercentage = 'additional_payee_secondary_sales_percentage',
  /** column name */
  ArtistAddress = 'artist_address',
  /** column name */
  ProjectId = 'project_id'
}

export type Proposed_Artist_Addresses_And_Splits_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Set_Input>;
  /** filter the rows which have to be updated */
  where: Proposed_Artist_Addresses_And_Splits_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Proposed_Artist_Addresses_And_Splits_Var_Pop_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_var_pop_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Proposed_Artist_Addresses_And_Splits_Var_Samp_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_var_samp_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Proposed_Artist_Addresses_And_Splits_Variance_Fields = {
  __typename?: 'proposed_artist_addresses_and_splits_variance_fields';
  additional_payee_primary_sales_percentage?: Maybe<Scalars['Float']>;
  additional_payee_secondary_sales_percentage?: Maybe<Scalars['Float']>;
};

export type Query_Root = {
  __typename?: 'query_root';
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
  account?: Maybe<Account>;
  accountProject?: Maybe<AccountProject>;
  accountProjects: Array<AccountProject>;
  accounts: Array<Account>;
  /** fetch data from the table: "artists" */
  artists: Array<Artists>;
  /** fetch aggregated fields from the table: "artists" */
  artists_aggregate: Artists_Aggregate;
  /** fetch data from the table: "categories" */
  categories: Array<Categories>;
  /** fetch aggregated fields from the table: "categories" */
  categories_aggregate: Categories_Aggregate;
  /** fetch data from the table: "categories" using primary key columns */
  categories_by_pk?: Maybe<Categories>;
  contract?: Maybe<Contract>;
  /** fetch data from the table: "contract_allowlistings" */
  contract_allowlistings: Array<Contract_Allowlistings>;
  /** fetch aggregated fields from the table: "contract_allowlistings" */
  contract_allowlistings_aggregate: Contract_Allowlistings_Aggregate;
  /** fetch data from the table: "contract_allowlistings" using primary key columns */
  contract_allowlistings_by_pk?: Maybe<Contract_Allowlistings>;
  /** fetch data from the table: "contract_type_names" */
  contract_type_names: Array<Contract_Type_Names>;
  /** fetch aggregated fields from the table: "contract_type_names" */
  contract_type_names_aggregate: Contract_Type_Names_Aggregate;
  /** fetch data from the table: "contract_type_names" using primary key columns */
  contract_type_names_by_pk?: Maybe<Contract_Type_Names>;
  /** fetch data from the table: "contract_types" */
  contract_types: Array<Contract_Types>;
  /** fetch aggregated fields from the table: "contract_types" */
  contract_types_aggregate: Contract_Types_Aggregate;
  /** fetch data from the table: "contract_types" using primary key columns */
  contract_types_by_pk?: Maybe<Contract_Types>;
  contracts: Array<Contract>;
  /** fetch data from the table: "contracts_metadata" */
  contracts_metadata: Array<Contracts_Metadata>;
  /** fetch aggregated fields from the table: "contracts_metadata" */
  contracts_metadata_aggregate: Contracts_Metadata_Aggregate;
  /** fetch data from the table: "contracts_metadata" using primary key columns */
  contracts_metadata_by_pk?: Maybe<Contracts_Metadata>;
  createApplication?: Maybe<CreateApplication>;
  /** fetch data from the table: "curation_statuses" */
  curation_statuses: Array<Curation_Statuses>;
  /** fetch aggregated fields from the table: "curation_statuses" */
  curation_statuses_aggregate: Curation_Statuses_Aggregate;
  /** fetch data from the table: "curation_statuses" using primary key columns */
  curation_statuses_by_pk?: Maybe<Curation_Statuses>;
  dependencies: Array<Dependency>;
  /** fetch data from the table: "dependencies_metadata" */
  dependencies_metadata: Array<Dependencies_Metadata>;
  /** fetch aggregated fields from the table: "dependencies_metadata" */
  dependencies_metadata_aggregate: Dependencies_Metadata_Aggregate;
  /** fetch data from the table: "dependencies_metadata" using primary key columns */
  dependencies_metadata_by_pk?: Maybe<Dependencies_Metadata>;
  dependency?: Maybe<Dependency>;
  dependencyAdditionalCDN?: Maybe<DependencyAdditionalCdn>;
  dependencyAdditionalCDNs: Array<DependencyAdditionalCdn>;
  dependencyAdditionalRepositories: Array<DependencyAdditionalRepository>;
  dependencyAdditionalRepository?: Maybe<DependencyAdditionalRepository>;
  dependencyRegistries: Array<DependencyRegistry>;
  dependencyRegistry?: Maybe<DependencyRegistry>;
  dependencyScript?: Maybe<DependencyScript>;
  dependencyScripts: Array<DependencyScript>;
  /** fetch data from the table: "dependency_additional_cdns" */
  dependency_additional_cdns: Array<Dependency_Additional_Cdns>;
  /** fetch aggregated fields from the table: "dependency_additional_cdns" */
  dependency_additional_cdns_aggregate: Dependency_Additional_Cdns_Aggregate;
  /** fetch data from the table: "dependency_additional_cdns" using primary key columns */
  dependency_additional_cdns_by_pk?: Maybe<Dependency_Additional_Cdns>;
  /** fetch data from the table: "dependency_additional_repositories" */
  dependency_additional_repositories: Array<Dependency_Additional_Repositories>;
  /** fetch aggregated fields from the table: "dependency_additional_repositories" */
  dependency_additional_repositories_aggregate: Dependency_Additional_Repositories_Aggregate;
  /** fetch data from the table: "dependency_additional_repositories" using primary key columns */
  dependency_additional_repositories_by_pk?: Maybe<Dependency_Additional_Repositories>;
  /** fetch data from the table: "dependency_registries" */
  dependency_registries: Array<Dependency_Registries>;
  /** fetch aggregated fields from the table: "dependency_registries" */
  dependency_registries_aggregate: Dependency_Registries_Aggregate;
  /** fetch data from the table: "dependency_registries" using primary key columns */
  dependency_registries_by_pk?: Maybe<Dependency_Registries>;
  /** fetch data from the table: "dependency_scripts" */
  dependency_scripts: Array<Dependency_Scripts>;
  /** fetch aggregated fields from the table: "dependency_scripts" */
  dependency_scripts_aggregate: Dependency_Scripts_Aggregate;
  /** fetch data from the table: "dependency_scripts" using primary key columns */
  dependency_scripts_by_pk?: Maybe<Dependency_Scripts>;
  engineRegistries: Array<EngineRegistry>;
  engineRegistry?: Maybe<EngineRegistry>;
  /** An array relationship */
  entity_tags: Array<Entity_Tags>;
  /** An aggregate relationship */
  entity_tags_aggregate: Entity_Tags_Aggregate;
  /** fetch data from the table: "entity_tags" using primary key columns */
  entity_tags_by_pk?: Maybe<Entity_Tags>;
  /** An array relationship */
  favorites: Array<Favorites>;
  /** An aggregate relationship */
  favorites_aggregate: Favorites_Aggregate;
  /** fetch data from the table: "favorites" using primary key columns */
  favorites_by_pk?: Maybe<Favorites>;
  /** fetch data from the table: "feature_field_values_counts" */
  feature_field_values_counts: Array<Feature_Field_Values_Counts>;
  /** fetch aggregated fields from the table: "feature_field_values_counts" */
  feature_field_values_counts_aggregate: Feature_Field_Values_Counts_Aggregate;
  /** fetch data from the table: "feature_flags" */
  feature_flags: Array<Feature_Flags>;
  /** fetch aggregated fields from the table: "feature_flags" */
  feature_flags_aggregate: Feature_Flags_Aggregate;
  /** fetch data from the table: "feature_flags" using primary key columns */
  feature_flags_by_pk?: Maybe<Feature_Flags>;
  /** execute function "filter_tokens_metadata_by_features" which returns "tokens_metadata" */
  filter_tokens_metadata_by_features: Array<Tokens_Metadata>;
  /** execute function "filter_tokens_metadata_by_features" and query aggregates on result of table type "tokens_metadata" */
  filter_tokens_metadata_by_features_aggregate: Tokens_Metadata_Aggregate;
  getAuthMessage?: Maybe<AuthMessageOutput>;
  getOpenseaCollectionURL?: Maybe<OpenseaCollectionData>;
  /** execute function "get_projects_metadata_feature_field_value_counts" which returns "feature_field_values_counts" */
  get_projects_metadata_feature_field_value_counts: Array<Feature_Field_Values_Counts>;
  /** execute function "get_projects_metadata_feature_field_value_counts" and query aggregates on result of table type "feature_field_values_counts" */
  get_projects_metadata_feature_field_value_counts_aggregate: Feature_Field_Values_Counts_Aggregate;
  isTokenFlagged?: Maybe<Scalars['Boolean']>;
  /** execute function "list_projects_metadata_random" which returns "projects_metadata" */
  list_projects_metadata_random: Array<Projects_Metadata>;
  /** execute function "list_projects_metadata_random" and query aggregates on result of table type "projects_metadata" */
  list_projects_metadata_random_aggregate: Projects_Metadata_Aggregate;
  /** fetch data from the table: "media" */
  media: Array<Media>;
  /** fetch aggregated fields from the table: "media" */
  media_aggregate: Media_Aggregate;
  /** fetch data from the table: "media" using primary key columns */
  media_by_pk?: Maybe<Media>;
  minter?: Maybe<Minter>;
  minterFilter?: Maybe<MinterFilter>;
  minterFilters: Array<MinterFilter>;
  /** fetch data from the table: "minter_filters_metadata" */
  minter_filters_metadata: Array<Minter_Filters_Metadata>;
  /** fetch aggregated fields from the table: "minter_filters_metadata" */
  minter_filters_metadata_aggregate: Minter_Filters_Metadata_Aggregate;
  /** fetch data from the table: "minter_filters_metadata" using primary key columns */
  minter_filters_metadata_by_pk?: Maybe<Minter_Filters_Metadata>;
  /** fetch data from the table: "minter_type_names" */
  minter_type_names: Array<Minter_Type_Names>;
  /** fetch aggregated fields from the table: "minter_type_names" */
  minter_type_names_aggregate: Minter_Type_Names_Aggregate;
  /** fetch data from the table: "minter_type_names" using primary key columns */
  minter_type_names_by_pk?: Maybe<Minter_Type_Names>;
  /** fetch data from the table: "minter_types" */
  minter_types: Array<Minter_Types>;
  /** fetch aggregated fields from the table: "minter_types" */
  minter_types_aggregate: Minter_Types_Aggregate;
  /** fetch data from the table: "minter_types" using primary key columns */
  minter_types_by_pk?: Maybe<Minter_Types>;
  minters: Array<Minter>;
  /** fetch data from the table: "minters_metadata" */
  minters_metadata: Array<Minters_Metadata>;
  /** fetch aggregated fields from the table: "minters_metadata" */
  minters_metadata_aggregate: Minters_Metadata_Aggregate;
  /** fetch data from the table: "minters_metadata" using primary key columns */
  minters_metadata_by_pk?: Maybe<Minters_Metadata>;
  /** An array relationship */
  notifications: Array<Notifications>;
  /** An aggregate relationship */
  notifications_aggregate: Notifications_Aggregate;
  /** fetch data from the table: "notifications" using primary key columns */
  notifications_by_pk?: Maybe<Notifications>;
  payment?: Maybe<Payment>;
  payments: Array<Payment>;
  project?: Maybe<Project>;
  projectExternalAssetDependencies: Array<ProjectExternalAssetDependency>;
  projectExternalAssetDependency?: Maybe<ProjectExternalAssetDependency>;
  projectMinterConfiguration?: Maybe<ProjectMinterConfiguration>;
  projectMinterConfigurations: Array<ProjectMinterConfiguration>;
  projectScript?: Maybe<ProjectScript>;
  projectScripts: Array<ProjectScript>;
  /** fetch data from the table: "project_external_asset_dependencies" */
  project_external_asset_dependencies: Array<Project_External_Asset_Dependencies>;
  /** fetch aggregated fields from the table: "project_external_asset_dependencies" */
  project_external_asset_dependencies_aggregate: Project_External_Asset_Dependencies_Aggregate;
  /** fetch data from the table: "project_external_asset_dependencies" using primary key columns */
  project_external_asset_dependencies_by_pk?: Maybe<Project_External_Asset_Dependencies>;
  /** fetch data from the table: "project_external_asset_dependency_types" */
  project_external_asset_dependency_types: Array<Project_External_Asset_Dependency_Types>;
  /** fetch aggregated fields from the table: "project_external_asset_dependency_types" */
  project_external_asset_dependency_types_aggregate: Project_External_Asset_Dependency_Types_Aggregate;
  /** fetch data from the table: "project_external_asset_dependency_types" using primary key columns */
  project_external_asset_dependency_types_by_pk?: Maybe<Project_External_Asset_Dependency_Types>;
  /** fetch data from the table: "project_minter_configurations" */
  project_minter_configurations: Array<Project_Minter_Configurations>;
  /** fetch aggregated fields from the table: "project_minter_configurations" */
  project_minter_configurations_aggregate: Project_Minter_Configurations_Aggregate;
  /** fetch data from the table: "project_minter_configurations" using primary key columns */
  project_minter_configurations_by_pk?: Maybe<Project_Minter_Configurations>;
  /** fetch data from the table: "project_scripts" */
  project_scripts: Array<Project_Scripts>;
  /** fetch aggregated fields from the table: "project_scripts" */
  project_scripts_aggregate: Project_Scripts_Aggregate;
  /** fetch data from the table: "project_scripts" using primary key columns */
  project_scripts_by_pk?: Maybe<Project_Scripts>;
  /** fetch data from the table: "project_series" */
  project_series: Array<Project_Series>;
  /** fetch aggregated fields from the table: "project_series" */
  project_series_aggregate: Project_Series_Aggregate;
  /** fetch data from the table: "project_series" using primary key columns */
  project_series_by_pk?: Maybe<Project_Series>;
  /** fetch data from the table: "project_vertical_categories" */
  project_vertical_categories: Array<Project_Vertical_Categories>;
  /** fetch aggregated fields from the table: "project_vertical_categories" */
  project_vertical_categories_aggregate: Project_Vertical_Categories_Aggregate;
  /** fetch data from the table: "project_vertical_categories" using primary key columns */
  project_vertical_categories_by_pk?: Maybe<Project_Vertical_Categories>;
  /** fetch data from the table: "project_verticals" */
  project_verticals: Array<Project_Verticals>;
  /** fetch aggregated fields from the table: "project_verticals" */
  project_verticals_aggregate: Project_Verticals_Aggregate;
  /** fetch data from the table: "project_verticals" using primary key columns */
  project_verticals_by_pk?: Maybe<Project_Verticals>;
  projects: Array<Project>;
  /** fetch data from the table: "projects_features" */
  projects_features: Array<Projects_Features>;
  /** fetch aggregated fields from the table: "projects_features" */
  projects_features_aggregate: Projects_Features_Aggregate;
  /** fetch data from the table: "projects_features" using primary key columns */
  projects_features_by_pk?: Maybe<Projects_Features>;
  /** fetch data from the table: "projects_features_private" */
  projects_features_private: Array<Projects_Features_Private>;
  /** fetch aggregated fields from the table: "projects_features_private" */
  projects_features_private_aggregate: Projects_Features_Private_Aggregate;
  /** fetch data from the table: "projects_metadata" */
  projects_metadata: Array<Projects_Metadata>;
  /** fetch aggregated fields from the table: "projects_metadata" */
  projects_metadata_aggregate: Projects_Metadata_Aggregate;
  /** fetch data from the table: "projects_metadata" using primary key columns */
  projects_metadata_by_pk?: Maybe<Projects_Metadata>;
  proposedArtistAddressesAndSplit?: Maybe<ProposedArtistAddressesAndSplit>;
  proposedArtistAddressesAndSplits: Array<ProposedArtistAddressesAndSplit>;
  /** fetch data from the table: "proposed_artist_addresses_and_splits" */
  proposed_artist_addresses_and_splits: Array<Proposed_Artist_Addresses_And_Splits>;
  /** fetch aggregated fields from the table: "proposed_artist_addresses_and_splits" */
  proposed_artist_addresses_and_splits_aggregate: Proposed_Artist_Addresses_And_Splits_Aggregate;
  /** fetch data from the table: "proposed_artist_addresses_and_splits" using primary key columns */
  proposed_artist_addresses_and_splits_by_pk?: Maybe<Proposed_Artist_Addresses_And_Splits>;
  receipt?: Maybe<Receipt>;
  /** fetch data from the table: "receipt_metadata" */
  receipt_metadata: Array<Receipt_Metadata>;
  /** fetch aggregated fields from the table: "receipt_metadata" */
  receipt_metadata_aggregate: Receipt_Metadata_Aggregate;
  /** fetch data from the table: "receipt_metadata" using primary key columns */
  receipt_metadata_by_pk?: Maybe<Receipt_Metadata>;
  receipts: Array<Receipt>;
  sale?: Maybe<Sale>;
  saleLookupTable?: Maybe<SaleLookupTable>;
  saleLookupTables: Array<SaleLookupTable>;
  sales: Array<Sale>;
  /** fetch data from the table: "screenings" */
  screenings: Array<Screenings>;
  /** fetch aggregated fields from the table: "screenings" */
  screenings_aggregate: Screenings_Aggregate;
  /** fetch data from the table: "screenings" using primary key columns */
  screenings_by_pk?: Maybe<Screenings>;
  /** execute function "search_projects" which returns "projects_metadata" */
  search_projects: Array<Projects_Metadata>;
  /** execute function "search_projects" and query aggregates on result of table type "projects_metadata" */
  search_projects_aggregate: Projects_Metadata_Aggregate;
  /** execute function "search_tags" which returns "tags" */
  search_tags: Array<Tags>;
  /** execute function "search_tags" and query aggregates on result of table type "tags" */
  search_tags_aggregate: Tags_Aggregate;
  /** execute function "search_tokens" which returns "tokens_metadata" */
  search_tokens: Array<Tokens_Metadata>;
  /** execute function "search_tokens" and query aggregates on result of table type "tokens_metadata" */
  search_tokens_aggregate: Tokens_Metadata_Aggregate;
  /** execute function "search_users" which returns "user_profiles" */
  search_users: Array<User_Profiles>;
  /** execute function "search_users" and query aggregates on result of table type "user_profiles" */
  search_users_aggregate: User_Profiles_Aggregate;
  /** fetch data from the table: "sync_status" */
  sync_status: Array<Sync_Status>;
  /** fetch aggregated fields from the table: "sync_status" */
  sync_status_aggregate: Sync_Status_Aggregate;
  /** fetch data from the table: "sync_status" using primary key columns */
  sync_status_by_pk?: Maybe<Sync_Status>;
  /** fetch data from the table: "tag_groupings" */
  tag_groupings: Array<Tag_Groupings>;
  /** fetch aggregated fields from the table: "tag_groupings" */
  tag_groupings_aggregate: Tag_Groupings_Aggregate;
  /** fetch data from the table: "tag_groupings" using primary key columns */
  tag_groupings_by_pk?: Maybe<Tag_Groupings>;
  /** fetch data from the table: "tag_status" */
  tag_status: Array<Tag_Status>;
  /** fetch aggregated fields from the table: "tag_status" */
  tag_status_aggregate: Tag_Status_Aggregate;
  /** fetch data from the table: "tag_status" using primary key columns */
  tag_status_by_pk?: Maybe<Tag_Status>;
  /** fetch data from the table: "tag_types" */
  tag_types: Array<Tag_Types>;
  /** fetch aggregated fields from the table: "tag_types" */
  tag_types_aggregate: Tag_Types_Aggregate;
  /** fetch data from the table: "tag_types" using primary key columns */
  tag_types_by_pk?: Maybe<Tag_Types>;
  /** fetch data from the table: "tags" */
  tags: Array<Tags>;
  /** fetch aggregated fields from the table: "tags" */
  tags_aggregate: Tags_Aggregate;
  /** fetch data from the table: "tags" using primary key columns */
  tags_by_pk?: Maybe<Tags>;
  /** fetch data from the table: "terms_of_service" */
  terms_of_service: Array<Terms_Of_Service>;
  /** fetch aggregated fields from the table: "terms_of_service" */
  terms_of_service_aggregate: Terms_Of_Service_Aggregate;
  /** fetch data from the table: "terms_of_service" using primary key columns */
  terms_of_service_by_pk?: Maybe<Terms_Of_Service>;
  token?: Maybe<Token>;
  tokens: Array<Token>;
  /** fetch data from the table: "tokens_metadata" */
  tokens_metadata: Array<Tokens_Metadata>;
  /** fetch aggregated fields from the table: "tokens_metadata" */
  tokens_metadata_aggregate: Tokens_Metadata_Aggregate;
  /** fetch data from the table: "tokens_metadata" using primary key columns */
  tokens_metadata_by_pk?: Maybe<Tokens_Metadata>;
  transfer?: Maybe<Transfer>;
  transfers: Array<Transfer>;
  /** fetch data from the table: "user_profiles" */
  user_profiles: Array<User_Profiles>;
  /** fetch aggregated fields from the table: "user_profiles" */
  user_profiles_aggregate: User_Profiles_Aggregate;
  /** fetch data from the table: "user_profiles" using primary key columns */
  user_profiles_by_pk?: Maybe<User_Profiles>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
  /** fetch data from the table: "verticals" */
  verticals: Array<Verticals>;
  /** fetch aggregated fields from the table: "verticals" */
  verticals_aggregate: Verticals_Aggregate;
  /** fetch data from the table: "verticals" using primary key columns */
  verticals_by_pk?: Maybe<Verticals>;
  /** fetch data from the table: "webflow_artist_info" */
  webflow_artist_info: Array<Webflow_Artist_Info>;
  /** fetch aggregated fields from the table: "webflow_artist_info" */
  webflow_artist_info_aggregate: Webflow_Artist_Info_Aggregate;
  /** fetch data from the table: "webflow_artist_info" using primary key columns */
  webflow_artist_info_by_pk?: Maybe<Webflow_Artist_Info>;
  /** fetch data from the table: "webflow_spectrum_articles" */
  webflow_spectrum_articles: Array<Webflow_Spectrum_Articles>;
  /** fetch aggregated fields from the table: "webflow_spectrum_articles" */
  webflow_spectrum_articles_aggregate: Webflow_Spectrum_Articles_Aggregate;
  /** fetch data from the table: "webflow_spectrum_articles" using primary key columns */
  webflow_spectrum_articles_by_pk?: Maybe<Webflow_Spectrum_Articles>;
  whitelisting?: Maybe<Whitelisting>;
  whitelistings: Array<Whitelisting>;
};


export type Query_Root_MetaArgs = {
  block?: InputMaybe<Block_Height>;
};


export type Query_RootAccountArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootAccountProjectArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootAccountProjectsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AccountProject_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<AccountProject_Filter>;
};


export type Query_RootAccountsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Account_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Account_Filter>;
};


export type Query_RootArtistsArgs = {
  distinct_on?: InputMaybe<Array<Artists_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Artists_Order_By>>;
  where?: InputMaybe<Artists_Bool_Exp>;
};


export type Query_RootArtists_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Artists_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Artists_Order_By>>;
  where?: InputMaybe<Artists_Bool_Exp>;
};


export type Query_RootCategoriesArgs = {
  distinct_on?: InputMaybe<Array<Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Categories_Order_By>>;
  where?: InputMaybe<Categories_Bool_Exp>;
};


export type Query_RootCategories_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Categories_Order_By>>;
  where?: InputMaybe<Categories_Bool_Exp>;
};


export type Query_RootCategories_By_PkArgs = {
  name: Scalars['String'];
};


export type Query_RootContractArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootContract_AllowlistingsArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


export type Query_RootContract_Allowlistings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


export type Query_RootContract_Allowlistings_By_PkArgs = {
  contract_address: Scalars['String'];
  user_address: Scalars['String'];
};


export type Query_RootContract_Type_NamesArgs = {
  distinct_on?: InputMaybe<Array<Contract_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Type_Names_Order_By>>;
  where?: InputMaybe<Contract_Type_Names_Bool_Exp>;
};


export type Query_RootContract_Type_Names_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Type_Names_Order_By>>;
  where?: InputMaybe<Contract_Type_Names_Bool_Exp>;
};


export type Query_RootContract_Type_Names_By_PkArgs = {
  name: Scalars['String'];
};


export type Query_RootContract_TypesArgs = {
  distinct_on?: InputMaybe<Array<Contract_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Types_Order_By>>;
  where?: InputMaybe<Contract_Types_Bool_Exp>;
};


export type Query_RootContract_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Types_Order_By>>;
  where?: InputMaybe<Contract_Types_Bool_Exp>;
};


export type Query_RootContract_Types_By_PkArgs = {
  type: Contract_Type_Names_Enum;
};


export type Query_RootContractsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Contract_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Contract_Filter>;
};


export type Query_RootContracts_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contracts_Metadata_Order_By>>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};


export type Query_RootContracts_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contracts_Metadata_Order_By>>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};


export type Query_RootContracts_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


export type Query_RootCreateApplicationArgs = {
  id: Scalars['uuid'];
};


export type Query_RootCuration_StatusesArgs = {
  distinct_on?: InputMaybe<Array<Curation_Statuses_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Curation_Statuses_Order_By>>;
  where?: InputMaybe<Curation_Statuses_Bool_Exp>;
};


export type Query_RootCuration_Statuses_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Curation_Statuses_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Curation_Statuses_Order_By>>;
  where?: InputMaybe<Curation_Statuses_Bool_Exp>;
};


export type Query_RootCuration_Statuses_By_PkArgs = {
  value: Scalars['String'];
};


export type Query_RootDependenciesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Dependency_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Dependency_Filter>;
};


export type Query_RootDependencies_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependencies_Metadata_Order_By>>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};


export type Query_RootDependencies_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependencies_Metadata_Order_By>>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};


export type Query_RootDependencies_Metadata_By_PkArgs = {
  type_and_version: Scalars['String'];
};


export type Query_RootDependencyArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootDependencyAdditionalCdnArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootDependencyAdditionalCdNsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyAdditionalCdn_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyAdditionalCdn_Filter>;
};


export type Query_RootDependencyAdditionalRepositoriesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyAdditionalRepository_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyAdditionalRepository_Filter>;
};


export type Query_RootDependencyAdditionalRepositoryArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootDependencyRegistriesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyRegistry_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyRegistry_Filter>;
};


export type Query_RootDependencyRegistryArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootDependencyScriptArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootDependencyScriptsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyScript_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyScript_Filter>;
};


export type Query_RootDependency_Additional_CdnsArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Cdns_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};


export type Query_RootDependency_Additional_Cdns_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Cdns_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};


export type Query_RootDependency_Additional_Cdns_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


export type Query_RootDependency_Additional_RepositoriesArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Repositories_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};


export type Query_RootDependency_Additional_Repositories_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Repositories_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};


export type Query_RootDependency_Additional_Repositories_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


export type Query_RootDependency_RegistriesArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Registries_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Registries_Order_By>>;
  where?: InputMaybe<Dependency_Registries_Bool_Exp>;
};


export type Query_RootDependency_Registries_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Registries_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Registries_Order_By>>;
  where?: InputMaybe<Dependency_Registries_Bool_Exp>;
};


export type Query_RootDependency_Registries_By_PkArgs = {
  address: Scalars['String'];
};


export type Query_RootDependency_ScriptsArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Scripts_Order_By>>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};


export type Query_RootDependency_Scripts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Scripts_Order_By>>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};


export type Query_RootDependency_Scripts_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


export type Query_RootEngineRegistriesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<EngineRegistry_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<EngineRegistry_Filter>;
};


export type Query_RootEngineRegistryArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootEntity_TagsArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


export type Query_RootEntity_Tags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


export type Query_RootEntity_Tags_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootFavoritesArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


export type Query_RootFavorites_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


export type Query_RootFavorites_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootFeature_Field_Values_CountsArgs = {
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Query_RootFeature_Field_Values_Counts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Query_RootFeature_FlagsArgs = {
  distinct_on?: InputMaybe<Array<Feature_Flags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Flags_Order_By>>;
  where?: InputMaybe<Feature_Flags_Bool_Exp>;
};


export type Query_RootFeature_Flags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Feature_Flags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Flags_Order_By>>;
  where?: InputMaybe<Feature_Flags_Bool_Exp>;
};


export type Query_RootFeature_Flags_By_PkArgs = {
  flag_name: Scalars['String'];
};


export type Query_RootFilter_Tokens_Metadata_By_FeaturesArgs = {
  args: Filter_Tokens_Metadata_By_Features_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Query_RootFilter_Tokens_Metadata_By_Features_AggregateArgs = {
  args: Filter_Tokens_Metadata_By_Features_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Query_RootGetAuthMessageArgs = {
  publicAddress: Scalars['String'];
};


export type Query_RootGetOpenseaCollectionUrlArgs = {
  contractAddress: Scalars['String'];
  projectId: Scalars['String'];
};


export type Query_RootGet_Projects_Metadata_Feature_Field_Value_CountsArgs = {
  args: Get_Projects_Metadata_Feature_Field_Value_Counts_Args;
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Query_RootGet_Projects_Metadata_Feature_Field_Value_Counts_AggregateArgs = {
  args: Get_Projects_Metadata_Feature_Field_Value_Counts_Args;
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Query_RootIsTokenFlaggedArgs = {
  contractAddress: Scalars['String'];
  tokenId: Scalars['String'];
};


export type Query_RootList_Projects_Metadata_RandomArgs = {
  args: List_Projects_Metadata_Random_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Query_RootList_Projects_Metadata_Random_AggregateArgs = {
  args: List_Projects_Metadata_Random_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Query_RootMediaArgs = {
  distinct_on?: InputMaybe<Array<Media_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Media_Order_By>>;
  where?: InputMaybe<Media_Bool_Exp>;
};


export type Query_RootMedia_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Media_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Media_Order_By>>;
  where?: InputMaybe<Media_Bool_Exp>;
};


export type Query_RootMedia_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootMinterArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootMinterFilterArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootMinterFiltersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<MinterFilter_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<MinterFilter_Filter>;
};


export type Query_RootMinter_Filters_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Minter_Filters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Filters_Metadata_Order_By>>;
  where?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
};


export type Query_RootMinter_Filters_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minter_Filters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Filters_Metadata_Order_By>>;
  where?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
};


export type Query_RootMinter_Filters_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


export type Query_RootMinter_Type_NamesArgs = {
  distinct_on?: InputMaybe<Array<Minter_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Type_Names_Order_By>>;
  where?: InputMaybe<Minter_Type_Names_Bool_Exp>;
};


export type Query_RootMinter_Type_Names_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minter_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Type_Names_Order_By>>;
  where?: InputMaybe<Minter_Type_Names_Bool_Exp>;
};


export type Query_RootMinter_Type_Names_By_PkArgs = {
  name: Scalars['String'];
};


export type Query_RootMinter_TypesArgs = {
  distinct_on?: InputMaybe<Array<Minter_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Types_Order_By>>;
  where?: InputMaybe<Minter_Types_Bool_Exp>;
};


export type Query_RootMinter_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minter_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Types_Order_By>>;
  where?: InputMaybe<Minter_Types_Bool_Exp>;
};


export type Query_RootMinter_Types_By_PkArgs = {
  type: Minter_Type_Names_Enum;
};


export type Query_RootMintersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Minter_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Minter_Filter>;
};


export type Query_RootMinters_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minters_Metadata_Order_By>>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};


export type Query_RootMinters_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minters_Metadata_Order_By>>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};


export type Query_RootMinters_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


export type Query_RootNotificationsArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};


export type Query_RootNotifications_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};


export type Query_RootNotifications_By_PkArgs = {
  trigger_key: Scalars['String'];
  trigger_time: Scalars['timestamptz'];
  user_address: Scalars['String'];
};


export type Query_RootPaymentArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootPaymentsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Payment_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Payment_Filter>;
};


export type Query_RootProjectArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootProjectExternalAssetDependenciesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectExternalAssetDependency_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProjectExternalAssetDependency_Filter>;
};


export type Query_RootProjectExternalAssetDependencyArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootProjectMinterConfigurationArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootProjectMinterConfigurationsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectMinterConfiguration_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProjectMinterConfiguration_Filter>;
};


export type Query_RootProjectScriptArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootProjectScriptsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectScript_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProjectScript_Filter>;
};


export type Query_RootProject_External_Asset_DependenciesArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependencies_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};


export type Query_RootProject_External_Asset_Dependencies_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependencies_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};


export type Query_RootProject_External_Asset_Dependencies_By_PkArgs = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};


export type Query_RootProject_External_Asset_Dependency_TypesArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependency_Types_Bool_Exp>;
};


export type Query_RootProject_External_Asset_Dependency_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependency_Types_Bool_Exp>;
};


export type Query_RootProject_External_Asset_Dependency_Types_By_PkArgs = {
  type: Scalars['String'];
};


export type Query_RootProject_Minter_ConfigurationsArgs = {
  distinct_on?: InputMaybe<Array<Project_Minter_Configurations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Minter_Configurations_Order_By>>;
  where?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
};


export type Query_RootProject_Minter_Configurations_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Minter_Configurations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Minter_Configurations_Order_By>>;
  where?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
};


export type Query_RootProject_Minter_Configurations_By_PkArgs = {
  id: Scalars['String'];
};


export type Query_RootProject_ScriptsArgs = {
  distinct_on?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Scripts_Order_By>>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};


export type Query_RootProject_Scripts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Scripts_Order_By>>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};


export type Query_RootProject_Scripts_By_PkArgs = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};


export type Query_RootProject_SeriesArgs = {
  distinct_on?: InputMaybe<Array<Project_Series_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Series_Order_By>>;
  where?: InputMaybe<Project_Series_Bool_Exp>;
};


export type Query_RootProject_Series_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Series_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Series_Order_By>>;
  where?: InputMaybe<Project_Series_Bool_Exp>;
};


export type Query_RootProject_Series_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootProject_Vertical_CategoriesArgs = {
  distinct_on?: InputMaybe<Array<Project_Vertical_Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Vertical_Categories_Order_By>>;
  where?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
};


export type Query_RootProject_Vertical_Categories_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Vertical_Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Vertical_Categories_Order_By>>;
  where?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
};


export type Query_RootProject_Vertical_Categories_By_PkArgs = {
  name: Categories_Enum;
};


export type Query_RootProject_VerticalsArgs = {
  distinct_on?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Verticals_Order_By>>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};


export type Query_RootProject_Verticals_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Verticals_Order_By>>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};


export type Query_RootProject_Verticals_By_PkArgs = {
  name: Verticals_Enum;
};


export type Query_RootProjectsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Project_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Project_Filter>;
};


export type Query_RootProjects_FeaturesArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Order_By>>;
  where?: InputMaybe<Projects_Features_Bool_Exp>;
};


export type Query_RootProjects_Features_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Order_By>>;
  where?: InputMaybe<Projects_Features_Bool_Exp>;
};


export type Query_RootProjects_Features_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootProjects_Features_PrivateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Private_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Private_Order_By>>;
  where?: InputMaybe<Projects_Features_Private_Bool_Exp>;
};


export type Query_RootProjects_Features_Private_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Private_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Private_Order_By>>;
  where?: InputMaybe<Projects_Features_Private_Bool_Exp>;
};


export type Query_RootProjects_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Query_RootProjects_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Query_RootProjects_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


export type Query_RootProposedArtistAddressesAndSplitArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootProposedArtistAddressesAndSplitsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProposedArtistAddressesAndSplit_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProposedArtistAddressesAndSplit_Filter>;
};


export type Query_RootProposed_Artist_Addresses_And_SplitsArgs = {
  distinct_on?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Order_By>>;
  where?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
};


export type Query_RootProposed_Artist_Addresses_And_Splits_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Order_By>>;
  where?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
};


export type Query_RootProposed_Artist_Addresses_And_Splits_By_PkArgs = {
  project_id: Scalars['String'];
};


export type Query_RootReceiptArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootReceipt_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


export type Query_RootReceipt_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


export type Query_RootReceipt_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


export type Query_RootReceiptsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Receipt_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Receipt_Filter>;
};


export type Query_RootSaleArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootSaleLookupTableArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootSaleLookupTablesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<SaleLookupTable_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<SaleLookupTable_Filter>;
};


export type Query_RootSalesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Sale_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Sale_Filter>;
};


export type Query_RootScreeningsArgs = {
  distinct_on?: InputMaybe<Array<Screenings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Screenings_Order_By>>;
  where?: InputMaybe<Screenings_Bool_Exp>;
};


export type Query_RootScreenings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Screenings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Screenings_Order_By>>;
  where?: InputMaybe<Screenings_Bool_Exp>;
};


export type Query_RootScreenings_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootSearch_ProjectsArgs = {
  args: Search_Projects_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Query_RootSearch_Projects_AggregateArgs = {
  args: Search_Projects_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Query_RootSearch_TagsArgs = {
  args: Search_Tags_Args;
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Query_RootSearch_Tags_AggregateArgs = {
  args: Search_Tags_Args;
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Query_RootSearch_TokensArgs = {
  args: Search_Tokens_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Query_RootSearch_Tokens_AggregateArgs = {
  args: Search_Tokens_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Query_RootSearch_UsersArgs = {
  args: Search_Users_Args;
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Query_RootSearch_Users_AggregateArgs = {
  args: Search_Users_Args;
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Query_RootSync_StatusArgs = {
  distinct_on?: InputMaybe<Array<Sync_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Sync_Status_Order_By>>;
  where?: InputMaybe<Sync_Status_Bool_Exp>;
};


export type Query_RootSync_Status_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Sync_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Sync_Status_Order_By>>;
  where?: InputMaybe<Sync_Status_Bool_Exp>;
};


export type Query_RootSync_Status_By_PkArgs = {
  id: Scalars['Boolean'];
};


export type Query_RootTag_GroupingsArgs = {
  distinct_on?: InputMaybe<Array<Tag_Groupings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Groupings_Order_By>>;
  where?: InputMaybe<Tag_Groupings_Bool_Exp>;
};


export type Query_RootTag_Groupings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tag_Groupings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Groupings_Order_By>>;
  where?: InputMaybe<Tag_Groupings_Bool_Exp>;
};


export type Query_RootTag_Groupings_By_PkArgs = {
  name: Scalars['String'];
};


export type Query_RootTag_StatusArgs = {
  distinct_on?: InputMaybe<Array<Tag_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Status_Order_By>>;
  where?: InputMaybe<Tag_Status_Bool_Exp>;
};


export type Query_RootTag_Status_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tag_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Status_Order_By>>;
  where?: InputMaybe<Tag_Status_Bool_Exp>;
};


export type Query_RootTag_Status_By_PkArgs = {
  value: Scalars['String'];
};


export type Query_RootTag_TypesArgs = {
  distinct_on?: InputMaybe<Array<Tag_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Types_Order_By>>;
  where?: InputMaybe<Tag_Types_Bool_Exp>;
};


export type Query_RootTag_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tag_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Types_Order_By>>;
  where?: InputMaybe<Tag_Types_Bool_Exp>;
};


export type Query_RootTag_Types_By_PkArgs = {
  value: Scalars['String'];
};


export type Query_RootTagsArgs = {
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Query_RootTags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Query_RootTags_By_PkArgs = {
  name: Scalars['String'];
};


export type Query_RootTerms_Of_ServiceArgs = {
  distinct_on?: InputMaybe<Array<Terms_Of_Service_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Terms_Of_Service_Order_By>>;
  where?: InputMaybe<Terms_Of_Service_Bool_Exp>;
};


export type Query_RootTerms_Of_Service_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Terms_Of_Service_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Terms_Of_Service_Order_By>>;
  where?: InputMaybe<Terms_Of_Service_Bool_Exp>;
};


export type Query_RootTerms_Of_Service_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootTokenArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootTokensArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Token_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Token_Filter>;
};


export type Query_RootTokens_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Query_RootTokens_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Query_RootTokens_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


export type Query_RootTransferArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootTransfersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Transfer_Filter>;
};


export type Query_RootUser_ProfilesArgs = {
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Query_RootUser_Profiles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Query_RootUser_Profiles_By_PkArgs = {
  id: Scalars['Int'];
};


export type Query_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Query_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Query_RootUsers_By_PkArgs = {
  public_address: Scalars['String'];
};


export type Query_RootVerticalsArgs = {
  distinct_on?: InputMaybe<Array<Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Verticals_Order_By>>;
  where?: InputMaybe<Verticals_Bool_Exp>;
};


export type Query_RootVerticals_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Verticals_Order_By>>;
  where?: InputMaybe<Verticals_Bool_Exp>;
};


export type Query_RootVerticals_By_PkArgs = {
  name: Scalars['String'];
};


export type Query_RootWebflow_Artist_InfoArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Artist_Info_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Artist_Info_Order_By>>;
  where?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
};


export type Query_RootWebflow_Artist_Info_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Artist_Info_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Artist_Info_Order_By>>;
  where?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
};


export type Query_RootWebflow_Artist_Info_By_PkArgs = {
  webflow_item_id: Scalars['String'];
};


export type Query_RootWebflow_Spectrum_ArticlesArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Spectrum_Articles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Spectrum_Articles_Order_By>>;
  where?: InputMaybe<Webflow_Spectrum_Articles_Bool_Exp>;
};


export type Query_RootWebflow_Spectrum_Articles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Spectrum_Articles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Spectrum_Articles_Order_By>>;
  where?: InputMaybe<Webflow_Spectrum_Articles_Bool_Exp>;
};


export type Query_RootWebflow_Spectrum_Articles_By_PkArgs = {
  webflow_item_id: Scalars['String'];
};


export type Query_RootWhitelistingArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_RootWhitelistingsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Whitelisting_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Whitelisting_Filter>;
};

/** indexed data from subgraph Receipt entity, used by settlment minters */
export type Receipt_Metadata = {
  __typename?: 'receipt_metadata';
  /** Computed field defining approximate excess settlement funds available to be reclaimed on a given receipt, given latest purchase price on minter. May have minor rounding errors after 15 decimals. */
  excess_settlement_funds?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  /** An object relationship */
  minter: Minters_Metadata;
  minter_id: Scalars['String'];
  net_posted: Scalars['String'];
  num_purchased: Scalars['String'];
  /** An object relationship */
  project: Projects_Metadata;
  project_id: Scalars['String'];
  /** An object relationship */
  user: Users;
  user_address: Scalars['String'];
};

/** aggregated selection of "receipt_metadata" */
export type Receipt_Metadata_Aggregate = {
  __typename?: 'receipt_metadata_aggregate';
  aggregate?: Maybe<Receipt_Metadata_Aggregate_Fields>;
  nodes: Array<Receipt_Metadata>;
};

export type Receipt_Metadata_Aggregate_Bool_Exp = {
  count?: InputMaybe<Receipt_Metadata_Aggregate_Bool_Exp_Count>;
};

export type Receipt_Metadata_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Receipt_Metadata_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "receipt_metadata" */
export type Receipt_Metadata_Aggregate_Fields = {
  __typename?: 'receipt_metadata_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Receipt_Metadata_Max_Fields>;
  min?: Maybe<Receipt_Metadata_Min_Fields>;
};


/** aggregate fields of "receipt_metadata" */
export type Receipt_Metadata_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "receipt_metadata" */
export type Receipt_Metadata_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Receipt_Metadata_Max_Order_By>;
  min?: InputMaybe<Receipt_Metadata_Min_Order_By>;
};

/** input type for inserting array relation for remote table "receipt_metadata" */
export type Receipt_Metadata_Arr_Rel_Insert_Input = {
  data: Array<Receipt_Metadata_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Receipt_Metadata_On_Conflict>;
};

/** Boolean expression to filter rows from the table "receipt_metadata". All fields are combined with a logical 'AND'. */
export type Receipt_Metadata_Bool_Exp = {
  _and?: InputMaybe<Array<Receipt_Metadata_Bool_Exp>>;
  _not?: InputMaybe<Receipt_Metadata_Bool_Exp>;
  _or?: InputMaybe<Array<Receipt_Metadata_Bool_Exp>>;
  excess_settlement_funds?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<String_Comparison_Exp>;
  minter?: InputMaybe<Minters_Metadata_Bool_Exp>;
  minter_id?: InputMaybe<String_Comparison_Exp>;
  net_posted?: InputMaybe<String_Comparison_Exp>;
  num_purchased?: InputMaybe<String_Comparison_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_address?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "receipt_metadata" */
export enum Receipt_Metadata_Constraint {
  /** unique or primary key constraint on columns "id" */
  ReceiptMetadataPkey = 'receipt_metadata_pkey'
}

/** input type for inserting data into table "receipt_metadata" */
export type Receipt_Metadata_Insert_Input = {
  id?: InputMaybe<Scalars['String']>;
  minter?: InputMaybe<Minters_Metadata_Obj_Rel_Insert_Input>;
  minter_id?: InputMaybe<Scalars['String']>;
  net_posted?: InputMaybe<Scalars['String']>;
  num_purchased?: InputMaybe<Scalars['String']>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Receipt_Metadata_Max_Fields = {
  __typename?: 'receipt_metadata_max_fields';
  id?: Maybe<Scalars['String']>;
  minter_id?: Maybe<Scalars['String']>;
  net_posted?: Maybe<Scalars['String']>;
  num_purchased?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by max() on columns of table "receipt_metadata" */
export type Receipt_Metadata_Max_Order_By = {
  id?: InputMaybe<Order_By>;
  minter_id?: InputMaybe<Order_By>;
  net_posted?: InputMaybe<Order_By>;
  num_purchased?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Receipt_Metadata_Min_Fields = {
  __typename?: 'receipt_metadata_min_fields';
  id?: Maybe<Scalars['String']>;
  minter_id?: Maybe<Scalars['String']>;
  net_posted?: Maybe<Scalars['String']>;
  num_purchased?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  user_address?: Maybe<Scalars['String']>;
};

/** order by min() on columns of table "receipt_metadata" */
export type Receipt_Metadata_Min_Order_By = {
  id?: InputMaybe<Order_By>;
  minter_id?: InputMaybe<Order_By>;
  net_posted?: InputMaybe<Order_By>;
  num_purchased?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "receipt_metadata" */
export type Receipt_Metadata_Mutation_Response = {
  __typename?: 'receipt_metadata_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Receipt_Metadata>;
};

/** on_conflict condition type for table "receipt_metadata" */
export type Receipt_Metadata_On_Conflict = {
  constraint: Receipt_Metadata_Constraint;
  update_columns?: Array<Receipt_Metadata_Update_Column>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};

/** Ordering options when selecting data from "receipt_metadata". */
export type Receipt_Metadata_Order_By = {
  excess_settlement_funds?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  minter?: InputMaybe<Minters_Metadata_Order_By>;
  minter_id?: InputMaybe<Order_By>;
  net_posted?: InputMaybe<Order_By>;
  num_purchased?: InputMaybe<Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_address?: InputMaybe<Order_By>;
};

/** primary key columns input for table: receipt_metadata */
export type Receipt_Metadata_Pk_Columns_Input = {
  id: Scalars['String'];
};

/** select columns of table "receipt_metadata" */
export enum Receipt_Metadata_Select_Column {
  /** column name */
  Id = 'id',
  /** column name */
  MinterId = 'minter_id',
  /** column name */
  NetPosted = 'net_posted',
  /** column name */
  NumPurchased = 'num_purchased',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  UserAddress = 'user_address'
}

/** input type for updating data in table "receipt_metadata" */
export type Receipt_Metadata_Set_Input = {
  id?: InputMaybe<Scalars['String']>;
  minter_id?: InputMaybe<Scalars['String']>;
  net_posted?: InputMaybe<Scalars['String']>;
  num_purchased?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "receipt_metadata" */
export type Receipt_Metadata_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Receipt_Metadata_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Receipt_Metadata_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['String']>;
  minter_id?: InputMaybe<Scalars['String']>;
  net_posted?: InputMaybe<Scalars['String']>;
  num_purchased?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
  user_address?: InputMaybe<Scalars['String']>;
};

/** update columns of table "receipt_metadata" */
export enum Receipt_Metadata_Update_Column {
  /** column name */
  Id = 'id',
  /** column name */
  MinterId = 'minter_id',
  /** column name */
  NetPosted = 'net_posted',
  /** column name */
  NumPurchased = 'num_purchased',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  UserAddress = 'user_address'
}

export type Receipt_Metadata_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Receipt_Metadata_Set_Input>;
  /** filter the rows which have to be updated */
  where: Receipt_Metadata_Bool_Exp;
};

/** This is the results of the wallet and ip screenings we've performed */
export type Screenings = {
  __typename?: 'screenings';
  blocked: Scalars['Boolean'];
  id: Scalars['Int'];
  ip_address?: Maybe<Scalars['String']>;
  /** A computed field, that runs the "screening_is_valid" function that calculates if the attached screening is still valid. */
  is_valid?: Maybe<Scalars['Boolean']>;
  last_checked: Scalars['timestamptz'];
  wallet_address?: Maybe<Scalars['String']>;
};

/** aggregated selection of "screenings" */
export type Screenings_Aggregate = {
  __typename?: 'screenings_aggregate';
  aggregate?: Maybe<Screenings_Aggregate_Fields>;
  nodes: Array<Screenings>;
};

/** aggregate fields of "screenings" */
export type Screenings_Aggregate_Fields = {
  __typename?: 'screenings_aggregate_fields';
  avg?: Maybe<Screenings_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Screenings_Max_Fields>;
  min?: Maybe<Screenings_Min_Fields>;
  stddev?: Maybe<Screenings_Stddev_Fields>;
  stddev_pop?: Maybe<Screenings_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Screenings_Stddev_Samp_Fields>;
  sum?: Maybe<Screenings_Sum_Fields>;
  var_pop?: Maybe<Screenings_Var_Pop_Fields>;
  var_samp?: Maybe<Screenings_Var_Samp_Fields>;
  variance?: Maybe<Screenings_Variance_Fields>;
};


/** aggregate fields of "screenings" */
export type Screenings_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Screenings_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Screenings_Avg_Fields = {
  __typename?: 'screenings_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "screenings". All fields are combined with a logical 'AND'. */
export type Screenings_Bool_Exp = {
  _and?: InputMaybe<Array<Screenings_Bool_Exp>>;
  _not?: InputMaybe<Screenings_Bool_Exp>;
  _or?: InputMaybe<Array<Screenings_Bool_Exp>>;
  blocked?: InputMaybe<Boolean_Comparison_Exp>;
  id?: InputMaybe<Int_Comparison_Exp>;
  ip_address?: InputMaybe<String_Comparison_Exp>;
  is_valid?: InputMaybe<Boolean_Comparison_Exp>;
  last_checked?: InputMaybe<Timestamptz_Comparison_Exp>;
  wallet_address?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "screenings" */
export enum Screenings_Constraint {
  /** unique or primary key constraint on columns "ip_address" */
  ScreeningsIpAddressKey = 'screenings_ip_address_key',
  /** unique or primary key constraint on columns "id" */
  ScreeningsPkey = 'screenings_pkey',
  /** unique or primary key constraint on columns "wallet_address" */
  ScreeningsWalletAddressKey = 'screenings_wallet_address_key'
}

/** input type for incrementing numeric columns in table "screenings" */
export type Screenings_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "screenings" */
export type Screenings_Insert_Input = {
  blocked?: InputMaybe<Scalars['Boolean']>;
  id?: InputMaybe<Scalars['Int']>;
  ip_address?: InputMaybe<Scalars['String']>;
  last_checked?: InputMaybe<Scalars['timestamptz']>;
  wallet_address?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Screenings_Max_Fields = {
  __typename?: 'screenings_max_fields';
  id?: Maybe<Scalars['Int']>;
  ip_address?: Maybe<Scalars['String']>;
  last_checked?: Maybe<Scalars['timestamptz']>;
  wallet_address?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Screenings_Min_Fields = {
  __typename?: 'screenings_min_fields';
  id?: Maybe<Scalars['Int']>;
  ip_address?: Maybe<Scalars['String']>;
  last_checked?: Maybe<Scalars['timestamptz']>;
  wallet_address?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "screenings" */
export type Screenings_Mutation_Response = {
  __typename?: 'screenings_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Screenings>;
};

/** on_conflict condition type for table "screenings" */
export type Screenings_On_Conflict = {
  constraint: Screenings_Constraint;
  update_columns?: Array<Screenings_Update_Column>;
  where?: InputMaybe<Screenings_Bool_Exp>;
};

/** Ordering options when selecting data from "screenings". */
export type Screenings_Order_By = {
  blocked?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  ip_address?: InputMaybe<Order_By>;
  is_valid?: InputMaybe<Order_By>;
  last_checked?: InputMaybe<Order_By>;
  wallet_address?: InputMaybe<Order_By>;
};

/** primary key columns input for table: screenings */
export type Screenings_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** select columns of table "screenings" */
export enum Screenings_Select_Column {
  /** column name */
  Blocked = 'blocked',
  /** column name */
  Id = 'id',
  /** column name */
  IpAddress = 'ip_address',
  /** column name */
  LastChecked = 'last_checked',
  /** column name */
  WalletAddress = 'wallet_address'
}

/** input type for updating data in table "screenings" */
export type Screenings_Set_Input = {
  blocked?: InputMaybe<Scalars['Boolean']>;
  id?: InputMaybe<Scalars['Int']>;
  ip_address?: InputMaybe<Scalars['String']>;
  last_checked?: InputMaybe<Scalars['timestamptz']>;
  wallet_address?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type Screenings_Stddev_Fields = {
  __typename?: 'screenings_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Screenings_Stddev_Pop_Fields = {
  __typename?: 'screenings_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Screenings_Stddev_Samp_Fields = {
  __typename?: 'screenings_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "screenings" */
export type Screenings_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Screenings_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Screenings_Stream_Cursor_Value_Input = {
  blocked?: InputMaybe<Scalars['Boolean']>;
  id?: InputMaybe<Scalars['Int']>;
  ip_address?: InputMaybe<Scalars['String']>;
  last_checked?: InputMaybe<Scalars['timestamptz']>;
  wallet_address?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type Screenings_Sum_Fields = {
  __typename?: 'screenings_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** update columns of table "screenings" */
export enum Screenings_Update_Column {
  /** column name */
  Blocked = 'blocked',
  /** column name */
  Id = 'id',
  /** column name */
  IpAddress = 'ip_address',
  /** column name */
  LastChecked = 'last_checked',
  /** column name */
  WalletAddress = 'wallet_address'
}

export type Screenings_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Screenings_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Screenings_Set_Input>;
  /** filter the rows which have to be updated */
  where: Screenings_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Screenings_Var_Pop_Fields = {
  __typename?: 'screenings_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Screenings_Var_Samp_Fields = {
  __typename?: 'screenings_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Screenings_Variance_Fields = {
  __typename?: 'screenings_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

export type Search_Projects_Args = {
  search?: InputMaybe<Scalars['String']>;
};

export type Search_Tags_Args = {
  search?: InputMaybe<Scalars['String']>;
};

export type Search_Tokens_Args = {
  search?: InputMaybe<Scalars['String']>;
};

export type Search_Users_Args = {
  search?: InputMaybe<Scalars['String']>;
};

export type Subscription_Root = {
  __typename?: 'subscription_root';
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
  account?: Maybe<Account>;
  accountProject?: Maybe<AccountProject>;
  accountProjects: Array<AccountProject>;
  accounts: Array<Account>;
  /** fetch data from the table: "artists" */
  artists: Array<Artists>;
  /** fetch aggregated fields from the table: "artists" */
  artists_aggregate: Artists_Aggregate;
  /** fetch data from the table in a streaming manner: "artists" */
  artists_stream: Array<Artists>;
  /** fetch data from the table: "categories" */
  categories: Array<Categories>;
  /** fetch aggregated fields from the table: "categories" */
  categories_aggregate: Categories_Aggregate;
  /** fetch data from the table: "categories" using primary key columns */
  categories_by_pk?: Maybe<Categories>;
  /** fetch data from the table in a streaming manner: "categories" */
  categories_stream: Array<Categories>;
  contract?: Maybe<Contract>;
  /** fetch data from the table: "contract_allowlistings" */
  contract_allowlistings: Array<Contract_Allowlistings>;
  /** fetch aggregated fields from the table: "contract_allowlistings" */
  contract_allowlistings_aggregate: Contract_Allowlistings_Aggregate;
  /** fetch data from the table: "contract_allowlistings" using primary key columns */
  contract_allowlistings_by_pk?: Maybe<Contract_Allowlistings>;
  /** fetch data from the table in a streaming manner: "contract_allowlistings" */
  contract_allowlistings_stream: Array<Contract_Allowlistings>;
  /** fetch data from the table: "contract_type_names" */
  contract_type_names: Array<Contract_Type_Names>;
  /** fetch aggregated fields from the table: "contract_type_names" */
  contract_type_names_aggregate: Contract_Type_Names_Aggregate;
  /** fetch data from the table: "contract_type_names" using primary key columns */
  contract_type_names_by_pk?: Maybe<Contract_Type_Names>;
  /** fetch data from the table in a streaming manner: "contract_type_names" */
  contract_type_names_stream: Array<Contract_Type_Names>;
  /** fetch data from the table: "contract_types" */
  contract_types: Array<Contract_Types>;
  /** fetch aggregated fields from the table: "contract_types" */
  contract_types_aggregate: Contract_Types_Aggregate;
  /** fetch data from the table: "contract_types" using primary key columns */
  contract_types_by_pk?: Maybe<Contract_Types>;
  /** fetch data from the table in a streaming manner: "contract_types" */
  contract_types_stream: Array<Contract_Types>;
  contracts: Array<Contract>;
  /** fetch data from the table: "contracts_metadata" */
  contracts_metadata: Array<Contracts_Metadata>;
  /** fetch aggregated fields from the table: "contracts_metadata" */
  contracts_metadata_aggregate: Contracts_Metadata_Aggregate;
  /** fetch data from the table: "contracts_metadata" using primary key columns */
  contracts_metadata_by_pk?: Maybe<Contracts_Metadata>;
  /** fetch data from the table in a streaming manner: "contracts_metadata" */
  contracts_metadata_stream: Array<Contracts_Metadata>;
  createApplication?: Maybe<CreateApplication>;
  /** fetch data from the table: "curation_statuses" */
  curation_statuses: Array<Curation_Statuses>;
  /** fetch aggregated fields from the table: "curation_statuses" */
  curation_statuses_aggregate: Curation_Statuses_Aggregate;
  /** fetch data from the table: "curation_statuses" using primary key columns */
  curation_statuses_by_pk?: Maybe<Curation_Statuses>;
  /** fetch data from the table in a streaming manner: "curation_statuses" */
  curation_statuses_stream: Array<Curation_Statuses>;
  dependencies: Array<Dependency>;
  /** fetch data from the table: "dependencies_metadata" */
  dependencies_metadata: Array<Dependencies_Metadata>;
  /** fetch aggregated fields from the table: "dependencies_metadata" */
  dependencies_metadata_aggregate: Dependencies_Metadata_Aggregate;
  /** fetch data from the table: "dependencies_metadata" using primary key columns */
  dependencies_metadata_by_pk?: Maybe<Dependencies_Metadata>;
  /** fetch data from the table in a streaming manner: "dependencies_metadata" */
  dependencies_metadata_stream: Array<Dependencies_Metadata>;
  dependency?: Maybe<Dependency>;
  dependencyAdditionalCDN?: Maybe<DependencyAdditionalCdn>;
  dependencyAdditionalCDNs: Array<DependencyAdditionalCdn>;
  dependencyAdditionalRepositories: Array<DependencyAdditionalRepository>;
  dependencyAdditionalRepository?: Maybe<DependencyAdditionalRepository>;
  dependencyRegistries: Array<DependencyRegistry>;
  dependencyRegistry?: Maybe<DependencyRegistry>;
  dependencyScript?: Maybe<DependencyScript>;
  dependencyScripts: Array<DependencyScript>;
  /** fetch data from the table: "dependency_additional_cdns" */
  dependency_additional_cdns: Array<Dependency_Additional_Cdns>;
  /** fetch aggregated fields from the table: "dependency_additional_cdns" */
  dependency_additional_cdns_aggregate: Dependency_Additional_Cdns_Aggregate;
  /** fetch data from the table: "dependency_additional_cdns" using primary key columns */
  dependency_additional_cdns_by_pk?: Maybe<Dependency_Additional_Cdns>;
  /** fetch data from the table in a streaming manner: "dependency_additional_cdns" */
  dependency_additional_cdns_stream: Array<Dependency_Additional_Cdns>;
  /** fetch data from the table: "dependency_additional_repositories" */
  dependency_additional_repositories: Array<Dependency_Additional_Repositories>;
  /** fetch aggregated fields from the table: "dependency_additional_repositories" */
  dependency_additional_repositories_aggregate: Dependency_Additional_Repositories_Aggregate;
  /** fetch data from the table: "dependency_additional_repositories" using primary key columns */
  dependency_additional_repositories_by_pk?: Maybe<Dependency_Additional_Repositories>;
  /** fetch data from the table in a streaming manner: "dependency_additional_repositories" */
  dependency_additional_repositories_stream: Array<Dependency_Additional_Repositories>;
  /** fetch data from the table: "dependency_registries" */
  dependency_registries: Array<Dependency_Registries>;
  /** fetch aggregated fields from the table: "dependency_registries" */
  dependency_registries_aggregate: Dependency_Registries_Aggregate;
  /** fetch data from the table: "dependency_registries" using primary key columns */
  dependency_registries_by_pk?: Maybe<Dependency_Registries>;
  /** fetch data from the table in a streaming manner: "dependency_registries" */
  dependency_registries_stream: Array<Dependency_Registries>;
  /** fetch data from the table: "dependency_scripts" */
  dependency_scripts: Array<Dependency_Scripts>;
  /** fetch aggregated fields from the table: "dependency_scripts" */
  dependency_scripts_aggregate: Dependency_Scripts_Aggregate;
  /** fetch data from the table: "dependency_scripts" using primary key columns */
  dependency_scripts_by_pk?: Maybe<Dependency_Scripts>;
  /** fetch data from the table in a streaming manner: "dependency_scripts" */
  dependency_scripts_stream: Array<Dependency_Scripts>;
  engineRegistries: Array<EngineRegistry>;
  engineRegistry?: Maybe<EngineRegistry>;
  /** An array relationship */
  entity_tags: Array<Entity_Tags>;
  /** An aggregate relationship */
  entity_tags_aggregate: Entity_Tags_Aggregate;
  /** fetch data from the table: "entity_tags" using primary key columns */
  entity_tags_by_pk?: Maybe<Entity_Tags>;
  /** fetch data from the table in a streaming manner: "entity_tags" */
  entity_tags_stream: Array<Entity_Tags>;
  /** An array relationship */
  favorites: Array<Favorites>;
  /** An aggregate relationship */
  favorites_aggregate: Favorites_Aggregate;
  /** fetch data from the table: "favorites" using primary key columns */
  favorites_by_pk?: Maybe<Favorites>;
  /** fetch data from the table in a streaming manner: "favorites" */
  favorites_stream: Array<Favorites>;
  /** fetch data from the table: "feature_field_values_counts" */
  feature_field_values_counts: Array<Feature_Field_Values_Counts>;
  /** fetch aggregated fields from the table: "feature_field_values_counts" */
  feature_field_values_counts_aggregate: Feature_Field_Values_Counts_Aggregate;
  /** fetch data from the table in a streaming manner: "feature_field_values_counts" */
  feature_field_values_counts_stream: Array<Feature_Field_Values_Counts>;
  /** fetch data from the table: "feature_flags" */
  feature_flags: Array<Feature_Flags>;
  /** fetch aggregated fields from the table: "feature_flags" */
  feature_flags_aggregate: Feature_Flags_Aggregate;
  /** fetch data from the table: "feature_flags" using primary key columns */
  feature_flags_by_pk?: Maybe<Feature_Flags>;
  /** fetch data from the table in a streaming manner: "feature_flags" */
  feature_flags_stream: Array<Feature_Flags>;
  /** execute function "filter_tokens_metadata_by_features" which returns "tokens_metadata" */
  filter_tokens_metadata_by_features: Array<Tokens_Metadata>;
  /** execute function "filter_tokens_metadata_by_features" and query aggregates on result of table type "tokens_metadata" */
  filter_tokens_metadata_by_features_aggregate: Tokens_Metadata_Aggregate;
  /** execute function "get_projects_metadata_feature_field_value_counts" which returns "feature_field_values_counts" */
  get_projects_metadata_feature_field_value_counts: Array<Feature_Field_Values_Counts>;
  /** execute function "get_projects_metadata_feature_field_value_counts" and query aggregates on result of table type "feature_field_values_counts" */
  get_projects_metadata_feature_field_value_counts_aggregate: Feature_Field_Values_Counts_Aggregate;
  /** execute function "list_projects_metadata_random" which returns "projects_metadata" */
  list_projects_metadata_random: Array<Projects_Metadata>;
  /** execute function "list_projects_metadata_random" and query aggregates on result of table type "projects_metadata" */
  list_projects_metadata_random_aggregate: Projects_Metadata_Aggregate;
  /** fetch data from the table: "media" */
  media: Array<Media>;
  /** fetch aggregated fields from the table: "media" */
  media_aggregate: Media_Aggregate;
  /** fetch data from the table: "media" using primary key columns */
  media_by_pk?: Maybe<Media>;
  /** fetch data from the table in a streaming manner: "media" */
  media_stream: Array<Media>;
  minter?: Maybe<Minter>;
  minterFilter?: Maybe<MinterFilter>;
  minterFilters: Array<MinterFilter>;
  /** fetch data from the table: "minter_filters_metadata" */
  minter_filters_metadata: Array<Minter_Filters_Metadata>;
  /** fetch aggregated fields from the table: "minter_filters_metadata" */
  minter_filters_metadata_aggregate: Minter_Filters_Metadata_Aggregate;
  /** fetch data from the table: "minter_filters_metadata" using primary key columns */
  minter_filters_metadata_by_pk?: Maybe<Minter_Filters_Metadata>;
  /** fetch data from the table in a streaming manner: "minter_filters_metadata" */
  minter_filters_metadata_stream: Array<Minter_Filters_Metadata>;
  /** fetch data from the table: "minter_type_names" */
  minter_type_names: Array<Minter_Type_Names>;
  /** fetch aggregated fields from the table: "minter_type_names" */
  minter_type_names_aggregate: Minter_Type_Names_Aggregate;
  /** fetch data from the table: "minter_type_names" using primary key columns */
  minter_type_names_by_pk?: Maybe<Minter_Type_Names>;
  /** fetch data from the table in a streaming manner: "minter_type_names" */
  minter_type_names_stream: Array<Minter_Type_Names>;
  /** fetch data from the table: "minter_types" */
  minter_types: Array<Minter_Types>;
  /** fetch aggregated fields from the table: "minter_types" */
  minter_types_aggregate: Minter_Types_Aggregate;
  /** fetch data from the table: "minter_types" using primary key columns */
  minter_types_by_pk?: Maybe<Minter_Types>;
  /** fetch data from the table in a streaming manner: "minter_types" */
  minter_types_stream: Array<Minter_Types>;
  minters: Array<Minter>;
  /** fetch data from the table: "minters_metadata" */
  minters_metadata: Array<Minters_Metadata>;
  /** fetch aggregated fields from the table: "minters_metadata" */
  minters_metadata_aggregate: Minters_Metadata_Aggregate;
  /** fetch data from the table: "minters_metadata" using primary key columns */
  minters_metadata_by_pk?: Maybe<Minters_Metadata>;
  /** fetch data from the table in a streaming manner: "minters_metadata" */
  minters_metadata_stream: Array<Minters_Metadata>;
  /** An array relationship */
  notifications: Array<Notifications>;
  /** An aggregate relationship */
  notifications_aggregate: Notifications_Aggregate;
  /** fetch data from the table: "notifications" using primary key columns */
  notifications_by_pk?: Maybe<Notifications>;
  /** fetch data from the table in a streaming manner: "notifications" */
  notifications_stream: Array<Notifications>;
  payment?: Maybe<Payment>;
  payments: Array<Payment>;
  project?: Maybe<Project>;
  projectExternalAssetDependencies: Array<ProjectExternalAssetDependency>;
  projectExternalAssetDependency?: Maybe<ProjectExternalAssetDependency>;
  projectMinterConfiguration?: Maybe<ProjectMinterConfiguration>;
  projectMinterConfigurations: Array<ProjectMinterConfiguration>;
  projectScript?: Maybe<ProjectScript>;
  projectScripts: Array<ProjectScript>;
  /** fetch data from the table: "project_external_asset_dependencies" */
  project_external_asset_dependencies: Array<Project_External_Asset_Dependencies>;
  /** fetch aggregated fields from the table: "project_external_asset_dependencies" */
  project_external_asset_dependencies_aggregate: Project_External_Asset_Dependencies_Aggregate;
  /** fetch data from the table: "project_external_asset_dependencies" using primary key columns */
  project_external_asset_dependencies_by_pk?: Maybe<Project_External_Asset_Dependencies>;
  /** fetch data from the table in a streaming manner: "project_external_asset_dependencies" */
  project_external_asset_dependencies_stream: Array<Project_External_Asset_Dependencies>;
  /** fetch data from the table: "project_external_asset_dependency_types" */
  project_external_asset_dependency_types: Array<Project_External_Asset_Dependency_Types>;
  /** fetch aggregated fields from the table: "project_external_asset_dependency_types" */
  project_external_asset_dependency_types_aggregate: Project_External_Asset_Dependency_Types_Aggregate;
  /** fetch data from the table: "project_external_asset_dependency_types" using primary key columns */
  project_external_asset_dependency_types_by_pk?: Maybe<Project_External_Asset_Dependency_Types>;
  /** fetch data from the table in a streaming manner: "project_external_asset_dependency_types" */
  project_external_asset_dependency_types_stream: Array<Project_External_Asset_Dependency_Types>;
  /** fetch data from the table: "project_minter_configurations" */
  project_minter_configurations: Array<Project_Minter_Configurations>;
  /** fetch aggregated fields from the table: "project_minter_configurations" */
  project_minter_configurations_aggregate: Project_Minter_Configurations_Aggregate;
  /** fetch data from the table: "project_minter_configurations" using primary key columns */
  project_minter_configurations_by_pk?: Maybe<Project_Minter_Configurations>;
  /** fetch data from the table in a streaming manner: "project_minter_configurations" */
  project_minter_configurations_stream: Array<Project_Minter_Configurations>;
  /** fetch data from the table: "project_scripts" */
  project_scripts: Array<Project_Scripts>;
  /** fetch aggregated fields from the table: "project_scripts" */
  project_scripts_aggregate: Project_Scripts_Aggregate;
  /** fetch data from the table: "project_scripts" using primary key columns */
  project_scripts_by_pk?: Maybe<Project_Scripts>;
  /** fetch data from the table in a streaming manner: "project_scripts" */
  project_scripts_stream: Array<Project_Scripts>;
  /** fetch data from the table: "project_series" */
  project_series: Array<Project_Series>;
  /** fetch aggregated fields from the table: "project_series" */
  project_series_aggregate: Project_Series_Aggregate;
  /** fetch data from the table: "project_series" using primary key columns */
  project_series_by_pk?: Maybe<Project_Series>;
  /** fetch data from the table in a streaming manner: "project_series" */
  project_series_stream: Array<Project_Series>;
  /** fetch data from the table: "project_vertical_categories" */
  project_vertical_categories: Array<Project_Vertical_Categories>;
  /** fetch aggregated fields from the table: "project_vertical_categories" */
  project_vertical_categories_aggregate: Project_Vertical_Categories_Aggregate;
  /** fetch data from the table: "project_vertical_categories" using primary key columns */
  project_vertical_categories_by_pk?: Maybe<Project_Vertical_Categories>;
  /** fetch data from the table in a streaming manner: "project_vertical_categories" */
  project_vertical_categories_stream: Array<Project_Vertical_Categories>;
  /** fetch data from the table: "project_verticals" */
  project_verticals: Array<Project_Verticals>;
  /** fetch aggregated fields from the table: "project_verticals" */
  project_verticals_aggregate: Project_Verticals_Aggregate;
  /** fetch data from the table: "project_verticals" using primary key columns */
  project_verticals_by_pk?: Maybe<Project_Verticals>;
  /** fetch data from the table in a streaming manner: "project_verticals" */
  project_verticals_stream: Array<Project_Verticals>;
  projects: Array<Project>;
  /** fetch data from the table: "projects_features" */
  projects_features: Array<Projects_Features>;
  /** fetch aggregated fields from the table: "projects_features" */
  projects_features_aggregate: Projects_Features_Aggregate;
  /** fetch data from the table: "projects_features" using primary key columns */
  projects_features_by_pk?: Maybe<Projects_Features>;
  /** fetch data from the table: "projects_features_private" */
  projects_features_private: Array<Projects_Features_Private>;
  /** fetch aggregated fields from the table: "projects_features_private" */
  projects_features_private_aggregate: Projects_Features_Private_Aggregate;
  /** fetch data from the table in a streaming manner: "projects_features_private" */
  projects_features_private_stream: Array<Projects_Features_Private>;
  /** fetch data from the table in a streaming manner: "projects_features" */
  projects_features_stream: Array<Projects_Features>;
  /** fetch data from the table: "projects_metadata" */
  projects_metadata: Array<Projects_Metadata>;
  /** fetch aggregated fields from the table: "projects_metadata" */
  projects_metadata_aggregate: Projects_Metadata_Aggregate;
  /** fetch data from the table: "projects_metadata" using primary key columns */
  projects_metadata_by_pk?: Maybe<Projects_Metadata>;
  /** fetch data from the table in a streaming manner: "projects_metadata" */
  projects_metadata_stream: Array<Projects_Metadata>;
  proposedArtistAddressesAndSplit?: Maybe<ProposedArtistAddressesAndSplit>;
  proposedArtistAddressesAndSplits: Array<ProposedArtistAddressesAndSplit>;
  /** fetch data from the table: "proposed_artist_addresses_and_splits" */
  proposed_artist_addresses_and_splits: Array<Proposed_Artist_Addresses_And_Splits>;
  /** fetch aggregated fields from the table: "proposed_artist_addresses_and_splits" */
  proposed_artist_addresses_and_splits_aggregate: Proposed_Artist_Addresses_And_Splits_Aggregate;
  /** fetch data from the table: "proposed_artist_addresses_and_splits" using primary key columns */
  proposed_artist_addresses_and_splits_by_pk?: Maybe<Proposed_Artist_Addresses_And_Splits>;
  /** fetch data from the table in a streaming manner: "proposed_artist_addresses_and_splits" */
  proposed_artist_addresses_and_splits_stream: Array<Proposed_Artist_Addresses_And_Splits>;
  receipt?: Maybe<Receipt>;
  /** fetch data from the table: "receipt_metadata" */
  receipt_metadata: Array<Receipt_Metadata>;
  /** fetch aggregated fields from the table: "receipt_metadata" */
  receipt_metadata_aggregate: Receipt_Metadata_Aggregate;
  /** fetch data from the table: "receipt_metadata" using primary key columns */
  receipt_metadata_by_pk?: Maybe<Receipt_Metadata>;
  /** fetch data from the table in a streaming manner: "receipt_metadata" */
  receipt_metadata_stream: Array<Receipt_Metadata>;
  receipts: Array<Receipt>;
  sale?: Maybe<Sale>;
  saleLookupTable?: Maybe<SaleLookupTable>;
  saleLookupTables: Array<SaleLookupTable>;
  sales: Array<Sale>;
  /** fetch data from the table: "screenings" */
  screenings: Array<Screenings>;
  /** fetch aggregated fields from the table: "screenings" */
  screenings_aggregate: Screenings_Aggregate;
  /** fetch data from the table: "screenings" using primary key columns */
  screenings_by_pk?: Maybe<Screenings>;
  /** fetch data from the table in a streaming manner: "screenings" */
  screenings_stream: Array<Screenings>;
  /** execute function "search_projects" which returns "projects_metadata" */
  search_projects: Array<Projects_Metadata>;
  /** execute function "search_projects" and query aggregates on result of table type "projects_metadata" */
  search_projects_aggregate: Projects_Metadata_Aggregate;
  /** execute function "search_tags" which returns "tags" */
  search_tags: Array<Tags>;
  /** execute function "search_tags" and query aggregates on result of table type "tags" */
  search_tags_aggregate: Tags_Aggregate;
  /** execute function "search_tokens" which returns "tokens_metadata" */
  search_tokens: Array<Tokens_Metadata>;
  /** execute function "search_tokens" and query aggregates on result of table type "tokens_metadata" */
  search_tokens_aggregate: Tokens_Metadata_Aggregate;
  /** execute function "search_users" which returns "user_profiles" */
  search_users: Array<User_Profiles>;
  /** execute function "search_users" and query aggregates on result of table type "user_profiles" */
  search_users_aggregate: User_Profiles_Aggregate;
  /** fetch data from the table: "sync_status" */
  sync_status: Array<Sync_Status>;
  /** fetch aggregated fields from the table: "sync_status" */
  sync_status_aggregate: Sync_Status_Aggregate;
  /** fetch data from the table: "sync_status" using primary key columns */
  sync_status_by_pk?: Maybe<Sync_Status>;
  /** fetch data from the table in a streaming manner: "sync_status" */
  sync_status_stream: Array<Sync_Status>;
  /** fetch data from the table: "tag_groupings" */
  tag_groupings: Array<Tag_Groupings>;
  /** fetch aggregated fields from the table: "tag_groupings" */
  tag_groupings_aggregate: Tag_Groupings_Aggregate;
  /** fetch data from the table: "tag_groupings" using primary key columns */
  tag_groupings_by_pk?: Maybe<Tag_Groupings>;
  /** fetch data from the table in a streaming manner: "tag_groupings" */
  tag_groupings_stream: Array<Tag_Groupings>;
  /** fetch data from the table: "tag_status" */
  tag_status: Array<Tag_Status>;
  /** fetch aggregated fields from the table: "tag_status" */
  tag_status_aggregate: Tag_Status_Aggregate;
  /** fetch data from the table: "tag_status" using primary key columns */
  tag_status_by_pk?: Maybe<Tag_Status>;
  /** fetch data from the table in a streaming manner: "tag_status" */
  tag_status_stream: Array<Tag_Status>;
  /** fetch data from the table: "tag_types" */
  tag_types: Array<Tag_Types>;
  /** fetch aggregated fields from the table: "tag_types" */
  tag_types_aggregate: Tag_Types_Aggregate;
  /** fetch data from the table: "tag_types" using primary key columns */
  tag_types_by_pk?: Maybe<Tag_Types>;
  /** fetch data from the table in a streaming manner: "tag_types" */
  tag_types_stream: Array<Tag_Types>;
  /** fetch data from the table: "tags" */
  tags: Array<Tags>;
  /** fetch aggregated fields from the table: "tags" */
  tags_aggregate: Tags_Aggregate;
  /** fetch data from the table: "tags" using primary key columns */
  tags_by_pk?: Maybe<Tags>;
  /** fetch data from the table in a streaming manner: "tags" */
  tags_stream: Array<Tags>;
  /** fetch data from the table: "terms_of_service" */
  terms_of_service: Array<Terms_Of_Service>;
  /** fetch aggregated fields from the table: "terms_of_service" */
  terms_of_service_aggregate: Terms_Of_Service_Aggregate;
  /** fetch data from the table: "terms_of_service" using primary key columns */
  terms_of_service_by_pk?: Maybe<Terms_Of_Service>;
  /** fetch data from the table in a streaming manner: "terms_of_service" */
  terms_of_service_stream: Array<Terms_Of_Service>;
  token?: Maybe<Token>;
  tokens: Array<Token>;
  /** fetch data from the table: "tokens_metadata" */
  tokens_metadata: Array<Tokens_Metadata>;
  /** fetch aggregated fields from the table: "tokens_metadata" */
  tokens_metadata_aggregate: Tokens_Metadata_Aggregate;
  /** fetch data from the table: "tokens_metadata" using primary key columns */
  tokens_metadata_by_pk?: Maybe<Tokens_Metadata>;
  /** fetch data from the table in a streaming manner: "tokens_metadata" */
  tokens_metadata_stream: Array<Tokens_Metadata>;
  transfer?: Maybe<Transfer>;
  transfers: Array<Transfer>;
  /** fetch data from the table: "user_profiles" */
  user_profiles: Array<User_Profiles>;
  /** fetch aggregated fields from the table: "user_profiles" */
  user_profiles_aggregate: User_Profiles_Aggregate;
  /** fetch data from the table: "user_profiles" using primary key columns */
  user_profiles_by_pk?: Maybe<User_Profiles>;
  /** fetch data from the table in a streaming manner: "user_profiles" */
  user_profiles_stream: Array<User_Profiles>;
  /** fetch data from the table: "users" */
  users: Array<Users>;
  /** fetch aggregated fields from the table: "users" */
  users_aggregate: Users_Aggregate;
  /** fetch data from the table: "users" using primary key columns */
  users_by_pk?: Maybe<Users>;
  /** fetch data from the table in a streaming manner: "users" */
  users_stream: Array<Users>;
  /** fetch data from the table: "verticals" */
  verticals: Array<Verticals>;
  /** fetch aggregated fields from the table: "verticals" */
  verticals_aggregate: Verticals_Aggregate;
  /** fetch data from the table: "verticals" using primary key columns */
  verticals_by_pk?: Maybe<Verticals>;
  /** fetch data from the table in a streaming manner: "verticals" */
  verticals_stream: Array<Verticals>;
  /** fetch data from the table: "webflow_artist_info" */
  webflow_artist_info: Array<Webflow_Artist_Info>;
  /** fetch aggregated fields from the table: "webflow_artist_info" */
  webflow_artist_info_aggregate: Webflow_Artist_Info_Aggregate;
  /** fetch data from the table: "webflow_artist_info" using primary key columns */
  webflow_artist_info_by_pk?: Maybe<Webflow_Artist_Info>;
  /** fetch data from the table in a streaming manner: "webflow_artist_info" */
  webflow_artist_info_stream: Array<Webflow_Artist_Info>;
  /** fetch data from the table: "webflow_spectrum_articles" */
  webflow_spectrum_articles: Array<Webflow_Spectrum_Articles>;
  /** fetch aggregated fields from the table: "webflow_spectrum_articles" */
  webflow_spectrum_articles_aggregate: Webflow_Spectrum_Articles_Aggregate;
  /** fetch data from the table: "webflow_spectrum_articles" using primary key columns */
  webflow_spectrum_articles_by_pk?: Maybe<Webflow_Spectrum_Articles>;
  /** fetch data from the table in a streaming manner: "webflow_spectrum_articles" */
  webflow_spectrum_articles_stream: Array<Webflow_Spectrum_Articles>;
  whitelisting?: Maybe<Whitelisting>;
  whitelistings: Array<Whitelisting>;
};


export type Subscription_Root_MetaArgs = {
  block?: InputMaybe<Block_Height>;
};


export type Subscription_RootAccountArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootAccountProjectArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootAccountProjectsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<AccountProject_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<AccountProject_Filter>;
};


export type Subscription_RootAccountsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Account_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Account_Filter>;
};


export type Subscription_RootArtistsArgs = {
  distinct_on?: InputMaybe<Array<Artists_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Artists_Order_By>>;
  where?: InputMaybe<Artists_Bool_Exp>;
};


export type Subscription_RootArtists_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Artists_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Artists_Order_By>>;
  where?: InputMaybe<Artists_Bool_Exp>;
};


export type Subscription_RootArtists_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Artists_Stream_Cursor_Input>>;
  where?: InputMaybe<Artists_Bool_Exp>;
};


export type Subscription_RootCategoriesArgs = {
  distinct_on?: InputMaybe<Array<Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Categories_Order_By>>;
  where?: InputMaybe<Categories_Bool_Exp>;
};


export type Subscription_RootCategories_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Categories_Order_By>>;
  where?: InputMaybe<Categories_Bool_Exp>;
};


export type Subscription_RootCategories_By_PkArgs = {
  name: Scalars['String'];
};


export type Subscription_RootCategories_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Categories_Stream_Cursor_Input>>;
  where?: InputMaybe<Categories_Bool_Exp>;
};


export type Subscription_RootContractArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootContract_AllowlistingsArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


export type Subscription_RootContract_Allowlistings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


export type Subscription_RootContract_Allowlistings_By_PkArgs = {
  contract_address: Scalars['String'];
  user_address: Scalars['String'];
};


export type Subscription_RootContract_Allowlistings_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Contract_Allowlistings_Stream_Cursor_Input>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


export type Subscription_RootContract_Type_NamesArgs = {
  distinct_on?: InputMaybe<Array<Contract_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Type_Names_Order_By>>;
  where?: InputMaybe<Contract_Type_Names_Bool_Exp>;
};


export type Subscription_RootContract_Type_Names_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Type_Names_Order_By>>;
  where?: InputMaybe<Contract_Type_Names_Bool_Exp>;
};


export type Subscription_RootContract_Type_Names_By_PkArgs = {
  name: Scalars['String'];
};


export type Subscription_RootContract_Type_Names_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Contract_Type_Names_Stream_Cursor_Input>>;
  where?: InputMaybe<Contract_Type_Names_Bool_Exp>;
};


export type Subscription_RootContract_TypesArgs = {
  distinct_on?: InputMaybe<Array<Contract_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Types_Order_By>>;
  where?: InputMaybe<Contract_Types_Bool_Exp>;
};


export type Subscription_RootContract_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Types_Order_By>>;
  where?: InputMaybe<Contract_Types_Bool_Exp>;
};


export type Subscription_RootContract_Types_By_PkArgs = {
  type: Contract_Type_Names_Enum;
};


export type Subscription_RootContract_Types_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Contract_Types_Stream_Cursor_Input>>;
  where?: InputMaybe<Contract_Types_Bool_Exp>;
};


export type Subscription_RootContractsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Contract_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Contract_Filter>;
};


export type Subscription_RootContracts_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contracts_Metadata_Order_By>>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};


export type Subscription_RootContracts_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contracts_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contracts_Metadata_Order_By>>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};


export type Subscription_RootContracts_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


export type Subscription_RootContracts_Metadata_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Contracts_Metadata_Stream_Cursor_Input>>;
  where?: InputMaybe<Contracts_Metadata_Bool_Exp>;
};


export type Subscription_RootCreateApplicationArgs = {
  id: Scalars['uuid'];
};


export type Subscription_RootCuration_StatusesArgs = {
  distinct_on?: InputMaybe<Array<Curation_Statuses_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Curation_Statuses_Order_By>>;
  where?: InputMaybe<Curation_Statuses_Bool_Exp>;
};


export type Subscription_RootCuration_Statuses_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Curation_Statuses_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Curation_Statuses_Order_By>>;
  where?: InputMaybe<Curation_Statuses_Bool_Exp>;
};


export type Subscription_RootCuration_Statuses_By_PkArgs = {
  value: Scalars['String'];
};


export type Subscription_RootCuration_Statuses_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Curation_Statuses_Stream_Cursor_Input>>;
  where?: InputMaybe<Curation_Statuses_Bool_Exp>;
};


export type Subscription_RootDependenciesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Dependency_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Dependency_Filter>;
};


export type Subscription_RootDependencies_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependencies_Metadata_Order_By>>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};


export type Subscription_RootDependencies_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependencies_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependencies_Metadata_Order_By>>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};


export type Subscription_RootDependencies_Metadata_By_PkArgs = {
  type_and_version: Scalars['String'];
};


export type Subscription_RootDependencies_Metadata_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Dependencies_Metadata_Stream_Cursor_Input>>;
  where?: InputMaybe<Dependencies_Metadata_Bool_Exp>;
};


export type Subscription_RootDependencyArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootDependencyAdditionalCdnArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootDependencyAdditionalCdNsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyAdditionalCdn_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyAdditionalCdn_Filter>;
};


export type Subscription_RootDependencyAdditionalRepositoriesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyAdditionalRepository_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyAdditionalRepository_Filter>;
};


export type Subscription_RootDependencyAdditionalRepositoryArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootDependencyRegistriesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyRegistry_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyRegistry_Filter>;
};


export type Subscription_RootDependencyRegistryArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootDependencyScriptArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootDependencyScriptsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DependencyScript_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DependencyScript_Filter>;
};


export type Subscription_RootDependency_Additional_CdnsArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Cdns_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};


export type Subscription_RootDependency_Additional_Cdns_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Cdns_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Cdns_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};


export type Subscription_RootDependency_Additional_Cdns_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


export type Subscription_RootDependency_Additional_Cdns_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Dependency_Additional_Cdns_Stream_Cursor_Input>>;
  where?: InputMaybe<Dependency_Additional_Cdns_Bool_Exp>;
};


export type Subscription_RootDependency_Additional_RepositoriesArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Repositories_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};


export type Subscription_RootDependency_Additional_Repositories_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Additional_Repositories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Additional_Repositories_Order_By>>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};


export type Subscription_RootDependency_Additional_Repositories_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


export type Subscription_RootDependency_Additional_Repositories_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Dependency_Additional_Repositories_Stream_Cursor_Input>>;
  where?: InputMaybe<Dependency_Additional_Repositories_Bool_Exp>;
};


export type Subscription_RootDependency_RegistriesArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Registries_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Registries_Order_By>>;
  where?: InputMaybe<Dependency_Registries_Bool_Exp>;
};


export type Subscription_RootDependency_Registries_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Registries_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Registries_Order_By>>;
  where?: InputMaybe<Dependency_Registries_Bool_Exp>;
};


export type Subscription_RootDependency_Registries_By_PkArgs = {
  address: Scalars['String'];
};


export type Subscription_RootDependency_Registries_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Dependency_Registries_Stream_Cursor_Input>>;
  where?: InputMaybe<Dependency_Registries_Bool_Exp>;
};


export type Subscription_RootDependency_ScriptsArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Scripts_Order_By>>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};


export type Subscription_RootDependency_Scripts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Dependency_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Dependency_Scripts_Order_By>>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};


export type Subscription_RootDependency_Scripts_By_PkArgs = {
  dependency_type_and_version: Scalars['String'];
  index: Scalars['Int'];
};


export type Subscription_RootDependency_Scripts_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Dependency_Scripts_Stream_Cursor_Input>>;
  where?: InputMaybe<Dependency_Scripts_Bool_Exp>;
};


export type Subscription_RootEngineRegistriesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<EngineRegistry_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<EngineRegistry_Filter>;
};


export type Subscription_RootEngineRegistryArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootEntity_TagsArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


export type Subscription_RootEntity_Tags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


export type Subscription_RootEntity_Tags_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootEntity_Tags_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Entity_Tags_Stream_Cursor_Input>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


export type Subscription_RootFavoritesArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


export type Subscription_RootFavorites_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


export type Subscription_RootFavorites_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootFavorites_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Favorites_Stream_Cursor_Input>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


export type Subscription_RootFeature_Field_Values_CountsArgs = {
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Subscription_RootFeature_Field_Values_Counts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Subscription_RootFeature_Field_Values_Counts_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Feature_Field_Values_Counts_Stream_Cursor_Input>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Subscription_RootFeature_FlagsArgs = {
  distinct_on?: InputMaybe<Array<Feature_Flags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Flags_Order_By>>;
  where?: InputMaybe<Feature_Flags_Bool_Exp>;
};


export type Subscription_RootFeature_Flags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Feature_Flags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Flags_Order_By>>;
  where?: InputMaybe<Feature_Flags_Bool_Exp>;
};


export type Subscription_RootFeature_Flags_By_PkArgs = {
  flag_name: Scalars['String'];
};


export type Subscription_RootFeature_Flags_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Feature_Flags_Stream_Cursor_Input>>;
  where?: InputMaybe<Feature_Flags_Bool_Exp>;
};


export type Subscription_RootFilter_Tokens_Metadata_By_FeaturesArgs = {
  args: Filter_Tokens_Metadata_By_Features_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Subscription_RootFilter_Tokens_Metadata_By_Features_AggregateArgs = {
  args: Filter_Tokens_Metadata_By_Features_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Subscription_RootGet_Projects_Metadata_Feature_Field_Value_CountsArgs = {
  args: Get_Projects_Metadata_Feature_Field_Value_Counts_Args;
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Subscription_RootGet_Projects_Metadata_Feature_Field_Value_Counts_AggregateArgs = {
  args: Get_Projects_Metadata_Feature_Field_Value_Counts_Args;
  distinct_on?: InputMaybe<Array<Feature_Field_Values_Counts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Feature_Field_Values_Counts_Order_By>>;
  where?: InputMaybe<Feature_Field_Values_Counts_Bool_Exp>;
};


export type Subscription_RootList_Projects_Metadata_RandomArgs = {
  args: List_Projects_Metadata_Random_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Subscription_RootList_Projects_Metadata_Random_AggregateArgs = {
  args: List_Projects_Metadata_Random_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Subscription_RootMediaArgs = {
  distinct_on?: InputMaybe<Array<Media_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Media_Order_By>>;
  where?: InputMaybe<Media_Bool_Exp>;
};


export type Subscription_RootMedia_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Media_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Media_Order_By>>;
  where?: InputMaybe<Media_Bool_Exp>;
};


export type Subscription_RootMedia_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootMedia_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Media_Stream_Cursor_Input>>;
  where?: InputMaybe<Media_Bool_Exp>;
};


export type Subscription_RootMinterArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootMinterFilterArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootMinterFiltersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<MinterFilter_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<MinterFilter_Filter>;
};


export type Subscription_RootMinter_Filters_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Minter_Filters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Filters_Metadata_Order_By>>;
  where?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
};


export type Subscription_RootMinter_Filters_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minter_Filters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Filters_Metadata_Order_By>>;
  where?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
};


export type Subscription_RootMinter_Filters_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


export type Subscription_RootMinter_Filters_Metadata_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Minter_Filters_Metadata_Stream_Cursor_Input>>;
  where?: InputMaybe<Minter_Filters_Metadata_Bool_Exp>;
};


export type Subscription_RootMinter_Type_NamesArgs = {
  distinct_on?: InputMaybe<Array<Minter_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Type_Names_Order_By>>;
  where?: InputMaybe<Minter_Type_Names_Bool_Exp>;
};


export type Subscription_RootMinter_Type_Names_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minter_Type_Names_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Type_Names_Order_By>>;
  where?: InputMaybe<Minter_Type_Names_Bool_Exp>;
};


export type Subscription_RootMinter_Type_Names_By_PkArgs = {
  name: Scalars['String'];
};


export type Subscription_RootMinter_Type_Names_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Minter_Type_Names_Stream_Cursor_Input>>;
  where?: InputMaybe<Minter_Type_Names_Bool_Exp>;
};


export type Subscription_RootMinter_TypesArgs = {
  distinct_on?: InputMaybe<Array<Minter_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Types_Order_By>>;
  where?: InputMaybe<Minter_Types_Bool_Exp>;
};


export type Subscription_RootMinter_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minter_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minter_Types_Order_By>>;
  where?: InputMaybe<Minter_Types_Bool_Exp>;
};


export type Subscription_RootMinter_Types_By_PkArgs = {
  type: Minter_Type_Names_Enum;
};


export type Subscription_RootMinter_Types_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Minter_Types_Stream_Cursor_Input>>;
  where?: InputMaybe<Minter_Types_Bool_Exp>;
};


export type Subscription_RootMintersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Minter_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Minter_Filter>;
};


export type Subscription_RootMinters_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minters_Metadata_Order_By>>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};


export type Subscription_RootMinters_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Minters_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Minters_Metadata_Order_By>>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};


export type Subscription_RootMinters_Metadata_By_PkArgs = {
  address: Scalars['String'];
};


export type Subscription_RootMinters_Metadata_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Minters_Metadata_Stream_Cursor_Input>>;
  where?: InputMaybe<Minters_Metadata_Bool_Exp>;
};


export type Subscription_RootNotificationsArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};


export type Subscription_RootNotifications_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};


export type Subscription_RootNotifications_By_PkArgs = {
  trigger_key: Scalars['String'];
  trigger_time: Scalars['timestamptz'];
  user_address: Scalars['String'];
};


export type Subscription_RootNotifications_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Notifications_Stream_Cursor_Input>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};


export type Subscription_RootPaymentArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootPaymentsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Payment_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Payment_Filter>;
};


export type Subscription_RootProjectArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootProjectExternalAssetDependenciesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectExternalAssetDependency_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProjectExternalAssetDependency_Filter>;
};


export type Subscription_RootProjectExternalAssetDependencyArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootProjectMinterConfigurationArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootProjectMinterConfigurationsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectMinterConfiguration_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProjectMinterConfiguration_Filter>;
};


export type Subscription_RootProjectScriptArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootProjectScriptsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProjectScript_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProjectScript_Filter>;
};


export type Subscription_RootProject_External_Asset_DependenciesArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependencies_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};


export type Subscription_RootProject_External_Asset_Dependencies_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependencies_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependencies_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};


export type Subscription_RootProject_External_Asset_Dependencies_By_PkArgs = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};


export type Subscription_RootProject_External_Asset_Dependencies_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Project_External_Asset_Dependencies_Stream_Cursor_Input>>;
  where?: InputMaybe<Project_External_Asset_Dependencies_Bool_Exp>;
};


export type Subscription_RootProject_External_Asset_Dependency_TypesArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependency_Types_Bool_Exp>;
};


export type Subscription_RootProject_External_Asset_Dependency_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_External_Asset_Dependency_Types_Order_By>>;
  where?: InputMaybe<Project_External_Asset_Dependency_Types_Bool_Exp>;
};


export type Subscription_RootProject_External_Asset_Dependency_Types_By_PkArgs = {
  type: Scalars['String'];
};


export type Subscription_RootProject_External_Asset_Dependency_Types_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Project_External_Asset_Dependency_Types_Stream_Cursor_Input>>;
  where?: InputMaybe<Project_External_Asset_Dependency_Types_Bool_Exp>;
};


export type Subscription_RootProject_Minter_ConfigurationsArgs = {
  distinct_on?: InputMaybe<Array<Project_Minter_Configurations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Minter_Configurations_Order_By>>;
  where?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
};


export type Subscription_RootProject_Minter_Configurations_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Minter_Configurations_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Minter_Configurations_Order_By>>;
  where?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
};


export type Subscription_RootProject_Minter_Configurations_By_PkArgs = {
  id: Scalars['String'];
};


export type Subscription_RootProject_Minter_Configurations_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Project_Minter_Configurations_Stream_Cursor_Input>>;
  where?: InputMaybe<Project_Minter_Configurations_Bool_Exp>;
};


export type Subscription_RootProject_ScriptsArgs = {
  distinct_on?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Scripts_Order_By>>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};


export type Subscription_RootProject_Scripts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Scripts_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Scripts_Order_By>>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};


export type Subscription_RootProject_Scripts_By_PkArgs = {
  index: Scalars['Int'];
  project_id: Scalars['String'];
};


export type Subscription_RootProject_Scripts_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Project_Scripts_Stream_Cursor_Input>>;
  where?: InputMaybe<Project_Scripts_Bool_Exp>;
};


export type Subscription_RootProject_SeriesArgs = {
  distinct_on?: InputMaybe<Array<Project_Series_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Series_Order_By>>;
  where?: InputMaybe<Project_Series_Bool_Exp>;
};


export type Subscription_RootProject_Series_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Series_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Series_Order_By>>;
  where?: InputMaybe<Project_Series_Bool_Exp>;
};


export type Subscription_RootProject_Series_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootProject_Series_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Project_Series_Stream_Cursor_Input>>;
  where?: InputMaybe<Project_Series_Bool_Exp>;
};


export type Subscription_RootProject_Vertical_CategoriesArgs = {
  distinct_on?: InputMaybe<Array<Project_Vertical_Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Vertical_Categories_Order_By>>;
  where?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
};


export type Subscription_RootProject_Vertical_Categories_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Vertical_Categories_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Vertical_Categories_Order_By>>;
  where?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
};


export type Subscription_RootProject_Vertical_Categories_By_PkArgs = {
  name: Categories_Enum;
};


export type Subscription_RootProject_Vertical_Categories_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Project_Vertical_Categories_Stream_Cursor_Input>>;
  where?: InputMaybe<Project_Vertical_Categories_Bool_Exp>;
};


export type Subscription_RootProject_VerticalsArgs = {
  distinct_on?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Verticals_Order_By>>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};


export type Subscription_RootProject_Verticals_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Project_Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Project_Verticals_Order_By>>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};


export type Subscription_RootProject_Verticals_By_PkArgs = {
  name: Verticals_Enum;
};


export type Subscription_RootProject_Verticals_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Project_Verticals_Stream_Cursor_Input>>;
  where?: InputMaybe<Project_Verticals_Bool_Exp>;
};


export type Subscription_RootProjectsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Project_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Project_Filter>;
};


export type Subscription_RootProjects_FeaturesArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Order_By>>;
  where?: InputMaybe<Projects_Features_Bool_Exp>;
};


export type Subscription_RootProjects_Features_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Order_By>>;
  where?: InputMaybe<Projects_Features_Bool_Exp>;
};


export type Subscription_RootProjects_Features_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootProjects_Features_PrivateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Private_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Private_Order_By>>;
  where?: InputMaybe<Projects_Features_Private_Bool_Exp>;
};


export type Subscription_RootProjects_Features_Private_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Features_Private_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Features_Private_Order_By>>;
  where?: InputMaybe<Projects_Features_Private_Bool_Exp>;
};


export type Subscription_RootProjects_Features_Private_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Projects_Features_Private_Stream_Cursor_Input>>;
  where?: InputMaybe<Projects_Features_Private_Bool_Exp>;
};


export type Subscription_RootProjects_Features_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Projects_Features_Stream_Cursor_Input>>;
  where?: InputMaybe<Projects_Features_Bool_Exp>;
};


export type Subscription_RootProjects_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Subscription_RootProjects_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Subscription_RootProjects_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


export type Subscription_RootProjects_Metadata_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Projects_Metadata_Stream_Cursor_Input>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Subscription_RootProposedArtistAddressesAndSplitArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootProposedArtistAddressesAndSplitsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProposedArtistAddressesAndSplit_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<ProposedArtistAddressesAndSplit_Filter>;
};


export type Subscription_RootProposed_Artist_Addresses_And_SplitsArgs = {
  distinct_on?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Order_By>>;
  where?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
};


export type Subscription_RootProposed_Artist_Addresses_And_Splits_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Proposed_Artist_Addresses_And_Splits_Order_By>>;
  where?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
};


export type Subscription_RootProposed_Artist_Addresses_And_Splits_By_PkArgs = {
  project_id: Scalars['String'];
};


export type Subscription_RootProposed_Artist_Addresses_And_Splits_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Proposed_Artist_Addresses_And_Splits_Stream_Cursor_Input>>;
  where?: InputMaybe<Proposed_Artist_Addresses_And_Splits_Bool_Exp>;
};


export type Subscription_RootReceiptArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootReceipt_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


export type Subscription_RootReceipt_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


export type Subscription_RootReceipt_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


export type Subscription_RootReceipt_Metadata_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Receipt_Metadata_Stream_Cursor_Input>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


export type Subscription_RootReceiptsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Receipt_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Receipt_Filter>;
};


export type Subscription_RootSaleArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootSaleLookupTableArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootSaleLookupTablesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<SaleLookupTable_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<SaleLookupTable_Filter>;
};


export type Subscription_RootSalesArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Sale_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Sale_Filter>;
};


export type Subscription_RootScreeningsArgs = {
  distinct_on?: InputMaybe<Array<Screenings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Screenings_Order_By>>;
  where?: InputMaybe<Screenings_Bool_Exp>;
};


export type Subscription_RootScreenings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Screenings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Screenings_Order_By>>;
  where?: InputMaybe<Screenings_Bool_Exp>;
};


export type Subscription_RootScreenings_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootScreenings_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Screenings_Stream_Cursor_Input>>;
  where?: InputMaybe<Screenings_Bool_Exp>;
};


export type Subscription_RootSearch_ProjectsArgs = {
  args: Search_Projects_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Subscription_RootSearch_Projects_AggregateArgs = {
  args: Search_Projects_Args;
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


export type Subscription_RootSearch_TagsArgs = {
  args: Search_Tags_Args;
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Subscription_RootSearch_Tags_AggregateArgs = {
  args: Search_Tags_Args;
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Subscription_RootSearch_TokensArgs = {
  args: Search_Tokens_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Subscription_RootSearch_Tokens_AggregateArgs = {
  args: Search_Tokens_Args;
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Subscription_RootSearch_UsersArgs = {
  args: Search_Users_Args;
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Subscription_RootSearch_Users_AggregateArgs = {
  args: Search_Users_Args;
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Subscription_RootSync_StatusArgs = {
  distinct_on?: InputMaybe<Array<Sync_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Sync_Status_Order_By>>;
  where?: InputMaybe<Sync_Status_Bool_Exp>;
};


export type Subscription_RootSync_Status_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Sync_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Sync_Status_Order_By>>;
  where?: InputMaybe<Sync_Status_Bool_Exp>;
};


export type Subscription_RootSync_Status_By_PkArgs = {
  id: Scalars['Boolean'];
};


export type Subscription_RootSync_Status_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Sync_Status_Stream_Cursor_Input>>;
  where?: InputMaybe<Sync_Status_Bool_Exp>;
};


export type Subscription_RootTag_GroupingsArgs = {
  distinct_on?: InputMaybe<Array<Tag_Groupings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Groupings_Order_By>>;
  where?: InputMaybe<Tag_Groupings_Bool_Exp>;
};


export type Subscription_RootTag_Groupings_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tag_Groupings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Groupings_Order_By>>;
  where?: InputMaybe<Tag_Groupings_Bool_Exp>;
};


export type Subscription_RootTag_Groupings_By_PkArgs = {
  name: Scalars['String'];
};


export type Subscription_RootTag_Groupings_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Tag_Groupings_Stream_Cursor_Input>>;
  where?: InputMaybe<Tag_Groupings_Bool_Exp>;
};


export type Subscription_RootTag_StatusArgs = {
  distinct_on?: InputMaybe<Array<Tag_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Status_Order_By>>;
  where?: InputMaybe<Tag_Status_Bool_Exp>;
};


export type Subscription_RootTag_Status_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tag_Status_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Status_Order_By>>;
  where?: InputMaybe<Tag_Status_Bool_Exp>;
};


export type Subscription_RootTag_Status_By_PkArgs = {
  value: Scalars['String'];
};


export type Subscription_RootTag_Status_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Tag_Status_Stream_Cursor_Input>>;
  where?: InputMaybe<Tag_Status_Bool_Exp>;
};


export type Subscription_RootTag_TypesArgs = {
  distinct_on?: InputMaybe<Array<Tag_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Types_Order_By>>;
  where?: InputMaybe<Tag_Types_Bool_Exp>;
};


export type Subscription_RootTag_Types_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tag_Types_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tag_Types_Order_By>>;
  where?: InputMaybe<Tag_Types_Bool_Exp>;
};


export type Subscription_RootTag_Types_By_PkArgs = {
  value: Scalars['String'];
};


export type Subscription_RootTag_Types_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Tag_Types_Stream_Cursor_Input>>;
  where?: InputMaybe<Tag_Types_Bool_Exp>;
};


export type Subscription_RootTagsArgs = {
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Subscription_RootTags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tags_Order_By>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Subscription_RootTags_By_PkArgs = {
  name: Scalars['String'];
};


export type Subscription_RootTags_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Tags_Stream_Cursor_Input>>;
  where?: InputMaybe<Tags_Bool_Exp>;
};


export type Subscription_RootTerms_Of_ServiceArgs = {
  distinct_on?: InputMaybe<Array<Terms_Of_Service_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Terms_Of_Service_Order_By>>;
  where?: InputMaybe<Terms_Of_Service_Bool_Exp>;
};


export type Subscription_RootTerms_Of_Service_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Terms_Of_Service_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Terms_Of_Service_Order_By>>;
  where?: InputMaybe<Terms_Of_Service_Bool_Exp>;
};


export type Subscription_RootTerms_Of_Service_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootTerms_Of_Service_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Terms_Of_Service_Stream_Cursor_Input>>;
  where?: InputMaybe<Terms_Of_Service_Bool_Exp>;
};


export type Subscription_RootTokenArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootTokensArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Token_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Token_Filter>;
};


export type Subscription_RootTokens_MetadataArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Subscription_RootTokens_Metadata_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Subscription_RootTokens_Metadata_By_PkArgs = {
  id: Scalars['String'];
};


export type Subscription_RootTokens_Metadata_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Tokens_Metadata_Stream_Cursor_Input>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


export type Subscription_RootTransferArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootTransfersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Transfer_Filter>;
};


export type Subscription_RootUser_ProfilesArgs = {
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Subscription_RootUser_Profiles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<User_Profiles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<User_Profiles_Order_By>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Subscription_RootUser_Profiles_By_PkArgs = {
  id: Scalars['Int'];
};


export type Subscription_RootUser_Profiles_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<User_Profiles_Stream_Cursor_Input>>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};


export type Subscription_RootUsersArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootUsers_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Users_Order_By>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootUsers_By_PkArgs = {
  public_address: Scalars['String'];
};


export type Subscription_RootUsers_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Users_Stream_Cursor_Input>>;
  where?: InputMaybe<Users_Bool_Exp>;
};


export type Subscription_RootVerticalsArgs = {
  distinct_on?: InputMaybe<Array<Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Verticals_Order_By>>;
  where?: InputMaybe<Verticals_Bool_Exp>;
};


export type Subscription_RootVerticals_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Verticals_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Verticals_Order_By>>;
  where?: InputMaybe<Verticals_Bool_Exp>;
};


export type Subscription_RootVerticals_By_PkArgs = {
  name: Scalars['String'];
};


export type Subscription_RootVerticals_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Verticals_Stream_Cursor_Input>>;
  where?: InputMaybe<Verticals_Bool_Exp>;
};


export type Subscription_RootWebflow_Artist_InfoArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Artist_Info_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Artist_Info_Order_By>>;
  where?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
};


export type Subscription_RootWebflow_Artist_Info_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Artist_Info_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Artist_Info_Order_By>>;
  where?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
};


export type Subscription_RootWebflow_Artist_Info_By_PkArgs = {
  webflow_item_id: Scalars['String'];
};


export type Subscription_RootWebflow_Artist_Info_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Webflow_Artist_Info_Stream_Cursor_Input>>;
  where?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
};


export type Subscription_RootWebflow_Spectrum_ArticlesArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Spectrum_Articles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Spectrum_Articles_Order_By>>;
  where?: InputMaybe<Webflow_Spectrum_Articles_Bool_Exp>;
};


export type Subscription_RootWebflow_Spectrum_Articles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Webflow_Spectrum_Articles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Webflow_Spectrum_Articles_Order_By>>;
  where?: InputMaybe<Webflow_Spectrum_Articles_Bool_Exp>;
};


export type Subscription_RootWebflow_Spectrum_Articles_By_PkArgs = {
  webflow_item_id: Scalars['String'];
};


export type Subscription_RootWebflow_Spectrum_Articles_StreamArgs = {
  batch_size: Scalars['Int'];
  cursor: Array<InputMaybe<Webflow_Spectrum_Articles_Stream_Cursor_Input>>;
  where?: InputMaybe<Webflow_Spectrum_Articles_Bool_Exp>;
};


export type Subscription_RootWhitelistingArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_RootWhitelistingsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Whitelisting_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Whitelisting_Filter>;
};

/** columns and relationships of "sync_status" */
export type Sync_Status = {
  __typename?: 'sync_status';
  id: Scalars['Boolean'];
  last_contract_updated_at: Scalars['timestamptz'];
  last_dependency_registry_updated_at: Scalars['timestamptz'];
  last_dependency_updated_at: Scalars['timestamptz'];
  last_minter_filter_updated_at: Scalars['timestamptz'];
  last_minter_updated_at: Scalars['timestamptz'];
  last_project_updated_at: Scalars['timestamptz'];
  last_receipt_updated_at: Scalars['timestamptz'];
  last_secondary_updated_at: Scalars['timestamptz'];
  last_token_updated_at: Scalars['timestamptz'];
};

/** aggregated selection of "sync_status" */
export type Sync_Status_Aggregate = {
  __typename?: 'sync_status_aggregate';
  aggregate?: Maybe<Sync_Status_Aggregate_Fields>;
  nodes: Array<Sync_Status>;
};

/** aggregate fields of "sync_status" */
export type Sync_Status_Aggregate_Fields = {
  __typename?: 'sync_status_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Sync_Status_Max_Fields>;
  min?: Maybe<Sync_Status_Min_Fields>;
};


/** aggregate fields of "sync_status" */
export type Sync_Status_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Sync_Status_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "sync_status". All fields are combined with a logical 'AND'. */
export type Sync_Status_Bool_Exp = {
  _and?: InputMaybe<Array<Sync_Status_Bool_Exp>>;
  _not?: InputMaybe<Sync_Status_Bool_Exp>;
  _or?: InputMaybe<Array<Sync_Status_Bool_Exp>>;
  id?: InputMaybe<Boolean_Comparison_Exp>;
  last_contract_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_dependency_registry_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_dependency_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_minter_filter_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_minter_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_project_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_receipt_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_secondary_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  last_token_updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "sync_status" */
export enum Sync_Status_Constraint {
  /** unique or primary key constraint on columns "id" */
  SyncStatusPkey = 'sync_status_pkey'
}

/** input type for inserting data into table "sync_status" */
export type Sync_Status_Insert_Input = {
  id?: InputMaybe<Scalars['Boolean']>;
  last_contract_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_dependency_registry_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_dependency_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_minter_filter_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_minter_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_project_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_receipt_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_secondary_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_token_updated_at?: InputMaybe<Scalars['timestamptz']>;
};

/** aggregate max on columns */
export type Sync_Status_Max_Fields = {
  __typename?: 'sync_status_max_fields';
  last_contract_updated_at?: Maybe<Scalars['timestamptz']>;
  last_dependency_registry_updated_at?: Maybe<Scalars['timestamptz']>;
  last_dependency_updated_at?: Maybe<Scalars['timestamptz']>;
  last_minter_filter_updated_at?: Maybe<Scalars['timestamptz']>;
  last_minter_updated_at?: Maybe<Scalars['timestamptz']>;
  last_project_updated_at?: Maybe<Scalars['timestamptz']>;
  last_receipt_updated_at?: Maybe<Scalars['timestamptz']>;
  last_secondary_updated_at?: Maybe<Scalars['timestamptz']>;
  last_token_updated_at?: Maybe<Scalars['timestamptz']>;
};

/** aggregate min on columns */
export type Sync_Status_Min_Fields = {
  __typename?: 'sync_status_min_fields';
  last_contract_updated_at?: Maybe<Scalars['timestamptz']>;
  last_dependency_registry_updated_at?: Maybe<Scalars['timestamptz']>;
  last_dependency_updated_at?: Maybe<Scalars['timestamptz']>;
  last_minter_filter_updated_at?: Maybe<Scalars['timestamptz']>;
  last_minter_updated_at?: Maybe<Scalars['timestamptz']>;
  last_project_updated_at?: Maybe<Scalars['timestamptz']>;
  last_receipt_updated_at?: Maybe<Scalars['timestamptz']>;
  last_secondary_updated_at?: Maybe<Scalars['timestamptz']>;
  last_token_updated_at?: Maybe<Scalars['timestamptz']>;
};

/** response of any mutation on the table "sync_status" */
export type Sync_Status_Mutation_Response = {
  __typename?: 'sync_status_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Sync_Status>;
};

/** on_conflict condition type for table "sync_status" */
export type Sync_Status_On_Conflict = {
  constraint: Sync_Status_Constraint;
  update_columns?: Array<Sync_Status_Update_Column>;
  where?: InputMaybe<Sync_Status_Bool_Exp>;
};

/** Ordering options when selecting data from "sync_status". */
export type Sync_Status_Order_By = {
  id?: InputMaybe<Order_By>;
  last_contract_updated_at?: InputMaybe<Order_By>;
  last_dependency_registry_updated_at?: InputMaybe<Order_By>;
  last_dependency_updated_at?: InputMaybe<Order_By>;
  last_minter_filter_updated_at?: InputMaybe<Order_By>;
  last_minter_updated_at?: InputMaybe<Order_By>;
  last_project_updated_at?: InputMaybe<Order_By>;
  last_receipt_updated_at?: InputMaybe<Order_By>;
  last_secondary_updated_at?: InputMaybe<Order_By>;
  last_token_updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: sync_status */
export type Sync_Status_Pk_Columns_Input = {
  id: Scalars['Boolean'];
};

/** select columns of table "sync_status" */
export enum Sync_Status_Select_Column {
  /** column name */
  Id = 'id',
  /** column name */
  LastContractUpdatedAt = 'last_contract_updated_at',
  /** column name */
  LastDependencyRegistryUpdatedAt = 'last_dependency_registry_updated_at',
  /** column name */
  LastDependencyUpdatedAt = 'last_dependency_updated_at',
  /** column name */
  LastMinterFilterUpdatedAt = 'last_minter_filter_updated_at',
  /** column name */
  LastMinterUpdatedAt = 'last_minter_updated_at',
  /** column name */
  LastProjectUpdatedAt = 'last_project_updated_at',
  /** column name */
  LastReceiptUpdatedAt = 'last_receipt_updated_at',
  /** column name */
  LastSecondaryUpdatedAt = 'last_secondary_updated_at',
  /** column name */
  LastTokenUpdatedAt = 'last_token_updated_at'
}

/** input type for updating data in table "sync_status" */
export type Sync_Status_Set_Input = {
  id?: InputMaybe<Scalars['Boolean']>;
  last_contract_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_dependency_registry_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_dependency_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_minter_filter_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_minter_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_project_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_receipt_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_secondary_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_token_updated_at?: InputMaybe<Scalars['timestamptz']>;
};

/** Streaming cursor of the table "sync_status" */
export type Sync_Status_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Sync_Status_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Sync_Status_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['Boolean']>;
  last_contract_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_dependency_registry_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_dependency_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_minter_filter_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_minter_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_project_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_receipt_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_secondary_updated_at?: InputMaybe<Scalars['timestamptz']>;
  last_token_updated_at?: InputMaybe<Scalars['timestamptz']>;
};

/** update columns of table "sync_status" */
export enum Sync_Status_Update_Column {
  /** column name */
  Id = 'id',
  /** column name */
  LastContractUpdatedAt = 'last_contract_updated_at',
  /** column name */
  LastDependencyRegistryUpdatedAt = 'last_dependency_registry_updated_at',
  /** column name */
  LastDependencyUpdatedAt = 'last_dependency_updated_at',
  /** column name */
  LastMinterFilterUpdatedAt = 'last_minter_filter_updated_at',
  /** column name */
  LastMinterUpdatedAt = 'last_minter_updated_at',
  /** column name */
  LastProjectUpdatedAt = 'last_project_updated_at',
  /** column name */
  LastReceiptUpdatedAt = 'last_receipt_updated_at',
  /** column name */
  LastSecondaryUpdatedAt = 'last_secondary_updated_at',
  /** column name */
  LastTokenUpdatedAt = 'last_token_updated_at'
}

export type Sync_Status_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Sync_Status_Set_Input>;
  /** filter the rows which have to be updated */
  where: Sync_Status_Bool_Exp;
};

/** columns and relationships of "tag_groupings" */
export type Tag_Groupings = {
  __typename?: 'tag_groupings';
  name: Scalars['String'];
};

/** aggregated selection of "tag_groupings" */
export type Tag_Groupings_Aggregate = {
  __typename?: 'tag_groupings_aggregate';
  aggregate?: Maybe<Tag_Groupings_Aggregate_Fields>;
  nodes: Array<Tag_Groupings>;
};

/** aggregate fields of "tag_groupings" */
export type Tag_Groupings_Aggregate_Fields = {
  __typename?: 'tag_groupings_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Tag_Groupings_Max_Fields>;
  min?: Maybe<Tag_Groupings_Min_Fields>;
};


/** aggregate fields of "tag_groupings" */
export type Tag_Groupings_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Tag_Groupings_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "tag_groupings". All fields are combined with a logical 'AND'. */
export type Tag_Groupings_Bool_Exp = {
  _and?: InputMaybe<Array<Tag_Groupings_Bool_Exp>>;
  _not?: InputMaybe<Tag_Groupings_Bool_Exp>;
  _or?: InputMaybe<Array<Tag_Groupings_Bool_Exp>>;
  name?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "tag_groupings" */
export enum Tag_Groupings_Constraint {
  /** unique or primary key constraint on columns "name" */
  TagGroupingsPkey = 'tag_groupings_pkey'
}

export enum Tag_Groupings_Enum {
  Heritage = 'heritage',
  Presentation = 'presentation',
  Social = 'social',
  Unassigned = 'unassigned'
}

/** Boolean expression to compare columns of type "tag_groupings_enum". All fields are combined with logical 'AND'. */
export type Tag_Groupings_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Tag_Groupings_Enum>;
  _in?: InputMaybe<Array<Tag_Groupings_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Tag_Groupings_Enum>;
  _nin?: InputMaybe<Array<Tag_Groupings_Enum>>;
};

/** input type for inserting data into table "tag_groupings" */
export type Tag_Groupings_Insert_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Tag_Groupings_Max_Fields = {
  __typename?: 'tag_groupings_max_fields';
  name?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Tag_Groupings_Min_Fields = {
  __typename?: 'tag_groupings_min_fields';
  name?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "tag_groupings" */
export type Tag_Groupings_Mutation_Response = {
  __typename?: 'tag_groupings_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Tag_Groupings>;
};

/** on_conflict condition type for table "tag_groupings" */
export type Tag_Groupings_On_Conflict = {
  constraint: Tag_Groupings_Constraint;
  update_columns?: Array<Tag_Groupings_Update_Column>;
  where?: InputMaybe<Tag_Groupings_Bool_Exp>;
};

/** Ordering options when selecting data from "tag_groupings". */
export type Tag_Groupings_Order_By = {
  name?: InputMaybe<Order_By>;
};

/** primary key columns input for table: tag_groupings */
export type Tag_Groupings_Pk_Columns_Input = {
  name: Scalars['String'];
};

/** select columns of table "tag_groupings" */
export enum Tag_Groupings_Select_Column {
  /** column name */
  Name = 'name'
}

/** input type for updating data in table "tag_groupings" */
export type Tag_Groupings_Set_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "tag_groupings" */
export type Tag_Groupings_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Tag_Groupings_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Tag_Groupings_Stream_Cursor_Value_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** update columns of table "tag_groupings" */
export enum Tag_Groupings_Update_Column {
  /** column name */
  Name = 'name'
}

export type Tag_Groupings_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Tag_Groupings_Set_Input>;
  /** filter the rows which have to be updated */
  where: Tag_Groupings_Bool_Exp;
};

/** status of tag */
export type Tag_Status = {
  __typename?: 'tag_status';
  description: Scalars['String'];
  value: Scalars['String'];
};

/** aggregated selection of "tag_status" */
export type Tag_Status_Aggregate = {
  __typename?: 'tag_status_aggregate';
  aggregate?: Maybe<Tag_Status_Aggregate_Fields>;
  nodes: Array<Tag_Status>;
};

/** aggregate fields of "tag_status" */
export type Tag_Status_Aggregate_Fields = {
  __typename?: 'tag_status_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Tag_Status_Max_Fields>;
  min?: Maybe<Tag_Status_Min_Fields>;
};


/** aggregate fields of "tag_status" */
export type Tag_Status_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Tag_Status_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "tag_status". All fields are combined with a logical 'AND'. */
export type Tag_Status_Bool_Exp = {
  _and?: InputMaybe<Array<Tag_Status_Bool_Exp>>;
  _not?: InputMaybe<Tag_Status_Bool_Exp>;
  _or?: InputMaybe<Array<Tag_Status_Bool_Exp>>;
  description?: InputMaybe<String_Comparison_Exp>;
  value?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "tag_status" */
export enum Tag_Status_Constraint {
  /** unique or primary key constraint on columns "value" */
  StatusPkey = 'status_pkey'
}

export enum Tag_Status_Enum {
  /** private status */
  Private = 'private',
  /** public status */
  Public = 'public'
}

/** Boolean expression to compare columns of type "tag_status_enum". All fields are combined with logical 'AND'. */
export type Tag_Status_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Tag_Status_Enum>;
  _in?: InputMaybe<Array<Tag_Status_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Tag_Status_Enum>;
  _nin?: InputMaybe<Array<Tag_Status_Enum>>;
};

/** input type for inserting data into table "tag_status" */
export type Tag_Status_Insert_Input = {
  description?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Tag_Status_Max_Fields = {
  __typename?: 'tag_status_max_fields';
  description?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Tag_Status_Min_Fields = {
  __typename?: 'tag_status_min_fields';
  description?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "tag_status" */
export type Tag_Status_Mutation_Response = {
  __typename?: 'tag_status_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Tag_Status>;
};

/** input type for inserting object relation for remote table "tag_status" */
export type Tag_Status_Obj_Rel_Insert_Input = {
  data: Tag_Status_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Tag_Status_On_Conflict>;
};

/** on_conflict condition type for table "tag_status" */
export type Tag_Status_On_Conflict = {
  constraint: Tag_Status_Constraint;
  update_columns?: Array<Tag_Status_Update_Column>;
  where?: InputMaybe<Tag_Status_Bool_Exp>;
};

/** Ordering options when selecting data from "tag_status". */
export type Tag_Status_Order_By = {
  description?: InputMaybe<Order_By>;
  value?: InputMaybe<Order_By>;
};

/** primary key columns input for table: tag_status */
export type Tag_Status_Pk_Columns_Input = {
  value: Scalars['String'];
};

/** select columns of table "tag_status" */
export enum Tag_Status_Select_Column {
  /** column name */
  Description = 'description',
  /** column name */
  Value = 'value'
}

/** input type for updating data in table "tag_status" */
export type Tag_Status_Set_Input = {
  description?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "tag_status" */
export type Tag_Status_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Tag_Status_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Tag_Status_Stream_Cursor_Value_Input = {
  description?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

/** update columns of table "tag_status" */
export enum Tag_Status_Update_Column {
  /** column name */
  Description = 'description',
  /** column name */
  Value = 'value'
}

export type Tag_Status_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Tag_Status_Set_Input>;
  /** filter the rows which have to be updated */
  where: Tag_Status_Bool_Exp;
};

/** type of tag */
export type Tag_Types = {
  __typename?: 'tag_types';
  description: Scalars['String'];
  value: Scalars['String'];
};

/** aggregated selection of "tag_types" */
export type Tag_Types_Aggregate = {
  __typename?: 'tag_types_aggregate';
  aggregate?: Maybe<Tag_Types_Aggregate_Fields>;
  nodes: Array<Tag_Types>;
};

/** aggregate fields of "tag_types" */
export type Tag_Types_Aggregate_Fields = {
  __typename?: 'tag_types_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Tag_Types_Max_Fields>;
  min?: Maybe<Tag_Types_Min_Fields>;
};


/** aggregate fields of "tag_types" */
export type Tag_Types_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Tag_Types_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "tag_types". All fields are combined with a logical 'AND'. */
export type Tag_Types_Bool_Exp = {
  _and?: InputMaybe<Array<Tag_Types_Bool_Exp>>;
  _not?: InputMaybe<Tag_Types_Bool_Exp>;
  _or?: InputMaybe<Array<Tag_Types_Bool_Exp>>;
  description?: InputMaybe<String_Comparison_Exp>;
  value?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "tag_types" */
export enum Tag_Types_Constraint {
  /** unique or primary key constraint on columns "value" */
  TypePkey = 'type_pkey'
}

export enum Tag_Types_Enum {
  /** tag type of project */
  Project = 'project',
  /** tag type of user */
  User = 'user'
}

/** Boolean expression to compare columns of type "tag_types_enum". All fields are combined with logical 'AND'. */
export type Tag_Types_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Tag_Types_Enum>;
  _in?: InputMaybe<Array<Tag_Types_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Tag_Types_Enum>;
  _nin?: InputMaybe<Array<Tag_Types_Enum>>;
};

/** input type for inserting data into table "tag_types" */
export type Tag_Types_Insert_Input = {
  description?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Tag_Types_Max_Fields = {
  __typename?: 'tag_types_max_fields';
  description?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Tag_Types_Min_Fields = {
  __typename?: 'tag_types_min_fields';
  description?: Maybe<Scalars['String']>;
  value?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "tag_types" */
export type Tag_Types_Mutation_Response = {
  __typename?: 'tag_types_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Tag_Types>;
};

/** input type for inserting object relation for remote table "tag_types" */
export type Tag_Types_Obj_Rel_Insert_Input = {
  data: Tag_Types_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Tag_Types_On_Conflict>;
};

/** on_conflict condition type for table "tag_types" */
export type Tag_Types_On_Conflict = {
  constraint: Tag_Types_Constraint;
  update_columns?: Array<Tag_Types_Update_Column>;
  where?: InputMaybe<Tag_Types_Bool_Exp>;
};

/** Ordering options when selecting data from "tag_types". */
export type Tag_Types_Order_By = {
  description?: InputMaybe<Order_By>;
  value?: InputMaybe<Order_By>;
};

/** primary key columns input for table: tag_types */
export type Tag_Types_Pk_Columns_Input = {
  value: Scalars['String'];
};

/** select columns of table "tag_types" */
export enum Tag_Types_Select_Column {
  /** column name */
  Description = 'description',
  /** column name */
  Value = 'value'
}

/** input type for updating data in table "tag_types" */
export type Tag_Types_Set_Input = {
  description?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "tag_types" */
export type Tag_Types_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Tag_Types_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Tag_Types_Stream_Cursor_Value_Input = {
  description?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

/** update columns of table "tag_types" */
export enum Tag_Types_Update_Column {
  /** column name */
  Description = 'description',
  /** column name */
  Value = 'value'
}

export type Tag_Types_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Tag_Types_Set_Input>;
  /** filter the rows which have to be updated */
  where: Tag_Types_Bool_Exp;
};

/** columns and relationships of "tags" */
export type Tags = {
  __typename?: 'tags';
  description?: Maybe<Scalars['String']>;
  display_name: Scalars['String'];
  /** An array relationship */
  entity_tags: Array<Entity_Tags>;
  /** An aggregate relationship */
  entity_tags_aggregate: Entity_Tags_Aggregate;
  grouping_name: Tag_Groupings_Enum;
  name: Scalars['String'];
  status: Tag_Status_Enum;
  /** An object relationship */
  status_enum: Tag_Status;
  tagline?: Maybe<Scalars['String']>;
  type: Tag_Types_Enum;
  /** An object relationship */
  type_enum: Tag_Types;
};


/** columns and relationships of "tags" */
export type TagsEntity_TagsArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


/** columns and relationships of "tags" */
export type TagsEntity_Tags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};

export type Tags_Aggregate = {
  __typename?: 'tags_aggregate';
  aggregate?: Maybe<Tags_Aggregate_Fields>;
  nodes: Array<Tags>;
};

/** aggregate fields of "tags" */
export type Tags_Aggregate_Fields = {
  __typename?: 'tags_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Tags_Max_Fields>;
  min?: Maybe<Tags_Min_Fields>;
};


/** aggregate fields of "tags" */
export type Tags_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Tags_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "tags". All fields are combined with a logical 'AND'. */
export type Tags_Bool_Exp = {
  _and?: InputMaybe<Array<Tags_Bool_Exp>>;
  _not?: InputMaybe<Tags_Bool_Exp>;
  _or?: InputMaybe<Array<Tags_Bool_Exp>>;
  description?: InputMaybe<String_Comparison_Exp>;
  display_name?: InputMaybe<String_Comparison_Exp>;
  entity_tags?: InputMaybe<Entity_Tags_Bool_Exp>;
  entity_tags_aggregate?: InputMaybe<Entity_Tags_Aggregate_Bool_Exp>;
  grouping_name?: InputMaybe<Tag_Groupings_Enum_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  status?: InputMaybe<Tag_Status_Enum_Comparison_Exp>;
  status_enum?: InputMaybe<Tag_Status_Bool_Exp>;
  tagline?: InputMaybe<String_Comparison_Exp>;
  type?: InputMaybe<Tag_Types_Enum_Comparison_Exp>;
  type_enum?: InputMaybe<Tag_Types_Bool_Exp>;
};

/** unique or primary key constraints on table "tags" */
export enum Tags_Constraint {
  /** unique or primary key constraint on columns "name" */
  TagsPkey = 'tags_pkey'
}

/** input type for inserting data into table "tags" */
export type Tags_Insert_Input = {
  description?: InputMaybe<Scalars['String']>;
  display_name?: InputMaybe<Scalars['String']>;
  entity_tags?: InputMaybe<Entity_Tags_Arr_Rel_Insert_Input>;
  grouping_name?: InputMaybe<Tag_Groupings_Enum>;
  name?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Tag_Status_Enum>;
  status_enum?: InputMaybe<Tag_Status_Obj_Rel_Insert_Input>;
  tagline?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<Tag_Types_Enum>;
  type_enum?: InputMaybe<Tag_Types_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Tags_Max_Fields = {
  __typename?: 'tags_max_fields';
  description?: Maybe<Scalars['String']>;
  display_name?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  tagline?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Tags_Min_Fields = {
  __typename?: 'tags_min_fields';
  description?: Maybe<Scalars['String']>;
  display_name?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  tagline?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "tags" */
export type Tags_Mutation_Response = {
  __typename?: 'tags_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Tags>;
};

/** input type for inserting object relation for remote table "tags" */
export type Tags_Obj_Rel_Insert_Input = {
  data: Tags_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Tags_On_Conflict>;
};

/** on_conflict condition type for table "tags" */
export type Tags_On_Conflict = {
  constraint: Tags_Constraint;
  update_columns?: Array<Tags_Update_Column>;
  where?: InputMaybe<Tags_Bool_Exp>;
};

/** Ordering options when selecting data from "tags". */
export type Tags_Order_By = {
  description?: InputMaybe<Order_By>;
  display_name?: InputMaybe<Order_By>;
  entity_tags_aggregate?: InputMaybe<Entity_Tags_Aggregate_Order_By>;
  grouping_name?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  status_enum?: InputMaybe<Tag_Status_Order_By>;
  tagline?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  type_enum?: InputMaybe<Tag_Types_Order_By>;
};

/** primary key columns input for table: tags */
export type Tags_Pk_Columns_Input = {
  name: Scalars['String'];
};

/** select columns of table "tags" */
export enum Tags_Select_Column {
  /** column name */
  Description = 'description',
  /** column name */
  DisplayName = 'display_name',
  /** column name */
  GroupingName = 'grouping_name',
  /** column name */
  Name = 'name',
  /** column name */
  Status = 'status',
  /** column name */
  Tagline = 'tagline',
  /** column name */
  Type = 'type'
}

/** input type for updating data in table "tags" */
export type Tags_Set_Input = {
  description?: InputMaybe<Scalars['String']>;
  display_name?: InputMaybe<Scalars['String']>;
  grouping_name?: InputMaybe<Tag_Groupings_Enum>;
  name?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Tag_Status_Enum>;
  tagline?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<Tag_Types_Enum>;
};

/** Streaming cursor of the table "tags" */
export type Tags_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Tags_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Tags_Stream_Cursor_Value_Input = {
  description?: InputMaybe<Scalars['String']>;
  display_name?: InputMaybe<Scalars['String']>;
  grouping_name?: InputMaybe<Tag_Groupings_Enum>;
  name?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Tag_Status_Enum>;
  tagline?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<Tag_Types_Enum>;
};

/** update columns of table "tags" */
export enum Tags_Update_Column {
  /** column name */
  Description = 'description',
  /** column name */
  DisplayName = 'display_name',
  /** column name */
  GroupingName = 'grouping_name',
  /** column name */
  Name = 'name',
  /** column name */
  Status = 'status',
  /** column name */
  Tagline = 'tagline',
  /** column name */
  Type = 'type'
}

export type Tags_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Tags_Set_Input>;
  /** filter the rows which have to be updated */
  where: Tags_Bool_Exp;
};

/** columns and relationships of "terms_of_service" */
export type Terms_Of_Service = {
  __typename?: 'terms_of_service';
  content: Scalars['String'];
  created_at: Scalars['timestamptz'];
  id: Scalars['Int'];
};

/** aggregated selection of "terms_of_service" */
export type Terms_Of_Service_Aggregate = {
  __typename?: 'terms_of_service_aggregate';
  aggregate?: Maybe<Terms_Of_Service_Aggregate_Fields>;
  nodes: Array<Terms_Of_Service>;
};

/** aggregate fields of "terms_of_service" */
export type Terms_Of_Service_Aggregate_Fields = {
  __typename?: 'terms_of_service_aggregate_fields';
  avg?: Maybe<Terms_Of_Service_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Terms_Of_Service_Max_Fields>;
  min?: Maybe<Terms_Of_Service_Min_Fields>;
  stddev?: Maybe<Terms_Of_Service_Stddev_Fields>;
  stddev_pop?: Maybe<Terms_Of_Service_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Terms_Of_Service_Stddev_Samp_Fields>;
  sum?: Maybe<Terms_Of_Service_Sum_Fields>;
  var_pop?: Maybe<Terms_Of_Service_Var_Pop_Fields>;
  var_samp?: Maybe<Terms_Of_Service_Var_Samp_Fields>;
  variance?: Maybe<Terms_Of_Service_Variance_Fields>;
};


/** aggregate fields of "terms_of_service" */
export type Terms_Of_Service_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Terms_Of_Service_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Terms_Of_Service_Avg_Fields = {
  __typename?: 'terms_of_service_avg_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "terms_of_service". All fields are combined with a logical 'AND'. */
export type Terms_Of_Service_Bool_Exp = {
  _and?: InputMaybe<Array<Terms_Of_Service_Bool_Exp>>;
  _not?: InputMaybe<Terms_Of_Service_Bool_Exp>;
  _or?: InputMaybe<Array<Terms_Of_Service_Bool_Exp>>;
  content?: InputMaybe<String_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "terms_of_service" */
export enum Terms_Of_Service_Constraint {
  /** unique or primary key constraint on columns "id" */
  TermsOfServicePkey = 'terms_of_service_pkey'
}

/** input type for incrementing numeric columns in table "terms_of_service" */
export type Terms_Of_Service_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "terms_of_service" */
export type Terms_Of_Service_Insert_Input = {
  content?: InputMaybe<Scalars['String']>;
  created_at?: InputMaybe<Scalars['timestamptz']>;
  id?: InputMaybe<Scalars['Int']>;
};

/** aggregate max on columns */
export type Terms_Of_Service_Max_Fields = {
  __typename?: 'terms_of_service_max_fields';
  content?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamptz']>;
  id?: Maybe<Scalars['Int']>;
};

/** aggregate min on columns */
export type Terms_Of_Service_Min_Fields = {
  __typename?: 'terms_of_service_min_fields';
  content?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['timestamptz']>;
  id?: Maybe<Scalars['Int']>;
};

/** response of any mutation on the table "terms_of_service" */
export type Terms_Of_Service_Mutation_Response = {
  __typename?: 'terms_of_service_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Terms_Of_Service>;
};

/** on_conflict condition type for table "terms_of_service" */
export type Terms_Of_Service_On_Conflict = {
  constraint: Terms_Of_Service_Constraint;
  update_columns?: Array<Terms_Of_Service_Update_Column>;
  where?: InputMaybe<Terms_Of_Service_Bool_Exp>;
};

/** Ordering options when selecting data from "terms_of_service". */
export type Terms_Of_Service_Order_By = {
  content?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: terms_of_service */
export type Terms_Of_Service_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** select columns of table "terms_of_service" */
export enum Terms_Of_Service_Select_Column {
  /** column name */
  Content = 'content',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Id = 'id'
}

/** input type for updating data in table "terms_of_service" */
export type Terms_Of_Service_Set_Input = {
  content?: InputMaybe<Scalars['String']>;
  created_at?: InputMaybe<Scalars['timestamptz']>;
  id?: InputMaybe<Scalars['Int']>;
};

/** aggregate stddev on columns */
export type Terms_Of_Service_Stddev_Fields = {
  __typename?: 'terms_of_service_stddev_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Terms_Of_Service_Stddev_Pop_Fields = {
  __typename?: 'terms_of_service_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Terms_Of_Service_Stddev_Samp_Fields = {
  __typename?: 'terms_of_service_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "terms_of_service" */
export type Terms_Of_Service_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Terms_Of_Service_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Terms_Of_Service_Stream_Cursor_Value_Input = {
  content?: InputMaybe<Scalars['String']>;
  created_at?: InputMaybe<Scalars['timestamptz']>;
  id?: InputMaybe<Scalars['Int']>;
};

/** aggregate sum on columns */
export type Terms_Of_Service_Sum_Fields = {
  __typename?: 'terms_of_service_sum_fields';
  id?: Maybe<Scalars['Int']>;
};

/** update columns of table "terms_of_service" */
export enum Terms_Of_Service_Update_Column {
  /** column name */
  Content = 'content',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Id = 'id'
}

export type Terms_Of_Service_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Terms_Of_Service_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Terms_Of_Service_Set_Input>;
  /** filter the rows which have to be updated */
  where: Terms_Of_Service_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Terms_Of_Service_Var_Pop_Fields = {
  __typename?: 'terms_of_service_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Terms_Of_Service_Var_Samp_Fields = {
  __typename?: 'terms_of_service_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Terms_Of_Service_Variance_Fields = {
  __typename?: 'terms_of_service_variance_fields';
  id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to compare columns of type "timestamp". All fields are combined with logical 'AND'. */
export type Timestamp_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['timestamp']>;
  _gt?: InputMaybe<Scalars['timestamp']>;
  _gte?: InputMaybe<Scalars['timestamp']>;
  _in?: InputMaybe<Array<Scalars['timestamp']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['timestamp']>;
  _lte?: InputMaybe<Scalars['timestamp']>;
  _neq?: InputMaybe<Scalars['timestamp']>;
  _nin?: InputMaybe<Array<Scalars['timestamp']>>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['timestamptz']>;
  _gt?: InputMaybe<Scalars['timestamptz']>;
  _gte?: InputMaybe<Scalars['timestamptz']>;
  _in?: InputMaybe<Array<Scalars['timestamptz']>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _lt?: InputMaybe<Scalars['timestamptz']>;
  _lte?: InputMaybe<Scalars['timestamptz']>;
  _neq?: InputMaybe<Scalars['timestamptz']>;
  _nin?: InputMaybe<Array<Scalars['timestamptz']>>;
};

/** columns and relationships of "tokens_metadata" */
export type Tokens_Metadata = {
  __typename?: 'tokens_metadata';
  /** An object relationship */
  contract?: Maybe<Contracts_Metadata>;
  contract_address: Scalars['String'];
  /** A computed field, executes function "token_favorited_by_user" */
  favorited_by_user?: Maybe<Scalars['Boolean']>;
  /** An array relationship */
  favorites: Array<Favorites>;
  /** An aggregate relationship */
  favorites_aggregate: Favorites_Aggregate;
  features: Scalars['jsonb'];
  /** An object relationship */
  gif?: Maybe<Media>;
  gif_id?: Maybe<Scalars['Int']>;
  hash: Scalars['String'];
  /** An object relationship */
  high_res_image?: Maybe<Media>;
  high_res_image_id?: Maybe<Scalars['Int']>;
  id: Scalars['String'];
  /** An object relationship */
  image?: Maybe<Media>;
  image_id?: Maybe<Scalars['Int']>;
  invocation: Scalars['Int'];
  isFlaggedAsSuspicious?: Maybe<Scalars['Boolean']>;
  list_currency_address?: Maybe<Scalars['String']>;
  list_currency_symbol?: Maybe<Scalars['String']>;
  list_eth_price?: Maybe<Scalars['float8']>;
  list_expiration_date?: Maybe<Scalars['timestamptz']>;
  list_platform?: Maybe<Scalars['String']>;
  list_price?: Maybe<Scalars['float8']>;
  list_url?: Maybe<Scalars['String']>;
  /** A computed field, executes function "live_view_path" */
  live_view_path?: Maybe<Scalars['String']>;
  /** A computed field, executes function "live_view_url" */
  live_view_url?: Maybe<Scalars['String']>;
  /** An object relationship */
  low_res_image?: Maybe<Media>;
  low_res_image_id?: Maybe<Scalars['Int']>;
  mint_transaction_hash?: Maybe<Scalars['String']>;
  minted_at: Scalars['timestamptz'];
  /** An object relationship */
  owner?: Maybe<Users>;
  owner_address: Scalars['String'];
  /** An object relationship */
  project: Projects_Metadata;
  project_id: Scalars['String'];
  project_name?: Maybe<Scalars['String']>;
  token?: Maybe<Token>;
  token_id: Scalars['String'];
  updated_at?: Maybe<Scalars['timestamp']>;
  /** An object relationship */
  video?: Maybe<Media>;
  video_id?: Maybe<Scalars['Int']>;
};


/** columns and relationships of "tokens_metadata" */
export type Tokens_MetadataFavoritesArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


/** columns and relationships of "tokens_metadata" */
export type Tokens_MetadataFavorites_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


/** columns and relationships of "tokens_metadata" */
export type Tokens_MetadataFeaturesArgs = {
  path?: InputMaybe<Scalars['String']>;
};


/** columns and relationships of "tokens_metadata" */
export type Tokens_MetadataTokenArgs = {
  block?: InputMaybe<Block_Height>;
  subgraphError?: _SubgraphErrorPolicy_;
};

/** aggregated selection of "tokens_metadata" */
export type Tokens_Metadata_Aggregate = {
  __typename?: 'tokens_metadata_aggregate';
  aggregate?: Maybe<Tokens_Metadata_Aggregate_Fields>;
  nodes: Array<Tokens_Metadata>;
};

export type Tokens_Metadata_Aggregate_Bool_Exp = {
  avg?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Avg>;
  corr?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Corr>;
  count?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Count>;
  covar_samp?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Covar_Samp>;
  max?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Max>;
  min?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Min>;
  stddev_samp?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Stddev_Samp>;
  sum?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Sum>;
  var_samp?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp_Var_Samp>;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Avg = {
  arguments: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Avg_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Corr = {
  arguments: Tokens_Metadata_Aggregate_Bool_Exp_Corr_Arguments;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Corr_Arguments = {
  X: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Corr_Arguments_Columns;
  Y: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Corr_Arguments_Columns;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Covar_Samp = {
  arguments: Tokens_Metadata_Aggregate_Bool_Exp_Covar_Samp_Arguments;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Covar_Samp_Arguments = {
  X: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Covar_Samp_Arguments_Columns;
  Y: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Covar_Samp_Arguments_Columns;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Max = {
  arguments: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Max_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Min = {
  arguments: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Min_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Stddev_Samp = {
  arguments: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Stddev_Samp_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Sum = {
  arguments: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Sum_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

export type Tokens_Metadata_Aggregate_Bool_Exp_Var_Samp = {
  arguments: Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Var_Samp_Arguments_Columns;
  distinct?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  predicate: Float8_Comparison_Exp;
};

/** aggregate fields of "tokens_metadata" */
export type Tokens_Metadata_Aggregate_Fields = {
  __typename?: 'tokens_metadata_aggregate_fields';
  avg?: Maybe<Tokens_Metadata_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Tokens_Metadata_Max_Fields>;
  min?: Maybe<Tokens_Metadata_Min_Fields>;
  stddev?: Maybe<Tokens_Metadata_Stddev_Fields>;
  stddev_pop?: Maybe<Tokens_Metadata_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Tokens_Metadata_Stddev_Samp_Fields>;
  sum?: Maybe<Tokens_Metadata_Sum_Fields>;
  var_pop?: Maybe<Tokens_Metadata_Var_Pop_Fields>;
  var_samp?: Maybe<Tokens_Metadata_Var_Samp_Fields>;
  variance?: Maybe<Tokens_Metadata_Variance_Fields>;
};


/** aggregate fields of "tokens_metadata" */
export type Tokens_Metadata_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** order by aggregate values of table "tokens_metadata" */
export type Tokens_Metadata_Aggregate_Order_By = {
  avg?: InputMaybe<Tokens_Metadata_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Tokens_Metadata_Max_Order_By>;
  min?: InputMaybe<Tokens_Metadata_Min_Order_By>;
  stddev?: InputMaybe<Tokens_Metadata_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Tokens_Metadata_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Tokens_Metadata_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Tokens_Metadata_Sum_Order_By>;
  var_pop?: InputMaybe<Tokens_Metadata_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Tokens_Metadata_Var_Samp_Order_By>;
  variance?: InputMaybe<Tokens_Metadata_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Tokens_Metadata_Append_Input = {
  features?: InputMaybe<Scalars['jsonb']>;
};

/** input type for inserting array relation for remote table "tokens_metadata" */
export type Tokens_Metadata_Arr_Rel_Insert_Input = {
  data: Array<Tokens_Metadata_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Tokens_Metadata_On_Conflict>;
};

/** aggregate avg on columns */
export type Tokens_Metadata_Avg_Fields = {
  __typename?: 'tokens_metadata_avg_fields';
  gif_id?: Maybe<Scalars['Float']>;
  high_res_image_id?: Maybe<Scalars['Float']>;
  image_id?: Maybe<Scalars['Float']>;
  invocation?: Maybe<Scalars['Float']>;
  list_eth_price?: Maybe<Scalars['Float']>;
  list_price?: Maybe<Scalars['Float']>;
  low_res_image_id?: Maybe<Scalars['Float']>;
  video_id?: Maybe<Scalars['Float']>;
};

/** order by avg() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Avg_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "tokens_metadata". All fields are combined with a logical 'AND'. */
export type Tokens_Metadata_Bool_Exp = {
  _and?: InputMaybe<Array<Tokens_Metadata_Bool_Exp>>;
  _not?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  _or?: InputMaybe<Array<Tokens_Metadata_Bool_Exp>>;
  contract?: InputMaybe<Contracts_Metadata_Bool_Exp>;
  contract_address?: InputMaybe<String_Comparison_Exp>;
  favorited_by_user?: InputMaybe<Boolean_Comparison_Exp>;
  favorites?: InputMaybe<Favorites_Bool_Exp>;
  favorites_aggregate?: InputMaybe<Favorites_Aggregate_Bool_Exp>;
  features?: InputMaybe<Jsonb_Comparison_Exp>;
  gif?: InputMaybe<Media_Bool_Exp>;
  gif_id?: InputMaybe<Int_Comparison_Exp>;
  hash?: InputMaybe<String_Comparison_Exp>;
  high_res_image?: InputMaybe<Media_Bool_Exp>;
  high_res_image_id?: InputMaybe<Int_Comparison_Exp>;
  id?: InputMaybe<String_Comparison_Exp>;
  image?: InputMaybe<Media_Bool_Exp>;
  image_id?: InputMaybe<Int_Comparison_Exp>;
  invocation?: InputMaybe<Int_Comparison_Exp>;
  list_currency_address?: InputMaybe<String_Comparison_Exp>;
  list_currency_symbol?: InputMaybe<String_Comparison_Exp>;
  list_eth_price?: InputMaybe<Float8_Comparison_Exp>;
  list_expiration_date?: InputMaybe<Timestamptz_Comparison_Exp>;
  list_platform?: InputMaybe<String_Comparison_Exp>;
  list_price?: InputMaybe<Float8_Comparison_Exp>;
  list_url?: InputMaybe<String_Comparison_Exp>;
  live_view_path?: InputMaybe<String_Comparison_Exp>;
  live_view_url?: InputMaybe<String_Comparison_Exp>;
  low_res_image?: InputMaybe<Media_Bool_Exp>;
  low_res_image_id?: InputMaybe<Int_Comparison_Exp>;
  mint_transaction_hash?: InputMaybe<String_Comparison_Exp>;
  minted_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  owner?: InputMaybe<Users_Bool_Exp>;
  owner_address?: InputMaybe<String_Comparison_Exp>;
  project?: InputMaybe<Projects_Metadata_Bool_Exp>;
  project_id?: InputMaybe<String_Comparison_Exp>;
  project_name?: InputMaybe<String_Comparison_Exp>;
  token_id?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamp_Comparison_Exp>;
  video?: InputMaybe<Media_Bool_Exp>;
  video_id?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "tokens_metadata" */
export enum Tokens_Metadata_Constraint {
  /** unique or primary key constraint on columns "id" */
  TokensMetadataPkey = 'tokens_metadata_pkey',
  /** unique or primary key constraint on columns "token_id", "contract_address" */
  TokensMetadataTokenIdContractAddressKey = 'tokens_metadata_token_id_contract_address_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Tokens_Metadata_Delete_At_Path_Input = {
  features?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Tokens_Metadata_Delete_Elem_Input = {
  features?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Tokens_Metadata_Delete_Key_Input = {
  features?: InputMaybe<Scalars['String']>;
};

/** input type for incrementing numeric columns in table "tokens_metadata" */
export type Tokens_Metadata_Inc_Input = {
  gif_id?: InputMaybe<Scalars['Int']>;
  high_res_image_id?: InputMaybe<Scalars['Int']>;
  image_id?: InputMaybe<Scalars['Int']>;
  list_eth_price?: InputMaybe<Scalars['float8']>;
  list_price?: InputMaybe<Scalars['float8']>;
  low_res_image_id?: InputMaybe<Scalars['Int']>;
  video_id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "tokens_metadata" */
export type Tokens_Metadata_Insert_Input = {
  contract?: InputMaybe<Contracts_Metadata_Obj_Rel_Insert_Input>;
  contract_address?: InputMaybe<Scalars['String']>;
  favorites?: InputMaybe<Favorites_Arr_Rel_Insert_Input>;
  features?: InputMaybe<Scalars['jsonb']>;
  gif?: InputMaybe<Media_Obj_Rel_Insert_Input>;
  gif_id?: InputMaybe<Scalars['Int']>;
  hash?: InputMaybe<Scalars['String']>;
  high_res_image?: InputMaybe<Media_Obj_Rel_Insert_Input>;
  high_res_image_id?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  image?: InputMaybe<Media_Obj_Rel_Insert_Input>;
  image_id?: InputMaybe<Scalars['Int']>;
  list_currency_address?: InputMaybe<Scalars['String']>;
  list_currency_symbol?: InputMaybe<Scalars['String']>;
  list_eth_price?: InputMaybe<Scalars['float8']>;
  list_expiration_date?: InputMaybe<Scalars['timestamptz']>;
  list_platform?: InputMaybe<Scalars['String']>;
  list_price?: InputMaybe<Scalars['float8']>;
  list_url?: InputMaybe<Scalars['String']>;
  low_res_image?: InputMaybe<Media_Obj_Rel_Insert_Input>;
  low_res_image_id?: InputMaybe<Scalars['Int']>;
  mint_transaction_hash?: InputMaybe<Scalars['String']>;
  minted_at?: InputMaybe<Scalars['timestamptz']>;
  owner?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  owner_address?: InputMaybe<Scalars['String']>;
  project?: InputMaybe<Projects_Metadata_Obj_Rel_Insert_Input>;
  project_id?: InputMaybe<Scalars['String']>;
  project_name?: InputMaybe<Scalars['String']>;
  token_id?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
  video?: InputMaybe<Media_Obj_Rel_Insert_Input>;
  video_id?: InputMaybe<Scalars['Int']>;
};

/** aggregate max on columns */
export type Tokens_Metadata_Max_Fields = {
  __typename?: 'tokens_metadata_max_fields';
  contract_address?: Maybe<Scalars['String']>;
  gif_id?: Maybe<Scalars['Int']>;
  hash?: Maybe<Scalars['String']>;
  high_res_image_id?: Maybe<Scalars['Int']>;
  id?: Maybe<Scalars['String']>;
  image_id?: Maybe<Scalars['Int']>;
  invocation?: Maybe<Scalars['Int']>;
  list_currency_address?: Maybe<Scalars['String']>;
  list_currency_symbol?: Maybe<Scalars['String']>;
  list_eth_price?: Maybe<Scalars['float8']>;
  list_expiration_date?: Maybe<Scalars['timestamptz']>;
  list_platform?: Maybe<Scalars['String']>;
  list_price?: Maybe<Scalars['float8']>;
  list_url?: Maybe<Scalars['String']>;
  low_res_image_id?: Maybe<Scalars['Int']>;
  mint_transaction_hash?: Maybe<Scalars['String']>;
  minted_at?: Maybe<Scalars['timestamptz']>;
  owner_address?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  project_name?: Maybe<Scalars['String']>;
  token_id?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  video_id?: Maybe<Scalars['Int']>;
};

/** order by max() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Max_Order_By = {
  contract_address?: InputMaybe<Order_By>;
  gif_id?: InputMaybe<Order_By>;
  hash?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_currency_address?: InputMaybe<Order_By>;
  list_currency_symbol?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_expiration_date?: InputMaybe<Order_By>;
  list_platform?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  list_url?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  mint_transaction_hash?: InputMaybe<Order_By>;
  minted_at?: InputMaybe<Order_By>;
  owner_address?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  project_name?: InputMaybe<Order_By>;
  token_id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Tokens_Metadata_Min_Fields = {
  __typename?: 'tokens_metadata_min_fields';
  contract_address?: Maybe<Scalars['String']>;
  gif_id?: Maybe<Scalars['Int']>;
  hash?: Maybe<Scalars['String']>;
  high_res_image_id?: Maybe<Scalars['Int']>;
  id?: Maybe<Scalars['String']>;
  image_id?: Maybe<Scalars['Int']>;
  invocation?: Maybe<Scalars['Int']>;
  list_currency_address?: Maybe<Scalars['String']>;
  list_currency_symbol?: Maybe<Scalars['String']>;
  list_eth_price?: Maybe<Scalars['float8']>;
  list_expiration_date?: Maybe<Scalars['timestamptz']>;
  list_platform?: Maybe<Scalars['String']>;
  list_price?: Maybe<Scalars['float8']>;
  list_url?: Maybe<Scalars['String']>;
  low_res_image_id?: Maybe<Scalars['Int']>;
  mint_transaction_hash?: Maybe<Scalars['String']>;
  minted_at?: Maybe<Scalars['timestamptz']>;
  owner_address?: Maybe<Scalars['String']>;
  project_id?: Maybe<Scalars['String']>;
  project_name?: Maybe<Scalars['String']>;
  token_id?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['timestamp']>;
  video_id?: Maybe<Scalars['Int']>;
};

/** order by min() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Min_Order_By = {
  contract_address?: InputMaybe<Order_By>;
  gif_id?: InputMaybe<Order_By>;
  hash?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_currency_address?: InputMaybe<Order_By>;
  list_currency_symbol?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_expiration_date?: InputMaybe<Order_By>;
  list_platform?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  list_url?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  mint_transaction_hash?: InputMaybe<Order_By>;
  minted_at?: InputMaybe<Order_By>;
  owner_address?: InputMaybe<Order_By>;
  project_id?: InputMaybe<Order_By>;
  project_name?: InputMaybe<Order_By>;
  token_id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "tokens_metadata" */
export type Tokens_Metadata_Mutation_Response = {
  __typename?: 'tokens_metadata_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Tokens_Metadata>;
};

/** input type for inserting object relation for remote table "tokens_metadata" */
export type Tokens_Metadata_Obj_Rel_Insert_Input = {
  data: Tokens_Metadata_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Tokens_Metadata_On_Conflict>;
};

/** on_conflict condition type for table "tokens_metadata" */
export type Tokens_Metadata_On_Conflict = {
  constraint: Tokens_Metadata_Constraint;
  update_columns?: Array<Tokens_Metadata_Update_Column>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};

/** Ordering options when selecting data from "tokens_metadata". */
export type Tokens_Metadata_Order_By = {
  contract?: InputMaybe<Contracts_Metadata_Order_By>;
  contract_address?: InputMaybe<Order_By>;
  favorited_by_user?: InputMaybe<Order_By>;
  favorites_aggregate?: InputMaybe<Favorites_Aggregate_Order_By>;
  features?: InputMaybe<Order_By>;
  gif?: InputMaybe<Media_Order_By>;
  gif_id?: InputMaybe<Order_By>;
  hash?: InputMaybe<Order_By>;
  high_res_image?: InputMaybe<Media_Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  image?: InputMaybe<Media_Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_currency_address?: InputMaybe<Order_By>;
  list_currency_symbol?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_expiration_date?: InputMaybe<Order_By>;
  list_platform?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  list_url?: InputMaybe<Order_By>;
  live_view_path?: InputMaybe<Order_By>;
  live_view_url?: InputMaybe<Order_By>;
  low_res_image?: InputMaybe<Media_Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  mint_transaction_hash?: InputMaybe<Order_By>;
  minted_at?: InputMaybe<Order_By>;
  owner?: InputMaybe<Users_Order_By>;
  owner_address?: InputMaybe<Order_By>;
  project?: InputMaybe<Projects_Metadata_Order_By>;
  project_id?: InputMaybe<Order_By>;
  project_name?: InputMaybe<Order_By>;
  token_id?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video?: InputMaybe<Media_Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: tokens_metadata */
export type Tokens_Metadata_Pk_Columns_Input = {
  id: Scalars['String'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Tokens_Metadata_Prepend_Input = {
  features?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column {
  /** column name */
  ContractAddress = 'contract_address',
  /** column name */
  Features = 'features',
  /** column name */
  GifId = 'gif_id',
  /** column name */
  Hash = 'hash',
  /** column name */
  HighResImageId = 'high_res_image_id',
  /** column name */
  Id = 'id',
  /** column name */
  ImageId = 'image_id',
  /** column name */
  Invocation = 'invocation',
  /** column name */
  ListCurrencyAddress = 'list_currency_address',
  /** column name */
  ListCurrencySymbol = 'list_currency_symbol',
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListExpirationDate = 'list_expiration_date',
  /** column name */
  ListPlatform = 'list_platform',
  /** column name */
  ListPrice = 'list_price',
  /** column name */
  ListUrl = 'list_url',
  /** column name */
  LowResImageId = 'low_res_image_id',
  /** column name */
  MintTransactionHash = 'mint_transaction_hash',
  /** column name */
  MintedAt = 'minted_at',
  /** column name */
  OwnerAddress = 'owner_address',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  ProjectName = 'project_name',
  /** column name */
  TokenId = 'token_id',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

/** select "tokens_metadata_aggregate_bool_exp_avg_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Avg_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** select "tokens_metadata_aggregate_bool_exp_corr_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Corr_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** select "tokens_metadata_aggregate_bool_exp_covar_samp_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Covar_Samp_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** select "tokens_metadata_aggregate_bool_exp_max_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Max_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** select "tokens_metadata_aggregate_bool_exp_min_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Min_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** select "tokens_metadata_aggregate_bool_exp_stddev_samp_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Stddev_Samp_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** select "tokens_metadata_aggregate_bool_exp_sum_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Sum_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** select "tokens_metadata_aggregate_bool_exp_var_samp_arguments_columns" columns of table "tokens_metadata" */
export enum Tokens_Metadata_Select_Column_Tokens_Metadata_Aggregate_Bool_Exp_Var_Samp_Arguments_Columns {
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListPrice = 'list_price'
}

/** input type for updating data in table "tokens_metadata" */
export type Tokens_Metadata_Set_Input = {
  contract_address?: InputMaybe<Scalars['String']>;
  features?: InputMaybe<Scalars['jsonb']>;
  gif_id?: InputMaybe<Scalars['Int']>;
  hash?: InputMaybe<Scalars['String']>;
  high_res_image_id?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  image_id?: InputMaybe<Scalars['Int']>;
  list_currency_address?: InputMaybe<Scalars['String']>;
  list_currency_symbol?: InputMaybe<Scalars['String']>;
  list_eth_price?: InputMaybe<Scalars['float8']>;
  list_expiration_date?: InputMaybe<Scalars['timestamptz']>;
  list_platform?: InputMaybe<Scalars['String']>;
  list_price?: InputMaybe<Scalars['float8']>;
  list_url?: InputMaybe<Scalars['String']>;
  low_res_image_id?: InputMaybe<Scalars['Int']>;
  mint_transaction_hash?: InputMaybe<Scalars['String']>;
  minted_at?: InputMaybe<Scalars['timestamptz']>;
  owner_address?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
  project_name?: InputMaybe<Scalars['String']>;
  token_id?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
  video_id?: InputMaybe<Scalars['Int']>;
};

/** aggregate stddev on columns */
export type Tokens_Metadata_Stddev_Fields = {
  __typename?: 'tokens_metadata_stddev_fields';
  gif_id?: Maybe<Scalars['Float']>;
  high_res_image_id?: Maybe<Scalars['Float']>;
  image_id?: Maybe<Scalars['Float']>;
  invocation?: Maybe<Scalars['Float']>;
  list_eth_price?: Maybe<Scalars['Float']>;
  list_price?: Maybe<Scalars['Float']>;
  low_res_image_id?: Maybe<Scalars['Float']>;
  video_id?: Maybe<Scalars['Float']>;
};

/** order by stddev() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Stddev_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Tokens_Metadata_Stddev_Pop_Fields = {
  __typename?: 'tokens_metadata_stddev_pop_fields';
  gif_id?: Maybe<Scalars['Float']>;
  high_res_image_id?: Maybe<Scalars['Float']>;
  image_id?: Maybe<Scalars['Float']>;
  invocation?: Maybe<Scalars['Float']>;
  list_eth_price?: Maybe<Scalars['Float']>;
  list_price?: Maybe<Scalars['Float']>;
  low_res_image_id?: Maybe<Scalars['Float']>;
  video_id?: Maybe<Scalars['Float']>;
};

/** order by stddev_pop() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Stddev_Pop_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Tokens_Metadata_Stddev_Samp_Fields = {
  __typename?: 'tokens_metadata_stddev_samp_fields';
  gif_id?: Maybe<Scalars['Float']>;
  high_res_image_id?: Maybe<Scalars['Float']>;
  image_id?: Maybe<Scalars['Float']>;
  invocation?: Maybe<Scalars['Float']>;
  list_eth_price?: Maybe<Scalars['Float']>;
  list_price?: Maybe<Scalars['Float']>;
  low_res_image_id?: Maybe<Scalars['Float']>;
  video_id?: Maybe<Scalars['Float']>;
};

/** order by stddev_samp() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Stddev_Samp_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "tokens_metadata" */
export type Tokens_Metadata_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Tokens_Metadata_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Tokens_Metadata_Stream_Cursor_Value_Input = {
  contract_address?: InputMaybe<Scalars['String']>;
  features?: InputMaybe<Scalars['jsonb']>;
  gif_id?: InputMaybe<Scalars['Int']>;
  hash?: InputMaybe<Scalars['String']>;
  high_res_image_id?: InputMaybe<Scalars['Int']>;
  id?: InputMaybe<Scalars['String']>;
  image_id?: InputMaybe<Scalars['Int']>;
  invocation?: InputMaybe<Scalars['Int']>;
  list_currency_address?: InputMaybe<Scalars['String']>;
  list_currency_symbol?: InputMaybe<Scalars['String']>;
  list_eth_price?: InputMaybe<Scalars['float8']>;
  list_expiration_date?: InputMaybe<Scalars['timestamptz']>;
  list_platform?: InputMaybe<Scalars['String']>;
  list_price?: InputMaybe<Scalars['float8']>;
  list_url?: InputMaybe<Scalars['String']>;
  low_res_image_id?: InputMaybe<Scalars['Int']>;
  mint_transaction_hash?: InputMaybe<Scalars['String']>;
  minted_at?: InputMaybe<Scalars['timestamptz']>;
  owner_address?: InputMaybe<Scalars['String']>;
  project_id?: InputMaybe<Scalars['String']>;
  project_name?: InputMaybe<Scalars['String']>;
  token_id?: InputMaybe<Scalars['String']>;
  updated_at?: InputMaybe<Scalars['timestamp']>;
  video_id?: InputMaybe<Scalars['Int']>;
};

/** aggregate sum on columns */
export type Tokens_Metadata_Sum_Fields = {
  __typename?: 'tokens_metadata_sum_fields';
  gif_id?: Maybe<Scalars['Int']>;
  high_res_image_id?: Maybe<Scalars['Int']>;
  image_id?: Maybe<Scalars['Int']>;
  invocation?: Maybe<Scalars['Int']>;
  list_eth_price?: Maybe<Scalars['float8']>;
  list_price?: Maybe<Scalars['float8']>;
  low_res_image_id?: Maybe<Scalars['Int']>;
  video_id?: Maybe<Scalars['Int']>;
};

/** order by sum() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Sum_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** update columns of table "tokens_metadata" */
export enum Tokens_Metadata_Update_Column {
  /** column name */
  ContractAddress = 'contract_address',
  /** column name */
  Features = 'features',
  /** column name */
  GifId = 'gif_id',
  /** column name */
  Hash = 'hash',
  /** column name */
  HighResImageId = 'high_res_image_id',
  /** column name */
  Id = 'id',
  /** column name */
  ImageId = 'image_id',
  /** column name */
  ListCurrencyAddress = 'list_currency_address',
  /** column name */
  ListCurrencySymbol = 'list_currency_symbol',
  /** column name */
  ListEthPrice = 'list_eth_price',
  /** column name */
  ListExpirationDate = 'list_expiration_date',
  /** column name */
  ListPlatform = 'list_platform',
  /** column name */
  ListPrice = 'list_price',
  /** column name */
  ListUrl = 'list_url',
  /** column name */
  LowResImageId = 'low_res_image_id',
  /** column name */
  MintTransactionHash = 'mint_transaction_hash',
  /** column name */
  MintedAt = 'minted_at',
  /** column name */
  OwnerAddress = 'owner_address',
  /** column name */
  ProjectId = 'project_id',
  /** column name */
  ProjectName = 'project_name',
  /** column name */
  TokenId = 'token_id',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

export type Tokens_Metadata_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Tokens_Metadata_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Tokens_Metadata_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Tokens_Metadata_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Tokens_Metadata_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Tokens_Metadata_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Tokens_Metadata_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Tokens_Metadata_Set_Input>;
  /** filter the rows which have to be updated */
  where: Tokens_Metadata_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Tokens_Metadata_Var_Pop_Fields = {
  __typename?: 'tokens_metadata_var_pop_fields';
  gif_id?: Maybe<Scalars['Float']>;
  high_res_image_id?: Maybe<Scalars['Float']>;
  image_id?: Maybe<Scalars['Float']>;
  invocation?: Maybe<Scalars['Float']>;
  list_eth_price?: Maybe<Scalars['Float']>;
  list_price?: Maybe<Scalars['Float']>;
  low_res_image_id?: Maybe<Scalars['Float']>;
  video_id?: Maybe<Scalars['Float']>;
};

/** order by var_pop() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Var_Pop_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Tokens_Metadata_Var_Samp_Fields = {
  __typename?: 'tokens_metadata_var_samp_fields';
  gif_id?: Maybe<Scalars['Float']>;
  high_res_image_id?: Maybe<Scalars['Float']>;
  image_id?: Maybe<Scalars['Float']>;
  invocation?: Maybe<Scalars['Float']>;
  list_eth_price?: Maybe<Scalars['Float']>;
  list_price?: Maybe<Scalars['Float']>;
  low_res_image_id?: Maybe<Scalars['Float']>;
  video_id?: Maybe<Scalars['Float']>;
};

/** order by var_samp() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Var_Samp_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Tokens_Metadata_Variance_Fields = {
  __typename?: 'tokens_metadata_variance_fields';
  gif_id?: Maybe<Scalars['Float']>;
  high_res_image_id?: Maybe<Scalars['Float']>;
  image_id?: Maybe<Scalars['Float']>;
  invocation?: Maybe<Scalars['Float']>;
  list_eth_price?: Maybe<Scalars['Float']>;
  list_price?: Maybe<Scalars['Float']>;
  low_res_image_id?: Maybe<Scalars['Float']>;
  video_id?: Maybe<Scalars['Float']>;
};

/** order by variance() on columns of table "tokens_metadata" */
export type Tokens_Metadata_Variance_Order_By = {
  gif_id?: InputMaybe<Order_By>;
  high_res_image_id?: InputMaybe<Order_By>;
  image_id?: InputMaybe<Order_By>;
  invocation?: InputMaybe<Order_By>;
  list_eth_price?: InputMaybe<Order_By>;
  list_price?: InputMaybe<Order_By>;
  low_res_image_id?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** columns and relationships of "user_profiles" */
export type User_Profiles = {
  __typename?: 'user_profiles';
  bio?: Maybe<Scalars['String']>;
  id: Scalars['Int'];
  name?: Maybe<Scalars['String']>;
  /** An object relationship */
  profile_picture?: Maybe<Media>;
  profile_picture_id?: Maybe<Scalars['Int']>;
  user_address: Scalars['String'];
  username?: Maybe<Scalars['String']>;
};

export type User_Profiles_Aggregate = {
  __typename?: 'user_profiles_aggregate';
  aggregate?: Maybe<User_Profiles_Aggregate_Fields>;
  nodes: Array<User_Profiles>;
};

/** aggregate fields of "user_profiles" */
export type User_Profiles_Aggregate_Fields = {
  __typename?: 'user_profiles_aggregate_fields';
  avg?: Maybe<User_Profiles_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<User_Profiles_Max_Fields>;
  min?: Maybe<User_Profiles_Min_Fields>;
  stddev?: Maybe<User_Profiles_Stddev_Fields>;
  stddev_pop?: Maybe<User_Profiles_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<User_Profiles_Stddev_Samp_Fields>;
  sum?: Maybe<User_Profiles_Sum_Fields>;
  var_pop?: Maybe<User_Profiles_Var_Pop_Fields>;
  var_samp?: Maybe<User_Profiles_Var_Samp_Fields>;
  variance?: Maybe<User_Profiles_Variance_Fields>;
};


/** aggregate fields of "user_profiles" */
export type User_Profiles_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<User_Profiles_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type User_Profiles_Avg_Fields = {
  __typename?: 'user_profiles_avg_fields';
  id?: Maybe<Scalars['Float']>;
  profile_picture_id?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "user_profiles". All fields are combined with a logical 'AND'. */
export type User_Profiles_Bool_Exp = {
  _and?: InputMaybe<Array<User_Profiles_Bool_Exp>>;
  _not?: InputMaybe<User_Profiles_Bool_Exp>;
  _or?: InputMaybe<Array<User_Profiles_Bool_Exp>>;
  bio?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Int_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  profile_picture?: InputMaybe<Media_Bool_Exp>;
  profile_picture_id?: InputMaybe<Int_Comparison_Exp>;
  user_address?: InputMaybe<String_Comparison_Exp>;
  username?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "user_profiles" */
export enum User_Profiles_Constraint {
  /** unique or primary key constraint on columns "id" */
  UserProfilesPkey = 'user_profiles_pkey',
  /** unique or primary key constraint on columns "user_address" */
  UserProfilesUserAddressKey = 'user_profiles_user_address_key',
  /** unique or primary key constraint on columns "username" */
  UserProfilesUsernameKey = 'user_profiles_username_key'
}

/** input type for incrementing numeric columns in table "user_profiles" */
export type User_Profiles_Inc_Input = {
  id?: InputMaybe<Scalars['Int']>;
  profile_picture_id?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "user_profiles" */
export type User_Profiles_Insert_Input = {
  bio?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  profile_picture?: InputMaybe<Media_Obj_Rel_Insert_Input>;
  profile_picture_id?: InputMaybe<Scalars['Int']>;
  user_address?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type User_Profiles_Max_Fields = {
  __typename?: 'user_profiles_max_fields';
  bio?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  profile_picture_id?: Maybe<Scalars['Int']>;
  user_address?: Maybe<Scalars['String']>;
  username?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type User_Profiles_Min_Fields = {
  __typename?: 'user_profiles_min_fields';
  bio?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['Int']>;
  name?: Maybe<Scalars['String']>;
  profile_picture_id?: Maybe<Scalars['Int']>;
  user_address?: Maybe<Scalars['String']>;
  username?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "user_profiles" */
export type User_Profiles_Mutation_Response = {
  __typename?: 'user_profiles_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<User_Profiles>;
};

/** input type for inserting object relation for remote table "user_profiles" */
export type User_Profiles_Obj_Rel_Insert_Input = {
  data: User_Profiles_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<User_Profiles_On_Conflict>;
};

/** on_conflict condition type for table "user_profiles" */
export type User_Profiles_On_Conflict = {
  constraint: User_Profiles_Constraint;
  update_columns?: Array<User_Profiles_Update_Column>;
  where?: InputMaybe<User_Profiles_Bool_Exp>;
};

/** Ordering options when selecting data from "user_profiles". */
export type User_Profiles_Order_By = {
  bio?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  profile_picture?: InputMaybe<Media_Order_By>;
  profile_picture_id?: InputMaybe<Order_By>;
  user_address?: InputMaybe<Order_By>;
  username?: InputMaybe<Order_By>;
};

/** primary key columns input for table: user_profiles */
export type User_Profiles_Pk_Columns_Input = {
  id: Scalars['Int'];
};

/** select columns of table "user_profiles" */
export enum User_Profiles_Select_Column {
  /** column name */
  Bio = 'bio',
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  ProfilePictureId = 'profile_picture_id',
  /** column name */
  UserAddress = 'user_address',
  /** column name */
  Username = 'username'
}

/** input type for updating data in table "user_profiles" */
export type User_Profiles_Set_Input = {
  bio?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  profile_picture_id?: InputMaybe<Scalars['Int']>;
  user_address?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};

/** aggregate stddev on columns */
export type User_Profiles_Stddev_Fields = {
  __typename?: 'user_profiles_stddev_fields';
  id?: Maybe<Scalars['Float']>;
  profile_picture_id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type User_Profiles_Stddev_Pop_Fields = {
  __typename?: 'user_profiles_stddev_pop_fields';
  id?: Maybe<Scalars['Float']>;
  profile_picture_id?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type User_Profiles_Stddev_Samp_Fields = {
  __typename?: 'user_profiles_stddev_samp_fields';
  id?: Maybe<Scalars['Float']>;
  profile_picture_id?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "user_profiles" */
export type User_Profiles_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: User_Profiles_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type User_Profiles_Stream_Cursor_Value_Input = {
  bio?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  profile_picture_id?: InputMaybe<Scalars['Int']>;
  user_address?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};

/** aggregate sum on columns */
export type User_Profiles_Sum_Fields = {
  __typename?: 'user_profiles_sum_fields';
  id?: Maybe<Scalars['Int']>;
  profile_picture_id?: Maybe<Scalars['Int']>;
};

/** update columns of table "user_profiles" */
export enum User_Profiles_Update_Column {
  /** column name */
  Bio = 'bio',
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  ProfilePictureId = 'profile_picture_id',
  /** column name */
  UserAddress = 'user_address',
  /** column name */
  Username = 'username'
}

export type User_Profiles_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<User_Profiles_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<User_Profiles_Set_Input>;
  /** filter the rows which have to be updated */
  where: User_Profiles_Bool_Exp;
};

/** aggregate var_pop on columns */
export type User_Profiles_Var_Pop_Fields = {
  __typename?: 'user_profiles_var_pop_fields';
  id?: Maybe<Scalars['Float']>;
  profile_picture_id?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type User_Profiles_Var_Samp_Fields = {
  __typename?: 'user_profiles_var_samp_fields';
  id?: Maybe<Scalars['Float']>;
  profile_picture_id?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type User_Profiles_Variance_Fields = {
  __typename?: 'user_profiles_variance_fields';
  id?: Maybe<Scalars['Float']>;
  profile_picture_id?: Maybe<Scalars['Float']>;
};

/** columns and relationships of "users" */
export type Users = {
  __typename?: 'users';
  account?: Maybe<Account>;
  /** An array relationship */
  allowlisted_on: Array<Contract_Allowlistings>;
  /** An aggregate relationship */
  allowlisted_on_aggregate: Contract_Allowlistings_Aggregate;
  created_at: Scalars['timestamptz'];
  /** A computed field, executes function "user_display_name" */
  display_name?: Maybe<Scalars['String']>;
  favorited_by_user?: Maybe<Scalars['Boolean']>;
  /** An array relationship */
  favorites: Array<Favorites>;
  /** An aggregate relationship */
  favorites_aggregate: Favorites_Aggregate;
  /** A computed field, executes function "user_feature_flags" */
  feature_flags?: Maybe<Scalars['jsonb']>;
  is_ab_staff?: Maybe<Scalars['Boolean']>;
  /** A computed field, executes function "user_is_curated" */
  is_curated?: Maybe<Scalars['Boolean']>;
  is_curator?: Maybe<Scalars['Boolean']>;
  /** A computed field, executes function "generate_nonce" */
  nonce?: Maybe<Scalars['String']>;
  nonce_offset: Scalars['Int'];
  /** An array relationship */
  notifications: Array<Notifications>;
  /** An aggregate relationship */
  notifications_aggregate: Notifications_Aggregate;
  /** An object relationship */
  profile?: Maybe<User_Profiles>;
  /** An array relationship */
  projects_created: Array<Projects_Metadata>;
  /** An aggregate relationship */
  projects_created_aggregate: Projects_Metadata_Aggregate;
  public_address: Scalars['String'];
  /** An array relationship */
  receipts: Array<Receipt_Metadata>;
  /** An aggregate relationship */
  receipts_aggregate: Receipt_Metadata_Aggregate;
  /** An array relationship */
  tags: Array<Entity_Tags>;
  /** An aggregate relationship */
  tags_aggregate: Entity_Tags_Aggregate;
  /** An array relationship */
  tokens: Array<Tokens_Metadata>;
  /** An aggregate relationship */
  tokens_aggregate: Tokens_Metadata_Aggregate;
  tos_accepted_at?: Maybe<Scalars['timestamptz']>;
  viewed_warning_banner?: Maybe<Scalars['Boolean']>;
  /** An object relationship */
  webflow_artist_info?: Maybe<Webflow_Artist_Info>;
};


/** columns and relationships of "users" */
export type UsersAccountArgs = {
  block?: InputMaybe<Block_Height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


/** columns and relationships of "users" */
export type UsersAllowlisted_OnArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersAllowlisted_On_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Contract_Allowlistings_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Contract_Allowlistings_Order_By>>;
  where?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersFavoritesArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersFavorites_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Favorites_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Favorites_Order_By>>;
  where?: InputMaybe<Favorites_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersFeature_FlagsArgs = {
  path?: InputMaybe<Scalars['String']>;
};


/** columns and relationships of "users" */
export type UsersNotificationsArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersNotifications_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Notifications_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Notifications_Order_By>>;
  where?: InputMaybe<Notifications_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersProjects_CreatedArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersProjects_Created_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Projects_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Projects_Metadata_Order_By>>;
  where?: InputMaybe<Projects_Metadata_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersReceiptsArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersReceipts_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Receipt_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Receipt_Metadata_Order_By>>;
  where?: InputMaybe<Receipt_Metadata_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersTagsArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersTags_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Entity_Tags_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Entity_Tags_Order_By>>;
  where?: InputMaybe<Entity_Tags_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersTokensArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};


/** columns and relationships of "users" */
export type UsersTokens_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Tokens_Metadata_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order_by?: InputMaybe<Array<Tokens_Metadata_Order_By>>;
  where?: InputMaybe<Tokens_Metadata_Bool_Exp>;
};

/** aggregated selection of "users" */
export type Users_Aggregate = {
  __typename?: 'users_aggregate';
  aggregate?: Maybe<Users_Aggregate_Fields>;
  nodes: Array<Users>;
};

/** aggregate fields of "users" */
export type Users_Aggregate_Fields = {
  __typename?: 'users_aggregate_fields';
  avg?: Maybe<Users_Avg_Fields>;
  count: Scalars['Int'];
  max?: Maybe<Users_Max_Fields>;
  min?: Maybe<Users_Min_Fields>;
  stddev?: Maybe<Users_Stddev_Fields>;
  stddev_pop?: Maybe<Users_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Users_Stddev_Samp_Fields>;
  sum?: Maybe<Users_Sum_Fields>;
  var_pop?: Maybe<Users_Var_Pop_Fields>;
  var_samp?: Maybe<Users_Var_Samp_Fields>;
  variance?: Maybe<Users_Variance_Fields>;
};


/** aggregate fields of "users" */
export type Users_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Users_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate avg on columns */
export type Users_Avg_Fields = {
  __typename?: 'users_avg_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** Boolean expression to filter rows from the table "users". All fields are combined with a logical 'AND'. */
export type Users_Bool_Exp = {
  _and?: InputMaybe<Array<Users_Bool_Exp>>;
  _not?: InputMaybe<Users_Bool_Exp>;
  _or?: InputMaybe<Array<Users_Bool_Exp>>;
  allowlisted_on?: InputMaybe<Contract_Allowlistings_Bool_Exp>;
  allowlisted_on_aggregate?: InputMaybe<Contract_Allowlistings_Aggregate_Bool_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  display_name?: InputMaybe<String_Comparison_Exp>;
  favorited_by_user?: InputMaybe<Boolean_Comparison_Exp>;
  favorites?: InputMaybe<Favorites_Bool_Exp>;
  favorites_aggregate?: InputMaybe<Favorites_Aggregate_Bool_Exp>;
  feature_flags?: InputMaybe<Jsonb_Comparison_Exp>;
  is_ab_staff?: InputMaybe<Boolean_Comparison_Exp>;
  is_curated?: InputMaybe<Boolean_Comparison_Exp>;
  is_curator?: InputMaybe<Boolean_Comparison_Exp>;
  nonce?: InputMaybe<String_Comparison_Exp>;
  nonce_offset?: InputMaybe<Int_Comparison_Exp>;
  notifications?: InputMaybe<Notifications_Bool_Exp>;
  notifications_aggregate?: InputMaybe<Notifications_Aggregate_Bool_Exp>;
  profile?: InputMaybe<User_Profiles_Bool_Exp>;
  projects_created?: InputMaybe<Projects_Metadata_Bool_Exp>;
  projects_created_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Bool_Exp>;
  public_address?: InputMaybe<String_Comparison_Exp>;
  receipts?: InputMaybe<Receipt_Metadata_Bool_Exp>;
  receipts_aggregate?: InputMaybe<Receipt_Metadata_Aggregate_Bool_Exp>;
  tags?: InputMaybe<Entity_Tags_Bool_Exp>;
  tags_aggregate?: InputMaybe<Entity_Tags_Aggregate_Bool_Exp>;
  tokens?: InputMaybe<Tokens_Metadata_Bool_Exp>;
  tokens_aggregate?: InputMaybe<Tokens_Metadata_Aggregate_Bool_Exp>;
  tos_accepted_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  viewed_warning_banner?: InputMaybe<Boolean_Comparison_Exp>;
  webflow_artist_info?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
};

/** unique or primary key constraints on table "users" */
export enum Users_Constraint {
  /** unique or primary key constraint on columns "public_address" */
  UsersPkey = 'users_pkey',
  /** unique or primary key constraint on columns "public_address" */
  UsersPublicAddressKey = 'users_public_address_key'
}

/** input type for incrementing numeric columns in table "users" */
export type Users_Inc_Input = {
  nonce_offset?: InputMaybe<Scalars['Int']>;
};

/** input type for inserting data into table "users" */
export type Users_Insert_Input = {
  allowlisted_on?: InputMaybe<Contract_Allowlistings_Arr_Rel_Insert_Input>;
  created_at?: InputMaybe<Scalars['timestamptz']>;
  favorites?: InputMaybe<Favorites_Arr_Rel_Insert_Input>;
  is_ab_staff?: InputMaybe<Scalars['Boolean']>;
  is_curator?: InputMaybe<Scalars['Boolean']>;
  nonce_offset?: InputMaybe<Scalars['Int']>;
  notifications?: InputMaybe<Notifications_Arr_Rel_Insert_Input>;
  profile?: InputMaybe<User_Profiles_Obj_Rel_Insert_Input>;
  projects_created?: InputMaybe<Projects_Metadata_Arr_Rel_Insert_Input>;
  public_address?: InputMaybe<Scalars['String']>;
  receipts?: InputMaybe<Receipt_Metadata_Arr_Rel_Insert_Input>;
  tags?: InputMaybe<Entity_Tags_Arr_Rel_Insert_Input>;
  tokens?: InputMaybe<Tokens_Metadata_Arr_Rel_Insert_Input>;
  tos_accepted_at?: InputMaybe<Scalars['timestamptz']>;
  viewed_warning_banner?: InputMaybe<Scalars['Boolean']>;
  webflow_artist_info?: InputMaybe<Webflow_Artist_Info_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Users_Max_Fields = {
  __typename?: 'users_max_fields';
  created_at?: Maybe<Scalars['timestamptz']>;
  nonce_offset?: Maybe<Scalars['Int']>;
  public_address?: Maybe<Scalars['String']>;
  tos_accepted_at?: Maybe<Scalars['timestamptz']>;
};

/** aggregate min on columns */
export type Users_Min_Fields = {
  __typename?: 'users_min_fields';
  created_at?: Maybe<Scalars['timestamptz']>;
  nonce_offset?: Maybe<Scalars['Int']>;
  public_address?: Maybe<Scalars['String']>;
  tos_accepted_at?: Maybe<Scalars['timestamptz']>;
};

/** response of any mutation on the table "users" */
export type Users_Mutation_Response = {
  __typename?: 'users_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Users>;
};

/** input type for inserting object relation for remote table "users" */
export type Users_Obj_Rel_Insert_Input = {
  data: Users_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Users_On_Conflict>;
};

/** on_conflict condition type for table "users" */
export type Users_On_Conflict = {
  constraint: Users_Constraint;
  update_columns?: Array<Users_Update_Column>;
  where?: InputMaybe<Users_Bool_Exp>;
};

/** Ordering options when selecting data from "users". */
export type Users_Order_By = {
  allowlisted_on_aggregate?: InputMaybe<Contract_Allowlistings_Aggregate_Order_By>;
  created_at?: InputMaybe<Order_By>;
  display_name?: InputMaybe<Order_By>;
  favorited_by_user?: InputMaybe<Order_By>;
  favorites_aggregate?: InputMaybe<Favorites_Aggregate_Order_By>;
  feature_flags?: InputMaybe<Order_By>;
  is_ab_staff?: InputMaybe<Order_By>;
  is_curated?: InputMaybe<Order_By>;
  is_curator?: InputMaybe<Order_By>;
  nonce?: InputMaybe<Order_By>;
  nonce_offset?: InputMaybe<Order_By>;
  notifications_aggregate?: InputMaybe<Notifications_Aggregate_Order_By>;
  profile?: InputMaybe<User_Profiles_Order_By>;
  projects_created_aggregate?: InputMaybe<Projects_Metadata_Aggregate_Order_By>;
  public_address?: InputMaybe<Order_By>;
  receipts_aggregate?: InputMaybe<Receipt_Metadata_Aggregate_Order_By>;
  tags_aggregate?: InputMaybe<Entity_Tags_Aggregate_Order_By>;
  tokens_aggregate?: InputMaybe<Tokens_Metadata_Aggregate_Order_By>;
  tos_accepted_at?: InputMaybe<Order_By>;
  viewed_warning_banner?: InputMaybe<Order_By>;
  webflow_artist_info?: InputMaybe<Webflow_Artist_Info_Order_By>;
};

/** primary key columns input for table: users */
export type Users_Pk_Columns_Input = {
  public_address: Scalars['String'];
};

/** select columns of table "users" */
export enum Users_Select_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  IsAbStaff = 'is_ab_staff',
  /** column name */
  IsCurator = 'is_curator',
  /** column name */
  NonceOffset = 'nonce_offset',
  /** column name */
  PublicAddress = 'public_address',
  /** column name */
  TosAcceptedAt = 'tos_accepted_at',
  /** column name */
  ViewedWarningBanner = 'viewed_warning_banner'
}

/** input type for updating data in table "users" */
export type Users_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']>;
  is_ab_staff?: InputMaybe<Scalars['Boolean']>;
  is_curator?: InputMaybe<Scalars['Boolean']>;
  nonce_offset?: InputMaybe<Scalars['Int']>;
  public_address?: InputMaybe<Scalars['String']>;
  tos_accepted_at?: InputMaybe<Scalars['timestamptz']>;
  viewed_warning_banner?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate stddev on columns */
export type Users_Stddev_Fields = {
  __typename?: 'users_stddev_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_pop on columns */
export type Users_Stddev_Pop_Fields = {
  __typename?: 'users_stddev_pop_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate stddev_samp on columns */
export type Users_Stddev_Samp_Fields = {
  __typename?: 'users_stddev_samp_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** Streaming cursor of the table "users" */
export type Users_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Users_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Users_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']>;
  is_ab_staff?: InputMaybe<Scalars['Boolean']>;
  is_curator?: InputMaybe<Scalars['Boolean']>;
  nonce_offset?: InputMaybe<Scalars['Int']>;
  public_address?: InputMaybe<Scalars['String']>;
  tos_accepted_at?: InputMaybe<Scalars['timestamptz']>;
  viewed_warning_banner?: InputMaybe<Scalars['Boolean']>;
};

/** aggregate sum on columns */
export type Users_Sum_Fields = {
  __typename?: 'users_sum_fields';
  nonce_offset?: Maybe<Scalars['Int']>;
};

/** update columns of table "users" */
export enum Users_Update_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  IsAbStaff = 'is_ab_staff',
  /** column name */
  IsCurator = 'is_curator',
  /** column name */
  NonceOffset = 'nonce_offset',
  /** column name */
  PublicAddress = 'public_address',
  /** column name */
  TosAcceptedAt = 'tos_accepted_at',
  /** column name */
  ViewedWarningBanner = 'viewed_warning_banner'
}

export type Users_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Users_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Users_Set_Input>;
  /** filter the rows which have to be updated */
  where: Users_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Users_Var_Pop_Fields = {
  __typename?: 'users_var_pop_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate var_samp on columns */
export type Users_Var_Samp_Fields = {
  __typename?: 'users_var_samp_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** aggregate variance on columns */
export type Users_Variance_Fields = {
  __typename?: 'users_variance_fields';
  nonce_offset?: Maybe<Scalars['Float']>;
};

/** vertical enums */
export type Verticals = {
  __typename?: 'verticals';
  name: Scalars['String'];
  /** An object relationship */
  project_vertical?: Maybe<Project_Verticals>;
};

/** aggregated selection of "verticals" */
export type Verticals_Aggregate = {
  __typename?: 'verticals_aggregate';
  aggregate?: Maybe<Verticals_Aggregate_Fields>;
  nodes: Array<Verticals>;
};

/** aggregate fields of "verticals" */
export type Verticals_Aggregate_Fields = {
  __typename?: 'verticals_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Verticals_Max_Fields>;
  min?: Maybe<Verticals_Min_Fields>;
};


/** aggregate fields of "verticals" */
export type Verticals_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Verticals_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** Boolean expression to filter rows from the table "verticals". All fields are combined with a logical 'AND'. */
export type Verticals_Bool_Exp = {
  _and?: InputMaybe<Array<Verticals_Bool_Exp>>;
  _not?: InputMaybe<Verticals_Bool_Exp>;
  _or?: InputMaybe<Array<Verticals_Bool_Exp>>;
  name?: InputMaybe<String_Comparison_Exp>;
  project_vertical?: InputMaybe<Project_Verticals_Bool_Exp>;
};

/** unique or primary key constraints on table "verticals" */
export enum Verticals_Constraint {
  /** unique or primary key constraint on columns "name" */
  VerticalsPkey = 'verticals_pkey'
}

export enum Verticals_Enum {
  Artblocksxbrightmoments = 'artblocksxbrightmoments',
  Artblocksxpace = 'artblocksxpace',
  Artblocksxtest = 'artblocksxtest',
  Curated = 'curated',
  Explorations = 'explorations',
  Factory = 'factory',
  Flex = 'flex',
  Fullyonchain = 'fullyonchain',
  Playground = 'playground',
  Presents = 'presents',
  Unassigned = 'unassigned'
}

/** Boolean expression to compare columns of type "verticals_enum". All fields are combined with logical 'AND'. */
export type Verticals_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Verticals_Enum>;
  _in?: InputMaybe<Array<Verticals_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']>;
  _neq?: InputMaybe<Verticals_Enum>;
  _nin?: InputMaybe<Array<Verticals_Enum>>;
};

/** input type for inserting data into table "verticals" */
export type Verticals_Insert_Input = {
  name?: InputMaybe<Scalars['String']>;
  project_vertical?: InputMaybe<Project_Verticals_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Verticals_Max_Fields = {
  __typename?: 'verticals_max_fields';
  name?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Verticals_Min_Fields = {
  __typename?: 'verticals_min_fields';
  name?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "verticals" */
export type Verticals_Mutation_Response = {
  __typename?: 'verticals_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Verticals>;
};

/** input type for inserting object relation for remote table "verticals" */
export type Verticals_Obj_Rel_Insert_Input = {
  data: Verticals_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Verticals_On_Conflict>;
};

/** on_conflict condition type for table "verticals" */
export type Verticals_On_Conflict = {
  constraint: Verticals_Constraint;
  update_columns?: Array<Verticals_Update_Column>;
  where?: InputMaybe<Verticals_Bool_Exp>;
};

/** Ordering options when selecting data from "verticals". */
export type Verticals_Order_By = {
  name?: InputMaybe<Order_By>;
  project_vertical?: InputMaybe<Project_Verticals_Order_By>;
};

/** primary key columns input for table: verticals */
export type Verticals_Pk_Columns_Input = {
  name: Scalars['String'];
};

/** select columns of table "verticals" */
export enum Verticals_Select_Column {
  /** column name */
  Name = 'name'
}

/** input type for updating data in table "verticals" */
export type Verticals_Set_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "verticals" */
export type Verticals_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Verticals_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Verticals_Stream_Cursor_Value_Input = {
  name?: InputMaybe<Scalars['String']>;
};

/** update columns of table "verticals" */
export enum Verticals_Update_Column {
  /** column name */
  Name = 'name'
}

export type Verticals_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Verticals_Set_Input>;
  /** filter the rows which have to be updated */
  where: Verticals_Bool_Exp;
};

/** columns and relationships of "webflow_artist_info" */
export type Webflow_Artist_Info = {
  __typename?: 'webflow_artist_info';
  published: Scalars['Boolean'];
  raw_data: Scalars['jsonb'];
  slug: Scalars['String'];
  /** An object relationship */
  user: Users;
  user_public_address: Scalars['String'];
  webflow_collection_id: Scalars['String'];
  webflow_item_id: Scalars['String'];
};


/** columns and relationships of "webflow_artist_info" */
export type Webflow_Artist_InfoRaw_DataArgs = {
  path?: InputMaybe<Scalars['String']>;
};

/** aggregated selection of "webflow_artist_info" */
export type Webflow_Artist_Info_Aggregate = {
  __typename?: 'webflow_artist_info_aggregate';
  aggregate?: Maybe<Webflow_Artist_Info_Aggregate_Fields>;
  nodes: Array<Webflow_Artist_Info>;
};

/** aggregate fields of "webflow_artist_info" */
export type Webflow_Artist_Info_Aggregate_Fields = {
  __typename?: 'webflow_artist_info_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Webflow_Artist_Info_Max_Fields>;
  min?: Maybe<Webflow_Artist_Info_Min_Fields>;
};


/** aggregate fields of "webflow_artist_info" */
export type Webflow_Artist_Info_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Webflow_Artist_Info_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Webflow_Artist_Info_Append_Input = {
  raw_data?: InputMaybe<Scalars['jsonb']>;
};

/** Boolean expression to filter rows from the table "webflow_artist_info". All fields are combined with a logical 'AND'. */
export type Webflow_Artist_Info_Bool_Exp = {
  _and?: InputMaybe<Array<Webflow_Artist_Info_Bool_Exp>>;
  _not?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
  _or?: InputMaybe<Array<Webflow_Artist_Info_Bool_Exp>>;
  published?: InputMaybe<Boolean_Comparison_Exp>;
  raw_data?: InputMaybe<Jsonb_Comparison_Exp>;
  slug?: InputMaybe<String_Comparison_Exp>;
  user?: InputMaybe<Users_Bool_Exp>;
  user_public_address?: InputMaybe<String_Comparison_Exp>;
  webflow_collection_id?: InputMaybe<String_Comparison_Exp>;
  webflow_item_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "webflow_artist_info" */
export enum Webflow_Artist_Info_Constraint {
  /** unique or primary key constraint on columns "webflow_item_id" */
  WebflowArtistInfoPkey = 'webflow_artist_info_pkey',
  /** unique or primary key constraint on columns "user_public_address" */
  WebflowArtistInfoUserPublicAddressKey = 'webflow_artist_info_user_public_address_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Webflow_Artist_Info_Delete_At_Path_Input = {
  raw_data?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Webflow_Artist_Info_Delete_Elem_Input = {
  raw_data?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Webflow_Artist_Info_Delete_Key_Input = {
  raw_data?: InputMaybe<Scalars['String']>;
};

/** input type for inserting data into table "webflow_artist_info" */
export type Webflow_Artist_Info_Insert_Input = {
  published?: InputMaybe<Scalars['Boolean']>;
  raw_data?: InputMaybe<Scalars['jsonb']>;
  slug?: InputMaybe<Scalars['String']>;
  user?: InputMaybe<Users_Obj_Rel_Insert_Input>;
  user_public_address?: InputMaybe<Scalars['String']>;
  webflow_collection_id?: InputMaybe<Scalars['String']>;
  webflow_item_id?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Webflow_Artist_Info_Max_Fields = {
  __typename?: 'webflow_artist_info_max_fields';
  slug?: Maybe<Scalars['String']>;
  user_public_address?: Maybe<Scalars['String']>;
  webflow_collection_id?: Maybe<Scalars['String']>;
  webflow_item_id?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Webflow_Artist_Info_Min_Fields = {
  __typename?: 'webflow_artist_info_min_fields';
  slug?: Maybe<Scalars['String']>;
  user_public_address?: Maybe<Scalars['String']>;
  webflow_collection_id?: Maybe<Scalars['String']>;
  webflow_item_id?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "webflow_artist_info" */
export type Webflow_Artist_Info_Mutation_Response = {
  __typename?: 'webflow_artist_info_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Webflow_Artist_Info>;
};

/** input type for inserting object relation for remote table "webflow_artist_info" */
export type Webflow_Artist_Info_Obj_Rel_Insert_Input = {
  data: Webflow_Artist_Info_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Webflow_Artist_Info_On_Conflict>;
};

/** on_conflict condition type for table "webflow_artist_info" */
export type Webflow_Artist_Info_On_Conflict = {
  constraint: Webflow_Artist_Info_Constraint;
  update_columns?: Array<Webflow_Artist_Info_Update_Column>;
  where?: InputMaybe<Webflow_Artist_Info_Bool_Exp>;
};

/** Ordering options when selecting data from "webflow_artist_info". */
export type Webflow_Artist_Info_Order_By = {
  published?: InputMaybe<Order_By>;
  raw_data?: InputMaybe<Order_By>;
  slug?: InputMaybe<Order_By>;
  user?: InputMaybe<Users_Order_By>;
  user_public_address?: InputMaybe<Order_By>;
  webflow_collection_id?: InputMaybe<Order_By>;
  webflow_item_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: webflow_artist_info */
export type Webflow_Artist_Info_Pk_Columns_Input = {
  webflow_item_id: Scalars['String'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Webflow_Artist_Info_Prepend_Input = {
  raw_data?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "webflow_artist_info" */
export enum Webflow_Artist_Info_Select_Column {
  /** column name */
  Published = 'published',
  /** column name */
  RawData = 'raw_data',
  /** column name */
  Slug = 'slug',
  /** column name */
  UserPublicAddress = 'user_public_address',
  /** column name */
  WebflowCollectionId = 'webflow_collection_id',
  /** column name */
  WebflowItemId = 'webflow_item_id'
}

/** input type for updating data in table "webflow_artist_info" */
export type Webflow_Artist_Info_Set_Input = {
  published?: InputMaybe<Scalars['Boolean']>;
  raw_data?: InputMaybe<Scalars['jsonb']>;
  slug?: InputMaybe<Scalars['String']>;
  user_public_address?: InputMaybe<Scalars['String']>;
  webflow_collection_id?: InputMaybe<Scalars['String']>;
  webflow_item_id?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "webflow_artist_info" */
export type Webflow_Artist_Info_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Webflow_Artist_Info_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Webflow_Artist_Info_Stream_Cursor_Value_Input = {
  published?: InputMaybe<Scalars['Boolean']>;
  raw_data?: InputMaybe<Scalars['jsonb']>;
  slug?: InputMaybe<Scalars['String']>;
  user_public_address?: InputMaybe<Scalars['String']>;
  webflow_collection_id?: InputMaybe<Scalars['String']>;
  webflow_item_id?: InputMaybe<Scalars['String']>;
};

/** update columns of table "webflow_artist_info" */
export enum Webflow_Artist_Info_Update_Column {
  /** column name */
  Published = 'published',
  /** column name */
  RawData = 'raw_data',
  /** column name */
  Slug = 'slug',
  /** column name */
  UserPublicAddress = 'user_public_address',
  /** column name */
  WebflowCollectionId = 'webflow_collection_id',
  /** column name */
  WebflowItemId = 'webflow_item_id'
}

export type Webflow_Artist_Info_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Webflow_Artist_Info_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Webflow_Artist_Info_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Webflow_Artist_Info_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Webflow_Artist_Info_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Webflow_Artist_Info_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Webflow_Artist_Info_Set_Input>;
  /** filter the rows which have to be updated */
  where: Webflow_Artist_Info_Bool_Exp;
};

/** columns and relationships of "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles = {
  __typename?: 'webflow_spectrum_articles';
  category: Scalars['String'];
  description: Scalars['String'];
  extra_info?: Maybe<Scalars['String']>;
  image: Scalars['String'];
  published_at?: Maybe<Scalars['timestamptz']>;
  raw_data: Scalars['jsonb'];
  section?: Maybe<Scalars['String']>;
  slug: Scalars['String'];
  title: Scalars['String'];
  webflow_collection_id: Scalars['String'];
  webflow_item_id: Scalars['String'];
};


/** columns and relationships of "webflow_spectrum_articles" */
export type Webflow_Spectrum_ArticlesRaw_DataArgs = {
  path?: InputMaybe<Scalars['String']>;
};

/** aggregated selection of "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_Aggregate = {
  __typename?: 'webflow_spectrum_articles_aggregate';
  aggregate?: Maybe<Webflow_Spectrum_Articles_Aggregate_Fields>;
  nodes: Array<Webflow_Spectrum_Articles>;
};

/** aggregate fields of "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_Aggregate_Fields = {
  __typename?: 'webflow_spectrum_articles_aggregate_fields';
  count: Scalars['Int'];
  max?: Maybe<Webflow_Spectrum_Articles_Max_Fields>;
  min?: Maybe<Webflow_Spectrum_Articles_Min_Fields>;
};


/** aggregate fields of "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Webflow_Spectrum_Articles_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Webflow_Spectrum_Articles_Append_Input = {
  raw_data?: InputMaybe<Scalars['jsonb']>;
};

/** Boolean expression to filter rows from the table "webflow_spectrum_articles". All fields are combined with a logical 'AND'. */
export type Webflow_Spectrum_Articles_Bool_Exp = {
  _and?: InputMaybe<Array<Webflow_Spectrum_Articles_Bool_Exp>>;
  _not?: InputMaybe<Webflow_Spectrum_Articles_Bool_Exp>;
  _or?: InputMaybe<Array<Webflow_Spectrum_Articles_Bool_Exp>>;
  category?: InputMaybe<String_Comparison_Exp>;
  description?: InputMaybe<String_Comparison_Exp>;
  extra_info?: InputMaybe<String_Comparison_Exp>;
  image?: InputMaybe<String_Comparison_Exp>;
  published_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  raw_data?: InputMaybe<Jsonb_Comparison_Exp>;
  section?: InputMaybe<String_Comparison_Exp>;
  slug?: InputMaybe<String_Comparison_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  webflow_collection_id?: InputMaybe<String_Comparison_Exp>;
  webflow_item_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "webflow_spectrum_articles" */
export enum Webflow_Spectrum_Articles_Constraint {
  /** unique or primary key constraint on columns "webflow_item_id" */
  WebflowSpectrumArticlesPkey = 'webflow_spectrum_articles_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Webflow_Spectrum_Articles_Delete_At_Path_Input = {
  raw_data?: InputMaybe<Array<Scalars['String']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Webflow_Spectrum_Articles_Delete_Elem_Input = {
  raw_data?: InputMaybe<Scalars['Int']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Webflow_Spectrum_Articles_Delete_Key_Input = {
  raw_data?: InputMaybe<Scalars['String']>;
};

/** input type for inserting data into table "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_Insert_Input = {
  category?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  extra_info?: InputMaybe<Scalars['String']>;
  image?: InputMaybe<Scalars['String']>;
  published_at?: InputMaybe<Scalars['timestamptz']>;
  raw_data?: InputMaybe<Scalars['jsonb']>;
  section?: InputMaybe<Scalars['String']>;
  slug?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
  webflow_collection_id?: InputMaybe<Scalars['String']>;
  webflow_item_id?: InputMaybe<Scalars['String']>;
};

/** aggregate max on columns */
export type Webflow_Spectrum_Articles_Max_Fields = {
  __typename?: 'webflow_spectrum_articles_max_fields';
  category?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  extra_info?: Maybe<Scalars['String']>;
  image?: Maybe<Scalars['String']>;
  published_at?: Maybe<Scalars['timestamptz']>;
  section?: Maybe<Scalars['String']>;
  slug?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  webflow_collection_id?: Maybe<Scalars['String']>;
  webflow_item_id?: Maybe<Scalars['String']>;
};

/** aggregate min on columns */
export type Webflow_Spectrum_Articles_Min_Fields = {
  __typename?: 'webflow_spectrum_articles_min_fields';
  category?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  extra_info?: Maybe<Scalars['String']>;
  image?: Maybe<Scalars['String']>;
  published_at?: Maybe<Scalars['timestamptz']>;
  section?: Maybe<Scalars['String']>;
  slug?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  webflow_collection_id?: Maybe<Scalars['String']>;
  webflow_item_id?: Maybe<Scalars['String']>;
};

/** response of any mutation on the table "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_Mutation_Response = {
  __typename?: 'webflow_spectrum_articles_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int'];
  /** data from the rows affected by the mutation */
  returning: Array<Webflow_Spectrum_Articles>;
};

/** on_conflict condition type for table "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_On_Conflict = {
  constraint: Webflow_Spectrum_Articles_Constraint;
  update_columns?: Array<Webflow_Spectrum_Articles_Update_Column>;
  where?: InputMaybe<Webflow_Spectrum_Articles_Bool_Exp>;
};

/** Ordering options when selecting data from "webflow_spectrum_articles". */
export type Webflow_Spectrum_Articles_Order_By = {
  category?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  extra_info?: InputMaybe<Order_By>;
  image?: InputMaybe<Order_By>;
  published_at?: InputMaybe<Order_By>;
  raw_data?: InputMaybe<Order_By>;
  section?: InputMaybe<Order_By>;
  slug?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  webflow_collection_id?: InputMaybe<Order_By>;
  webflow_item_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: webflow_spectrum_articles */
export type Webflow_Spectrum_Articles_Pk_Columns_Input = {
  webflow_item_id: Scalars['String'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Webflow_Spectrum_Articles_Prepend_Input = {
  raw_data?: InputMaybe<Scalars['jsonb']>;
};

/** select columns of table "webflow_spectrum_articles" */
export enum Webflow_Spectrum_Articles_Select_Column {
  /** column name */
  Category = 'category',
  /** column name */
  Description = 'description',
  /** column name */
  ExtraInfo = 'extra_info',
  /** column name */
  Image = 'image',
  /** column name */
  PublishedAt = 'published_at',
  /** column name */
  RawData = 'raw_data',
  /** column name */
  Section = 'section',
  /** column name */
  Slug = 'slug',
  /** column name */
  Title = 'title',
  /** column name */
  WebflowCollectionId = 'webflow_collection_id',
  /** column name */
  WebflowItemId = 'webflow_item_id'
}

/** input type for updating data in table "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_Set_Input = {
  category?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  extra_info?: InputMaybe<Scalars['String']>;
  image?: InputMaybe<Scalars['String']>;
  published_at?: InputMaybe<Scalars['timestamptz']>;
  raw_data?: InputMaybe<Scalars['jsonb']>;
  section?: InputMaybe<Scalars['String']>;
  slug?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
  webflow_collection_id?: InputMaybe<Scalars['String']>;
  webflow_item_id?: InputMaybe<Scalars['String']>;
};

/** Streaming cursor of the table "webflow_spectrum_articles" */
export type Webflow_Spectrum_Articles_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Webflow_Spectrum_Articles_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Webflow_Spectrum_Articles_Stream_Cursor_Value_Input = {
  category?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  extra_info?: InputMaybe<Scalars['String']>;
  image?: InputMaybe<Scalars['String']>;
  published_at?: InputMaybe<Scalars['timestamptz']>;
  raw_data?: InputMaybe<Scalars['jsonb']>;
  section?: InputMaybe<Scalars['String']>;
  slug?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
  webflow_collection_id?: InputMaybe<Scalars['String']>;
  webflow_item_id?: InputMaybe<Scalars['String']>;
};

/** update columns of table "webflow_spectrum_articles" */
export enum Webflow_Spectrum_Articles_Update_Column {
  /** column name */
  Category = 'category',
  /** column name */
  Description = 'description',
  /** column name */
  ExtraInfo = 'extra_info',
  /** column name */
  Image = 'image',
  /** column name */
  PublishedAt = 'published_at',
  /** column name */
  RawData = 'raw_data',
  /** column name */
  Section = 'section',
  /** column name */
  Slug = 'slug',
  /** column name */
  Title = 'title',
  /** column name */
  WebflowCollectionId = 'webflow_collection_id',
  /** column name */
  WebflowItemId = 'webflow_item_id'
}

export type Webflow_Spectrum_Articles_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Webflow_Spectrum_Articles_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Webflow_Spectrum_Articles_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Webflow_Spectrum_Articles_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Webflow_Spectrum_Articles_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Webflow_Spectrum_Articles_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Webflow_Spectrum_Articles_Set_Input>;
  /** filter the rows which have to be updated */
  where: Webflow_Spectrum_Articles_Bool_Exp;
};

export type InsertContractsMetaResponseFragmentFragment = { __typename?: 'contracts_metadata', address: string, bucket_name?: string | null | undefined, contract_type: Contract_Type_Names_Enum };

export type ContractMetadataUpdateInfoFragment = { __typename?: 'contracts_metadata', address: string, bucket_name?: string | null | undefined, contract_type: Contract_Type_Names_Enum };

export type InsertContractsMetadataMutationVariables = Exact<{
  contractsMetadata: Array<Contracts_Metadata_Insert_Input> | Contracts_Metadata_Insert_Input;
}>;


export type InsertContractsMetadataMutation = { __typename?: 'mutation_root', insert_contracts_metadata?: { __typename?: 'contracts_metadata_mutation_response', returning: Array<{ __typename?: 'contracts_metadata', address: string, bucket_name?: string | null | undefined, contract_type: Contract_Type_Names_Enum }> } | null | undefined };

export const InsertContractsMetaResponseFragmentFragmentDoc = gql`
    fragment insertContractsMetaResponseFragment on contracts_metadata {
  address
  bucket_name
  contract_type
}
    `;
export const ContractMetadataUpdateInfoFragmentDoc = gql`
    fragment ContractMetadataUpdateInfo on contracts_metadata {
  address
  bucket_name
  contract_type
}
    `;
export const InsertContractsMetadataDocument = gql`
    mutation InsertContractsMetadata($contractsMetadata: [contracts_metadata_insert_input!]!) {
  insert_contracts_metadata(
    objects: $contractsMetadata
    on_conflict: {constraint: contracts_metadata_pkey, update_columns: [address, bucket_name, contract_type]}
  ) {
    returning {
      ...insertContractsMetaResponseFragment
    }
  }
}
    ${InsertContractsMetaResponseFragmentFragmentDoc}`;