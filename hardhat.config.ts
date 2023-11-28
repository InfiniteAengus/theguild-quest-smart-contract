import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import { load } from 'ts-dotenv';

const env = load({
  INFURA_API_KEY: String,
  INFURA_SECRET_KEY: String,
  WALLET_PRIVATE_KEY: String,
  ETHERSCAN_API_KEY: String
});

const config: HardhatUserConfig = {
  solidity: "0.8.20",

  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${env.INFURA_API_KEY}`,
      accounts: [env.WALLET_PRIVATE_KEY]
    },
    // mainnet: {
    //   url: `https://mainnet.infura.io/v3/${env.INFURA_API_KEY}`,
    //   accounts: [env.WALLET_PRIVATE_KEY]
    // },
    spicy: {
      url: `https://spicy-rpc.chiliz.com/`,
      accounts: [env.WALLET_PRIVATE_KEY]
    },
    chiliz: {
      url: "https://rpc.ankr.com/chiliz",
      accounts: [env.WALLET_PRIVATE_KEY], 
      chainId: 88888
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [env.WALLET_PRIVATE_KEY], 
      chainId: 43113
    },
    avalanche:{
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [env.WALLET_PRIVATE_KEY], 
      chainId: 43114
    }

  },

  etherscan: {
    apiKey: {
      sepolia: env.ETHERSCAN_API_KEY,
      spicy: env.ETHERSCAN_API_KEY
    },
    customChains: [
      {
        network: "spicy",
        chainId: 88882,
        urls: {
          apiURL: "",
          browserURL: "http://spicy-explorer.chiliz.com/"
        }
      }
    ]
  }
}

export default config;
