import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTransactionReceipt, Signer } from "ethers";
import {
    EscrowNative,
    EscrowToken,
    MockNFT,
    MockRewarder,
    MockToken,
    Nexus,
    ProfileNFT,
    Quest,
    Rewarder,
    Tavern,
    TaxManager,
} from "../typechain-types";
import {
    fixture_tavern_unit_tests,
    full_integration_fixture,
} from "./helpers/fixtures";
import { parseEventLogs } from "./helpers/utils";
import { mockTokenSetup, selfDestructSetup } from "./helpers/setup";

describe("Tavern", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_unit_tests() {
        const accounts = await mockAccounts();
        return await fixture_tavern_unit_tests(accounts);
    }

    async function fixture_intergration_tests() {
        const accounts = await mockAccounts();
        return await full_integration_fixture(accounts);
    }

    describe("Unit Tests", function () {
        let accounts_: Signer[],
            quest_: Quest,
            escrowNative_: EscrowNative,
            escrowToken_: EscrowToken,
            mockRewarder_: MockRewarder,
            mockNft_: MockNFT,
            tavern_: Tavern,
            mockERC20_: MockToken,
            nexus_: Nexus,
            taxManager_: TaxManager;

        it("Tavern should be deployed, and initialized", async function () {
            const {
                accounts,
                quest,
                escrowNative,
                escrowToken,
                mockRewarder,
                mockNft,
                tavern,
                mockERC20,
                nexus,
                taxManager,
            } = await loadFixture(fixture_unit_tests);

            expect(await quest.initialized()).to.be.false;

            // TaxManager setup
            await nexus.setTaxManager(taxManager.target);
            await taxManager.setPlatformRevenuePool(
                await accounts[0].getAddress()
            );

            await nexus.setNFT(mockNft.target);

            accounts_ = accounts;
            quest_ = quest;
            escrowNative_ = escrowNative;
            escrowToken_ = escrowToken;
            mockRewarder_ = mockRewarder;
            mockNft_ = mockNft;
            tavern_ = tavern;
            mockERC20_ = mockERC20;
            nexus_ = nexus;
            taxManager_ = taxManager;
        });

        it("Initialized values should be correct", async function () {
            expect(await tavern_.escrowNativeImplementation()).to.equal(
                escrowNative_.target
            );

            expect(await tavern_.escrowTokenImplementation()).to.equal(
                escrowToken_.target
            );

            expect(await tavern_.questImplementation()).to.equal(quest_.target);

            expect(await tavern_.getProfileNFT()).to.equal(mockNft_.target);
        });

        it("Should not be able to create a new quest unless barkeeper", async function () {
            // Creating nfts for solver and seeker
            await mockNft_.mint(await accounts_[0].getAddress());
            await mockNft_.mint(await accounts_[1].getAddress());

            await expect(
                tavern_[
                    "createNewQuest(uint32,uint32,uint256,string,uint256,uint256)"
                ](0, 1, 1000, "Quest URI", 3, 1)
            ).to.be.revertedWith("only barkeeper");
        });

        it("Should not be able to set the barkeeper, if not owner", async function () {
            await expect(
                tavern_
                    .connect(accounts_[1])
                    .setBarkeeper(await accounts_[0].getAddress())
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to set the barkeeper", async function () {
            await tavern_.setBarkeeper(await accounts_[0].getAddress());

            expect(await tavern_.getBarkeeper()).to.equal(
                await accounts_[0].getAddress()
            );
        });

        let nativeQuest_: Quest, tokenQuest_: Quest;

        it("Barkeeper should be able to create a new native quest", async function () {
            const trx = await tavern_[
                "createNewQuest(uint32,uint32,uint256,string,uint256,uint256)"
            ](0, 1, 1000, "Quest URI", 3, 1);

            const receipt = (await trx.wait()) as ContractTransactionReceipt;

            expect(receipt).to.be.ok;

            const keys = [
                "solverId",
                "seekerId",
                "quest",
                "maxExtension",
                "escrowImplementation",
                "paymentAmount",
            ];

            const createdQuest = parseEventLogs(
                receipt.logs,
                tavern_.interface,
                "QuestCreatedNative",
                keys
            );

            expect(createdQuest).to.be.ok;

            expect(createdQuest.solverId).to.equal(0n);
            expect(createdQuest.seekerId).to.equal(1n);
            expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
            expect(createdQuest.escrowImplementation).to.equal(
                escrowNative_.target
            );
            expect(createdQuest.paymentAmount).to.equal(1000);

            const nativeQuest = await ethers.getContractAt(
                "Quest",
                createdQuest.quest
            );

            nativeQuest_ = nativeQuest;
        });

        it("Should be able to create an erc20 token quest", async function () {
            const trx = await tavern_[
                "createNewQuest(uint32,uint32,uint256,string,uint256,address,uint256)"
            ](0, 1, 1000, "Quest URI", 3, mockERC20_.target, 2);

            const receipt = (await trx.wait()) as ContractTransactionReceipt;

            expect(receipt).to.be.ok;

            const keys = [
                "solverId",
                "seekerId",
                "quest",
                "maxExtension",
                "escrowImplementation",
                "paymentAmount",
                "token",
            ];

            const createdQuest = parseEventLogs(
                receipt.logs,
                tavern_.interface,
                "QuestCreatedToken",
                keys
            );

            expect(createdQuest).to.be.ok;

            expect(createdQuest.solverId).to.equal(0n);
            expect(createdQuest.seekerId).to.equal(1n);
            expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
            expect(createdQuest.escrowImplementation).to.equal(
                escrowToken_.target
            );
            expect(createdQuest.paymentAmount).to.equal(1000);

            const tokenQuest = await ethers.getContractAt(
                "Quest",
                createdQuest.quest
            );

            tokenQuest_ = tokenQuest;
        });

        it("Should be able to confirmNFTOwnership of an address with an nft from the tavern contract", async function () {
            // A valid account should return true
            expect(
                await tavern_.confirmNFTOwnership(
                    await accounts_[0].getAddress()
                )
            ).to.be.true;

            // An invalid account should return false
            expect(
                await tavern_.confirmNFTOwnership(
                    await accounts_[2].getAddress()
                )
            ).to.be.false;
        });

        it("Should be able to get the owner of an NFT from the tavern contract", async function () {
            expect(await tavern_.ownerOf(0)).to.equal(
                await accounts_[0].getAddress()
            );
        });

        // it.skip("Should not be able to set profileNFT unless owner", async function () {
        //     await expect(
        //         tavern_.connect(accounts_[1]).setProfileNft(mockNft_.target)
        //     ).to.be.revertedWith("only owner");

        //     expect(await tavern_.getProfileNFT()).to.equal(mockNft_.target);

        //     await tavern_.setProfileNft(await accounts_[1].getAddress());

        //     expect(await tavern_.getProfileNFT()).to.equal(
        //         await accounts_[1].getAddress()
        //     );
        // });

        it("Should not be able to setQuestImplementation unless owner", async function () {
            await expect(
                tavern_
                    .connect(accounts_[1])
                    .setQuestImplementation(quest_.target)
            ).to.be.revertedWith("only owner");

            expect(await tavern_.questImplementation()).to.equal(quest_.target);

            await tavern_.setQuestImplementation(
                await accounts_[1].getAddress()
            );

            expect(await tavern_.questImplementation()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Should not be able to setEscrowNativeImplementation unless owner", async function () {
            await expect(
                tavern_
                    .connect(accounts_[1])
                    .setEscrowNativeImplementation(escrowNative_.target)
            ).to.be.revertedWith("only owner");

            expect(await tavern_.escrowNativeImplementation()).to.equal(
                escrowNative_.target
            );

            await tavern_.setEscrowNativeImplementation(
                await accounts_[1].getAddress()
            );

            expect(await tavern_.escrowNativeImplementation()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Should not be able to setEscrowTokenImplementation unless owner", async function () {
            await expect(
                tavern_
                    .connect(accounts_[1])
                    .setEscrowTokenImplementation(escrowToken_.target)
            ).to.be.revertedWith("only owner");

            expect(await tavern_.escrowTokenImplementation()).to.equal(
                escrowToken_.target
            );

            await tavern_.setEscrowTokenImplementation(
                await accounts_[1].getAddress()
            );

            expect(await tavern_.escrowTokenImplementation()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Should not be able to setMediator unless owner", async function () {
            await expect(
                tavern_
                    .connect(accounts_[1])
                    .setMediator(await accounts_[0].getAddress())
            ).to.be.revertedWith("only owner");

            expect(await tavern_.mediator()).to.equal(ethers.ZeroAddress);

            await tavern_.setMediator(await accounts_[1].getAddress());

            expect(await tavern_.mediator()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Should not be able to setReviewPeriod unless owner", async function () {
            await expect(
                tavern_.connect(accounts_[1]).setReviewPeriod(1000)
            ).to.be.revertedWith("only owner");

            expect(await tavern_.reviewPeriod()).to.equal(1n);

            await tavern_.setReviewPeriod(1000n);

            expect(await tavern_.reviewPeriod()).to.equal(1000n);
        });

        it("Should not be able to recoverTokens unless owner", async function () {
            await mockERC20_.mint(tavern_.target, 1000);

            expect(await mockERC20_.balanceOf(tavern_.target)).to.equal(1000);

            expect(
                await mockERC20_.balanceOf(await accounts_[0].getAddress())
            ).to.equal(0);

            await expect(
                tavern_
                    .connect(accounts_[1])
                    .recoverTokens(
                        mockERC20_.target,
                        await accounts_[0].getAddress()
                    )
            ).to.be.revertedWith("only owner");
        });
    });

    describe("Integration Tests", function () {
        let accounts_: {
                owner: Signer;
                seeker: Signer;
                solver: Signer;
            },
            rewarder: Rewarder,
            profileNFT: ProfileNFT,
            tavern: Tavern;

        it("Tavern should be deployed, and initialized and setup", async function () {
            const { accounts, contracts } = await loadFixture(
                fixture_intergration_tests
            );

            expect(
                await contracts.tavern.escrowNativeImplementation()
            ).to.equal(contracts.escrowNativeImplementation.target);

            expect(await contracts.tavern.escrowTokenImplementation()).to.equal(
                contracts.escrowTokenImplementation.target
            );

            expect(await contracts.tavern.questImplementation()).to.equal(
                contracts.questImplementation.target
            );

            expect(await contracts.tavern.getProfileNFT()).to.equal(
                contracts.profileNFT.target
            );

            expect(await contracts.tavern.getBarkeeper()).to.equal(
                await accounts.owner.getAddress()
            );

            expect(await contracts.tavern.owner()).to.equal(
                await accounts.owner.getAddress()
            );

            expect(await contracts.tavern.nexus()).to.equal(
                contracts.nexus.target
            );

            // Create profiles
            await contracts.nexus.createProfile(
                0,
                await accounts.seeker.getAddress(),
                "SeekerProfile",
                ethers.encodeBytes32String("0")
            );

            await contracts.nexus.createProfile(
                0,
                await accounts.solver.getAddress(),
                "SolverProfile",
                ethers.encodeBytes32String("0")
            );

            rewarder = contracts.rewarder;
            profileNFT = contracts.profileNFT;
            tavern = contracts.tavern;
            accounts_ = accounts;
        });

        it("Only barkeeper should be able to create a new quest", async function () {
            // Creates native quest
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    [
                        "createNewQuest(uint32,uint32,uint256,string,uint256,uint256)"
                    ](0, 1, 1000, "Quest URI", 3, 1)
            ).to.be.revertedWith("only barkeeper");

            // Creates token quest
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    [
                        "createNewQuest(uint32,uint32,uint256,string,uint256,address,uint256)"
                    ](0, 1, 1000, "Quest URI", 3, ethers.ZeroAddress, 1)
            ).to.be.revertedWith("only barkeeper");
        });

        it("Barkeeper should be able to create a new native quest", async function () {
            const trx = await tavern
                .connect(accounts_.owner)
                [
                    "createNewQuest(uint32,uint32,uint256,string,uint256,uint256)"
                ](1, 2, 1000, "Quest URI", 3, 1);

            const receipt = (await trx.wait()) as ContractTransactionReceipt;

            expect(receipt).to.be.ok;

            const keys = [
                "seekerId",
                "solverId",
                "quest",
                "maxExtension",
                "escrowImplementation",
                "paymentAmount",
            ];

            const createdQuest = parseEventLogs(
                receipt.logs,
                tavern.interface,
                "QuestCreatedNative",
                keys
            );

            expect(createdQuest).to.be.ok;

            expect(createdQuest.seekerId).to.equal(1);
            expect(createdQuest.solverId).to.equal(2);
            expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
            expect(createdQuest.escrowImplementation).to.equal(
                await tavern.escrowNativeImplementation()
            );
            expect(createdQuest.paymentAmount).to.equal(1000);
        });

        it("Barkeeper should be able to create an erc20 token quest", async function () {
            const trx = await tavern
                .connect(accounts_.owner)
                [
                    "createNewQuest(uint32,uint32,uint256,string,uint256,address,uint256)"
                ](1, 2, 1000, "Quest URI", 3, ethers.ZeroAddress, 2);

            const receipt = (await trx.wait()) as ContractTransactionReceipt;

            expect(receipt).to.be.ok;

            const keys = [
                "seekerId",
                "solverId",
                "quest",
                "maxExtension",
                "escrowImplementation",
                "paymentAmount",
                "token",
            ];

            const createdQuest = parseEventLogs(
                receipt.logs,
                tavern.interface,
                "QuestCreatedToken",
                keys
            );

            expect(createdQuest).to.be.ok;

            expect(createdQuest.seekerId).to.equal(1);
            expect(createdQuest.solverId).to.equal(2);
            expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
            expect(createdQuest.escrowImplementation).to.equal(
                await tavern.escrowTokenImplementation()
            );
            expect(createdQuest.paymentAmount).to.equal(1000);
        });

        it("Contract should start with not paused", async function () {
            expect(await tavern.paused()).to.be.false;
        });

        it("Only barkeeper should be able to changes the paused state", async function () {
            await expect(
                tavern.connect(accounts_.seeker).pause()
            ).to.be.revertedWith("only barkeeper");
            await expect(
                tavern.connect(accounts_.seeker).unpause()
            ).to.be.revertedWith("only barkeeper");
        });

        it("barkeeper should be able to pause and unpause the contract", async function () {
            await tavern.pause();
            expect(await tavern.paused()).to.be.true;

            await tavern.unpause();
            expect(await tavern.paused()).to.be.false;
        });

        it("Only owner should be able to set the barkeeper", async function () {
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    .setBarkeeper(await accounts_.owner.getAddress())
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to set the barkeeper", async function () {
            await tavern.setBarkeeper(await accounts_.seeker.getAddress());
            expect(await tavern.getBarkeeper()).to.equal(
                await accounts_.seeker.getAddress()
            );

            await tavern.setBarkeeper(await accounts_.owner.getAddress());
        });

        // it.skip("Only owner should be able to set the profileNFT", async function () {
        //     await expect(
        //         tavern
        //             .connect(accounts_.seeker)
        //             .setProfileNft(await accounts_.owner.getAddress())
        //     ).to.be.revertedWith("only owner");
        // });

        // it.skip("Owner should be able to set the profileNFT", async function () {
        //     const originalProfileNFT = await tavern.getProfileNFT();

        //     await tavern.setProfileNft(await accounts_.seeker.getAddress());
        //     expect(await tavern.getProfileNFT()).to.equal(
        //         await accounts_.seeker.getAddress()
        //     );

        //     await tavern.setProfileNft(originalProfileNFT);
        // });

        it("Only owner should be able to set the questImplementation", async function () {
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    .setQuestImplementation(await accounts_.owner.getAddress())
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to set the questImplementation", async function () {
            const originalQuestImplementation =
                await tavern.questImplementation();

            await tavern.setQuestImplementation(
                await accounts_.seeker.getAddress()
            );
            expect(await tavern.questImplementation()).to.equal(
                await accounts_.seeker.getAddress()
            );

            await tavern.setQuestImplementation(originalQuestImplementation);
        });

        it("Only owner should be able to set the escrowNativeImplementation", async function () {
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    .setEscrowNativeImplementation(
                        await accounts_.owner.getAddress()
                    )
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to set the escrowNativeImplementation", async function () {
            const originalEscrowNativeImplementation =
                await tavern.escrowNativeImplementation();

            await tavern.setEscrowNativeImplementation(
                await accounts_.seeker.getAddress()
            );
            expect(await tavern.escrowNativeImplementation()).to.equal(
                await accounts_.seeker.getAddress()
            );

            await tavern.setEscrowNativeImplementation(
                originalEscrowNativeImplementation
            );
        });

        it("Only owner should be able to set the escrowTokenImplementation", async function () {
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    .setEscrowTokenImplementation(
                        await accounts_.owner.getAddress()
                    )
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to set the escrowTokenImplementation", async function () {
            const originalEscrowTokenImplementation =
                await tavern.escrowTokenImplementation();

            await tavern.setEscrowTokenImplementation(
                await accounts_.seeker.getAddress()
            );
            expect(await tavern.escrowTokenImplementation()).to.equal(
                await accounts_.seeker.getAddress()
            );

            await tavern.setEscrowTokenImplementation(
                originalEscrowTokenImplementation
            );
        });

        it("Only owner should be able to set the mediator", async function () {
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    .setMediator(await accounts_.owner.getAddress())
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to set the mediator", async function () {
            const originalMediator = await tavern.mediator();

            await tavern.setMediator(await accounts_.seeker.getAddress());
            expect(await tavern.mediator()).to.equal(
                await accounts_.seeker.getAddress()
            );

            await tavern.setMediator(originalMediator);
        });

        it("Only owner should be able to set the reviewPeriod", async function () {
            await expect(
                tavern.connect(accounts_.seeker).setReviewPeriod(1000)
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to set the reviewPeriod", async function () {
            const originalReviewPeriod = await tavern.reviewPeriod();

            await tavern.setReviewPeriod(1000);
            expect(await tavern.reviewPeriod()).to.equal(1000);

            await tavern.setReviewPeriod(originalReviewPeriod);
        });

        it("Only owner should be able to recoverTokens", async function () {
            await expect(
                tavern
                    .connect(accounts_.seeker)
                    .recoverTokens(
                        ethers.ZeroAddress,
                        await accounts_.owner.getAddress()
                    )
            ).to.be.revertedWith("only owner");
        });

        it("Owner should be able to recoverTokens native", async function () {
            const selfDestruct = await selfDestructSetup(true);

            // Transfer eth to tavern
            await accounts_.solver.sendTransaction({
                to: selfDestruct.target,
                value: ethers.parseEther("1.0"),
            });

            await selfDestruct.sendEther(tavern.target);

            const balanceBefore = await ethers.provider.getBalance(
                tavern.target
            );

            expect(balanceBefore).to.equal(ethers.parseEther("1.0"));

            const ownerBalanceBefore = await ethers.provider.getBalance(
                await accounts_.seeker.getAddress()
            );

            await tavern.recoverTokens(
                ethers.ZeroAddress,
                await accounts_.seeker.getAddress()
            );

            const balanceAfter = await ethers.provider.getBalance(
                tavern.target
            );

            expect(balanceAfter).to.equal(0);

            const ownerBalanceAfter = await ethers.provider.getBalance(
                await accounts_.seeker.getAddress()
            );

            expect(ownerBalanceAfter).to.equal(
                ownerBalanceBefore + ethers.parseEther("1.0")
            );
        });

        it("Owner should be able to recoverTokens erc20", async function () {
            const mockToken = await mockTokenSetup(
                "mockToken",
                "mToken",
                18,
                true
            );

            await mockToken.mint(tavern.target, 1000);

            expect(await mockToken.balanceOf(tavern.target)).to.equal(1000);

            expect(
                await mockToken.balanceOf(await accounts_.owner.getAddress())
            ).to.equal(0);

            await tavern.recoverTokens(
                mockToken.target,
                await accounts_.owner.getAddress()
            );

            expect(await mockToken.balanceOf(tavern.target)).to.equal(0);
            expect(
                await mockToken.balanceOf(await accounts_.owner.getAddress())
            ).to.equal(1000);
        });

        it("Get rewarder should revert when contract is paused", async function () {
            await tavern.pause();
            await expect(tavern.getRewarder()).to.be.revertedWithCustomError(
                tavern,
                "EnforcedPause"
            );
            await tavern.unpause();
        });

        it("Get rewarder should return the rewarder contract", async function () {
            expect(await tavern.getRewarder()).to.equal(rewarder.target);
        });

        it("Get profile nft sjould revert when contract is paused", async function () {
            await tavern.pause();
            await expect(tavern.getProfileNFT()).to.be.revertedWithCustomError(
                tavern,
                "EnforcedPause"
            );
            await tavern.unpause();
        });

        it("Get profile nft should return the profile nft contract", async function () {
            expect(await tavern.getProfileNFT()).to.equal(profileNFT.target);
        });

        it("OwnerOf should revert when contract is paused", async function () {
            await tavern.pause();
            await expect(tavern.ownerOf(0)).to.be.revertedWithCustomError(
                tavern,
                "EnforcedPause"
            );
            await tavern.unpause();
        });

        it("OwnerOf should return the owner of the nft", async function () {
            expect(await tavern.ownerOf(1)).to.equal(
                await accounts_.seeker.getAddress()
            );
        });
    });
});
