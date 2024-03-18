import { ethers } from "hardhat";
import fs from "fs";
import { load } from 'ts-dotenv';

const env = load({
    GUILD_MASTER_PUBLIC_KEY: String
});
  

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

async function main() {
    const network = await ethers.provider.getNetwork();

    console.log("Network: ", network.name);
    console.log("Deployer address: ", env.GUILD_MASTER_PUBLIC_KEY);

    const taxManager = await ethers.getContractAt(
        "TaxManager",
        "0x7C25965b2bFf7E48a2CA01E086277D518901956e"
    );

    // 1s sleep to not get timeout
    const timeout = 1000;

   
    await taxManager.setBulkReferralRate(
            1,
            referralRewardsDistribution.tier1.layer1,
            referralRewardsDistribution.tier1.layer2,
            referralRewardsDistribution.tier1.layer3,
            referralRewardsDistribution.tier1.layer4
        );

    console.log("Tier 1 (novice) Ref rates set!")

    await taxManager.setBulkReferralRate(
            2,
            referralRewardsDistribution.tier2.layer1,
            referralRewardsDistribution.tier2.layer2,
            referralRewardsDistribution.tier2.layer3,
            referralRewardsDistribution.tier2.layer4
        );

    console.log("Tier 2 (adept) Ref rates set!")

    await taxManager.setBulkReferralRate(
            3,
            referralRewardsDistribution.tier3.layer1,
            referralRewardsDistribution.tier3.layer2,
            referralRewardsDistribution.tier3.layer3,
            referralRewardsDistribution.tier3.layer4
        );

    console.log("Tier 3 (expert) Ref rates set!")

    const tx = await taxManager.setBulkReferralRate(
            4,
            referralRewardsDistribution.tier4.layer1,
            referralRewardsDistribution.tier4.layer2,
            referralRewardsDistribution.tier4.layer3,
            referralRewardsDistribution.tier4.layer4
        );
    
    console.log(tx)
    console.log("Tier 4 (master) Ref rates set!")


    await taxManager.setBulkReferralRate(
            5,
            referralRewardsDistribution.tier5.layer1,
            referralRewardsDistribution.tier5.layer2,
            referralRewardsDistribution.tier5.layer3,
            referralRewardsDistribution.tier5.layer4
    );

    console.log("Tier 5 (god) Ref rates set!")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});