import {
    ReferralRewardsDistribution,
    SeekerTax,
    SolverTax,
    TierConditions,
} from "../../../test/helpers/types";

export const tierConditions: TierConditions = {
    tier1: {
        xpPoints: 0,
        novicesReferred: 0,
        adeptsReferred: 0,
        mastersReferred: 0,
        godsReferred: 0,
    },
    tier2: {
        xpPoints: 0,
        novicesReferred: 0,
        adeptsReferred: 0,
        mastersReferred: 0,
        godsReferred: 0,
    },
    tier3: {
        xpPoints: 0,
        novicesReferred: 0,
        adeptsReferred: 0,
        mastersReferred: 0,
        godsReferred: 0,
    },
    tier4: {
        xpPoints: 0,
        novicesReferred: 0,
        adeptsReferred: 0,
        mastersReferred: 0,
        godsReferred: 0,
    },
    tier5: {
        xpPoints: 0,
        novicesReferred: 0,
        adeptsReferred: 0,
        mastersReferred: 0,
        godsReferred: 0,
    },
};

export const referralRewardsDistribution: ReferralRewardsDistribution = {
    tier1: {
        layer1: 1200,
        layer2: 800,
        layer3: 400,
        layer4: 200,
    },
    tier2: {
        layer1: 1600,
        layer2: 1050,
        layer3: 525,
        layer4: 260,
    },
    tier3: {
        layer1: 2000,
        layer2: 1300,
        layer3: 650,
        layer4: 375,
    },
    tier4: {
        layer1: 2400,
        layer2: 1600,
        layer3: 800,
        layer4: 400,
    },
    tier5: {
        layer1: 3000,
        layer2: 2000,
        layer3: 1000,
        layer4: 600,
    },
};

export const disputeDepositRate: number = 0;

export const seekerFees: SeekerTax = {
    referralRewards: 100n,
    platformRevenue: 200n,
};

export const solverFees: SolverTax = {
    referralRewards: 200n,
    platformRevenue: 700n,
    platformTreasury: 100n,
};

export const reviewPeriod: number = 0;
