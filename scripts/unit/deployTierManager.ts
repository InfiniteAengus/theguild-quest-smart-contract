import { ethers } from "hardhat";

const xp = ethers.getAddress("0x7409F45348b611c981488A137f75a7B3F901B8b5");

async function main() {
  const tierManager = await ethers.deployContract("TierManager", [xp]);

  await tierManager.waitForDeployment();

  console.log(
    `Tier Manager deployed to ${tierManager.target}`
  );

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});