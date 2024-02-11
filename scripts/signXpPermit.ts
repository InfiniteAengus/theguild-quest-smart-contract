import { ethers } from "hardhat";
import { load } from 'ts-dotenv';

const env = load({
    WALLET_PRIVATE_KEY: String,
});

const tokenAddress = "";
const myAddress = "0x6f9e2777D267FAe69b0C5A24a402D14DA1fBcaA1";

const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');

export async function signTransferPermit(spender: string = "0x6fBF72f2bfB8f3E6eA5513e4CF40226481F4f975",  nonce: bigint = 1n, period: number = 600) {
    
    // Define permit function parameters
    const SECOND = 1000;

    const fromAddress = myAddress;
    // JavaScript dates have millisecond resolution
    const expiry = Math.trunc((Date.now() + period * SECOND) / SECOND);

    const message = {
        holder: fromAddress,
        spender: spender,
        nonce: nonce,
        expiry: expiry,
        allowed: true,
    };

    const messageData = createPermitMessageData(message);
    const signer = new ethers.Wallet(env.WALLET_PRIVATE_KEY, provider);
    const sig = await signData(signer, messageData.typedData.domain, messageData.typedData.types, messageData.typedData.message);  
    
}

const createPermitMessageData = function (message: any) {
    const typedData = {
        types: {
            EIP712Domain: [
            {
                name: "name",
                type: "string",
            },
            {
                name: "version",
                type: "string",
            },
            {
                name: "chainId",
                type: "uint256",
            },
            {
                name: "verifyingContract",
                type: "address",
            },
            ],
            Permit: [
            {
                name: "holder",
                type: "address",
            },
            {
                name: "spender",
                type: "address",
            },
            {
                name: "nonce",
                type: "uint256",
            },
            {
                name: "expiry",
                type: "uint256",
            },
            {
                name: "allowed",
                type: "bool",
            },
            ],
        },
        "primaryType": "Permit",
        domain: {
            "name": "Guild Xp",
            "version": "1",
            "chainId": 43113,  // testnet
            "verifyingContract": tokenAddress
        },
        message: message
    };
  
    return {
      typedData,
      message,
    };
};

const signData = async (signer: any, domain: any, types: any, message: any) => {
    // Ensure the signer is connected and ready
    if (!signer._signTypedData) {
      throw new Error('The signer does not support _signTypedData.');
    }
  
    // Sign the typed data
    const signature = await signer._signTypedData(domain, types, message);
  
    // Use ethers.Signature to parse the signature
    const sig = ethers.Signature.from(signature);
  
    // Extract v, r, s components
    return { v: sig.v, r: sig.r, s: sig.s };
  };
  
  