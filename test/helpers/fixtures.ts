import { ethers } from "hardhat";
import {
    EscrowNative,
    ReferralHandlerERC6551Account,
} from "../../typechain-types";
import { ERC6551Setup, Nexus6551 } from "./types";
import {
    deployMockExecutes,
    erc6551Setup,
    escrowNativeSetup,
    escrowTokenSetup,
    managersSetup,
    mockEscrowSetup,
    mockNFTSetup,
    mockQuestSetup,
    mockRewarderSetup,
    mockTavernSetup,
    mockTokenSetup,
    nexusSetup,
    profileNFTSetup,
    questSetup,
    rewarderSetup,
    tavernSetup,
    taxManagerSetup,
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

// Fixture for ProfileNFT.sol Unit Tests
export async function fixture_profile_nft_unit_tests(accounts: Signer[]) {
    const { nexus } = await nexusSetup(true);

    const profileNFT = await profileNFTSetup(nexus, true);

    await profileNFT.setNexus(await accounts[0].getAddress());

    return { profileNFT, accounts, nexus };
}

// Fixture for ProfileNFT.sol Integration Tests
export async function fixture_profile_nft_integration_tests(
    accounts: Signer[]
) {
    const { nexus } = await nexusSetup(true);

    const profileNFT = await profileNFTSetup(nexus, true);

    return { profileNFT, accounts, nexus };
}

// Fixture for the Escrow Contract Unit Tests
export async function fixture_escrow_unit_tests(accounts: Signer[]) {
    const nexus = await nexusSetup(true);

    const taxManager = await taxManagerSetup(true);

    // Set the tax manager for the nexus
    await nexus.nexus.setTaxManager(taxManager.target);

    const escrowNativeImpl = await escrowNativeSetup(true);
    const escrowTokenImpl = await escrowTokenSetup(true);
    const mockRewarder = await mockRewarderSetup(
        true,
        accounts[0],
        nexus.nexus
    );

    const mockToken = await mockTokenSetup(true);

    const questNative = await mockQuestSetup(
        true,
        escrowNativeImpl,
        ethers.ZeroAddress,
        mockRewarder
    );

    await questNative[
        "initialize(uint32,uint32,uint256,string,address,address,address)"
    ](
        0,
        1,
        1000,
        "MockQuestNative",
        escrowNativeImpl.target,
        ethers.ZeroAddress,
        mockRewarder.target
    );

    const questToken = await mockQuestSetup(
        true,
        escrowTokenImpl,
        mockToken.target.toString(),
        mockRewarder
    );

    await questToken[
        "initialize(uint32,uint32,uint256,string,address,address,address)"
    ](
        0,
        1,
        1000,
        "MockQuestToken",
        escrowTokenImpl.target,
        mockToken.target,
        mockRewarder.target
    );

    return {
        escrowNativeImpl,
        escrowTokenImpl,
        accounts,
        mockRewarder,
        questNative,
        questToken,
        mockToken,
        taxManager,
    };
}

export async function fixture_quest_unit_tests(accounts: Signer[]) {
    const escrowNative = await escrowNativeSetup(true);
    const escrowToken = await escrowTokenSetup(true);
    const taxManager = await taxManagerSetup(true);

    const { nexus } = await nexusSetup(true);

    const mockRewarder = await mockRewarderSetup(true, accounts[0], nexus);

    const quest = await questSetup(true);

    const mockTavern = await mockTavernSetup(
        true,
        nexus,
        escrowNative,
        escrowToken,
        quest,
        accounts,
        mockRewarder
    );

    const mockToken = await mockTokenSetup(true);

    return {
        mockTavern,
        quest,
        accounts,
        escrowNative,
        escrowToken,
        mockRewarder,
        taxManager,
        nexus,
        mockToken,
    };
}

export async function fixture_tavern_unit_tests(accounts: Signer[]) {
    const { nexus } = await nexusSetup(true);

    const escrowNative = await escrowNativeSetup(true);
    const escrowToken = await escrowTokenSetup(true);
    const mockRewarder = await mockRewarderSetup(true, accounts[0], nexus);
    const taxManager = await taxManagerSetup(true);

    const mockNft = await mockNFTSetup(true);
    const mockERC20 = await mockTokenSetup(true);

    const quest = await questSetup(true);

    const tavern = await tavernSetup(
        quest,
        escrowNative,
        escrowToken,
        mockNft,
        nexus,
        true
    );

    return {
        quest,
        escrowNative,
        escrowToken,
        mockNft,
        tavern,
        mockRewarder,
        accounts,
        mockERC20,
        taxManager,
        nexus,
    };
}

// Fixture for Rewarder Contract Unit tests
export async function fixture_rewarder_unit_tests(accounts: Signer[]) {
    const { nexus } = await nexusSetup(true);
    const taxManager = await taxManagerSetup(true);
    const nft = await profileNFTSetup(nexus, true);

    const mockToken = await mockTokenSetup(true);

    await nexus.setGuardian(await accounts[0].getAddress());

    await nexus.setTaxManager(taxManager.target);

    await taxManager.setPlatformTreasuryPool(await accounts[6].getAddress());
    await taxManager.setPlatformRevenuePool(await accounts[7].getAddress());
    await taxManager.setReferralTaxTreasury(await accounts[8].getAddress());
    await taxManager.setDisputeFeesTreasury(await accounts[9].getAddress());

    await nexus.setNFT(nft.target);

    const rewarder = await rewarderSetup(true, nexus, accounts[0]);
    const mockEscrow = await mockEscrowSetup(true);

    await mockEscrow.setRewarder(rewarder.target);

    return { rewarder, nexus, accounts, taxManager, mockEscrow, mockToken };
}

export async function fixture_rewarder_integration_tests(accounts: Signer[]) {
    const { nexus } = await nexusSetup(true);
    const taxManager = await taxManagerSetup(true);
    const nft = await profileNFTSetup(nexus, true);

    await nexus.setGuardian(await accounts[0].getAddress());

    await nexus.setTaxManager(taxManager.target);
    await nexus.setNFT(nft.target);

    const rewarder = await rewarderSetup(true, nexus, accounts[0]);

    return { rewarder, nexus, accounts, taxManager };
}

async function full_integration_fixture(accounts: Signer[]) {}
