import { ethers } from "hardhat";
import { ReferralHandlerERC6551Account } from "../../typechain-types";
import { ERC6551Setup, Nexus6551 } from "./types";
import {
    deployMockExecutes,
    erc6551Setup,
    managersSetup,
    mockNFTSetup,
    nexusSetup,
    profileNFTSetup,
    xpSetup,
} from "./setup";
import { Signer } from "ethers";
import { createAndReturnRegistryAccount } from "./utils";

// For ERC6551 Unit Tests
export async function fixture_6551(): Promise<ERC6551Setup> {
    return await erc6551Setup(true);
}

export async function fixture_6551_with_nexus(): Promise<Nexus6551> {
    return await nexusSetup(true);
}

// Fixture for ERC6551 Unit Tests, uses mock a NFT
export async function fixture_6551_unit_tests(accounts: Signer[]) {
    const erc6551 = await fixture_6551();

    const mockNft = await mockNFTSetup(true);

    // Account 0 Mints token 0
    await mockNft.mint(await accounts[0].getAddress());

    const accountDetails = {
        implementation: erc6551.account.target.toString(),
        salt: ethers.encodeBytes32String("1"),
        chainId: 43112,
        tokenContract: mockNft.target.toString(),
        tokenId: 0,
    };

    const newAccount = await createAndReturnRegistryAccount(
        accountDetails,
        erc6551.registry,
        accounts[0]
    );

    // Get the account details
    const newAccountInstance = erc6551.account.attach(
        newAccount
    ) as ReferralHandlerERC6551Account;

    const mockExecutes = await deployMockExecutes(true);

    return {
        accounts,
        erc6551,
        newAccount,
        newAccountInstance,
        mockNft,
        accountDetails,
        mockExecutes,
    };
}

// Fixture for ERC6551 Integration Tests, integrates the Nexus contract, ProfileNFT contract, and Managers contracts
// Setups contracts as well as set values for the Nexus and Managers contracts
export async function fixture_6551_integration_tests(accounts: Signer[]) {
    const { erc6551, nexus } = await fixture_6551_with_nexus();

    await nexus.setGuardian(await accounts[0].getAddress());

    const profileNFT = await profileNFTSetup(nexus, true);

    await nexus.setNFT(profileNFT.target);

    const xpToken = await xpSetup(true, accounts[0]);

    const managers = await managersSetup(true, xpToken);

    await nexus.setTaxManager(managers.taxManager.target);
    await nexus.setTierManager(managers.tierManager.target);

    await managers.tierManager.setConditions(1, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(2, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(3, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(4, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(5, 1, 1, 1, 1, 1);

    const mockExecutes = await deployMockExecutes(true);

    return {
        erc6551,
        nexus,
        accounts,
        profileNFT,
        managers,
        mockExecutes,
        xpToken,
    };
}

// Fixture for Nexus.sol Unit Tests
export async function fixture_nexus_unit_tests(accounts: Signer[]) {
    const { erc6551, nexus } = await nexusSetup(true);

    const profileNFT = await profileNFTSetup(nexus, true);

    const xpToken = await xpSetup(true, accounts[0]);

    const managers = await managersSetup(true, xpToken);

    return { erc6551, nexus, profileNFT, managers, accounts, xpToken };
}
