import { ethers } from "hardhat";
import { erc6551Setup } from "../../test/helpers/setup";
import fs from "fs";

async function main() {
    const [devAccount, defaultDeployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("Network: ", network.name);
    console.log("Deployer address: ", await defaultDeployer.getAddress());

    const ERC6551 = await erc6551Setup(defaultDeployer, false);

    const addresses = {
        registry: ERC6551.registry.target,
        account: ERC6551.account.target,
    };

    fs.writeFileSync(
        "./deployments/avax/" + network.name + "/addresses.json",
        JSON.stringify(addresses)
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
