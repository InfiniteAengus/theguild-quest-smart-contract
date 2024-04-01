import { ethers } from "hardhat";
import { load } from "ts-dotenv";

const env = load({
  GUILD_MASTER_PUBLIC_KEY: String
});

const nexus = ethers.getAddress("0x7a3a85cDa70C5fBc24D8F84C1920ba0Eff2964Ba");

const myWallet = env.GUILD_MASTER_PUBLIC_KEY;

async function main() {
  const rewarder = await ethers.deployContract("Rewarder", [myWallet, nexus]);

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