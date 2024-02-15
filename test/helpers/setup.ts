import { ethers } from "hardhat";
import {
    EscrowNative,
    MockExecute,
    MockExecuteEth,
    MockNFT,
    Nexus,
    ProfileNFT,
    Quest,
    Tavern,
    TierManager,
} from "../../typechain-types";
import { ERC6551Setup, Managers, MockExecutes, Nexus6551 } from "./types";

// Mock Deployments

export async function deployMockExecute(
    silence: Boolean
): Promise<MockExecute> {
    const mockExecute = await ethers.deployContract("MockExecute");
    await mockExecute.waitForDeployment();

    if (!silence) {
        console.log(`MockExecute deployed to ${mockExecute.target}`);
    }

    return mockExecute;
}

export async function deployMockExecuteEth(
    silence: Boolean
): Promise<MockExecuteEth> {
    const mockExecuteEth = await ethers.deployContract("MockExecuteEth");
    await mockExecuteEth.waitForDeployment();

    if (!silence) {
        console.log(`MockExecuteEth deployed to ${mockExecuteEth.target}`);
    }

    return mockExecuteEth;
}

export async function deployMockExecutes(
    silence: Boolean
): Promise<MockExecutes> {
    const mockExecute = await deployMockExecute(silence);
    const mockExecuteEth = await deployMockExecuteEth(silence);

    return {
        mockExecute,
        mockExecuteEth,
    };
}

export async function mockNFTSetup(silence: Boolean): Promise<MockNFT> {
    const mockNFT = await ethers.deployContract("MockNFT");
    await mockNFT.waitForDeployment();

    if (!silence) {
        console.log(`MockNFT deployed to ${mockNFT.target}`);
    }

    return mockNFT;
}

// Contract Setups

export async function erc6551Setup(silence: Boolean): Promise<ERC6551Setup> {
    const erc6551Registry = await ethers.deployContract("ERC6551Registry");

    await erc6551Registry.waitForDeployment();

    if (!silence) {
        console.log(`ERC6551Registry deployed to ${erc6551Registry.target}`);
    }

    const erc6551Account = await ethers.deployContract(
        "ReferralHandlerERC6551Account"
    );

    await erc6551Account.waitForDeployment();

    if (!silence) {
        console.log(`ERC6551Account deployed to ${erc6551Account.target}`);
    }

    return {
        registry: erc6551Registry,
        account: erc6551Account,
    };
}

export async function nexusSetup(silence: Boolean): Promise<Nexus6551> {
    const erc6551 = await erc6551Setup(silence);

    const nexus = await ethers.deployContract("Nexus", [
        erc6551.account.target,
        erc6551.registry.target,
    ]);

    await nexus.waitForDeployment();

    if (!silence) {
        console.log(`Nexus deployed to ${nexus.target}`);
    }

    return { nexus, erc6551 };
}

export async function profileNFTSetup(
    nexus: Nexus,
    silence: Boolean
): Promise<ProfileNFT> {
    const profileNFT = await ethers.deployContract("ProfileNFT", [
        nexus.target,
    ]);

    await profileNFT.waitForDeployment();

    if (!silence) {
        console.log(`ProfileNFT deployed to ${profileNFT.target}`);
    }

    return profileNFT;
}

// TODO: only deploys escrowNative for now
export async function escrowSetup(): Promise<EscrowNative> {
    const escrow = await ethers.deployContract("EscrowNative");

    await escrow.waitForDeployment();

    console.log(`Escrow deployed to ${escrow.target}`);

    return escrow;
}

export async function questSetup(): Promise<Quest> {
    const quest = await ethers.deployContract("Quest");

    await quest.waitForDeployment();

    console.log(`Quest deployed to ${quest.target}`);

    return quest;
}

export async function tierManagerSetup(silence: Boolean): Promise<TierManager> {
    const tierManager = await ethers.deployContract("TierManager");
    await tierManager.waitForDeployment();

    if (!silence) {
        console.log(`TierManager deployed to ${tierManager.target}`);
    }

    return tierManager;
}

export async function taxManagerSetup(silence: Boolean) {
    const taxManager = await ethers.deployContract("TaxManager");
    await taxManager.waitForDeployment();

    if (!silence) {
        console.log(`TaxManager deployed to ${taxManager.target}`);
    }

    return taxManager;
}

export async function managersSetup(silence: Boolean): Promise<Managers> {
    const tierManager = await tierManagerSetup(silence);
    const taxManager = await taxManagerSetup(silence);

    return {
        tierManager,
        taxManager,
    };
}

// TODO: add actual escrow token instead of using escrowNative for both
export async function tavernSetup(
    quest: Quest,
    escrowNative: EscrowNative,
    escrowToken: EscrowNative,
    profileNFT: ProfileNFT
): Promise<Tavern> {
    const tavern = await ethers.deployContract("Tavern", [
        quest.target,
        escrowNative.target,
        escrowToken.target,
        profileNFT.target,
    ]);

    await tavern.waitForDeployment();

    console.log(`Tavern deployed to ${tavern.target}`);

    return tavern;
}

export async function setup(silence: Boolean) {
    const { nexus, erc6551 } = await nexusSetup(silence);
    const profileNFT = await profileNFTSetup(nexus, silence);

    const escrow = await escrowSetup();
    const quest = await questSetup();

    const tavern = await tavernSetup(quest, escrow, escrow, profileNFT);

    return {
        erc6551,
        nexus,
        profileNFT,
        tavern,
    };
}
