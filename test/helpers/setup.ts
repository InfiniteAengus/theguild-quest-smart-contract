import { ethers } from "hardhat";
import {
    EscrowNative,
    EscrowToken,
    GuildXp,
    MockExecute,
    MockExecuteEth,
    MockNFT,
    MockRewarder,
    MockToken,
    Nexus,
    ProfileNFT,
    Quest,
    Rewarder,
    SelfDestruct,
    Tavern,
    TierManager,
} from "../../typechain-types";
import { ERC6551Setup, Managers, MockExecutes, Nexus6551 } from "./types";
import { Signer } from "ethers";

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

export async function mockTokenSetup(
    name: string,
    symbol: string,
    decimals: number,
    silence: Boolean
): Promise<MockToken> {
    const mockToken = await ethers.deployContract("MockToken", [
        name,
        symbol,
        decimals,
    ]);
    await mockToken.waitForDeployment();

    if (!silence) {
        console.log(`MockToken deployed to ${mockToken.target}`);
    }

    return mockToken;
}

export async function selfDestructSetup(
    silence: Boolean
): Promise<SelfDestruct> {
    const selfDestruct = await ethers.deployContract("SelfDestruct");
    await selfDestruct.waitForDeployment();

    if (!silence) {
        console.log(`SelfDestruct deployed to ${selfDestruct.target}`);
    }

    return selfDestruct;
}

export async function mockFailReceiverSetup(silence: Boolean) {
    const mockFailReceiver = await ethers.deployContract("MockFailReceiver");
    await mockFailReceiver.waitForDeployment();

    if (!silence) {
        console.log(`MockFailReceiver deployed to ${mockFailReceiver.target}`);
    }

    return mockFailReceiver;
}

export async function mockRewarderSetup(
    silence: Boolean,
    account: Signer,
    nexus: Nexus
) {
    const mockRewarder = await ethers.deployContract("MockRewarder", [
        account,
        nexus.target,
    ]);
    await mockRewarder.waitForDeployment();

    if (!silence) {
        console.log(`MockRewarder deployed to ${mockRewarder.target}`);
    }

    return mockRewarder;
}

export async function mockQuestSetup(
    silence: Boolean,
    escrow: EscrowNative | EscrowToken,
    token: string,
    mockRewarder: MockRewarder
) {
    const quest = await ethers.deployContract("MockQuest");

    await quest.waitForDeployment();

    if (!silence) {
        console.log(`MockQuest deployed to ${quest.target}`);
    }

    return quest;
}

export async function mockTavernSetup(
    silence: Boolean,
    nexus: Nexus,
    escrowNative: EscrowNative,
    escrowToken: EscrowToken,
    quest: Quest,
    accounts: Signer[],
    rewarder: MockRewarder
) {
    const mockTavern = await ethers.deployContract("MockTavern", [
        quest.target,
        escrowNative.target,
        escrowToken.target,
        await accounts[0].getAddress(),
        await accounts[1].getAddress(),
        rewarder.target,
        nexus.target,
    ]);
    await mockTavern.waitForDeployment();

    if (!silence) {
        console.log(`MockTavern deployed to ${mockTavern.target}`);
    }

    return mockTavern;
}

export async function mockEscrowSetup(silence: Boolean) {
    const mockEscrow = await ethers.deployContract("MockEscrow");
    await mockEscrow.waitForDeployment();

    if (!silence) {
        console.log(`MockEscrow deployed to ${mockEscrow.target}`);
    }

    return mockEscrow;
}

// Contract Setups

