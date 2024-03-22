import { ethers } from "hardhat";
import fs from "fs";
import { sleep } from "../../test/helpers/utils";
import { nonDeployerConfigAccounts } from "./config/nonDeployerAccounts";
import { NonDeployerConfigAccounts } from "../../test/helpers/types";
import {
    disputeDepositRate,
    referralRewardsDistribution,
    seekerFees,
    solverFees,
} from "./config/contractParameters";

async function main() {
    const [devAccount, defaultDeployer] = await ethers.getSigners();

    const network = await ethers.provider.getNetwork();

    console.log("Network: ", network.name);
    console.log("Deployer address: ", await defaultDeployer.getAddress());

    const addressesData = fs.readFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        "utf8"
    );

    const parsedAddressesData = JSON.parse(addressesData);
    const accounts = nonDeployerConfigAccounts as NonDeployerConfigAccounts;

    const taxManager = await ethers.getContractAt(
        "TaxManager",
        parsedAddressesData.taxManager
    );

    // 1s sleep to not get timeout
    const timeout = 1000;

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setPlatformTreasuryPool(accounts.taxManagerPlatformTreasury);

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setPlatformRevenuePool(accounts.taxManagerPlatformRevenuePool);

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setReferralTaxTreasury(accounts.taxManagerReferralTaxTreasury);

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setDisputeFeesTreasury(accounts.taxManagerDisputeFeesTreasury);

    sleep(timeout);

    // Set fees
    // Values are based on the current values on figma

    await taxManager
        .connect(defaultDeployer)
        .setSeekerFees(seekerFees.referralRewards, seekerFees.platformRevenue);

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setSolverFees(
            solverFees.referralRewards,
            solverFees.platformRevenue,
            solverFees.platformTreasury
        );

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setDisputeDepositRate(disputeDepositRate);

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setBulkReferralRate(
            1,
            referralRewardsDistribution.tier1.layer1,
            referralRewardsDistribution.tier1.layer2,
            referralRewardsDistribution.tier1.layer3,
            referralRewardsDistribution.tier1.layer4
        );

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setBulkReferralRate(
            2,
            referralRewardsDistribution.tier2.layer1,
            referralRewardsDistribution.tier2.layer2,
            referralRewardsDistribution.tier2.layer3,
            referralRewardsDistribution.tier2.layer4
        );

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setBulkReferralRate(
            3,
            referralRewardsDistribution.tier3.layer1,
            referralRewardsDistribution.tier3.layer2,
            referralRewardsDistribution.tier3.layer3,
            referralRewardsDistribution.tier3.layer4
        );

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setBulkReferralRate(
            4,
            referralRewardsDistribution.tier4.layer1,
            referralRewardsDistribution.tier4.layer2,
            referralRewardsDistribution.tier4.layer3,
            referralRewardsDistribution.tier4.layer4
        );

    sleep(timeout);

    await taxManager
        .connect(defaultDeployer)
        .setBulkReferralRate(
            5,
            referralRewardsDistribution.tier5.layer1,
            referralRewardsDistribution.tier5.layer2,
            referralRewardsDistribution.tier5.layer3,
            referralRewardsDistribution.tier5.layer4
        );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
