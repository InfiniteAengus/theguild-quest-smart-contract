import { ethers } from "hardhat";
import { tavernSetup } from "../../test/helpers/setup";
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
    console.log("Deployer address: ", await tavernOwner.getAddress());

    const addressesData = fs.readFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        "utf8"
    );

    const parsedAddressesData = JSON.parse(addressesData);

    const tavern = await tavernSetup(
        tavernOwner,
        parsedAddressesData.quest,
        parsedAddressesData.escrows.escrowNative,
        parsedAddressesData.escrows.escrowToken,
        parsedAddressesData.nexus,
        false
    );

    parsedAddressesData.tavern = tavern.target;

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
