import { ethers } from "hardhat";
import { load } from "ts-dotenv";

const env = load({
  GUILD_MASTER_PUBLIC_KEY: String
});

async function main() {

  const escrowN = await ethers.deployContract("EscrowNative");

  await escrowN.waitForDeployment();

  console.log(
    `Escrow Native deployed to ${escrowN.target}`
  );

  const escrowT = await ethers.deployContract("EscrowToken");

  await escrowT.waitForDeployment();

  console.log(
    `Escrow Token deployed to ${escrowT.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
