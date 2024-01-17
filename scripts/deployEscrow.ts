import { ethers } from "hardhat";

async function main() {

  const escrow = await ethers.deployContract("Escrow", [["0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1", "0x983a7B7D5d22c49887C21C98E6ADAaD6A860FF13"]]);

  await escrow.waitForDeployment();

  console.log(
    `Escrow deployed to ${escrow.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
