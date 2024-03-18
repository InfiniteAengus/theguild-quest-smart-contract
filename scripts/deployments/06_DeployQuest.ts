import { ethers } from "hardhat";
import { questSetup } from "../../test/helpers/setup";
import fs from "fs";

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
    console.log("Deployer address: ", await defaultDeployer.getAddress());

    const addressesData = fs.readFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        "utf8"
    );

    const parsedAddressesData = JSON.parse(addressesData);

    const questImplementation = await questSetup(false);

    parsedAddressesData.quest = questImplementation.target;

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
