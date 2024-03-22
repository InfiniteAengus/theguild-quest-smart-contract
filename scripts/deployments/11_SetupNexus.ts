import { ethers } from "hardhat";
import fs from "fs";
import { sleep } from "../../test/helpers/utils";
import { nonDeployerConfigAccounts } from "./config/nonDeployerAccounts";
import { NonDeployerConfigAccounts } from "../../test/helpers/types";

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

    const nexus = await ethers.getContractAt(
        "Nexus",
        parsedAddressesData.nexus
    );

    // 1s sleep to not get timeout
    const timeout = 1000;

    sleep(timeout);

    await nexus.connect(defaultDeployer).setGuardian(accounts.nexusGuardian);

    sleep(timeout);

    await nexus
        .connect(defaultDeployer)
        .setRewarder(parsedAddressesData.rewarder);

    sleep(timeout);

    await nexus.connect(defaultDeployer).setNFT(parsedAddressesData.profileNFT);

    sleep(timeout);

    await nexus
        .connect(defaultDeployer)
        .setTaxManager(parsedAddressesData.taxManager);

    sleep(timeout);

    await nexus
        .connect(defaultDeployer)
        .setTierManager(parsedAddressesData.tierManager);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
