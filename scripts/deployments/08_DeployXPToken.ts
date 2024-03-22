import { ethers } from "hardhat";
import { xpSetup } from "../../test/helpers/setup";
import fs from "fs";
import { nonDeployerConfigAccounts } from "./config/nonDeployerAccounts";

async function main() {
    const [devAccount, defaultDeployer] = await ethers.getSigners();

    const network = await ethers.provider.getNetwork();

    console.log("Network: ", network.name);
    console.log("Deployer address: ", await defaultDeployer.getAddress());

    const addressesData = fs.readFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        "utf8"
    );

    const guildXpOwner = nonDeployerConfigAccounts.guildXpOwner;
    const parsedAddressesData = JSON.parse(addressesData);

    const xpToken = await xpSetup(false, guildXpOwner);

    parsedAddressesData.xpToken = xpToken.target;

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
