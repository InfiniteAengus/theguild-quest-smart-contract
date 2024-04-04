import {
    loadFixture,
    takeSnapshot,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, ContractTransactionReceipt } from "ethers";
import {
    EscrowNative,
    EscrowToken,
    MockQuest,
    MockRewarder,
    MockToken,
    Nexus,
    Quest,
    Rewarder,
    Tavern,
    TaxManager,
} from "../typechain-types";
import {
    fixture_escrow_unit_tests,
    fixture_profile_nft_integration_tests,
    full_integration_fixture,
} from "./helpers/fixtures";
import { calculateTaxAmount, parseEventLogs } from "./helpers/utils";
import { SeekerTax, SolverTax } from "./helpers/types";
import { mockTokenSetup } from "./helpers/setup";

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

    async function fixture_integration_tests() {
        const accounts = await mockAccounts();
        return await full_integration_fixture(accounts);
    }

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

            it("Should not be able to initialize escrow again", async function () {
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
                    "ResolutionProcessed"
                );
            });

            it("Balance of escrow should return to 0 after processResolution", async function () {
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(0);
            });
        });

        let accounts_: {
                owner: Signer;
                seeker: Signer;
                solver: Signer;
            },
            escrowNative: EscrowNative,
            quest: Quest,
            taxManager: TaxManager;
        let snapshot: any;
        const PAYMENT_AMOUNT = ethers.parseEther("1.5");

        describe("Integration Tests", function () {
            it("Should be able to setup a quest and create an escrow from a quest", async function () {
                const { accounts, contracts } = await loadFixture(
                    fixture_integration_tests
                );

                // Create a seeker and a solver profile

                // Seeker Profile - Index 1
                await contracts.nexus.createProfile(
                    0,
                    await accounts.seeker.getAddress(),
                    "SeekerProfile",
                    ethers.encodeBytes32String("0")
                );

                // Solver Profile - Index 2
                await contracts.nexus.createProfile(
                    0,
                    await accounts.solver.getAddress(),
                    "SolverProfile",
                    ethers.encodeBytes32String("0")
                );

                // Create a quest
                const tx = await contracts.tavern[
                    "createNewQuest(uint32,uint32,uint256,string,uint256,uint256)"
                ](1, 2, PAYMENT_AMOUNT, "Native Integration Quest", 3, 1);

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                expect(receipt).to.be.ok;

                const keys = [
                    "seekerId",
                    "solver",
                    "quest",
                    "maxExtension",
                    "escrowImplementation",
                    "paymentAmount",
                ];

                const createdQuest = parseEventLogs(
                    receipt.logs,
                    contracts.tavern.interface,
                    "QuestCreatedNative",
                    keys
                );

                expect(createdQuest).to.be.ok;

                expect(createdQuest.seekerId).to.equal(1);
                expect(createdQuest.solver).to.equal(2);
                expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
                expect(createdQuest.escrowImplementation).to.equal(
                    contracts.escrowNativeImplementation.target
                );
                expect(createdQuest.paymentAmount).to.equal(PAYMENT_AMOUNT);

                // Get the quest contract
                const questInstance = contracts.questImplementation.attach(
                    createdQuest.quest
                ) as Quest;

                // Calculate seeker tax
                const tax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.referralRewards + seekerTax.platformRevenue
                );

                // Start the quest
                await questInstance.connect(accounts.seeker).startQuest({
                    value: PAYMENT_AMOUNT + tax,
                });

                // Get the escrow address
                const escrowStorage = await ethers.provider.getStorage(
                    questInstance.target,
                    10
                );

                const escrowAddress = ethers.getAddress(
                    ethers.stripZerosLeft(escrowStorage)
                );

                escrowNative = contracts.escrowNativeImplementation.attach(
                    escrowAddress
                ) as EscrowNative;

                quest = questInstance;
                accounts_ = accounts;
                taxManager = contracts.taxManager;

                snapshot = await takeSnapshot();
            });

            it("Escrow native should be initialized and have the correct values", async function () {
                const seekerId = await escrowNative.seekerId();
                const solverId = await escrowNative.solverId();
                const paymentAmount = await escrowNative.paymentAmount();
                const initialized = await escrowNative.initialized();

                expect(initialized).to.be.true;
                expect(seekerId).to.equal(1);
                expect(solverId).to.equal(2);
                expect(paymentAmount).to.equal(PAYMENT_AMOUNT);

                // Escrow balance should be equal to the payment amount
                const balance = await ethers.provider.getBalance(
                    escrowNative.target
                );

                expect(balance).to.equal(PAYMENT_AMOUNT);
            });

            it("Escrow contract cant be initialized again", async function () {
                await expect(
                    escrowNative.initialize(ethers.ZeroAddress, 0, 0, 0)
                ).to.be.reverted;
            });

            it("Only the quest contract should be able to process payment", async function () {
                await expect(
                    escrowNative.connect(accounts_.solver).processPayment()
                ).to.be.revertedWith("only quest");
            });

            it("Only the quest contract should be able to process start dispute", async function () {
                await expect(
                    escrowNative.connect(accounts_.solver).processStartDispute()
                ).to.be.revertedWith("only quest");
            });

            it("Only the quest contract should be able to process resolution", async function () {
                await expect(
                    escrowNative.connect(accounts_.solver).processResolution(10)
                ).to.be.revertedWith("only quest");
            });

            it("Should be able to process payment and solver should receive reward", async function () {
                snapshot.restore();

                // Process payment for the quest and escrow
                await quest.connect(accounts_.solver).finishQuest();

                const balanceBefore = await ethers.provider.getBalance(
                    await accounts_.solver.getAddress()
                );

                await quest.connect(accounts_.solver).receiveReward();

                const balanceAfter = await ethers.provider.getBalance(
                    await accounts_.solver.getAddress()
                );

                expect(balanceAfter).to.be.gt(balanceBefore);

                // Balance of escrow should be 0
                const balance = await ethers.provider.getBalance(
                    escrowNative.target
                );

                expect(balance).to.equal(0);

                // Quest should be in a finished and rewarded state
                const finished = await quest.finished();
                const rewarded = await quest.rewarded();

                expect(finished).to.be.true;
                expect(rewarded).to.be.true;
            });

            it("Should be able to start dispute and resolve it", async function () {
                snapshot.restore();

                const balanceBefore = await ethers.provider.getBalance(
                    escrowNative.target
                );

                const disputeTax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    disputeTaxRate
                );

                await quest
                    .connect(accounts_.seeker)
                    .startDispute({ value: disputeTax });

                const balanceAfter = await ethers.provider.getBalance(
                    escrowNative.target
                );

                expect(balanceAfter).to.be.equal(balanceBefore);

                const disputeTreasury = await taxManager.disputeFeesTreasury();

                const balance = await ethers.provider.getBalance(
                    disputeTreasury
                );

                expect(balance).to.equal(disputeTax + DEFAULT_ACCOUNT_BALANCE);

                // Process resolution

                const balanceBeforeResolutionEscrow =
                    await ethers.provider.getBalance(escrowNative.target);

                expect(balanceBeforeResolutionEscrow).to.equal(PAYMENT_AMOUNT);

                const balanceBeforeResolutionSolver =
                    await ethers.provider.getBalance(
                        await accounts_.solver.getAddress()
                    );

                await quest.connect(accounts_.owner).resolveDispute(10000);

                const balanceAfterResolutionEscrow =
                    await ethers.provider.getBalance(escrowNative.target);

                const balanceAfterResolutionSolver =
                    await ethers.provider.getBalance(
                        await accounts_.solver.getAddress()
                    );

                expect(balanceAfterResolutionEscrow).to.equal(0);

                expect(balanceAfterResolutionSolver).to.be.gt(
                    balanceBeforeResolutionSolver
                );
            });
        });
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

                await taxManager.setPlatformRevenuePool(
                    await accounts[1].getAddress()
                );
                await taxManager.setReferralTaxTreasury(
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
                    "ResolutionProcessed"
                );
            });

            it("Balance of escrow should return to 0 after processResolution", async function () {
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balance).to.equal(0);
            });
        });

        let accounts_: {
                owner: Signer;
                seeker: Signer;
                solver: Signer;
            },
            mockToken_: MockToken,
            escrowToken: EscrowToken,
            rewarder: Rewarder,
            quest: Quest,
            taxManager: TaxManager;
        let snapshot: any;
        const PAYMENT_AMOUNT = ethers.parseEther("1.5");

        describe("Integration Tests", function () {
            it("Should be able to setup a quest and create an escrow from a quest", async function () {
                const { accounts, contracts } = await loadFixture(
                    fixture_integration_tests
                );

                // Deploy mock token
                const mockToken = await mockTokenSetup(
                    "mockToken",
                    "mToken",
                    18,
                    true
                );
                mockToken_ = mockToken;

                // Create a seeker and a solver profile

                // Seeker Profile - Index 1
                await contracts.nexus.createProfile(
                    0,
                    await accounts.seeker.getAddress(),
                    "SeekerProfile",
                    ethers.encodeBytes32String("0")
                );

                // Solver Profile - Index 2
                await contracts.nexus.createProfile(
                    0,
                    await accounts.solver.getAddress(),
                    "SolverProfile",
                    ethers.encodeBytes32String("0")
                );

                // Create a quest
                const tx = await contracts.tavern[
                    "createNewQuest(uint32,uint32,uint256,string,uint256,address,uint256)"
                ](
                    1,
                    2,
                    PAYMENT_AMOUNT,
                    "Native Integration Quest",
                    3,
                    mockToken_.target,
                    1
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                expect(receipt).to.be.ok;

                const keys = [
                    "seekerId",
                    "solver",
                    "quest",
                    "maxExtension",
                    "escrowImplementation",
                    "paymentAmount",
                    "token",
                ];

                const createdQuest = parseEventLogs(
                    receipt.logs,
                    contracts.tavern.interface,
                    "QuestCreatedToken",
                    keys
                );

                expect(createdQuest).to.be.ok;

                expect(createdQuest.seekerId).to.equal(1);
                expect(createdQuest.solver).to.equal(2);
                expect(createdQuest.quest).to.not.equal(ethers.ZeroAddress);
                expect(createdQuest.escrowImplementation).to.equal(
                    contracts.escrowTokenImplementation.target
                );
                expect(createdQuest.paymentAmount).to.equal(PAYMENT_AMOUNT);
                expect(createdQuest.token).to.equal(mockToken_.target);

                // Get the quest contract
                const questInstance = contracts.questImplementation.attach(
                    createdQuest.quest
                ) as Quest;

                // Calculate seeker tax
                const tax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.referralRewards + seekerTax.platformRevenue
                );

                // Mint and approve quest contract as seeker
                await mockToken.mint(
                    await accounts.seeker.getAddress(),
                    PAYMENT_AMOUNT + tax
                );
                await mockToken
                    .connect(accounts.seeker)
                    .approve(questInstance.target, PAYMENT_AMOUNT + tax);

                // Start the quest
                await questInstance.connect(accounts.seeker).startQuest();

                // Get the escrow address
                const escrowStorage = await ethers.provider.getStorage(
                    questInstance.target,
                    10
                );

                const escrowAddress = ethers.getAddress(
                    ethers.stripZerosLeft(escrowStorage)
                );

                escrowToken = contracts.escrowNativeImplementation.attach(
                    escrowAddress
                ) as EscrowToken;

                quest = questInstance;
                accounts_ = accounts;
                taxManager = contracts.taxManager;
                rewarder = contracts.rewarder;

                snapshot = await takeSnapshot();
            });

            it("Escrow token should be initialized and have the correct values", async function () {
                const seekerId = await escrowToken.seekerId();
                const solverId = await escrowToken.solverId();
                const paymentAmount = await escrowToken.paymentAmount();
                const initialized = await escrowToken.initialized();

                expect(initialized).to.be.true;
                expect(seekerId).to.equal(1);
                expect(solverId).to.equal(2);
                expect(paymentAmount).to.equal(PAYMENT_AMOUNT);

                // Escrow balance should be equal to the payment amount
                const balance = await mockToken_.balanceOf(escrowToken.target);

                expect(balance).to.equal(PAYMENT_AMOUNT);
            });

            it("Escrow contract cant be initialized again", async function () {
                await expect(
                    escrowToken.initialize(ethers.ZeroAddress, 0, 0, 0)
                ).to.be.reverted;
            });

            it("Only the quest contract should be able to process payment", async function () {
                await expect(
                    escrowToken.connect(accounts_.solver).processPayment()
                ).to.be.revertedWith("only quest");
            });

            it("Only the quest contract should be able to process start dispute", async function () {
                await expect(
                    escrowToken.connect(accounts_.solver).processStartDispute()
                ).to.be.revertedWith("only quest");
            });

            it("Only the quest contract should be able to process resolution", async function () {
                await expect(
                    escrowToken.connect(accounts_.solver).processResolution(10)
                ).to.be.revertedWith("only quest");
            });

            it("Should be able to process payment and solver should receive reward", async function () {
                snapshot.restore();

                // Process payment for the quest and escrow
                await quest.connect(accounts_.solver).finishQuest();

                const balanceBefore = await mockToken_.balanceOf(
                    await accounts_.solver.getAddress()
                );

                await quest.connect(accounts_.solver).receiveReward();

                const balanceAfter = await mockToken_.balanceOf(
                    await accounts_.solver.getAddress()
                );

                expect(balanceAfter).to.be.gt(balanceBefore);

                // Balance of escrow should be 0
                const balance = await mockToken_.balanceOf(escrowToken.target);

                expect(balance).to.equal(0);

                // Quest should be in a finished and rewarded state
                const finished = await quest.finished();
                const rewarded = await quest.rewarded();

                expect(finished).to.be.true;
                expect(rewarded).to.be.true;
            });

            it("Should be able to start dispute and resolve it", async function () {
                snapshot.restore();

                const balanceBefore = await mockToken_.balanceOf(
                    escrowToken.target
                );

                const disputeTax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    disputeTaxRate
                );

                // Mint and approve rewarder contract as seeker
                await mockToken_.mint(
                    await accounts_.seeker.getAddress(),
                    disputeTax
                );

                await mockToken_
                    .connect(accounts_.seeker)
                    .approve(rewarder.target, disputeTax);

                await quest.connect(accounts_.seeker).startDispute();

                const balanceAfter = await mockToken_.balanceOf(
                    escrowToken.target
                );

                expect(balanceAfter).to.be.equal(balanceBefore);

                const disputeTreasury = await taxManager.disputeFeesTreasury();

                const balance = await mockToken_.balanceOf(disputeTreasury);

                expect(balance).to.equal(disputeTax);

                // Process resolution

                const balanceBeforeResolutionEscrow =
                    await mockToken_.balanceOf(escrowToken.target);

                expect(balanceBeforeResolutionEscrow).to.equal(PAYMENT_AMOUNT);

                const balanceBeforeResolutionSolver =
                    await mockToken_.balanceOf(
                        await accounts_.solver.getAddress()
                    );

                await quest.connect(accounts_.owner).resolveDispute(10000);

                const balanceAfterResolutionEscrow = await mockToken_.balanceOf(
                    escrowToken.target
                );

                const balanceAfterResolutionSolver = await mockToken_.balanceOf(
                    await accounts_.solver.getAddress()
                );

                expect(balanceAfterResolutionEscrow).to.equal(0);

                expect(balanceAfterResolutionSolver).to.be.gt(
                    balanceBeforeResolutionSolver
                );
            });
        });
    });
});
