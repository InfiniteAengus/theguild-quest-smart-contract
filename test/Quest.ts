import {
    loadFixture,
    takeSnapshot,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, ContractTransactionReceipt } from "ethers";
import {
    EscrowNative,
    MockRewarder,
    MockTavern,
    Quest,
} from "../typechain-types";
import {
    fixture_profile_nft_integration_tests,
    fixture_quest_unit_tests,
} from "./helpers/fixtures";
import { EscrowToken } from "../typechain-types/contracts/EscrowToken.sol";
import { parseEventLogs } from "./helpers/utils";

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
        return await fixture_profile_nft_integration_tests(accounts);
    }

    describe("Unit Tests", function () {
        let accounts_: Signer[],
            quest_: Quest,
            escrowNative_: EscrowNative,
            escrowToken_: EscrowToken,
            mockTavern_: MockTavern,
            mockRewarder_: MockRewarder;

        it("Quest should be deployed, but not yet initialized", async function () {
            const {
                mockTavern,
                accounts,
                quest,
                escrowToken,
                escrowNative,
                mockRewarder,
            } = await loadFixture(fixture_unit_tests);

            expect(await quest.initialized()).to.be.false;

            accounts_ = accounts;
            quest_ = quest;
            escrowNative_ = escrowNative;
            escrowToken_ = escrowToken;
            mockTavern_ = mockTavern;
            mockRewarder_ = mockRewarder;
        });

        it("Should be able to initialize the contract and update values", async function () {
            await quest_.initialize(
                1,
                2,
                1000,
                "Quest URI",
                escrowNative_.target,
                ethers.ZeroAddress
            );

            expect(await quest_.initialized()).to.be.true;

            expect(await quest_.solverId()).to.equal(1);
            expect(await quest_.seekerId()).to.equal(2);

            expect(await quest_.paymentAmount()).to.equal(1000);

            expect(await quest_.infoURI()).to.equal("Quest URI");

            expect(await quest_.escrowImplemntation()).to.equal(
                escrowNative_.target
            );

            expect(await quest_.token()).to.equal(ethers.ZeroAddress);
        });

        let questInstance: Quest;

        it("Should be able to create quest through the tavern and be initialized in the same transaction", async function () {
            await mockTavern_.setBarkeeper(await accounts_[0].getAddress());
            await mockTavern_.setMediator(await accounts_[2].getAddress());

            const trx = await mockTavern_[
                "createNewQuest(uint32,uint32,uint256,string)"
            ](1, 2, 1000, "QuestURI");

            const receipt = (await trx.wait()) as ContractTransactionReceipt;

            expect(receipt).to.be.ok;

            const keys = [
                "solverId",
                "seekerId",
                "quest",
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

            expect(createdQuest.solverId).to.equal(1);
            expect(createdQuest.seekerId).to.equal(2);
            expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
            expect(createdQuest.escrowImplementation).to.equal(
                escrowNative_.target
            );
            expect(createdQuest.paymentAmount).to.equal(1000);

            questInstance = await ethers.getContractAt(
                "Quest",
                createdQuest.quest
            );

            expect(await questInstance.initialized()).to.be.true;
        });

        it("Should be able to get the rewarder from tavern contract", async function () {
            expect(await questInstance.getRewarder()).to.equal(
                mockRewarder_.target
            );
        });

        it("Only seeker should be able to start quest", async function () {
            await expect(
                questInstance.connect(accounts_[1]).startQuest()
            ).to.be.revertedWith("only Seeker");
        });

        it("Should not be able to start dispute unless quest has been started", async function () {
            await expect(questInstance.startDispute()).to.be.revertedWith(
                "quest not started"
            );
        });

        it("Should not be able to finish quest unless the quest has been started", async function () {
            await expect(
                questInstance.connect(accounts_[1]).finishQuest()
            ).to.be.revertedWith("quest not started");
        });

        let snapshot;

        it("Should be able to start quest, and create an escrow contract", async function () {
            await questInstance.startQuest({ value: 1000 });

            expect(await questInstance.started()).to.be.true;

            snapshot = await takeSnapshot();
        });

        it("Should not be able to start a quest again if it has already starter", async function () {
            await expect(
                questInstance.startQuest({ value: 1000 })
            ).to.be.revertedWith("already started");
        });

        it("Only seeker should be able to start dispute", async function () {
            await expect(
                questInstance.connect(accounts_[1]).startDispute()
            ).to.be.revertedWith("only Seeker");
        });

        it("Seeker should be able to start dispute", async function () {
            await questInstance.startDispute();

            expect(await questInstance.beingDisputed()).to.be.true;
        });

        it("Should not be able to start dispute again if it has already started", async function () {
            await expect(questInstance.startDispute()).to.be.revertedWith(
                "Dispute started before"
            );
        });

        it("Only solver should be able to finish quest", async function () {
            await expect(questInstance.finishQuest()).to.be.revertedWith(
                "only Solver"
            );
        });

        it("Solver should be able to finish quest", async function () {
            await questInstance.connect(accounts_[1]).finishQuest();

            expect(await questInstance.finished()).to.be.true;
        });

        it("Only the seeker should be able to extend quest period", async function () {
            await expect(
                questInstance.connect(accounts_[1]).extend()
            ).to.be.revertedWith("only Seeker");
        });

        it("Seeker should be able to extend quest period", async function () {
            await questInstance.extend();

            expect(await questInstance.extended()).to.be.true;
        });

        it("Should not be able to extend quest again after extending it", async function () {
            await expect(questInstance.extend()).to.be.revertedWith(
                "Was extended before"
            );
        });

        it("Should not be able to extend again once extended", async function () {
            await expect(questInstance.extend()).to.be.revertedWith(
                "Was extended before"
            );
        });

        it("Only solver should be able to receive reward", async function () {
            await expect(questInstance.receiveReward()).to.be.revertedWith(
                "only Solver"
            );
        });

        it("Should not be able to receive reward while the quest is under dispute", async function () {
            await expect(
                questInstance.connect(accounts_[1]).receiveReward()
            ).to.be.revertedWith("Is under dispute");
        });

        it("Only mediator should be able to resolve dispute", async function () {
            await expect(
                questInstance.connect(accounts_[1]).resolveDispute(50)
            ).to.be.revertedWith("only mediator");
        });

        it("Mediator should be able to resolve dispute", async function () {
            await questInstance.connect(accounts_[2]).resolveDispute(50);

            expect(await questInstance.rewarded()).to.be.true;

            // balance of the contract should be 0
            expect(
                await ethers.provider.getBalance(questInstance.target)
            ).to.equal(0);
        });
    });

    // Dependencies contracts aren't quite done yet
    describe("Integration Tests", function () {});
});
