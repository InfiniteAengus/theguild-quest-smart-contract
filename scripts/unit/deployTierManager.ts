import { ethers } from "hardhat";

const registry = ethers.getAddress("0x000000006551c19487814612e58FE06813775758");

const myWallet = ethers.getAddress("0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1");

async function main() {
  const tierManager = await ethers.deployContract("TierManager", ["0x88F8916481118cA802aC8116f82c7002602a49BC"]);

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