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
