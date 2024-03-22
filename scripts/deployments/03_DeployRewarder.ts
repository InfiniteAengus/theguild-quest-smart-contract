import { ethers } from "hardhat";
import { rewarderSetup } from "../../test/helpers/setup";
import fs from "fs";
import { nonDeployerConfigAccounts } from "./config/nonDeployerAccounts";

async function main() {
    const [devAccount, defaultDeployer] = await ethers.getSigners();

    const network = await ethers.provider.getNetwork();

    const rewarderSteward = nonDeployerConfigAccounts.rewarderSteward;

    console.log("Network: ", network.name);
    console.log("Deployer address: ", await defaultDeployer.getAddress());

    const addressesData = fs.readFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        "utf8"
    );

    const parsedAddressesData = JSON.parse(addressesData);
    const rewarder = await rewarderSetup(
        defaultDeployer,
        false,
        parsedAddressesData.nexus,
        rewarderSteward
    );

    parsedAddressesData.rewarder = rewarder.target;

    fs.writeFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        JSON.stringify(parsedAddressesData)
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
