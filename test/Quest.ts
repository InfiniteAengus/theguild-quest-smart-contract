import {
    loadFixture,
    takeSnapshot,
    mine,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, ContractTransactionReceipt } from "ethers";
import {
    EscrowNative,
    MockRewarder,
    MockTavern,
    Nexus,
    Quest,
    TaxManager,
    EscrowToken,
    MockToken,
    Tavern,
} from "../typechain-types";
import {
    fixture_profile_nft_integration_tests,
    fixture_quest_unit_tests,
    full_integration_fixture,
} from "./helpers/fixtures";
import { calculateTaxAmount, parseEventLogs } from "./helpers/utils";
import { SeekerTax, SolverTax } from "./helpers/types";

describe("Quest", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_unit_tests() {
        const accounts = await mockAccounts();
        return await fixture_quest_unit_tests(accounts);
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
            mockTavern_: MockTavern,
            mockRewarder_: MockRewarder,
            taxManager_: TaxManager,
            nexus_: Nexus,
            mockToken_: MockToken;

        it("Quest should be deployed, but not yet initialized", async function () {
            const {
                mockTavern,
                accounts,
                quest,
                escrowToken,
                escrowNative,
                mockRewarder,
                taxManager,
                nexus,
                mockToken,
            } = await loadFixture(fixture_unit_tests);

            expect(await quest.initialized()).to.be.false;

            // Tax manager setup
            await nexus.setTaxManager(taxManager.target);

            await taxManager.setPlatformRevenuePool(
                await accounts[4].getAddress()
            );
            await taxManager.setReferralTaxTreasury(
                await accounts[4].getAddress()
            );

            // Setting 10% fees to be paid out to the platform
            await taxManager.setSeekerFees(0, 1000);

            accounts_ = accounts;
            quest_ = quest;
            escrowNative_ = escrowNative;
            escrowToken_ = escrowToken;
            mockTavern_ = mockTavern;
            mockRewarder_ = mockRewarder;
            taxManager_ = taxManager;
            nexus_ = nexus;
            mockToken_ = mockToken;
        });

        it("Should be able to initialize the contract and update values", async function () {
            await quest_.initialize(
                0,
                1,
                1000,
                "Quest URI",
                3,
                escrowNative_.target,
                ethers.ZeroAddress
            );

            expect(await quest_.initialized()).to.be.true;

            expect(await quest_.seekerId()).to.equal(0);
            expect(await quest_.solverId()).to.equal(1);

            expect(await quest_.paymentAmount()).to.equal(1000);

            expect(await quest_.infoURI()).to.equal("Quest URI");

            expect(await quest_.escrowImplementation()).to.equal(
                escrowNative_.target
            );

            expect(await quest_.token()).to.equal(ethers.ZeroAddress);
        });

        it("Should not be able to initialize the contract again", async function () {
            await expect(
                quest_.initialize(
                    0,
                    1,
                    1000,
                    "Quest URI",
                    3,
                    escrowNative_.target,
                    ethers.ZeroAddress
                )
            ).to.be.reverted;
        });

        let nativeQuestInstance: Quest, tokenQuestInstance: Quest;

        it("Should be able to create a native quest through the tavern and be initialized in the same transaction", async function () {
            await mockTavern_.setBarkeeper(await accounts_[0].getAddress());
            await mockTavern_.setMediator(await accounts_[2].getAddress());

            const trx = await mockTavern_[
                "createNewQuest(uint32,uint32,uint256,string,uint256)"
            ](0, 1, 1000, "Quest URI", 3);

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
                mockTavern_.interface,
                "QuestCreatedNative",
                keys
            );

            expect(createdQuest).to.be.ok;

            expect(createdQuest.solverId).to.equal(0);
            expect(createdQuest.seekerId).to.equal(1);
            expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
            expect(createdQuest.escrowImplementation).to.equal(
                escrowNative_.target
            );
            expect(createdQuest.paymentAmount).to.equal(1000);

            nativeQuestInstance = await ethers.getContractAt(
                "Quest",
                createdQuest.quest
            );

            expect(await nativeQuestInstance.initialized()).to.be.true;
        });

        it("Should be able to create a token quest through the tavern and be initialized in the same transaction", async function () {
            const trx = await mockTavern_[
                "createNewQuest(uint32,uint32,uint256,string,uint256,address)"
            ](0, 1, 1000, "Quest URI", 3, mockToken_.target);

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
                mockTavern_.interface,
                "QuestCreatedToken",
                keys
            );

            expect(createdQuest).to.be.ok;

            expect(createdQuest.solverId).to.equal(0);
            expect(createdQuest.seekerId).to.equal(1);
            expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
            expect(createdQuest.escrowImplementation).to.equal(
                escrowToken_.target
            );
            expect(createdQuest.paymentAmount).to.equal(1000);
            expect(createdQuest.token).to.equal(mockToken_.target);

            tokenQuestInstance = await ethers.getContractAt(
                "Quest",
                createdQuest.quest
            );

            expect(await tokenQuestInstance.initialized()).to.be.true;
        });

        it("Should be able to get the rewarder from tavern contract", async function () {
            expect(await nativeQuestInstance.getRewarder()).to.equal(
                mockRewarder_.target
            );
        });

        it("Only seeker should be able to start native quest", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).startQuest()
            ).to.be.revertedWith("only Seeker");
        });

        it("Only seeker should be able to start token quest", async function () {
            await expect(
                tokenQuestInstance.connect(accounts_[1]).startQuest()
            ).to.be.revertedWith("only Seeker");
        });

        it("Should not be able to start dispute unless native quest has been started", async function () {
            await expect(nativeQuestInstance.startDispute()).to.be.revertedWith(
                "quest not started"
            );
        });

        it("Should not be able to start dispute unless token quest has been started", async function () {
            await expect(tokenQuestInstance.startDispute()).to.be.revertedWith(
                "quest not started"
            );
        });

        it("Should not be able to finish native quest unless the quest has been started", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).finishQuest()
            ).to.be.revertedWith("quest not started");
        });

        it("Should not be able to finish token quest unless the quest has been started", async function () {
            await expect(
                tokenQuestInstance.connect(accounts_[1]).finishQuest()
            ).to.be.revertedWith("quest not started");
        });

        let snapshot: any;

        it("Should be able to start native quest, and create an escrow contract with fees sent alongside", async function () {
            await nativeQuestInstance.startQuest({ value: 1100 });

            expect(await nativeQuestInstance.started()).to.be.true;

            snapshot = await takeSnapshot();
        });

        it("Should not be able to start a quest again if it has already starter", async function () {
            await expect(nativeQuestInstance.startQuest()).to.be.revertedWith(
                "already started"
            );
        });

        it("Only seeker should be able to start dispute", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).startDispute()
            ).to.be.revertedWith("only Seeker");
        });

        it("Should not be able to solve dispute unless dispute has been started also since mediator has not been set", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[2]).resolveDispute(50)
            ).to.be.revertedWith("only mediator");
        });

        it("Seeker should be able to start dispute", async function () {
            await nativeQuestInstance.startDispute();

            expect(await nativeQuestInstance.beingDisputed()).to.be.true;
        });

        it("Should not be able to start dispute again if it has already started", async function () {
            await expect(nativeQuestInstance.startDispute()).to.be.revertedWith(
                "Dispute started before"
            );
        });

        it("Only solver should be able to finish quest", async function () {
            await expect(nativeQuestInstance.finishQuest()).to.be.revertedWith(
                "only Solver"
            );
        });

        it("Solver should be able to finish quest", async function () {
            await nativeQuestInstance.connect(accounts_[1]).finishQuest();

            expect(await nativeQuestInstance.finished()).to.be.true;
        });

        it("Only the seeker should be able to extend quest period", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).extend()
            ).to.be.revertedWith("only Seeker");
        });

        it("Seeker should be able to extend quest period", async function () {
            await nativeQuestInstance.extend();

            expect(await nativeQuestInstance.extendedCount()).to.eq(1);
        });

        it.skip("Should not be able to extend quest again after extending it", async function () {
            await expect(nativeQuestInstance.extend()).to.be.revertedWith(
                "Was extended before"
            );
        });

        it.skip("Should not be able to extend again once extended", async function () {
            await expect(nativeQuestInstance.extend()).to.be.revertedWith(
                "Was extended before"
            );
        });

        it("Only solver should be able to receive reward", async function () {
            await expect(
                nativeQuestInstance.receiveReward()
            ).to.be.revertedWith("only Solver");
        });

        it("Should not be able to receive reward while the quest is under dispute", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).receiveReward()
            ).to.be.revertedWith("Is under dispute");
        });

        it("Only mediator should be able to resolve dispute", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).resolveDispute(50)
            ).to.be.revertedWith("only mediator");
        });

        it("Solver share for resolving dispute cant be more than 100", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[2]).resolveDispute(10001)
            ).to.be.revertedWith("Share can't be more than 10000");
        });

        it("Mediator should be able to resolve dispute", async function () {
            await nativeQuestInstance.connect(accounts_[2]).resolveDispute(50);

            expect(await nativeQuestInstance.rewarded()).to.be.true;

            // balance of the contract should be 0
            expect(
                await ethers.provider.getBalance(nativeQuestInstance.target)
            ).to.equal(0);
        });

        it("Should not be able to resolve dispute again if it has already been resolved, and rewards distributed", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[2]).resolveDispute(50)
            ).to.be.revertedWith("Rewarded before");
        });

        it("Solver should still be able to finish quest once dispute is over", async function () {
            await nativeQuestInstance.connect(accounts_[1]).finishQuest();

            expect(await nativeQuestInstance.finished()).to.be.true;
        });

        it("Seeker should not be able to extend quest period if quest is not finished", async function () {
            snapshot.restore();

            await expect(nativeQuestInstance.extend()).to.be.revertedWith(
                "Quest not finished"
            );
        });

        it("Should not be able to receive reward if quest is not finished", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).receiveReward()
            ).to.be.revertedWith("Quest not finished");

            expect(await nativeQuestInstance.rewarded()).to.be.false;
        });

        it("Seeker is able to extend quest period once quest is finished", async function () {
            await nativeQuestInstance.connect(accounts_[1]).finishQuest();

            expect(await nativeQuestInstance.finished()).to.be.true;

            await nativeQuestInstance.extend();

            expect(await nativeQuestInstance.extendedCount()).to.equal(1);
        });

        it("Should not be able to receive reward if its not reward time yet", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_[1]).receiveReward()
            ).to.be.revertedWith("Not reward time yet");

            expect(await nativeQuestInstance.rewarded()).to.be.false;
        });

        it("Should be able to receive reward if conditions are met", async function () {
            // Mines block to reach time for reward
            await mine(2000);

            await nativeQuestInstance.connect(accounts_[1]).receiveReward();

            expect(await nativeQuestInstance.rewarded()).to.be.true;
        });

        it("Should not be able to receive reward again if already rewarded", async function () {
            snapshot.restore();

            await nativeQuestInstance.connect(accounts_[1]).finishQuest();

            await mine(1001);

            await nativeQuestInstance.connect(accounts_[1]).receiveReward();

            expect(await nativeQuestInstance.rewarded()).to.be.true;

            await expect(
                nativeQuestInstance.connect(accounts_[1]).receiveReward()
            ).to.be.revertedWith("Rewarded before");
        });

        it("Should not be able to extend if already rewarded", async function () {
            await expect(nativeQuestInstance.extend()).to.be.revertedWith(
                "Was rewarded before"
            );
        });

        it("Should be able to start token quest, and create an escrow contract with fees sent alongside", async function () {
            await mockToken_.mint(await accounts_[0].getAddress(), 1100);
            await mockToken_.approve(tokenQuestInstance.target, 1100);

            await tokenQuestInstance.startQuest();

            expect(await tokenQuestInstance.started()).to.be.true;
        });
    });

    describe("Integration Tests", function () {
        let accounts_: {
                owner: Signer;
                seeker: Signer;
                solver: Signer;
            },
            nexus: Nexus,
            tavern: Tavern,
            quest: Quest;

        const PAYMENT_AMOUNT = ethers.parseEther("2");

        let seekerTax: SeekerTax = {
                referralRewards: 100n,
                platformRevenue: 200n,
            },
            solverTax: SolverTax = {
                referralRewards: 200n,
                platformRevenue: 700n,
                platformTreasury: 100n,
            },
            disputeTaxRate = 1000n;
        const DEFAULT_ACCOUNT_BALANCE = ethers.parseEther("10000000");

        it("Should deploy, create profiles and initialize tavern to create quests", async function () {
            const { accounts, contracts } = await loadFixture(
                fixture_intergration_tests
            );

            accounts_ = accounts;
            nexus = contracts.nexus;
            tavern = contracts.tavern;
            quest = contracts.questImplementation;

            // Create seeker profile to create quest
            await nexus.createProfile(
                0,
                await accounts.seeker.getAddress(),
                "Seeker",
                ethers.encodeBytes32String("0")
            );

            // Create solver profile to accept quest
            await nexus.createProfile(
                0,
                await accounts.solver.getAddress(),
                "Solver",
                ethers.encodeBytes32String("0")
            );
        });

        let nativeQuestInstance: Quest;
        let snapshot: any;

        it("Create a native quest through the tavern and be initialized in the same transaction", async function () {
            await tavern.setBarkeeper(await accounts_.owner.getAddress());
            await tavern.setMediator(await accounts_.owner.getAddress());

            const trx = await tavern[
                "createNewQuest(uint32,uint32,uint256,string,uint256,uint256)"
            ](1, 2, PAYMENT_AMOUNT, "Quest URI", 3, 1);

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
            expect(createdQuest.paymentAmount).to.equal(PAYMENT_AMOUNT);

            nativeQuestInstance = await ethers.getContractAt(
                "Quest",
                createdQuest.quest
            );

            snapshot = await takeSnapshot();
        });

        it("Initialized quest values should be correct", async function () {
            expect(await nativeQuestInstance.initialized()).to.be.true;

            expect(await nativeQuestInstance.seekerId()).to.equal(1);
            expect(await nativeQuestInstance.solverId()).to.equal(2);

            expect(await nativeQuestInstance.paymentAmount()).to.equal(
                PAYMENT_AMOUNT
            );

            expect(await nativeQuestInstance.infoURI()).to.equal("Quest URI");

            expect(await nativeQuestInstance.token()).to.equal(
                ethers.ZeroAddress
            );
        });

        it("Only seeker should be able to start quest", async function () {
            await expect(
                nativeQuestInstance.connect(accounts_.solver).startQuest()
            ).to.be.revertedWith("only Seeker");

            const tax = calculateTaxAmount(
                PAYMENT_AMOUNT,
                seekerTax.platformRevenue + seekerTax.referralRewards
            );

            await nativeQuestInstance.connect(accounts_.seeker).startQuest({
                value: PAYMENT_AMOUNT + tax,
            });
        });

        it("Quest state should be started, and cant be started again", async function () {
            expect(await nativeQuestInstance.started()).to.be.true;

            await expect(
                nativeQuestInstance.connect(accounts_.seeker).startQuest()
            ).to.be.revertedWith("already started");
        });
    });
});
