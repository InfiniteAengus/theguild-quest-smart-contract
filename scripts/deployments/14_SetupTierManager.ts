import { ethers } from "hardhat";
import fs from "fs";
import { sleep } from "../../test/helpers/utils";
import { nonDeployerConfigAccounts } from "./config/nonDeployerAccounts";
import { NonDeployerConfigAccounts } from "../../test/helpers/types";
import {
    disputeDepositRate,
    seekerFees,
    solverFees,
    tierConditions,
} from "./config/contractParameters";

async function main() {
    const [
        defaultDeployer,
        nexusMaster,
        profileNFTCounselor,
        tavernOwner,
        taxManagerCustodian,
        tierManagerMagistrate,
    ] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("Network: ", network.name);
    console.log("Deployer address: ", await tierManagerMagistrate.getAddress());

    const addressesData = fs.readFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        "utf8"
    );

    const parsedAddressesData = JSON.parse(addressesData);
    const accounts = nonDeployerConfigAccounts as NonDeployerConfigAccounts;

    const tierManager = await ethers.getContractAt(
        "TierManager",
        parsedAddressesData.tierManager
    );

    // 1s sleep to not get timeout
    const timeout = 1000;

    sleep(timeout);

    await tierManager
        .connect(tierManagerMagistrate)
        .setConditions(
            1,
            tierConditions.tier1.xpPoints,
            tierConditions.tier1.novicesReferred,
            tierConditions.tier1.adeptsReferred,
            tierConditions.tier1.expertsReferred,
            tierConditions.tier1.mastersReferred,
            tierConditions.tier1.godsReferred
        );

    sleep(timeout);

    await tierManager
        .connect(tierManagerMagistrate)
        .setConditions(
            2,
            tierConditions.tier2.xpPoints,
            tierConditions.tier2.novicesReferred,
            tierConditions.tier2.adeptsReferred,
            tierConditions.tier2.expertsReferred,
            tierConditions.tier2.mastersReferred,
            tierConditions.tier2.godsReferred
        );

    sleep(timeout);

    await tierManager
        .connect(tierManagerMagistrate)
        .setConditions(
            3,
            tierConditions.tier3.xpPoints,
            tierConditions.tier3.novicesReferred,
            tierConditions.tier3.adeptsReferred,
            tierConditions.tier3.expertsReferred,
            tierConditions.tier3.mastersReferred,
            tierConditions.tier3.godsReferred
        );

    sleep(timeout);

    await tierManager
        .connect(tierManagerMagistrate)
        .setConditions(
            4,
            tierConditions.tier4.xpPoints,
            tierConditions.tier4.novicesReferred,
            tierConditions.tier4.adeptsReferred,
            tierConditions.tier4.expertsReferred,
            tierConditions.tier4.mastersReferred,
            tierConditions.tier4.godsReferred
        );

    sleep(timeout);

    await tierManager
        .connect(tierManagerMagistrate)
        .setConditions(
            5,
            tierConditions.tier5.xpPoints,
            tierConditions.tier5.novicesReferred,
            tierConditions.tier5.adeptsReferred,
            tierConditions.tier5.expertsReferred,
            tierConditions.tier5.mastersReferred,
            tierConditions.tier5.godsReferred
        );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
