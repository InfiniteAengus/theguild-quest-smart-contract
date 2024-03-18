import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { GuildXp, TaxManager, TierManager } from "../typechain-types";
import { full_integration_fixture } from "./helpers/fixtures";
import { mockTokenSetup, selfDestructSetup } from "./helpers/setup";

describe("Managers", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_intergration_tests() {
        const accounts = await mockAccounts();
        return await full_integration_fixture(accounts);
    }

    describe("Tax Manager", function () {
        let accounts_: {
                owner: Signer;
                seeker: Signer;
                solver: Signer;
            },
            taxManager: TaxManager;

        it("Tax manager should be deployed, and initialized", async function () {
            const { accounts, contracts } = await loadFixture(
                fixture_intergration_tests
            );

            expect(await contracts.taxManager.custodian()).to.equal(
                await accounts.owner.getAddress()
            );

            taxManager = contracts.taxManager;
            accounts_ = accounts;
        });

        it("Default referral rate should be 0", async function () {
            expect(await taxManager.getReferralRate(1, 0)).to.equal(0);

            // Invalid referral depth will also return 0
            expect(await taxManager.getReferralRate(0, 1)).to.equal(0);
        });

        it("Only custodians should be able to set the custodian", async function () {
            const newCustodian = await accounts_.seeker.getAddress();
            await expect(
                taxManager.connect(accounts_.seeker).setCustodian(newCustodian)
            ).to.be.revertedWith("only custodian");
            await taxManager
                .connect(accounts_.owner)
                .setCustodian(newCustodian);
            expect(await taxManager.custodian()).to.equal(newCustodian);

            await taxManager
                .connect(accounts_.seeker)
                .setCustodian(await accounts_.owner.getAddress());
        });

        it("Only custodians should be able to set the platform treasury pool", async function () {
            const newPool = await accounts_.seeker.getAddress();
            await expect(
                taxManager.setPlatformTreasuryPool(ethers.ZeroAddress)
            ).to.be.revertedWith("Zero address");
            await expect(
                taxManager
                    .connect(accounts_.seeker)
                    .setPlatformTreasuryPool(newPool)
            ).to.be.revertedWith("only custodian");
            await taxManager
                .connect(accounts_.owner)
                .setPlatformTreasuryPool(newPool);
            expect(await taxManager.platformTreasury()).to.equal(newPool);
        });

        it("only custodians should be able to set the platform revenue pool", async function () {
            const newPool = await accounts_.seeker.getAddress();
            await expect(
                taxManager.setPlatformRevenuePool(ethers.ZeroAddress)
            ).to.be.revertedWith("Zero address");
            await expect(
                taxManager
                    .connect(accounts_.seeker)
                    .setPlatformRevenuePool(newPool)
            ).to.be.revertedWith("only custodian");
            await taxManager
                .connect(accounts_.owner)
                .setPlatformRevenuePool(newPool);
            expect(await taxManager.platformRevenuePool()).to.equal(newPool);
        });

        it("Only custodians should be able to set the referral tax treasury", async function () {
            const newPool = await accounts_.seeker.getAddress();
            await expect(
                taxManager.setReferralTaxTreasury(ethers.ZeroAddress)
            ).to.be.revertedWith("Zero address");
            await expect(
                taxManager
                    .connect(accounts_.seeker)
                    .setReferralTaxTreasury(newPool)
            ).to.be.revertedWith("only custodian");
            await taxManager
                .connect(accounts_.owner)
                .setReferralTaxTreasury(newPool);
            expect(await taxManager.referralTaxTreasury()).to.equal(newPool);
        });

        it("only custodians should be able to set the disputeFeesTreasury", async function () {
            const newPool = await accounts_.seeker.getAddress();
            await expect(
                taxManager.setDisputeFeesTreasury(ethers.ZeroAddress)
            ).to.be.revertedWith("Zero address");
            await expect(
                taxManager
                    .connect(accounts_.seeker)
                    .setDisputeFeesTreasury(newPool)
            ).to.be.revertedWith("only custodian");
            await taxManager
                .connect(accounts_.owner)
                .setDisputeFeesTreasury(newPool);
            expect(await taxManager.disputeFeesTreasury()).to.equal(newPool);
        });

        it("Only custodian should be able to set the seeker fees within the valid tax rate", async function () {
            const seekerReferralRewards = 100;
            const seekerPlatformrevenue = 200;

            await expect(
                taxManager
                    .connect(accounts_.solver)
                    .setSeekerFees(seekerReferralRewards, seekerPlatformrevenue)
            ).to.be.revertedWith("only custodian");

            await taxManager.setSeekerFees(
                seekerReferralRewards,
                seekerPlatformrevenue
            );

            const seekerTaxRate = await taxManager.getSeekerTaxRate();
            expect(300n).to.equal(seekerTaxRate);

            const seekerFees = await taxManager.getSeekerFees();
            expect(seekerFees[0]).to.equal(seekerReferralRewards);
            expect(seekerFees[1]).to.equal(seekerPlatformrevenue);
        });

        it("Will revert on invalid tax rate on set seeker fees", async function () {
            const seekerReferralRewards = 1000000;
            const seekerPlatformrevenue = 200;

            await expect(
                taxManager.setSeekerFees(
                    seekerReferralRewards,
                    seekerPlatformrevenue
                )
            ).to.be.revertedWith("Tax rate too high");
        });

        it("Will revert on invalid tax rate on set solver fees", async function () {
            const solverReferralTax = 1000000;
            const solverPlatformRev = 200;
            const solverPlatformTreasury = 300;

            await expect(
                taxManager.setSolverFees(
                    solverReferralTax,
                    solverPlatformRev,
                    solverPlatformTreasury
                )
            ).to.be.revertedWith("Tax rate too high");
        });

        it("Will revert on invalid tax rate on set bulk referral rate", async function () {
            const first = 10000000000;
            const second = 1;
            const third = 1;
            const fourth = 1;

            await expect(
                taxManager.setBulkReferralRate(1, first, second, third, fourth)
            ).to.be.revertedWith("Tax rate too high");
        });

        it("Will revert on invalid tax rate on set dispute rate", async function () {
            const disputeDepositRate = 1000000;

            await expect(
                taxManager.setDisputeDepositRate(disputeDepositRate)
            ).to.be.revertedWith("Tax rate too high");
        });

        it("Only custodian should be able to set the solver fees within the valid tax rate", async function () {
            const solverReferralRewards = 100;
            const solverPlatformrevenue = 200;
            const solverPlatformTreasury = 300;

            await expect(
                taxManager
                    .connect(accounts_.solver)
                    .setSolverFees(
                        solverReferralRewards,
                        solverPlatformrevenue,
                        solverPlatformTreasury
                    )
            ).to.be.revertedWith("only custodian");

            await taxManager.setSolverFees(
                solverReferralRewards,
                solverPlatformrevenue,
                solverPlatformTreasury
            );

            const solverTaxRate = await taxManager.getSolverTaxRate();
            expect(600n).to.equal(solverTaxRate);

            const solverFees = await taxManager.getSolverFees();
            expect(solverFees[0]).to.equal(solverReferralRewards);
            expect(solverFees[1]).to.equal(solverPlatformrevenue);
            expect(solverFees[2]).to.equal(solverPlatformTreasury);
        });

        it("Only custodian should be able to set bulkReferralRate", async function () {
            await expect(
                taxManager
                    .connect(accounts_.solver)
                    .setBulkReferralRate(1, 100, 200, 300, 400)
            ).to.be.revertedWith("only custodian");

            await taxManager.setBulkReferralRate(1, 100, 200, 300, 400);

            const bulkReferralRate = await taxManager.getReferralRate(1, 1);
            expect(bulkReferralRate).to.equal(100);
        });

        it("Only custodian should be able to set disutedepositrate", async function () {
            await expect(
                taxManager.connect(accounts_.solver).setDisputeDepositRate(100)
            ).to.be.revertedWith("only custodian");

            await taxManager.setDisputeDepositRate(100);

            const disputeDepositRate = await taxManager.disputeDepositRate();
            expect(disputeDepositRate).to.equal(100);
        });

        it("Only custodian should be able to recoverTokens native", async function () {
            await expect(
                taxManager
                    .connect(accounts_.solver)
                    .recoverTokens(
                        ethers.ZeroAddress,
                        await accounts_.solver.getAddress()
                    )
            ).to.be.revertedWith("only custodian");

            const selfDestruct = await selfDestructSetup(true);

            // Transfer eth to taxManager
            await accounts_.solver.sendTransaction({
                to: selfDestruct.target,
                value: ethers.parseEther("1.0"),
            });

            await selfDestruct.sendEther(taxManager.target);

            expect(
                await ethers.provider.getBalance(taxManager.target)
            ).to.equal(ethers.parseEther("1.0"));

            const balanceBefore = await ethers.provider.getBalance(
                await accounts_.solver.getAddress()
            );

            await taxManager.recoverTokens(
                ethers.ZeroAddress,
                await accounts_.solver.getAddress()
            );

            const balanceAfter = await ethers.provider.getBalance(
                await accounts_.solver.getAddress()
            );

            expect(balanceAfter - balanceBefore).to.equal(
                ethers.parseEther("1.0")
            );
        });

        it("Only custodian should be able to recoverTokens token", async function () {
            const mockToken = await mockTokenSetup(
                "mockToken",
                "mToken",
                18,
                true
            );

            await mockToken.mint(taxManager.target, 1000);

            expect(await mockToken.balanceOf(taxManager.target)).to.equal(1000);

            await taxManager.recoverTokens(
                mockToken.target,
                await accounts_.solver.getAddress()
            );

            expect(
                await mockToken.balanceOf(await accounts_.solver.getAddress())
            ).to.equal(1000);
        });
    });

    describe("TierManager", function () {
        let accounts_: {
                owner: Signer;
                seeker: Signer;
                solver: Signer;
            },
            tierManager: TierManager,
            xpToken: GuildXp;

        it("TierManager should be deployed, and initialized", async function () {
            const { accounts, contracts } = await loadFixture(
                fixture_intergration_tests
            );

            expect(await contracts.tierManager.magistrate()).to.equal(
                await accounts.owner.getAddress()
            );
            expect(await contracts.tierManager.xpToken()).to.equal(
                contracts.xpToken.target
            );

            tierManager = contracts.tierManager;
            accounts_ = accounts;
            xpToken = contracts.xpToken;
        });

        it("Only magistrate should be able to set the magistrate", async function () {
            await expect(
                tierManager
                    .connect(accounts_.seeker)
                    .setMagistrate(await accounts_.seeker.getAddress())
            ).to.be.revertedWith("only magistrate");

            await tierManager.setMagistrate(
                await accounts_.seeker.getAddress()
            );
            expect(await tierManager.magistrate()).to.equal(
                await accounts_.seeker.getAddress()
            );

            await tierManager
                .connect(accounts_.seeker)
                .setMagistrate(await accounts_.owner.getAddress());
        });

        it("Only magistrate should be able to set the xpToken", async function () {
            await expect(
                tierManager
                    .connect(accounts_.seeker)
                    .setXpToken(await accounts_.seeker.getAddress())
            ).to.be.revertedWith("only magistrate");

            await tierManager.setXpToken(await accounts_.seeker.getAddress());
            expect(await tierManager.xpToken()).to.equal(
                await accounts_.seeker.getAddress()
            );

            await tierManager.setXpToken(xpToken.target);
        });

        it("Only magistrate should be able to set the tier", async function () {
            await expect(
                tierManager
                    .connect(accounts_.seeker)
                    .setConditions(1, 1, 1, 1, 1, 1)
            ).to.be.revertedWith("only magistrate");

            await tierManager.setConditions(1, 1, 1, 1, 1, 1);

            const conditions = await tierManager.tierUpConditions(1);

            expect(conditions[0]).to.equal(1);
            expect(conditions[1]).to.equal(1);
            expect(conditions[2]).to.equal(1);
            expect(conditions[3]).to.equal(1);
            expect(conditions[4]).to.equal(1);
        });

        it("Should be able to validate a user's tier", async function () {
            // Should be able to validate a user's tier
            let tierCounts = [0n, 0n, 0n, 0n, 0n];

            // Invalid check tier upgrade
            const value = await tierManager.checkTierUpgrade(
                tierCounts,
                await accounts_.seeker.getAddress(),
                1
            );

            // Returns false
            expect(value).to.equal(false);

            // Mints xp tokens to the user
            await xpToken.mint(await accounts_.seeker.getAddress(), 1);

            tierCounts = [1n, 1n, 1n, 1n, 1n];

            // Valid check tier upgrade
            const value2 = await tierManager.checkTierUpgrade(
                tierCounts,
                await accounts_.seeker.getAddress(),
                1
            );

            // Returns true
            expect(value2).to.equal(true);
        });

        it("Only magistrate should be able to recoverTokens native", async function () {
            await expect(
                tierManager
                    .connect(accounts_.solver)
                    .recoverTokens(
                        ethers.ZeroAddress,
                        await accounts_.solver.getAddress()
                    )
            ).to.be.revertedWith("only magistrate");

            const selfDestruct = await selfDestructSetup(true);

            // Transfer eth to tierManager
            await accounts_.solver.sendTransaction({
                to: selfDestruct.target,
                value: ethers.parseEther("1.0"),
            });

            await selfDestruct.sendEther(tierManager.target);

            expect(
                await ethers.provider.getBalance(tierManager.target)
            ).to.equal(ethers.parseEther("1.0"));

            const balanceBefore = await ethers.provider.getBalance(
                await accounts_.solver.getAddress()
            );

            await tierManager.recoverTokens(
                ethers.ZeroAddress,
                await accounts_.solver.getAddress()
            );

            const balanceAfter = await ethers.provider.getBalance(
                await accounts_.solver.getAddress()
            );

            expect(balanceAfter - balanceBefore).to.equal(
                ethers.parseEther("1.0")
            );
        });

        it("Only magistrate should be able to recoverTokens token", async function () {
            const mockToken = await mockTokenSetup(
                "mockToken",
                "mToken",
                18,
                true
            );

            await mockToken.mint(tierManager.target, 1000);

            expect(await mockToken.balanceOf(tierManager.target)).to.equal(
                1000
            );

            await tierManager.recoverTokens(
                mockToken.target,
                await accounts_.solver.getAddress()
            );

            expect(
                await mockToken.balanceOf(await accounts_.solver.getAddress())
            ).to.equal(1000);
        });
    });
});
