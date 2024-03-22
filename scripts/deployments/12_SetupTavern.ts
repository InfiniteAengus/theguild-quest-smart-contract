import { ethers } from "hardhat";
import fs from "fs";
import { sleep } from "../../test/helpers/utils";
import { nonDeployerConfigAccounts } from "./config/nonDeployerAccounts";
import { NonDeployerConfigAccounts } from "../../test/helpers/types";
import { reviewPeriod } from "./config/contractParameters";

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

    const tavern = await ethers.getContractAt(
        "Tavern",
        parsedAddressesData.tavern
    );

    // 1s sleep to not get timeout
    const timeout = 1000;

    sleep(timeout);

    await tavern
        .connect(defaultDeployer)
        .setBarkeeper(accounts.tavernBarkeeper);

    sleep(timeout);

    await tavern.connect(defaultDeployer).setMediator(accounts.tavernMediator);

    sleep(timeout);

    await tavern.connect(defaultDeployer).setReviewPeriod(reviewPeriod);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
