import { ethers } from "hardhat";

async function main() {

  const handler = await ethers.deployContract("ReferralHandler");

  await handler.waitForDeployment();

  console.log(
    `Handler deployed to ${handler.target}`
  );

  const nexus = await ethers.deployContract("Nexus", [handler.target]);

  await nexus.waitForDeployment();

  console.log(
    `Nexus deployed to ${nexus.target}`
  );

  const nft = await ethers.deployContract("ProfileNFT", [nexus.target]);

  await nft.waitForDeployment();

  console.log(
    `Profile NFT deployed to ${nft.target}`
  );

  await nexus.setNFT(nft.target);

  await nexus.setGuardian("0x2919e92Ef458D3D14D658159F24F7fDA200823D5");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});