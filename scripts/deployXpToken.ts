import { ethers } from "hardhat";

async function main() {

  const xp = await ethers.deployContract("GuildXp", ["0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1"]);

  await xp.waitForDeployment();

  console.log(
    `Xp Token deployed to ${xp.target}`
  );

  const randomAddress = ethers.Wallet.createRandom().address;
  const myAddress = ethers.getAddress("0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1");
  const mint = await xp.mint(randomAddress, 1000);

  console.log(
    `Xp Token minted to ${randomAddress} at ${mint.hash}`
  );

  await mint.wait(2);

  const burn = await xp.burn(randomAddress, 1000);

  console.log(
    `Xp Token burned from  ${randomAddress} at ${burn.hash}`
  );
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
