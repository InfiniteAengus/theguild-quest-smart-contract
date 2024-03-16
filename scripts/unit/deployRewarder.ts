import { ethers } from "hardhat";

const nexus = ethers.getAddress("0xA43e398EB9C90f4E391562852177D62A248A1aBF");

const myWallet = ethers.getAddress("0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1");

async function main() {
  const rewarder = await ethers.deployContract("Rewarder", [myWallet, "0xA43e398EB9C90f4E391562852177D62A248A1aBF"]);

  await rewarder.waitForDeployment();

  console.log(
    `Rewarder deployed to ${rewarder.target}`
  );

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});