import { ethers } from "hardhat";
import { Wallet } from "ethers";
import { load } from 'ts-dotenv';

const env = load({
    DEV_WALLET_PRIVATE_KEY: String,
});

const tokenAddress = "0x110948B25843Bb709aDEc3247DF134fe4bb5A503";
const myAddress = "0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1";

const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');

// nonce should be checked or tracked before calling
export async function signTransferPermit(spender: string = "0x6fBF72f2bfB8f3E6eA5513e4CF40226481F4f975",  nonce: bigint = 0n, period: number = 600) {
    
    // Define permit function parameters
    const SECOND = 1000;

    const fromAddress = myAddress;
    // JavaScript dates have millisecond resolution
    const deadline = Math.trunc((Date.now() + period * SECOND) / SECOND);

    const message = {
        owner: fromAddress,
        spender: spender,
        value: 1000,
        nonce: nonce,
        deadline: deadline,
    };

    const primaryType = "Permit";

    const types = {
        // EIP712Domain: [
        //     {name: "name",type: "string",},
        //     {name: "version",type: "string",},
        //     {name: "chainId",type: "uint256",},
        //     {name: "verifyingContract",type: "address",},
        // ],
        "Permit": [
            {name: "owner",type: "address"},
            {name: "spender",type: "address"},
            {name: "value",type: "uint256"},
            {name: "nonce",type: "uint256"},
            {name: "deadline",type: "uint256"},
        ],
       
    };
        
    const domain = {
        name: "GuildXp",
        version: "1",
        chainId: 43113,  // fuji testnet
        verifyingContract: tokenAddress
    };
   
    const signer = new ethers.Wallet(env.DEV_WALLET_PRIVATE_KEY, provider);
    console.log(signer.address)
    const sig = await signData(signer, domain, types, message);  
    
    console.log(sig);
    console.log(`Message: { deadline: ${message.deadline} }`)
}


const signData = async (signer: Wallet, domain: any, types: any, message: any) => {
    // Ensure the signer is connected and ready
    if (!signer.signTypedData) {
      throw new Error('The signer does not support _signTypedData.');
    }
  
    // Sign the typed data
    const signature = await signer.signTypedData(domain, types, message);
  
    // Use ethers.Signature to parse the signature
    const sig = ethers.Signature.from(signature);
  
    // Extract v, r, s components
    return { v: sig.v, r: sig.r, s: sig.s };
  };
  

async function main(){
    await signTransferPermit();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});