export async function erc6551Setup(
    deployer: Signer,
    silence: Boolean
): Promise<ERC6551Setup> {
    const erc6551Registry = await ethers.deployContract("ERC6551Registry", {
        signer: deployer,
    });

    await erc6551Registry.waitForDeployment();

    if (!silence) {
        console.log(`ERC6551Registry deployed to ${erc6551Registry.target}`);
    }

    const erc6551Account = await ethers.deployContract(
        "ReferralHandlerERC6551Account",
        {
            signer: deployer,
        }
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

export async function nexusDeploy(
    deployer: Signer,
    account: string,
    registry: string,
    silence: Boolean
): Promise<Nexus> {
    const nexus = await ethers.deployContract("Nexus", [account, registry], {
        signer: deployer,
    });

    await nexus.waitForDeployment();

    if (!silence) {
        console.log(`Nexus deployed to ${nexus.target}`);
    }

    return nexus;
}

export async function nexusSetup(
    deployer: Signer,
    silence: Boolean
): Promise<Nexus6551> {
    const erc6551 = await erc6551Setup(deployer, silence);

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
    deployer: Signer,
    nexus: string,
    silence: Boolean
): Promise<ProfileNFT> {
    const profileNFT = await ethers.deployContract("ProfileNFT", [nexus], {
        signer: deployer,
    });

    await profileNFT.waitForDeployment();

    if (!silence) {
        console.log(`ProfileNFT deployed to ${profileNFT.target}`);
    }

    return profileNFT;
}

export async function escrowNativeSetup(
    deployer: Signer,
    silence: Boolean
): Promise<EscrowNative> {
    const escrow = await ethers.deployContract("EscrowNative", {
        signer: deployer,
    });

    await escrow.waitForDeployment();

    if (!silence) {
        console.log(`Escrow deployed to ${escrow.target}`);
    }

    return escrow;
}

export async function escrowTokenSetup(
    deployer: Signer,
    silence: Boolean
): Promise<EscrowToken> {
    const escrow = await ethers.deployContract("EscrowToken", {
        signer: deployer,
    });

    await escrow.waitForDeployment();

    if (!silence) {
        console.log(`Escrow deployed to ${escrow.target}`);
    }

    return escrow;
}

export async function questSetup(
    deployer: Signer,
    silence: Boolean
): Promise<Quest> {
    const quest = await ethers.deployContract("Quest", { signer: deployer });

    await quest.waitForDeployment();

    if (!silence) {
        console.log(`Quest deployed to ${quest.target}`);
    }

    return quest;
}

export async function tierManagerSetup(
    deployer: Signer,
    silence: Boolean,
    xpToken: string
): Promise<TierManager> {
    const tierManager = await ethers.deployContract("TierManager", [xpToken], {
        signer: deployer,
    });
    await tierManager.waitForDeployment();

    if (!silence) {
        console.log(`TierManager deployed to ${tierManager.target}`);
    }

    return tierManager;
}

export async function taxManagerSetup(deployer: Signer, silence: Boolean) {
    const taxManager = await ethers.deployContract("TaxManager", {
        signer: deployer,
    });
    await taxManager.waitForDeployment();

    if (!silence) {
        console.log(`TaxManager deployed to ${taxManager.target}`);
    }

    return taxManager;
}

export async function managersSetup(
    deployer: Signer,
    silence: Boolean,
    xpToken: GuildXp
): Promise<Managers> {
    const tierManager = await tierManagerSetup(
        deployer,
        silence,
        xpToken.target as string
    );
    const taxManager = await taxManagerSetup(deployer, silence);

    return {
        tierManager,
        taxManager,
    };
}

export async function xpSetup(
    deployer: Signer,
    silence: Boolean,
    signer: string
): Promise<GuildXp> {
    const guildXp = await ethers.deployContract("GuildXp", [signer], {
        signer: deployer,
    });
    await guildXp.waitForDeployment();

    if (!silence) {
        console.log(`GuildXp deployed to ${guildXp.target}`);
    }

    return guildXp;
}

export async function rewarderSetup(
    deployer: Signer,
    silence: Boolean,
    nexus: string,
    account: string
): Promise<Rewarder> {
    const rewarder = await ethers.deployContract("Rewarder", [account, nexus], {
        signer: deployer,
    });

    await rewarder.waitForDeployment();

    if (!silence) {
        console.log(`Rewarder deployed to ${rewarder.target}`);
    }

    return rewarder;
}

export async function tavernSetup(
    deployer: Signer,
    quest: string,
    escrowNative: string,
    escrowToken: string,
    nexus: string,
    silence: Boolean
): Promise<Tavern> {
    const tavern = await ethers.deployContract(
        "Tavern",
        [quest, escrowNative, escrowToken, nexus],
        { signer: deployer }
    );

    await tavern.waitForDeployment();

    if (!silence) {
        console.log(`Tavern deployed to ${tavern.target}`);
    }

    return tavern;
}

export async function setup(deployer: Signer, silence: Boolean) {
    const { nexus, erc6551 } = await nexusSetup(deployer, silence);
    const profileNFT = await profileNFTSetup(
        deployer,
        nexus.target as string,
        silence
    );

    const escrowNative = await escrowNativeSetup(deployer, silence);
    const escrowToken = await escrowTokenSetup(deployer, silence);
    const quest = await questSetup(deployer, true);

    const tavern = await tavernSetup(
        deployer,
        quest.target as string,
        escrowNative.target as string,
        escrowToken.target as string,
        nexus.target as string,
        true
    );

    return {
        erc6551,
        nexus,
        profileNFT,
        tavern,
    };
}
