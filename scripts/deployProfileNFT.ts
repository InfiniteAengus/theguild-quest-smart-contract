import { ethers } from "hardhat";

async function main() {

  const nft = await ethers.deployContract("ProfileNFT", ["0xe444b08d74816662a26e3688c07C1150B911C97b"]);

  await nft.waitForDeployment();

  console.log(
    `Profile NFT deployed to ${nft.target}`
  );

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
