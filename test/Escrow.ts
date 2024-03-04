import {
    loadFixture,
    takeSnapshot,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import {
    EscrowNative,
    EscrowToken,
    MockQuest,
    MockRewarder,
    MockToken,
} from "../typechain-types";
import {
    fixture_escrow_unit_tests,
    fixture_profile_nft_integration_tests,
} from "./helpers/fixtures";

describe("Escrow", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_unit_tests() {
        const accounts = await mockAccounts();
        return await fixture_escrow_unit_tests(accounts);
    }

    async function fixture_intergration_tests() {
        const accounts = await mockAccounts();
        return await fixture_profile_nft_integration_tests(accounts);
    }

    describe("Escrow Native", function () {
        describe("Unit Tests", function () {
            let accounts_: Signer[],
                escrow_: EscrowNative,
                mockRewarder_: MockRewarder,
                questNative_: MockQuest;

            let snapshot: any;

            it("Should be able to setup and deploy quest to get escrow", async function () {
                const {
                    accounts,
                    mockRewarder,
                    questNative,
                    escrowNativeImpl,
                } = await loadFixture(fixture_unit_tests);

                expect(await questNative.initialized()).to.be.true;

                expect(await questNative.escrow()).to.equal(ethers.ZeroAddress);

                // Should not be able to start quest if value is insufficient
                await expect(questNative.startQuest({ value: 0 })).to.be
                    .reverted;

                // Start quest
                await questNative.startQuest({ value: 1000 });

                const escrow = await questNative.escrow();

                expect(escrow).to.not.equal(ethers.ZeroAddress);

                const escrowNative = escrowNativeImpl.attach(
                    escrow
                ) as EscrowNative;

                questNative_ = questNative;
                accounts_ = accounts;
                escrow_ = escrowNative;
                mockRewarder_ = mockRewarder;
            });

            it("Should not be able to intialize escrow again", async function () {
                await expect(escrow_.initialize(ethers.ZeroAddress, 0, 0, 1000))
                    .to.be.reverted;
            });

            it("Escrow should be initialized with the correct values", async function () {
                /*
                    Values Initialized for the mock escrow
                    token - address zero
                    seekerId - 0
                    solverId - 1
                    paymentAmount - 1000
                */

                const seekerId = await escrow_.seekerId();

                expect(seekerId).to.equal(0);

                const solverId = await escrow_.solverId();

                expect(solverId).to.equal(1);

                const paymentAmount = await escrow_.paymentAmount();

                expect(paymentAmount).to.equal(1000);
            });

            it("Balance within the escrow should be correct after creation", async function () {
                // Get balance of escrow
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(1000);

                // Take snapshot of state
                snapshot = await takeSnapshot();
            });

            it("Shouldn't be able to call process payment if not from the quest contract address", async function () {
                await expect(
                    escrow_.connect(accounts_[1]).processPayment()
                ).to.be.revertedWith("only quest");
            });

            it("Should be able to execute the processPayment function from the quest contract", async function () {
                await expect(questNative_.receiveReward()).to.emit(
                    mockRewarder_,
                    "RewardClaimed"
                );
            });

            it("Balance of escrow contract should be 0 after processPayment", async function () {
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(0);
            });

            it("Should not be able to call processResolution if not the Quest contract", async function () {
                await expect(escrow_.processPayment()).to.be.revertedWith(
                    "only quest"
                );
            });

            it("Should be able to call processResolution from the quest contract", async function () {
                // Restores snapshot with ether within the escrow
                snapshot.restore();

                // Escrow should have a balance of 1000
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(1000);

                await expect(questNative_.resolveDispute(10)).to.emit(
                    mockRewarder_,
                    "ResolutionProccessed"
                );
            });

            it("Balance of escrow should return to 0 after processResolution", async function () {
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(0);
            });
        });

        // Dependencies contracts aren't quite done yet
        describe("Integration Tests", function () {});
    });

    describe("Escrow Token", function () {
        describe("Unit Tests", function () {
            let accounts_: Signer[],
                escrow_: EscrowNative,
                mockRewarder_: MockRewarder,
                questToken_: MockQuest,
                mockToken_: MockToken;

            let snapshot: any;

            it("Should be able to setup and deploy quest to get escrow", async function () {
                const {
                    accounts,
                    mockRewarder,
                    questToken,
                    mockToken,
                    escrowTokenImpl,
                    taxManager,
                } = await loadFixture(fixture_unit_tests);

                expect(await questToken.initialized()).to.be.true;

                expect(await questToken.escrow()).to.equal(ethers.ZeroAddress);

                await taxManager.setPlatformTaxReceiver(
                    await accounts[1].getAddress()
                );
                await taxManager.setreferralTaxReceiver(
                    await accounts[1].getAddress()
                );
                // Set the seeker fees to hit require check
                await taxManager.setSeekerFees(0, 1000);

                // Should not be able to start quest if value is insufficient
                // await expect(questToken.startQuest()).to.be.reverted;

                // Mints mock token to the user and approve the quest
                await mockToken.mint(await accounts[0].getAddress(), 1100);
                await mockToken
                    .connect(accounts[0])
                    .approve(questToken.target, 1100);

                await questToken.startQuest();

                const escrow = await questToken.escrow();

                expect(escrow).to.not.equal(ethers.ZeroAddress);

                const escrowToken = escrowTokenImpl.attach(
                    escrow
                ) as EscrowToken;

                questToken_ = questToken;
                accounts_ = accounts;
                escrow_ = escrowToken;
                mockRewarder_ = mockRewarder;
                mockToken_ = mockToken;
            });

            it("Should not be able to intialize escrow again", async function () {
                await expect(escrow_.initialize(ethers.ZeroAddress, 0, 0, 1000))
                    .to.be.reverted;
            });

            it("Escrow should be initialized with the correct values", async function () {
                /*
                    Values Initialized for the mock escrow
                    token - address zero
                    seekerId - 0
                    solverId - 1
                    paymentAmount - 1000
                */

                const seekerId = await escrow_.seekerId();

                expect(seekerId).to.equal(0);

                const solverId = await escrow_.solverId();

                expect(solverId).to.equal(1);

                const paymentAmount = await escrow_.paymentAmount();

                expect(paymentAmount).to.equal(1000);
            });

            it("Balance within the escrow should be correct after creation", async function () {
                // Get balance of escrow
                const balance = await mockToken_.balanceOf(escrow_.target);

                expect(balance).to.equal(1100);

                // Take snapshot of state
                snapshot = await takeSnapshot();
            });

            it("Shouldn't be able to call process payment if not from the quest contract address", async function () {
                await expect(
                    escrow_.connect(accounts_[1]).processPayment()
                ).to.be.revertedWith("only quest");
            });

            it("Should be able to execute the processPayment function from the quest contract", async function () {
                await expect(questToken_.receiveReward()).to.emit(
                    mockRewarder_,
                    "RewardClaimed"
                );
            });

            it("Balance of escrow contract should be 0 after processPayment", async function () {
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(0);
            });

            it("Should not be able to call processResolution if not the Quest contract", async function () {
                await expect(escrow_.processPayment()).to.be.revertedWith(
                    "only quest"
                );
            });

            it("Should be able to call processResolution from the quest contract", async function () {
                // Restores snapshot with ether within the escrow
                snapshot.restore();

                // Escrow should have a balance of 1100
                const balance = await mockToken_.balanceOf(escrow_.target);

                expect(balance).to.equal(1100);

                await expect(questToken_.resolveDispute(10)).to.emit(
                    mockRewarder_,
                    "ResolutionProccessed"
                );
            });

            it("Balance of escrow should return to 0 after processResolution", async function () {
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(0);
            });
        });

        // Dependencies contracts aren't quite done yet
        describe("Integration Tests", function () {});
    });
});
