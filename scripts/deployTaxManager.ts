import { ethers } from "hardhat";
import { taxManagerSetup } from "../test/helpers/setup";
import { SeekerTax, SolverTax } from "../test/helpers/types";
import { TaxManager } from "../typechain-types";

let seekerTax: SeekerTax = {
        referralRewards: 100n,
        platformRevenue: 200n,
    },
    solverTax: SolverTax = {
        referralRewards: 200n,
        platformRevenue: 700n,
        platformTreasury: 100n,
    },
    disputeTax = 1000n;

async function main() {
    const accounts = await ethers.getSigners();

    console.log("Deployer address: ", await accounts[0].getAddress());

    const taxManager = await taxManagerSetup(true);

    // const TaxManager = await ethers.getContractFactory("TaxManager");
    // const taxManager = TaxManager.attach(
    //     "0x82cdd6628fD7285D46605c667Ad0FaB887bDdFeF"
    // ) as TaxManager;

    await taxManager.setPlatformTreasuryPool(await accounts[0].getAddress());
    await taxManager.setPlatformRevenuePool(await accounts[0].getAddress());
    await taxManager.setReferralTaxTreasury(await accounts[0].getAddress());
    await taxManager.setDisputeFeesTreasury(await accounts[0].getAddress());

    await taxManager.setSeekerFees(
        seekerTax.referralRewards,
        seekerTax.platformRevenue
    );

    await taxManager.setSolverFees(
        solverTax.referralRewards,
        solverTax.platformRevenue,
        solverTax.platformTreasury
    );

    await taxManager.setDisputeDepositRate(disputeTax);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
