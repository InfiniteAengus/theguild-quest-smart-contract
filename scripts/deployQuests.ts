import { ethers } from "hardhat";

const registry = ethers.getAddress("0x000000006551c19487814612e58FE06813775758");

const myWallet = ethers.getAddress("0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1");

const ProfileNFT = ethers.getAddress("0x3Fa0c7Fa878046bA80F742C2D947a8A07C52A55D");

const Nexus = ethers.getAddress("0xA43e398EB9C90f4E391562852177D62A248A1aBF");

async function main() {

    // address _questImplementation,
    // address _escrowNativeImplementation,
    // address _escrowTokenImplementation,
    // address _profileNft,
    // address _nexus
  const _questImplementation = await ethers.deployContract("Quest");

  await _questImplementation.waitForDeployment();

  console.log(
    `Quest deployed to ${_questImplementation.target}`
  );

  const _escrowNativeImplementation = await ethers.deployContract("EscrowNative");

  await _escrowNativeImplementation.waitForDeployment();

  console.log(
    `Escrow Native deployed to ${_escrowNativeImplementation.target}`
  );

  const _escrowTokenImplementation = await ethers.deployContract("EscrowToken");

  await _escrowTokenImplementation.waitForDeployment();

  console.log(
    `Escrow Token deployed to ${_escrowTokenImplementation.target}`
  );

  const tavern = await ethers.deployContract("Tavern", [_questImplementation.target, _escrowNativeImplementation.target, _escrowTokenImplementation.target, ProfileNFT, Nexus]);

  await tavern.waitForDeployment();

  console.log(
    `Nexus deployed to ${tavern.target}`
  );

 

  const barkeeper = await tavern.setBarkeeper("0x4CA23B523c2b0f730bC9BBc5152A286953159Fe5");

  //const guardian = await nexus.setGuardian("0x4CA23B523c2b0f730bC9BBc5152A286953159Fe5");
  
  barkeeper.wait(2);

  //const master = await nexus.setMaster("0x4CA23B523c2b0f730bC9BBc5152A286953159Fe5");
  //const master = await nexus.setMaster(myWallet);

  //master.wait();
  console.log("Owner set to ", await tavern.owner());
  console.log("Barkeeper set to ", await tavern.getBarkeeper());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});