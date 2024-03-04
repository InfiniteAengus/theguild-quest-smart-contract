import {
    loadFixture,
    impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
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
    Quest,
    Tavern,
    TaxManager,
} from "../typechain-types";
import {
    fixture_profile_nft_integration_tests,
    fixture_tavern_unit_tests,
} from "./helpers/fixtures";
import { parseEventLogs } from "./helpers/utils";

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
        return await fixture_profile_nft_integration_tests(accounts);
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
            await taxManager.setPlatformTaxReceiver(
                await accounts[0].getAddress()
            );

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
                tavern_["createNewQuest(uint32,uint32,uint256,string)"](
                    0,
                    1,
                    1000,
                    "Quest URI"
                )
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
                "createNewQuest(uint32,uint32,uint256,string)"
            ](0, 1, 1000, "Quest URI");

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
                "createNewQuest(uint32,uint32,uint256,string,address)"
            ](0, 1, 1000, "Quest URI", mockERC20_.target);

            const receipt = (await trx.wait()) as ContractTransactionReceipt;

            expect(receipt).to.be.ok;

            const keys = [
                "solverId",
                "seekerId",
                "quest",
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

        it("Should not be able to set profileNFT unless owner", async function () {
            await expect(
                tavern_.connect(accounts_[1]).setProfileNft(mockNft_.target)
            ).to.be.revertedWith("only owner");

            expect(await tavern_.getProfileNFT()).to.equal(mockNft_.target);

            await tavern_.setProfileNft(await accounts_[1].getAddress());

            expect(await tavern_.getProfileNFT()).to.equal(
                await accounts_[1].getAddress()
            );
        });

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

    // Dependencies contracts aren't quite done yet
    describe("Integration Tests", function () {});
});
