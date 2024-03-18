import { ethers } from "hardhat";
import fs from "fs";
import { load } from 'ts-dotenv';

const env = load({
    GUILD_MASTER_PUBLIC_KEY: String
});

const tierManagerA = "0xeC99e885a56eC02Ec3cbAf9753Bf870E686581ef";

export type TierConditions = {
    tier1: {
        xpPoints: bigint;
        novicesReferred: bigint;
        adeptsReferred: bigint;
        expertsReferred: bigint;
        mastersReferred: bigint;
        godsReferred: bigint;
    };
    tier2: {
        xpPoints: bigint;
        novicesReferred: bigint;
        adeptsReferred: bigint;
        expertsReferred: bigint;
        mastersReferred: bigint;
        godsReferred: bigint;
    };
    tier3: {
        xpPoints: bigint;
        novicesReferred: bigint;
        adeptsReferred: bigint;
        expertsReferred: bigint;
        mastersReferred: bigint;
        godsReferred: bigint;
    };
    tier4: {
        xpPoints: bigint;
        novicesReferred: bigint;
        adeptsReferred: bigint;
        expertsReferred: bigint;
        mastersReferred: bigint;
        godsReferred: bigint;
    };
    tier5: {
        xpPoints: bigint;
        novicesReferred: bigint;
        adeptsReferred: bigint;
        expertsReferred: bigint;
        mastersReferred: bigint;
        godsReferred: bigint;
    };
};

export const tierConditions: TierConditions = {
    tier1: {
        xpPoints: ethers.parseUnits("3", 2),
        novicesReferred: 0n,
        adeptsReferred: 0n,
        expertsReferred: 0n,
        mastersReferred: 0n,
        godsReferred: 0n,
    },
    tier2: {
        xpPoints: ethers.parseUnits("4470", 2),
        novicesReferred: 3n,
        adeptsReferred: 0n,
        expertsReferred: 0n,
        mastersReferred: 0n,
        godsReferred: 0n,
    },
    tier3: {
        xpPoints: ethers.parseUnits("37224", 2),
        novicesReferred: 5n,
        adeptsReferred: 1n,
        expertsReferred: 0n,
        mastersReferred: 0n,
        godsReferred: 0n,
    },
    tier4: {
        xpPoints: ethers.parseUnits("737627", 2),
        novicesReferred: 5n,
        adeptsReferred: 2n,
        expertsReferred: 1n,
        mastersReferred: 0n,
        godsReferred: 0n,
    },
    tier5: {
        xpPoints: ethers.parseUnits("5346332", 2),
        novicesReferred: 5n,
        adeptsReferred: 2n,
        expertsReferred: 1n,
        mastersReferred: 1n,
        godsReferred: 0n,
    },
};

async function main() {
    const network = await ethers.provider.getNetwork();

    console.log("Network: ", network.name);
    console.log("Deployer address: ", env.GUILD_MASTER_PUBLIC_KEY);

    const tierManager = await ethers.getContractAt(
        "TierManager",
        tierManagerA
    );

    // 1s sleep to not get timeout
    const timeout = 1000;

    
    await tierManager.setConditions(
            1,
            tierConditions.tier1.xpPoints,
            tierConditions.tier1.novicesReferred,
            tierConditions.tier1.adeptsReferred,
            tierConditions.tier1.expertsReferred,
            tierConditions.tier1.mastersReferred,
            tierConditions.tier1.godsReferred
        );

    console.log("Conditions for tier 1 set!")

    await tierManager.setConditions(
            2,
            tierConditions.tier2.xpPoints,
            tierConditions.tier2.novicesReferred,
            tierConditions.tier2.adeptsReferred,
            tierConditions.tier2.expertsReferred,
            tierConditions.tier2.mastersReferred,
            tierConditions.tier2.godsReferred
        );

    console.log("Conditions for tier 2 set!")

    await tierManager.setConditions(
            3,
            tierConditions.tier3.xpPoints,
            tierConditions.tier3.novicesReferred,
            tierConditions.tier3.adeptsReferred,
            tierConditions.tier3.expertsReferred,
            tierConditions.tier3.mastersReferred,
            tierConditions.tier3.godsReferred
        );

        console.log("Conditions for tier 3 set!")

    await tierManager.setConditions(
            4,
            tierConditions.tier4.xpPoints,
            tierConditions.tier4.novicesReferred,
            tierConditions.tier4.adeptsReferred,
            tierConditions.tier4.expertsReferred,
            tierConditions.tier4.mastersReferred,
            tierConditions.tier4.godsReferred
        );

        console.log("Conditions for tier 4 set!")

    await tierManager
        .setConditions(
            5,
            tierConditions.tier5.xpPoints,
            tierConditions.tier5.novicesReferred,
            tierConditions.tier5.adeptsReferred,
            tierConditions.tier5.expertsReferred,
            tierConditions.tier5.mastersReferred,
            tierConditions.tier5.godsReferred
        );

        console.log("Conditions for tier 5 set!")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});