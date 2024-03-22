import { ethers } from "hardhat";
import { taxManagerSetup } from "../test/helpers/setup";
import { SeekerTax, SolverTax } from "../test/helpers/types";
import { load } from "ts-dotenv";

const env = load({
  GUILD_MASTER_PUBLIC_KEY: String
});

const Platform_Revenue = ethers.getAddress("0xc3a64EacC53cD1Cb9823a461750AA14453646442");
const DisputeFees_RefTax = ethers.getAddress("0x14C823D938aBa8dd9c63745F67b4f78A704Ee830")

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

    console.log("Deployer address: ", [env.GUILD_MASTER_PUBLIC_KEY]);

    const taxManager = await ethers.deployContract("TaxManager");
    await taxManager.waitForDeployment();

    console.log(`TaxManager deployed to ${taxManager.target}`);

    await taxManager.setPlatformTreasuryPool(Platform_Revenue);
    await taxManager.setPlatformRevenuePool(Platform_Revenue);
    await taxManager.setReferralTaxTreasury(DisputeFees_RefTax);
    await taxManager.setDisputeFeesTreasury(DisputeFees_RefTax);

    console.log("Pools set!");

    await taxManager.setSeekerFees(
        seekerTax.referralRewards,
        seekerTax.platformRevenue
    );

    console.log("Seeker Fees Set!");

    await taxManager.setSolverFees(
        solverTax.referralRewards,
        solverTax.platformRevenue,
        solverTax.platformTreasury
    );

    console.log("Solver Fees Set!");


    await taxManager.setDisputeDepositRate(disputeTax);

    console.log("Dispute Deposit Rate Set!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
