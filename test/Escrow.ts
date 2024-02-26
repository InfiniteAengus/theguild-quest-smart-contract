import {
    loadFixture,
    impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { EscrowNative, MockRewarder } from "../typechain-types";
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
                mockRewarder_: MockRewarder;

            it("Escrow should be deployed, but not yet initialized", async function () {
                const { accounts, escrow, mockRewarder } = await loadFixture(
                    fixture_unit_tests
                );

                expect(await escrow.initialized()).to.be.false;

                accounts_ = accounts;
                escrow_ = escrow;
                mockRewarder_ = mockRewarder;
            });

            it("Should be able to initialize contract and update values", async function () {
                await escrow_.initialize(ethers.ZeroAddress, { value: 1000 });

                expect(await escrow_.initialized()).to.be.true;

                expect(await escrow_.quest()).to.equal(
                    await accounts_[0].getAddress()
                );

                expect(await escrow_.paymentAmount()).to.equal(1000);

                // Get the balance of the contract
                const balance = await ethers.provider.getBalance(
                    escrow_.target
                );

                // Value was sent and amount was updated
                expect(balance).to.equal(1000);
            });

            it("Should be able to call processPayment as the Quest contract", async function () {
                // Get balance of escrow
                const balanceBefore = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balanceBefore).to.equal(1000);

                expect(await escrow_.proccessPayment(0, mockRewarder_.target))
                    .to.emit(mockRewarder_, "RewardNativeClaimed")
                    .withArgs(
                        await accounts_[0].getAddress(),
                        escrow_.target,
                        1000
                    );

                // Get balance of account 0 after
                const balanceAfter = await ethers.provider.getBalance(
                    escrow_.target
                );

                expect(balanceAfter).to.equal(0);
            });

            it("Shouldn't be able to call process payment if not from the quest contract address", async function () {
                await expect(
                    escrow_
                        .connect(accounts_[1])
                        .proccessPayment(0, mockRewarder_.target)
                ).to.be.revertedWith("only quest");
            });

            it("Should be able to call processResolution as the Quest contract", async function () {
                expect(
                    await escrow_.proccessResolution(
                        1,
                        1,
                        0,
                        mockRewarder_.target
                    )
                )
                    .to.emit(mockRewarder_, "ResolutionProccessed")
                    .withArgs(1, 1, 0);
            });

            it("Shouldn't be able to call processResolution if not from the quest contract address", async function () {
                await expect(
                    escrow_
                        .connect(accounts_[1])
                        .proccessResolution(1, 1, 0, mockRewarder_.target)
                ).to.be.revertedWith("only quest");
            });
        });

        // Dependencies contracts aren't quite done yet
        describe("Integration Tests", function () {});
    });
});
