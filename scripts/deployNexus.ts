import { ethers } from "hardhat";

const registry = ethers.getAddress("0x000000006551c19487814612e58FE06813775758");

const myWallet = ethers.getAddress("0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1");

async function main() {

  const nexus = await ethers.deployContract("Nexus", ["0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1", registry]);

  await nexus.waitForDeployment();

  console.log(
    `Nexus deployed to ${nexus.target}`
  );

  const nft = await ethers.deployContract("ProfileNFT", [nexus.target]);

  await nft.waitForDeployment();

  console.log(
    `Profile NFT deployed to ${nft.target}`
  );

  const account = await ethers.deployContract("ReferralHandlerERC6551Account", [nexus.target]);

  await account.waitForDeployment();

  console.log(
    `Handler Acoount deployed to ${account.target}`
  );

  await nexus.setNFT(nft.target);

  console.log("Nft set to ", nft.target);

  await nexus.setAccountImpl(account.target);

  console.log("Account impl set to ", account.target);

  const guardian = await nexus.setGuardian("0x4CA23B523c2b0f730bC9BBc5152A286953159Fe5");
  //const guardian = await nexus.setGuardian(myWallet);
  guardian.wait(2);

  console.log("Guardian set to ", await nexus.guardian());

  const master = await nexus.setMaster("0x4CA23B523c2b0f730bC9BBc5152A286953159Fe5");
  //const master = await nexus.setMaster(myWallet);

  master.wait();
  console.log("Master set to ", await nexus.master());

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});