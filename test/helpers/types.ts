import {
    ERC6551Registry,
    MockExecute,
    MockExecuteEth,
    Nexus,
    ReferralHandlerERC6551Account,
    TaxManager,
    TierManager,
} from "../../typechain-types";

export type ERC6551Setup = {
    registry: ERC6551Registry;
    account: ReferralHandlerERC6551Account;
};

export type Nexus6551 = {
    nexus: Nexus;
    erc6551: ERC6551Setup;
};

export type MockExecutes = {
    mockExecute: MockExecute;
    mockExecuteEth: MockExecuteEth;
};

export type Managers = {
    tierManager: TierManager;
    taxManager: TaxManager;
};

export type FilteredLogEvent = {
    args: [];
};

export type AccountDetails = {
    implementation: string;
    salt: string;
    chainId: number;
    tokenContract: string;
    tokenId: number;
};

export type CreatedAccount = {
    nftId: number;
    handlerAddress: string;
};

export type CreatedAccountWithOwner = CreatedAccount & {
    owner: string;
};

export type SeekerTax = {
    referralRewards: bigint;
    platformRevenue: bigint;
};

export type SolverTax = {
    referralRewards: bigint;
    platformRevenue: bigint;
    platformTreasury: bigint;
};

export type ReferralRewardsDistribution = {
    tier1: {
        layer1: number;
        layer2: number;
        layer3: number;
        layer4: number;
    };
    tier2: {
        layer1: number;
        layer2: number;
        layer3: number;
        layer4: number;
    };
    tier3: {
        layer1: number;
        layer2: number;
        layer3: number;
        layer4: number;
    };
    tier4: {
        layer1: number;
        layer2: number;
        layer3: number;
        layer4: number;
    };
    tier5: {
        layer1: number;
        layer2: number;
        layer3: number;
        layer4: number;
    };
};

export type LayerKeys = "layer1" | "layer2" | "layer3" | "layer4";
