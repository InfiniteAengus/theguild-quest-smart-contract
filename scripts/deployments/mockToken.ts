import { ethers } from "hardhat";
import { mockTokenSetup } from "../../test/helpers/setup";
import fs from "fs";

async function main() {
    const accounts = await ethers.getSigners();

    console.log("Deployer address: ", await accounts[0].getAddress());

    const mockUSDC = await mockTokenSetup("Mock USDC", "mUSDC", 6, true);

    console.log("Mock USDC deployed to: ", mockUSDC.target);

    const mockUSDT = await mockTokenSetup("Mock USDT", "mUSDT", 6, true);

    console.log("Mock USDT deployed to: ", mockUSDT.target);

    const mockDAI = await mockTokenSetup("Mock DAI", "mDAI", 18, true);

    console.log("Mock DAI deployed to: ", mockDAI.target);

    const mockCOQ = await mockTokenSetup("Mock COQ", "mCOQ", 18, true);

    console.log("Mock COQ deployed to: ", mockCOQ.target);

    const tokens = {
        usdc: {
            address: mockUSDC.target,
            name: "Mock USDC",
            symbol: "mUSDC",
            decimals: 6,
        },
        usdt: {
            address: mockUSDT.target,
            name: "Mock USDT",
            symbol: "mUSDT",
            decimals: 6,
        },
        dai: {
            address: mockDAI.target,
            name: "Mock DAI",
            symbol: "mDAI",
            decimals: 18,
        },
        coq: {
            address: mockCOQ.target,
            name: "Mock COQ",
            symbol: "mCOQ",
            decimals: 18,
        },
    };

    fs.writeFileSync(
        "./deployments/avax/fuji/mockTokens.json",
        JSON.stringify(tokens)
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
