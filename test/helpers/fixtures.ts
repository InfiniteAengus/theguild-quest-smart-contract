import { ethers } from "hardhat";
import {
    EscrowNative,
    ReferralHandlerERC6551Account,
} from "../../typechain-types";
import { ERC6551Setup, Nexus6551, SeekerTax, SolverTax } from "./types";
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
export async function fixture_6551(deployer: Signer): Promise<ERC6551Setup> {
    return await erc6551Setup(deployer, true);
}

export async function fixture_6551_with_nexus(
    deployer: Signer
): Promise<Nexus6551> {
    return await nexusSetup(deployer, true);
}

// Fixture for ERC6551 Unit Tests, uses mock a NFT
export async function fixture_6551_unit_tests(accounts: Signer[]) {
    const erc6551 = await fixture_6551(accounts[0]);

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
    const { erc6551, nexus } = await fixture_6551_with_nexus(accounts[0]);

    await nexus.setGuardian(await accounts[0].getAddress());

    const profileNFT = await profileNFTSetup(
        accounts[0],
        nexus.target as string,
        true
    );

    await nexus.setNFT(profileNFT.target);

    const xpToken = await xpSetup(
        accounts[0],
        true,
        await accounts[0].getAddress()
    );

    const managers = await managersSetup(accounts[0], true, xpToken);

    await nexus.setTaxManager(managers.taxManager.target);
    await nexus.setTierManager(managers.tierManager.target);

    await managers.tierManager.setConditions(1, 1, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(2, 1, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(3, 1, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(4, 1, 1, 1, 1, 1, 1);
    await managers.tierManager.setConditions(5, 1, 1, 1, 1, 1, 1);

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
    const { erc6551, nexus } = await nexusSetup(accounts[0], true);

    const profileNFT = await profileNFTSetup(
        accounts[0],
        nexus.target as string,
        true
    );

    const xpToken = await xpSetup(
        accounts[0],
        true,
        await accounts[0].getAddress()
    );

    const managers = await managersSetup(accounts[0], true, xpToken);

    return { erc6551, nexus, profileNFT, managers, accounts, xpToken };
}

// Fixture for ProfileNFT.sol Unit Tests
export async function fixture_profile_nft_unit_tests(accounts: Signer[]) {
    const { nexus } = await nexusSetup(accounts[0], true);

    const profileNFT = await profileNFTSetup(
        accounts[0],
        nexus.target as string,
        true
    );

    await profileNFT.setNexus(await accounts[0].getAddress());

    return { profileNFT, accounts, nexus };
}

// Fixture for ProfileNFT.sol Integration Tests
export async function fixture_profile_nft_integration_tests(
    accounts: Signer[]
) {
    const { nexus } = await nexusSetup(accounts[0], true);

    const profileNFT = await profileNFTSetup(
        accounts[0],
        nexus.target as string,
        true
    );

    return { profileNFT, accounts, nexus };
}

// Fixture for the Escrow Contract Unit Tests
export async function fixture_escrow_unit_tests(accounts: Signer[]) {
    const nexus = await nexusSetup(accounts[0], true);

    const taxManager = await taxManagerSetup(accounts[0], true);

    // Set the tax manager for the nexus
    await nexus.nexus.setTaxManager(taxManager.target);

    const escrowNativeImpl = await escrowNativeSetup(accounts[0], true);
    const escrowTokenImpl = await escrowTokenSetup(accounts[0], true);
    const mockRewarder = await mockRewarderSetup(
        true,
        accounts[0],
        nexus.nexus
    );

    const mockToken = await mockTokenSetup("mockToken", "mToken", 18, true);

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
    const escrowNative = await escrowNativeSetup(accounts[0], true);
    const escrowToken = await escrowTokenSetup(accounts[0], true);
    const taxManager = await taxManagerSetup(accounts[0], true);

    const { nexus } = await nexusSetup(accounts[0], true);

    const mockRewarder = await mockRewarderSetup(true, accounts[0], nexus);

    const quest = await questSetup(accounts[0], true);

    const mockTavern = await mockTavernSetup(
        true,
        nexus,
        escrowNative,
        escrowToken,
        quest,
        accounts,
        mockRewarder
    );

    const mockToken = await mockTokenSetup("mockToken", "mToken", 18, true);

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
    const { nexus } = await nexusSetup(accounts[0], true);

    const escrowNative = await escrowNativeSetup(accounts[0], true);
    const escrowToken = await escrowTokenSetup(accounts[0], true);
    const mockRewarder = await mockRewarderSetup(true, accounts[0], nexus);
    const taxManager = await taxManagerSetup(accounts[0], true);

    const mockNft = await mockNFTSetup(true);
    const mockERC20 = await mockTokenSetup("mockToken", "mToken", 18, true);

    const quest = await questSetup(accounts[0], true);

    const tavern = await tavernSetup(
        accounts[0],
        quest.target as string,
        escrowNative.target as string,
        escrowToken.target as string,
        nexus.target as string,
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
    const { nexus } = await nexusSetup(accounts[0], true);
    const taxManager = await taxManagerSetup(accounts[0], true);
    const nft = await profileNFTSetup(
        accounts[0],
        nexus.target as string,
        true
    );

    const mockToken = await mockTokenSetup("mockToken", "mToken", 6, true);

    await nexus.setGuardian(await accounts[0].getAddress());

    await nexus.setTaxManager(taxManager.target);

    await taxManager.setPlatformTreasuryPool(await accounts[6].getAddress());
    await taxManager.setPlatformRevenuePool(await accounts[7].getAddress());
    await taxManager.setReferralTaxTreasury(await accounts[8].getAddress());
    await taxManager.setDisputeFeesTreasury(await accounts[9].getAddress());

    await nexus.setNFT(nft.target);

    const rewarder = await rewarderSetup(
        accounts[0],
        true,
        nexus.target as string,
        await accounts[0].getAddress()
    );
    const mockEscrow = await mockEscrowSetup(true);

    await mockEscrow.setRewarder(rewarder.target);

    return { rewarder, nexus, accounts, taxManager, mockEscrow, mockToken };
}

export async function fixture_rewarder_integration_tests(accounts: Signer[]) {
    const { nexus } = await nexusSetup(accounts[0], true);
    const taxManager = await taxManagerSetup(accounts[0], true);
    const nft = await profileNFTSetup(
        accounts[0],
        nexus.target as string,
        true
    );

    await nexus.setGuardian(await accounts[0].getAddress());

    await nexus.setTaxManager(taxManager.target);
    await nexus.setNFT(nft.target);

    const rewarder = await rewarderSetup(
        accounts[0],
        true,
        nexus.target as string,
        await accounts[0].getAddress()
    );

    return { rewarder, nexus, accounts, taxManager };
}

// Default seeker and solver tax values
let seekerTax: SeekerTax = {
        referralRewards: 100n,
        platformRevenue: 200n,
    },
    solverTax: SolverTax = {
        referralRewards: 200n,
        platformRevenue: 700n,
        platformTreasury: 100n,
    },
    disputeTax = 1000n;

export async function full_integration_fixture(accounts: Signer[]) {
    const owner = accounts[0];
    const seeker = accounts[1];
    const solver = accounts[2];
    const platformTreasury = accounts[3];
    const platformRevenue = accounts[4];
    const taxTreasury = accounts[5];
    const disputeTreasury = accounts[6];

    const { nexus, erc6551 } = await nexusSetup(owner, true);

    const rewarder = await rewarderSetup(
        owner,
        true,
        nexus.target as string,
        await owner.getAddress()
    );

    const profileNFT = await profileNFTSetup(
        owner,
        nexus.target as string,
        true
    );

    const escrowNativeImplementation = await escrowNativeSetup(owner, true);
    const escrowTokenImplementation = await escrowTokenSetup(owner, true);

    const questImplementation = await questSetup(owner, true);

    const tavern = await tavernSetup(
        owner,
        questImplementation.target as string,
        escrowNativeImplementation.target as string,
        escrowTokenImplementation.target as string,
        nexus.target as string,
        true
    );

    const xpToken = await xpSetup(owner, true, await owner.getAddress());

    const { tierManager, taxManager } = await managersSetup(
        owner,
        true,
        xpToken
    );

    // Nexus setup
    {
        await nexus.setGuardian(await owner.getAddress());
        await nexus.setRewarder(rewarder.target);
        await nexus.setNFT(profileNFT.target);
        await nexus.setTaxManager(taxManager.target);
        await nexus.setTierManager(tierManager.target);
    }

    // Tavern setup
    {
        await tavern.setBarkeeper(await owner.getAddress());
        await tavern.setMediator(await owner.getAddress());
    }

    // Tax manager address and fees setup
    {
        await nexus.setTaxManager(taxManager.target);
        await taxManager.setPlatformTreasuryPool(
            await platformTreasury.getAddress()
        );
        await taxManager.setPlatformRevenuePool(
            await platformRevenue.getAddress()
        );
        await taxManager.setReferralTaxTreasury(await taxTreasury.getAddress());
        await taxManager.setDisputeFeesTreasury(
            await disputeTreasury.getAddress()
        );

        await taxManager.setSeekerFees(
            seekerTax.referralRewards,
            seekerTax.platformRevenue
        );

        await taxManager.setSolverFees(
            solverTax.referralRewards,
            solverTax.platformRevenue,
            solverTax.platformTreasury
        );

        await taxManager.setDisputeDepositRate(disputeTax);
    }

    // Tier manager setup
    {
        // Low values for easy testing
        await tierManager.setConditions(1, 1, 1, 1, 1, 1, 1);
        await tierManager.setConditions(2, 1, 1, 1, 1, 1, 1);
        await tierManager.setConditions(3, 1, 1, 1, 1, 1, 1);
        await tierManager.setConditions(4, 1, 1, 1, 1, 1, 1);
        await tierManager.setConditions(5, 1, 1, 1, 1, 1, 1);
    }

    return {
        accounts: {
            owner,
            seeker,
            solver,
        },
        contracts: {
            nexus,
            erc6551,
            rewarder,
            profileNFT,
            escrowNativeImplementation,
            escrowTokenImplementation,
            questImplementation,
            tavern,
            xpToken,
            tierManager,
            taxManager,
        },
    };
}
