import {
    loadFixture,
    takeSnapshot,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTransactionReceipt, Signer } from "ethers";
import {
    CreatedAccount,
    CreatedAccountWithOwner,
    ERC6551Setup,
    LayerKeys,
    ReferralRewardsDistribution,
    SeekerTax,
    SolverTax,
} from "./helpers/types";
import {
    ReferralHandlerERC6551Account,
    ProfileNFT,
    Nexus,
    Rewarder,
    TaxManager,
    MockEscrow,
    MockToken,
} from "../typechain-types";
import {
    fixture_rewarder_integration_tests,
    fixture_rewarder_unit_tests,
} from "./helpers/fixtures";
import { calculateTaxAmount, parseEventLogs } from "./helpers/utils";

describe("Rewarder", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [
            owner,
            user1,
            user2,
            user3,
            user4,
            user5,
            user6,
            user7,
            user8,
            user9,
        ] = await ethers.getSigners();

        return [
            owner,
            user1,
            user2,
            user3,
            user4,
            user5,
            user6,
            user7,
            user8,
            user9,
        ];
    }

    async function fixture_unit_tests() {
        const accounts = await mockAccounts();
        return await fixture_rewarder_unit_tests(accounts);
    }

    async function fixture_integration_tests() {
        const accounts = await mockAccounts();
        return await fixture_rewarder_integration_tests(accounts);
    }

    // Unit tests to test the Rewarder contract
    describe("Unit Tests", function () {
        let rewarder_: Rewarder,
            nexus_: Nexus,
            accounts_: Signer[],
            taxManager_: TaxManager,
            seeker_: CreatedAccountWithOwner,
            solver_: CreatedAccountWithOwner,
            mockEscrow_: MockEscrow,
            mockToken_: MockToken,
            referrers: CreatedAccountWithOwner[] = [];

        let snapshot: any;

        // Transactions are by default sent from accounts[0]

        describe("Without tax", function () {
            it("Should setup rewarder successfully", async function () {
                const {
                    rewarder,
                    nexus,
                    accounts,
                    taxManager,
                    mockEscrow,
                    mockToken,
                } = await loadFixture(fixture_unit_tests);

                expect(await rewarder.nexus()).to.not.equal(ethers.ZeroAddress);
                expect(await rewarder.steward()).to.equal(
                    await accounts[0].getAddress()
                );
                expect(await rewarder.getTaxManager()).to.equal(
                    taxManager.target
                );

                // Setup profiles
                // Profile ID-1 is Seeker
                await nexus.createProfile(
                    0,
                    await accounts[1].getAddress(),
                    "Seeker"
                );
                seeker_ = {
                    handlerAddress: await nexus.getHandler(1),
                    nftId: 1,
                    owner: await accounts[1].getAddress(),
                };

                // Create referral tree, up to the max of 4 referrals
                {
                    // Adding other profiles to create referrals for solver
                    // Profile ID-2 is Referrer 1
                    await nexus.createProfile(
                        0,
                        await accounts[0].getAddress(),
                        "Referrer 1"
                    );

                    // Profile ID-3 is Referrer 2
                    await nexus.createProfile(
                        2,
                        await accounts[0].getAddress(),
                        "Referrer 2"
                    );

                    // Profile ID-4 is Referrer 3
                    await nexus.createProfile(
                        3,
                        await accounts[0].getAddress(),
                        "Referrer 3"
                    );

                    // Profile ID-5 is Referrer 4
                    await nexus.createProfile(
                        4,
                        await accounts[0].getAddress(),
                        "Referrer 4"
                    );

                    referrers.push({
                        handlerAddress: await nexus.getHandler(5),
                        nftId: 5,
                        owner: await accounts[0].getAddress(),
                    });
                    referrers.push({
                        handlerAddress: await nexus.getHandler(4),
                        nftId: 4,
                        owner: await accounts[0].getAddress(),
                    });
                    referrers.push({
                        handlerAddress: await nexus.getHandler(3),
                        nftId: 3,
                        owner: await accounts[0].getAddress(),
                    });
                    referrers.push({
                        handlerAddress: await nexus.getHandler(2),
                        nftId: 2,
                        owner: await accounts[0].getAddress(),
                    });
                }

                // Profile ID-6 is Solver
                await nexus.createProfile(
                    5,
                    await accounts[2].getAddress(),
                    "Solver"
                );
                solver_ = {
                    handlerAddress: await nexus.getHandler(6),
                    nftId: 6,
                    owner: await accounts[2].getAddress(),
                };

                // Setup tax receiver addresses
                {
                    // await taxManager.
                }

                rewarder_ = rewarder;
                nexus_ = nexus;
                accounts_ = accounts;
                taxManager_ = taxManager;
                mockEscrow_ = mockEscrow;
                mockToken_ = mockToken;

                // Initialise mock escrow

                await mockEscrow.initialize(ethers.ZeroAddress, 1, 6, 1000);

                // Take snapshot of state
                snapshot = await takeSnapshot();
            });

            it("Should be able to reward native tokens to solver without any tax", async function () {
                await snapshot.restore();

                const seekerBalanceBefore = await ethers.provider.getBalance(
                    seeker_.owner
                );

                expect(seekerBalanceBefore).to.gt(0n);

                const solverBalanceBefore = await ethers.provider.getBalance(
                    solver_.owner
                );

                expect(solverBalanceBefore).to.gt(0n);

                // Transfer ether to mockEscrow
                await accounts_[0].sendTransaction({
                    to: mockEscrow_.target,
                    value: 1000,
                });

                expect(
                    await ethers.provider.getBalance(mockEscrow_.target)
                ).to.equal(1000);

                const tx = await mockEscrow_.processPayment();

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["solverAccount", "escrow", "solverReward"];

                const rewardNativeClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "RewardNativeClaimed",
                    keys
                );

                expect(rewardNativeClaimed).to.be.ok;

                expect(rewardNativeClaimed.solverAccount).to.equal(
                    solver_.handlerAddress
                );
                expect(rewardNativeClaimed.escrow).to.equal(mockEscrow_.target);
                expect(rewardNativeClaimed.solverReward).to.equal(1000);

                // Mock escrow should no longer have any native balance after handleRewardNative is called
                expect(
                    await ethers.provider.getBalance(mockEscrow_.target)
                ).to.equal(0);

                // Seeker balance should have no change after call
                expect(
                    await ethers.provider.getBalance(seeker_.owner)
                ).to.equal(seekerBalanceBefore);

                // Solver owner should have 1000 wei more native token after handleRewardNative is called
                expect(
                    await ethers.provider.getBalance(solver_.owner)
                ).to.equal(solverBalanceBefore + 1000n);

                // Referrers should not have any balance
                for (let i = 0; i < referrers.length; i++) {
                    expect(
                        await ethers.provider.getBalance(
                            referrers[i].handlerAddress
                        )
                    ).to.equal(0);
                }
            });

            it("Should be able to reward erc20 tokens to solver without any tax", async function () {
                await snapshot.restore();

                const seekerBalance = await mockToken_.balanceOf(seeker_.owner);

                expect(seekerBalance).to.equal(0n);

                const solverBalance = await mockToken_.balanceOf(solver_.owner);

                expect(solverBalance).to.equal(0n);

                // Mint tokens to accounts[0]
                // Account[0] is simulated as escrow here
                await mockToken_.mint(await accounts_[0].getAddress(), 1000);

                expect(
                    await mockToken_.balanceOf(await accounts_[0].getAddress())
                ).to.equal(1000);

                await mockToken_
                    .connect(accounts_[0])
                    .approve(rewarder_.target, 1000);

                const tx = await rewarder_.handleRewardToken(
                    mockToken_.target,
                    6,
                    1000
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = [
                    "solverAccount",
                    "escrow",
                    "solverReward",
                    "token",
                ];

                const rewardERC20Claimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "RewardTokenClaimed",
                    keys
                );

                expect(rewardERC20Claimed).to.be.ok;

                expect(rewardERC20Claimed.solverAccount).to.equal(
                    solver_.handlerAddress
                );
                // Account[0] is simulated as escrow here for erc20 token transfers
                expect(rewardERC20Claimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(rewardERC20Claimed.solverReward).to.equal(1000);
                expect(rewardERC20Claimed.token).to.equal(mockToken_.target);

                // Mock escrow should no longer have any erc20 balance after handleRewardToken is called
                expect(
                    await mockToken_.balanceOf(await accounts_[0].getAddress())
                ).to.equal(0);

                // Solver owner should gain 1000 wei of erc20 tokens
                expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                    solverBalance + 1000n
                );

                // Solver should have no change in value
                expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(0);

                // Referrers should not have any erc20 token balance
                for (let i = 0; i < referrers.length; i++) {
                    expect(
                        await mockToken_.balanceOf(referrers[i].handlerAddress)
                    ).to.equal(0);
                }
            });

            it("Should be able to handleSeekerTaxNative without any tax", async function () {
                await snapshot.restore();

                const seekerBalanceBefore = await ethers.provider.getBalance(
                    seeker_.owner
                );

                expect(
                    await ethers.provider.getBalance(rewarder_.target)
                ).to.equal(0);

                const tx = await rewarder_.handleSeekerTaxNative(1, 0, 0);

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["seekerAccount", "escrow", "tax"];

                const seekerTaxNativeClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "SeekerTaxPaidNative",
                    keys
                );

                expect(seekerTaxNativeClaimed).to.be.ok;

                expect(seekerTaxNativeClaimed.seekerAccount).to.equal(
                    seeker_.handlerAddress
                );
                expect(seekerTaxNativeClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(seekerTaxNativeClaimed.tax).to.equal(0);

                // If no tax was paid the rewarder will not have any balance
                expect(
                    await ethers.provider.getBalance(rewarder_.target)
                ).to.equal(0);

                // Seeker should not have a change in value
                expect(
                    await ethers.provider.getBalance(seeker_.owner)
                ).to.equal(seekerBalanceBefore);

                // Referrers should not have any balance
                for (let i = 0; i < referrers.length; i++) {
                    expect(
                        await ethers.provider.getBalance(
                            referrers[i].handlerAddress
                        )
                    ).to.equal(0);
                }
            });

            it("Should be able to handleSeekerTaxToken without any tax", async function () {
                await snapshot.restore();

                await mockToken_.mint(accounts_[0], 1000);

                await mockToken_.approve(rewarder_.target, 1000);

                // Account 0  is used to simulate escrow
                const balanceBefore = await mockToken_.balanceOf(
                    await accounts_[0].getAddress()
                );

                expect(balanceBefore).to.equal(1000);

                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                const tx = await rewarder_.handleSeekerTaxToken(
                    1,
                    0,
                    0,
                    mockToken_.target
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["seekerAccount", "escrow", "tax", "token"];

                const seekerTaxTokenClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "SeekerTaxPaidToken",
                    keys
                );

                expect(seekerTaxTokenClaimed).to.be.ok;

                expect(seekerTaxTokenClaimed.seekerAccount).to.equal(
                    seeker_.handlerAddress
                );
                expect(seekerTaxTokenClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(seekerTaxTokenClaimed.tax).to.equal(0);
                expect(seekerTaxTokenClaimed.token).to.equal(mockToken_.target);

                // If no tax was paid the rewarder will not have any balance
                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                // Should not have a change in value for simulated escrow
                expect(
                    await mockToken_.balanceOf(await accounts_[0].getAddress())
                ).to.equal(balanceBefore);

                // Referrers should not have any balance
                for (let i = 0; i < referrers.length; i++) {
                    expect(
                        await mockToken_.balanceOf(referrers[i].handlerAddress)
                    ).to.equal(0);
                }
            });

            it("Should be able to handleStartDisputeNative without any tax", async function () {
                await snapshot.restore();

                const seekerBalanceBefore = await ethers.provider.getBalance(
                    seeker_.owner
                );

                const disputeTreasuryBefore = await ethers.provider.getBalance(
                    await taxManager_.disputeFeesTreasury()
                );

                // Don't need to us mockRewarder to call this function
                // Value can only be 0 if there is no actual disputeDepositRate
                const tx = await rewarder_.handleStartDisputeNative(1000, {
                    value: 0,
                });

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["escrow", "deposit"];

                const startDisputeNativeClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "DisputeDepositPaidNative",
                    keys
                );

                expect(startDisputeNativeClaimed).to.be.ok;

                expect(startDisputeNativeClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(startDisputeNativeClaimed.deposit).to.equal(0);

                // If no tax was paid the rewarder will not have any balance
                expect(
                    await ethers.provider.getBalance(rewarder_.target)
                ).to.equal(0);

                // Seeker should not have a change in value
                expect(
                    await ethers.provider.getBalance(seeker_.owner)
                ).to.equal(seekerBalanceBefore);

                const disputeTreasury = await taxManager_.disputeFeesTreasury();

                // Dispute treasury should not have any changes if there is no disputeTax
                expect(
                    await ethers.provider.getBalance(disputeTreasury)
                ).to.equal(disputeTreasuryBefore);
            });

            it("Should be able to handleStartDisputeToken without any tax", async function () {
                await snapshot.restore();

                await mockToken_.mint(await accounts_[0].getAddress(), 1000);

                await mockToken_.approve(rewarder_.target, 1000);

                // Account 0 is used to simulate escrow
                const balanceBefore = await mockToken_.balanceOf(
                    await accounts_[0].getAddress()
                );

                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                const tx = await rewarder_.handleStartDisputeToken(
                    1000,
                    mockToken_.target,
                    1
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["escrow", "deposit", "token"];

                const startDisputeTokenClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "DisputeDepositPaidToken",
                    keys
                );

                expect(startDisputeTokenClaimed).to.be.ok;

                expect(startDisputeTokenClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(startDisputeTokenClaimed.deposit).to.equal(0);
                expect(startDisputeTokenClaimed.token).to.equal(
                    mockToken_.target
                );

                // If no tax was paid the rewarder will not have any balance
                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                // Account 0 should not have a change in value
                expect(
                    await mockToken_.balanceOf(await accounts_[0].getAddress())
                ).to.equal(balanceBefore);

                const disputeTreasury = await taxManager_.disputeFeesTreasury();

                // Dispute treasury should not have any change if there is no disputeTax
                expect(await mockToken_.balanceOf(disputeTreasury)).to.equal(0);
            });

            describe("processResolutionNative", function () {
                it("Should be able to processResolutionNative with no tax when solver is at fault", async function () {
                    await snapshot.restore();

                    expect(
                        await ethers.provider.getBalance(rewarder_.target)
                    ).to.equal(0);

                    const solverBalanceBefore =
                        await ethers.provider.getBalance(solver_.owner);

                    // If solver is at fault, seeker owner will be rewarded with payment
                    // Checks if seeker owner balance before
                    const seekerBalanceBefore =
                        await ethers.provider.getBalance(seeker_.owner);

                    // Transfer ether to mockEscrow
                    await accounts_[0].sendTransaction({
                        to: mockEscrow_.target,
                        value: 1000,
                    });

                    expect(
                        await ethers.provider.getBalance(mockEscrow_.target)
                    ).to.equal(1000);

                    // 0% in basis points
                    await mockEscrow_.processResolution(0);

                    // Solver should have no change in value after call
                    expect(
                        await ethers.provider.getBalance(solver_.owner)
                    ).to.equal(solverBalanceBefore);

                    // Seeker should have 1000 wei more after processResolutionNative is called
                    expect(
                        await ethers.provider.getBalance(seeker_.owner)
                    ).to.equal(seekerBalanceBefore + 1000n);
                });

                it("Should be able to processResolutionNative with no tax when seeker is at fault", async function () {
                    await snapshot.restore();

                    expect(
                        await ethers.provider.getBalance(rewarder_.target)
                    ).to.equal(0);

                    const seekerBalanceBefore =
                        await ethers.provider.getBalance(seeker_.owner);

                    // If seeker is at fault, solver owner will be rewarded with payment
                    // Checks if solver owner balance before
                    const solverBalanceBefore =
                        await ethers.provider.getBalance(solver_.owner);

                    // Transfer ether to mockEscrow
                    await accounts_[0].sendTransaction({
                        to: mockEscrow_.target,
                        value: 1000,
                    });

                    expect(
                        await ethers.provider.getBalance(mockEscrow_.target)
                    ).to.equal(1000);

                    // 100% in basis points
                    await mockEscrow_.processResolution(10000n);

                    expect(
                        await ethers.provider.getBalance(mockEscrow_.target)
                    ).to.equal(0);

                    // Seeker should have no change in value after call
                    expect(
                        await ethers.provider.getBalance(seeker_.owner)
                    ).to.equal(seekerBalanceBefore);

                    // Solver should have 1000 wei more after processResolutionNative is called
                    expect(
                        await ethers.provider.getBalance(solver_.owner)
                    ).to.equal(solverBalanceBefore + 1000n);
                });

                it("Should be able to processResolutionNative with no tax when both are at fault and results in arbitrary distribution", async function () {
                    await snapshot.restore();

                    expect(
                        await ethers.provider.getBalance(rewarder_.target)
                    ).to.equal(0);

                    const seekerBalanceBefore =
                        await ethers.provider.getBalance(seeker_.owner);

                    const solverBalanceBefore =
                        await ethers.provider.getBalance(solver_.owner);

                    // Transfer ether to mockEscrow
                    await accounts_[0].sendTransaction({
                        to: mockEscrow_.target,
                        value: 1000,
                    });

                    expect(
                        await ethers.provider.getBalance(mockEscrow_.target)
                    ).to.equal(1000);

                    // 50% in basis points
                    await mockEscrow_.processResolution(5000n);

                    expect(
                        await ethers.provider.getBalance(mockEscrow_.target)
                    ).to.equal(0);

                    // With a 50-50 split, and no tax, seeker and solver should both have 500 wei more after processResolutionNative is called

                    // Seeker should have 500 wei more after processResolutionNative is called
                    expect(
                        await ethers.provider.getBalance(seeker_.owner)
                    ).to.equal(seekerBalanceBefore + 500n);

                    // Solver should have 500 wei more after processResolutionNative is called
                    expect(
                        await ethers.provider.getBalance(solver_.owner)
                    ).to.equal(solverBalanceBefore + 500n);
                });
            });

            describe("processResolutionToken", function () {
                it("Should be able to processResolutionToken with no tax when solver is at fault", async function () {
                    await snapshot.restore();

                    // Mint mock token to account 0
                    // Account 0 is used to simulate escrow
                    await mockToken_.mint(
                        await accounts_[0].getAddress(),
                        1000
                    );
                    await mockToken_.approve(rewarder_.target, 1000);

                    expect(
                        await mockToken_.balanceOf(
                            await accounts_[0].getAddress()
                        )
                    ).to.equal(1000);

                    expect(
                        await mockToken_.balanceOf(rewarder_.target)
                    ).to.equal(0);

                    // Seeker should have no balance before
                    expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(
                        0
                    );

                    // Solver should have no balance before
                    expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                        0
                    );

                    // 0% in basis points
                    await rewarder_.processResolutionToken(
                        1,
                        6,
                        0,
                        mockToken_.target,
                        1000
                    );

                    // Solver should have no change in value after call
                    expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                        0
                    );

                    // Seeker should have 1000 wei more after processResolutionToken is called
                    expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(
                        1000
                    );

                    // Account 0 should no longer have any balance
                    expect(
                        await mockToken_.balanceOf(mockEscrow_.target)
                    ).to.equal(0);

                    // There should not be any leftovers in the rewarder
                    expect(
                        await mockToken_.balanceOf(rewarder_.target)
                    ).to.equal(0);
                });

                it("Should be able to processResolutionToken with no tax when seeker is at fault", async function () {
                    await snapshot.restore();

                    // Mint mock token to account 0
                    // Account 0 is used to simulate escrow
                    await mockToken_.mint(
                        await accounts_[0].getAddress(),
                        1000
                    );
                    await mockToken_.approve(rewarder_.target, 1000);

                    expect(
                        await mockToken_.balanceOf(
                            await accounts_[0].getAddress()
                        )
                    ).to.equal(1000);

                    expect(
                        await mockToken_.balanceOf(rewarder_.target)
                    ).to.equal(0);

                    // Seeker should have no balance before
                    expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(
                        0
                    );

                    // Solver should have no balance before
                    expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                        0
                    );

                    // 100% in basis points
                    await rewarder_.processResolutionToken(
                        1,
                        6,
                        10000,
                        mockToken_.target,
                        1000
                    );

                    // Seeker should have no change in value after call
                    expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(
                        0
                    );

                    // Solver should have 1000 wei more after processResolutionToken is called
                    expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                        1000
                    );

                    // Account 0 should no longer have any balance
                    expect(
                        await mockToken_.balanceOf(mockEscrow_.target)
                    ).to.equal(0);

                    // There should not be any leftovers in the rewarder
                    expect(
                        await mockToken_.balanceOf(rewarder_.target)
                    ).to.equal(0);
                });

                it("Should be able to processResolutionToken with no tax when both are at fault and results in arbitrary distribution", async function () {
                    await snapshot.restore();

                    // Mint mock token to account 0
                    // Account 0 is used to simulate escrow
                    await mockToken_.mint(
                        await accounts_[0].getAddress(),
                        1000
                    );
                    await mockToken_.approve(rewarder_.target, 1000);

                    expect(
                        await mockToken_.balanceOf(
                            await accounts_[0].getAddress()
                        )
                    ).to.equal(1000);

                    expect(
                        await mockToken_.balanceOf(rewarder_.target)
                    ).to.equal(0);

                    // Seeker should have no balance before
                    expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(
                        0
                    );

                    // Solver should have no balance before
                    expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                        0
                    );

                    // 50% in basis points
                    await rewarder_.processResolutionToken(
                        1,
                        6,
                        5000,
                        mockToken_.target,
                        1000
                    );

                    // With a 50-50 split, and no tax, seeker and solver should both have 500 wei more after processResolutionToken is called

                    // Seeker should have 500 wei more after processResolutionToken is called
                    expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(
                        500
                    );

                    // Solver should have 500 wei more after processResolutionToken is called
                    expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                        500
                    );

                    // Account 0 should no longer have any balance
                    expect(
                        await mockToken_.balanceOf(mockEscrow_.target)
                    ).to.equal(0);

                    // There should not be any leftovers in the rewarder
                    expect(
                        await mockToken_.balanceOf(rewarder_.target)
                    ).to.equal(0);
                });
            });
        });

        describe("With Tax", function () {
            let taxSnapshot: any;

            let seekerTax: SeekerTax = {
                    referralRewards: 100n,
                    platformRevenue: 200n,
                },
                solverTax: SolverTax = {
                    referralRewards: 200n,
                    platformRevenue: 700n,
                    platformTreasury: 100n,
                };

            let referralRewardsDistribution: ReferralRewardsDistribution = {
                tier1: {
                    layer1: 1200,
                    layer2: 800,
                    layer3: 400,
                    layer4: 200,
                },
                tier2: {
                    layer1: 1600,
                    layer2: 1050,
                    layer3: 525,
                    layer4: 260,
                },
                tier3: {
                    layer1: 2000,
                    layer2: 1300,
                    layer3: 650,
                    layer4: 375,
                },
                tier4: {
                    layer1: 2400,
                    layer2: 1600,
                    layer3: 800,
                    layer4: 400,
                },
                tier5: {
                    layer1: 3000,
                    layer2: 2000,
                    layer3: 1000,
                    layer4: 600,
                },
            };

            function getLayerValue(layer: LayerKeys): number {
                return referralRewardsDistribution.tier1[layer];
            }

            const PAYMENT_AMOUNT = ethers.parseEther("0.5");

            let platformTreasuryPool: string,
                platformRevenuePool: string,
                referralTaxTreasury: string,
                disputeFeesTreasuryPool: string;

            const DEFAULT_ACCOUNT_BALANCE = ethers.parseEther("10000000");

            const disputeDepositRate = 1000;

            it("Set up tax values for the respective rewarder functions", async function () {
                await snapshot.restore();

                // Set Seeker Tax Fees
                await taxManager_.setSeekerFees(
                    seekerTax.referralRewards,
                    seekerTax.platformRevenue
                );

                // Set Solver Tax Fees
                await taxManager_.setSolverFees(
                    solverTax.referralRewards,
                    solverTax.platformRevenue,
                    solverTax.platformTreasury
                );

                // Set dispute deposit rate
                await taxManager_.setDisputeDepositRate(disputeDepositRate);

                // Set referrer tax rates for tier 1 - 5

                // Tier - 1
                await taxManager_.setBulkReferralRate(
                    1,
                    referralRewardsDistribution.tier1.layer1,
                    referralRewardsDistribution.tier1.layer2,
                    referralRewardsDistribution.tier1.layer3,
                    referralRewardsDistribution.tier1.layer4
                );

                // Tier - 2
                await taxManager_.setBulkReferralRate(
                    2,
                    referralRewardsDistribution.tier2.layer1,
                    referralRewardsDistribution.tier2.layer2,
                    referralRewardsDistribution.tier2.layer3,
                    referralRewardsDistribution.tier2.layer4
                );

                // Tier - 3
                await taxManager_.setBulkReferralRate(
                    3,
                    referralRewardsDistribution.tier3.layer1,
                    referralRewardsDistribution.tier3.layer2,
                    referralRewardsDistribution.tier3.layer3,
                    referralRewardsDistribution.tier3.layer4
                );

                // Tier - 4
                await taxManager_.setBulkReferralRate(
                    4,
                    referralRewardsDistribution.tier4.layer1,
                    referralRewardsDistribution.tier4.layer2,
                    referralRewardsDistribution.tier4.layer3,
                    referralRewardsDistribution.tier4.layer4
                );

                // Tier - 5
                await taxManager_.setBulkReferralRate(
                    5,
                    referralRewardsDistribution.tier5.layer1,
                    referralRewardsDistribution.tier5.layer2,
                    referralRewardsDistribution.tier5.layer3,
                    referralRewardsDistribution.tier5.layer4
                );

                await mockEscrow_.setPaymentAmount(PAYMENT_AMOUNT);

                platformTreasuryPool = await taxManager_.platformTreasury();
                platformRevenuePool = await taxManager_.platformRevenuePool();
                referralTaxTreasury = await taxManager_.referralTaxTreasury();
                disputeFeesTreasuryPool =
                    await taxManager_.disputeFeesTreasury();

                taxSnapshot = await takeSnapshot();
            });

            it("Should be able to reward native tokens to solver with projected tax", async function () {
                await taxSnapshot.restore();

                const seekerBalanceBefore = await ethers.provider.getBalance(
                    seeker_.owner
                );

                expect(seekerBalanceBefore).to.equal(DEFAULT_ACCOUNT_BALANCE);

                const solverBalanceBefore = await ethers.provider.getBalance(
                    solver_.owner
                );

                expect(solverBalanceBefore).to.equal(DEFAULT_ACCOUNT_BALANCE);

                // Transfer ether to mockEscrow
                await accounts_[0].sendTransaction({
                    to: mockEscrow_.target,
                    value: PAYMENT_AMOUNT,
                });

                expect(
                    await ethers.provider.getBalance(mockEscrow_.target)
                ).to.equal(PAYMENT_AMOUNT);

                const tx = await mockEscrow_.processPayment();

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["solverAccount", "escrow", "solverReward"];

                const rewardNativeClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "RewardNativeClaimed",
                    keys
                );

                expect(rewardNativeClaimed).to.be.ok;

                expect(rewardNativeClaimed.solverAccount).to.equal(
                    solver_.handlerAddress
                );
                expect(rewardNativeClaimed.escrow).to.equal(mockEscrow_.target);

                const taxValue = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.platformRevenue +
                        solverTax.referralRewards +
                        solverTax.platformTreasury
                );

                const rewardAmount = PAYMENT_AMOUNT - taxValue;

                expect(rewardNativeClaimed.solverReward).to.equal(rewardAmount);

                // Mock escrow should no longer have any native balance after handleRewardNative is called
                expect(
                    await ethers.provider.getBalance(mockEscrow_.target)
                ).to.equal(0);

                // Seeker balance should have no change after call
                expect(
                    await ethers.provider.getBalance(seeker_.owner)
                ).to.equal(seekerBalanceBefore);

                // Solver owner should have more native token after handleRewardNative is called
                expect(
                    await ethers.provider.getBalance(solver_.owner)
                ).to.equal(DEFAULT_ACCOUNT_BALANCE + rewardAmount);

                const platformTreasuryPoolBalance = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.platformTreasury
                );
                const platformRevenuePoolBalance = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.platformRevenue
                );

                let referralTaxAmount = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.referralRewards
                );

                expect(
                    await ethers.provider.getBalance(platformTreasuryPool)
                ).to.equal(
                    platformTreasuryPoolBalance + DEFAULT_ACCOUNT_BALANCE
                );

                expect(
                    await ethers.provider.getBalance(platformRevenuePool)
                ).to.equal(
                    platformRevenuePoolBalance + DEFAULT_ACCOUNT_BALANCE
                );

                let totalReferralTax = 0n;
                // Referrers should not have any balance
                for (let i = 0; i < referrers.length; i++) {
                    let layerNumber = i + 1;
                    let layerKey = `layer${layerNumber}` as LayerKeys;

                    const tax = calculateTaxAmount(
                        referralTaxAmount,
                        BigInt(getLayerValue(layerKey))
                    );

                    expect(
                        await ethers.provider.getBalance(
                            referrers[i].handlerAddress
                        )
                    ).to.equal(tax);

                    totalReferralTax += tax;
                }

                const leftovers = await ethers.provider.getBalance(
                    referralTaxTreasury
                );

                expect(referralTaxAmount).to.equal(
                    leftovers - DEFAULT_ACCOUNT_BALANCE + totalReferralTax
                );
            });

            it("Should be able to reward erc20 tokens to solver with projected tax", async function () {
                await taxSnapshot.restore();

                const seekerBalance = await mockToken_.balanceOf(seeker_.owner);

                expect(seekerBalance).to.equal(0);

                const solverBalance = await mockToken_.balanceOf(solver_.owner);

                expect(solverBalance).to.equal(0);

                // Mint tokens to accounts[0]
                // Account[0] is simulated as escrow here
                await mockToken_.mint(
                    await accounts_[0].getAddress(),
                    PAYMENT_AMOUNT
                );

                expect(
                    await mockToken_.balanceOf(await accounts_[0].getAddress())
                ).to.equal(PAYMENT_AMOUNT);

                await mockToken_
                    .connect(accounts_[0])
                    .approve(rewarder_.target, PAYMENT_AMOUNT);

                const tx = await rewarder_.handleRewardToken(
                    mockToken_.target,
                    6,
                    PAYMENT_AMOUNT
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = [
                    "solverAccount",
                    "escrow",
                    "solverReward",
                    "token",
                ];

                const rewardERC20Claimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "RewardTokenClaimed",
                    keys
                );

                expect(rewardERC20Claimed).to.be.ok;

                expect(rewardERC20Claimed.solverAccount).to.equal(
                    solver_.handlerAddress
                );

                // Account[0] is simulated as escrow here for erc20 token transfers
                expect(rewardERC20Claimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );

                const taxValue = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.platformRevenue +
                        solverTax.referralRewards +
                        solverTax.platformTreasury
                );

                const rewardAmount = PAYMENT_AMOUNT - taxValue;

                expect(rewardERC20Claimed.solverReward).to.equal(rewardAmount);
                expect(rewardERC20Claimed.token).to.equal(mockToken_.target);

                // Mock escrow should no longer have any erc20 balance after handleRewardToken is called
                expect(
                    await mockToken_.balanceOf(await accounts_[0].getAddress())
                ).to.equal(0);

                // Seeker balance should have no change after call
                expect(await mockToken_.balanceOf(seeker_.owner)).to.equal(
                    seekerBalance
                );

                // Solver owner should gain more erc20 tokens after handleRewardToken is called
                expect(await mockToken_.balanceOf(solver_.owner)).to.equal(
                    solverBalance + rewardAmount
                );

                const platformTreasuryPoolBalance = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.platformTreasury
                );
                const platformRevenuePoolBalance = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.platformRevenue
                );

                let referralTaxAmount = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    solverTax.referralRewards
                );

                expect(
                    await mockToken_.balanceOf(platformTreasuryPool)
                ).to.equal(platformTreasuryPoolBalance);

                expect(
                    await mockToken_.balanceOf(platformRevenuePool)
                ).to.equal(platformRevenuePoolBalance);

                let totalReferralTax = 0n;
                // Referrers should not have any balance
                for (let i = 0; i < referrers.length; i++) {
                    let layerNumber = i + 1;
                    let layerKey = `layer${layerNumber}` as LayerKeys;

                    const tax = calculateTaxAmount(
                        referralTaxAmount,
                        BigInt(getLayerValue(layerKey))
                    );

                    expect(
                        await mockToken_.balanceOf(referrers[i].handlerAddress)
                    ).to.equal(tax);

                    totalReferralTax += tax;
                }

                const leftovers = await mockToken_.balanceOf(
                    referralTaxTreasury
                );

                expect(referralTaxAmount).to.equal(
                    leftovers + totalReferralTax
                );
            });

            it("Should be able to handleSeekerTaxNative with projected tax", async function () {
                await taxSnapshot.restore();

                // Account 0 is used to simulate escrow
                const account0BalanceBefore = await ethers.provider.getBalance(
                    await accounts_[0].getAddress()
                );

                expect(
                    await ethers.provider.getBalance(rewarder_.target)
                ).to.equal(0);

                const platformRevenueTax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.platformRevenue
                );

                const referralRewardsTax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.referralRewards
                );

                const tx = await rewarder_.handleSeekerTaxNative(
                    1,
                    platformRevenueTax,
                    referralRewardsTax,
                    { value: platformRevenueTax + referralRewardsTax }
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const gasUsed = receipt.gasUsed;
                const gasPrice = receipt.gasPrice;

                const gasCost = gasUsed * gasPrice;

                const keys = ["seekerAccount", "escrow", "tax"];

                const seekerTaxNativeClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "SeekerTaxPaidNative",
                    keys
                );

                expect(seekerTaxNativeClaimed).to.be.ok;

                expect(seekerTaxNativeClaimed.seekerAccount).to.equal(
                    seeker_.handlerAddress
                );
                expect(seekerTaxNativeClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );

                expect(seekerTaxNativeClaimed.tax).to.equal(
                    platformRevenueTax + referralRewardsTax
                );

                // The rewarder should not hold any tax value
                expect(
                    await ethers.provider.getBalance(rewarder_.target)
                ).to.equal(0n);

                // Account 0 should have a change in value
                expect(
                    await ethers.provider.getBalance(
                        await accounts_[0].getAddress()
                    )
                ).to.equal(
                    account0BalanceBefore -
                        platformRevenueTax -
                        referralRewardsTax -
                        gasCost
                );

                const platformRevenuePoolBalance = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.platformRevenue
                );

                expect(
                    await ethers.provider.getBalance(platformRevenuePool)
                ).to.equal(
                    platformRevenuePoolBalance + DEFAULT_ACCOUNT_BALANCE
                );

                let referralTaxAmount = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.referralRewards
                );

                // Referrers balance check
                for (let i = 0; i < referrers.length; i++) {
                    // Should be 0 since the seeker has no referrers
                    expect(
                        await ethers.provider.getBalance(
                            referrers[i].handlerAddress
                        )
                    ).to.equal(0);
                }

                expect(
                    await ethers.provider.getBalance(referralTaxTreasury)
                ).to.equal(referralTaxAmount + DEFAULT_ACCOUNT_BALANCE);
            });

            it("Should be able to handleSeekerTaxToken with projected tax", async function () {
                await taxSnapshot.restore();

                const platformRevenueTax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.platformRevenue
                );

                const referralRewardsTax = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.referralRewards
                );

                const totalTax = platformRevenueTax + referralRewardsTax;

                await mockToken_.mint(
                    await accounts_[0].getAddress(),
                    totalTax
                );

                await mockToken_.approve(rewarder_.target, totalTax);

                // Account 0 is used to simulate escrow
                const balanceBefore = await mockToken_.balanceOf(
                    await accounts_[0].getAddress()
                );

                expect(balanceBefore).to.equal(totalTax);

                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                const tx = await rewarder_.handleSeekerTaxToken(
                    1,
                    platformRevenueTax,
                    referralRewardsTax,
                    mockToken_.target
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["seekerAccount", "escrow", "tax", "token"];

                const seekerTaxTokenClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "SeekerTaxPaidToken",
                    keys
                );

                expect(seekerTaxTokenClaimed).to.be.ok;

                expect(seekerTaxTokenClaimed.seekerAccount).to.equal(
                    seeker_.handlerAddress
                );
                expect(seekerTaxTokenClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(seekerTaxTokenClaimed.tax).to.equal(
                    platformRevenueTax + referralRewardsTax
                );
                expect(seekerTaxTokenClaimed.token).to.equal(mockToken_.target);

                // The rewarder should not hold any tax value
                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                // Account 0 should have a change in value
                expect(
                    await mockToken_.balanceOf(await accounts_[0].getAddress())
                ).to.equal(
                    balanceBefore - platformRevenueTax - referralRewardsTax
                );

                const platformRevenuePoolBalance = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.platformRevenue
                );

                expect(
                    await mockToken_.balanceOf(platformRevenuePool)
                ).to.equal(platformRevenuePoolBalance);

                let referralTaxAmount = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    seekerTax.referralRewards
                );

                // Referrers have new balances that adds up to the referralTaxAmount + leftovers
                for (let i = 0; i < referrers.length; i++) {
                    // Should be 0 since the seeker has no referrers
                    expect(
                        await mockToken_.balanceOf(referrers[i].handlerAddress)
                    ).to.equal(0);
                }

                expect(
                    await mockToken_.balanceOf(referralTaxTreasury)
                ).to.equal(referralTaxAmount);
            });

            it("Should be able to handleStartDisputeNative with projected tax", async function () {
                await taxSnapshot.restore();

                const account0BalanceBefore = await ethers.provider.getBalance(
                    await accounts_[0].getAddress()
                );

                const disputeTreasuryBefore = await ethers.provider.getBalance(
                    disputeFeesTreasuryPool
                );

                const disputeFeeTaxAmount = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    BigInt(disputeDepositRate)
                );

                // Don't need to use mockRewarder to call this function
                const tx = await rewarder_.handleStartDisputeNative(
                    PAYMENT_AMOUNT,
                    {
                        value: disputeFeeTaxAmount,
                    }
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["escrow", "deposit"];

                const startDisputeNativeClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "DisputeDepositPaidNative",
                    keys
                );

                expect(startDisputeNativeClaimed).to.be.ok;

                expect(startDisputeNativeClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(startDisputeNativeClaimed.deposit).to.equal(
                    disputeFeeTaxAmount
                );

                // The rewarder should not hold any tax value
                expect(
                    await ethers.provider.getBalance(rewarder_.target)
                ).to.equal(0);

                const gasUsed = receipt.gasUsed;
                const gasPrice = receipt.gasPrice;

                const gasCost = gasUsed * gasPrice;

                // Account 0 should have a change in value
                expect(
                    await ethers.provider.getBalance(
                        await accounts_[0].getAddress()
                    )
                ).to.equal(
                    account0BalanceBefore - disputeFeeTaxAmount - gasCost
                );

                const disputeTreasury = await taxManager_.disputeFeesTreasury();

                // Dispute treasury should increase by the tax amount
                expect(
                    await ethers.provider.getBalance(disputeTreasury)
                ).to.equal(disputeTreasuryBefore + disputeFeeTaxAmount);
            });

            it("Should be able to handleStartDisputeToken with projected tax", async function () {
                await taxSnapshot.restore();

                const disputeFeeTaxAmount = calculateTaxAmount(
                    PAYMENT_AMOUNT,
                    BigInt(disputeDepositRate)
                );

                await mockToken_.mint(seeker_.owner, disputeFeeTaxAmount);

                await mockToken_
                    .connect(accounts_[1]) // Seeker Signer // TODO: Change to seeker_
                    .approve(rewarder_.target, disputeFeeTaxAmount);

                // We can use seeker account straight to simulate token transfer
                const balanceBefore = await mockToken_.balanceOf(
                    await accounts_[1].getAddress()
                );

                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                const tx = await rewarder_.handleStartDisputeToken(
                    PAYMENT_AMOUNT,
                    mockToken_.target,
                    1
                );

                const receipt = (await tx.wait()) as ContractTransactionReceipt;

                const keys = ["escrow", "deposit", "token"];

                const startDisputeTokenClaimed = parseEventLogs(
                    receipt.logs,
                    rewarder_.interface,
                    "DisputeDepositPaidToken",
                    keys
                );

                expect(startDisputeTokenClaimed).to.be.ok;

                expect(startDisputeTokenClaimed.escrow).to.equal(
                    await accounts_[0].getAddress()
                );
                expect(startDisputeTokenClaimed.deposit).to.equal(
                    disputeFeeTaxAmount
                );
                expect(startDisputeTokenClaimed.token).to.equal(
                    mockToken_.target
                );

                // The rewarder should not hold any tax value
                expect(await mockToken_.balanceOf(rewarder_.target)).to.equal(
                    0
                );

                // Account 0 should have a change in value
                expect(
                    await mockToken_.balanceOf(await accounts_[1].getAddress())
                ).to.equal(balanceBefore - disputeFeeTaxAmount);

                const disputeTreasury = await taxManager_.disputeFeesTreasury();

                // Dispute treasury should increase by the tax amount
                expect(await mockToken_.balanceOf(disputeTreasury)).to.equal(
                    disputeFeeTaxAmount
                );
            });
        });
    });

    describe("Integration Tests", function () {
        let rewarder_: Rewarder,
            nexus_: Nexus,
            accounts_: Signer[],
            taxManager_: TaxManager,
            seeker_: Signer,
            solver_: Signer;

        it("Rewarder setup should be successful", async function () {
            const { rewarder, nexus, accounts, taxManager } = await loadFixture(
                fixture_integration_tests
            );

            expect(await rewarder.nexus()).to.not.equal(ethers.ZeroAddress);
            expect(await rewarder.steward()).to.equal(
                await accounts[0].getAddress()
            );
            expect(await rewarder.getTaxManager()).to.equal(taxManager.target);

            // Setup profiles
            await nexus.createProfile(
                0,
                await accounts[1].getAddress(),
                "Seeker"
            );
            seeker_ = accounts[1];
            await nexus.createProfile(
                0,
                await accounts[2].getAddress(),
                "Solver"
            );
            solver_ = accounts[2];

            rewarder_ = rewarder;
            nexus_ = nexus;
            accounts_ = accounts;
            taxManager_ = taxManager;
        });
    });
});
