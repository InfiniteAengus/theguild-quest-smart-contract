import { ethers } from "hardhat";

const Nexus = ethers.getAddress("0x7a3a85cDa70C5fBc24D8F84C1920ba0Eff2964Ba");
const quest = ethers.getAddress("0x477B2B2e874820998939c977B7f7De03D48f1A98");
const escrowN = ethers.getAddress("0x000a105F222968Df91FB22EF0A61aCB30DE10121");
const escrowT = ethers.getAddress("0xCB57b07Bb6f03baBA194fb0B150ff6B729348D2d");


async function main() {

    // address _questImplementation,
    // address _escrowNativeImplementation,
    // address _escrowTokenImplementation,
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

  const tavern = await ethers.deployContract("Tavern", [_questImplementation.target, _escrowNativeImplementation.target, _escrowTokenImplementation.target, Nexus]);

  await tavern.waitForDeployment();

  console.log(
    `Tavern deployed to ${tavern.target}`
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