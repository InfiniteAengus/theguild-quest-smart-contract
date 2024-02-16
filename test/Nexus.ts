import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTransactionReceipt, Signer } from "ethers";
import {
    AccountDetails,
    FilteredLogEvent,
    ERC6551Setup,
    MockExecutes,
    Managers,
} from "./helpers/types";
import { EventLog } from "ethers";
import {
    ReferralHandlerERC6551Account,
    ProfileNFT,
    Nexus,
} from "../typechain-types";
import {
    fixture_6551,
    fixture_6551_integration_tests,
    fixture_6551_unit_tests,
    fixture_nexus_unit_tests,
} from "./helpers/fixtures";
import { parseEventLogs } from "./helpers/utils";

describe("Nexus", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_unit_tests() {
        const accounts = await mockAccounts();
        return await fixture_nexus_unit_tests(accounts);
    }

    // Unit tests to test the ERC6551 Specific Core Requirements
    describe("Unit Tests", function () {
        let nexus_: Nexus,
            erc6551_: ERC6551Setup,
            accounts_: Signer[],
            profileNFT_: ProfileNFT;

        it("Account and Registry contract should be added successfully", async function () {
            const { nexus, erc6551, accounts, profileNFT } = await loadFixture(
                fixture_unit_tests
            );

            const accountImplementation = await nexus.accountImplementation();

            expect(accountImplementation).to.not.equal(ethers.ZeroAddress);
            expect(accountImplementation).to.equal(erc6551.account.target);

            const accountRegistry = await nexus.Registry();

            expect(accountRegistry).to.not.equal(ethers.ZeroAddress);
            expect(accountRegistry).to.equal(erc6551.registry.target);

            nexus_ = nexus;
            erc6551_ = erc6551;
            accounts_ = accounts;
            profileNFT_ = profileNFT;
        });

        it("Only Master should be able to addHandlers manually", async function () {
            await expect(
                nexus_.connect(accounts_[1]).addHandler(ethers.ZeroAddress)
            ).to.be.revertedWith("only master");

            await nexus_.addHandler(await accounts_[0].getAddress());

            expect(await nexus_.isHandler(await accounts_[0].getAddress())).to
                .be.true;
        });

        it("Should not be able to notify tier upgrade unless the account is a handler", async function () {
            await expect(
                nexus_.connect(accounts_[1]).notifyTierUpdate(1, 2)
            ).to.be.revertedWith("only handler");
        });

        it("Should be able to notify tier upgrade if the account is a handler", async function () {
            expect(await nexus_.notifyTierUpdate(1, 2))
                .to.emit(nexus_, "LevelChange")
                .withArgs(await accounts_[0].getAddress(), 1, 2);
        });

        it("Should not be able to notifySelfTaxClaimed unless the account is a handler", async function () {
            await expect(
                nexus_.connect(accounts_[1]).notifySelfTaxClaimed(1, 2)
            ).to.be.revertedWith("only handler");
        });

        it("Should be able to notifySelfTaxClaimed if the account is a handler", async function () {
            expect(await nexus_.notifySelfTaxClaimed(1, 2))
                .to.emit(nexus_, "LevelChange")
                .withArgs(await accounts_[0].getAddress(), 1, 2);
        });

        it("Should not be able to notifyReferralTaxClaimed unless the account is a handler", async function () {
            await expect(
                nexus_.connect(accounts_[1]).notifyReferralTaxClaimed(1, 2)
            ).to.be.revertedWith("only handler");
        });

        it("Should be able to notifyReferralTaxClaimed if the account is a handler", async function () {
            expect(await nexus_.notifyReferralTaxClaimed(1, 2))
                .to.emit(nexus_, "LevelChange")
                .withArgs(await accounts_[0].getAddress(), 1, 2);
        });

        it("Only master should be able to change the master", async function () {
            await expect(
                nexus_
                    .connect(accounts_[1])
                    .setMaster(await accounts_[1].getAddress())
            ).to.be.revertedWith("only master");

            await nexus_.setMaster(await accounts_[1].getAddress());

            expect(await nexus_.master()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Only master should be able the set the guardian", async function () {
            await expect(
                nexus_
                    .connect(accounts_[0])
                    .setGuardian(await accounts_[1].getAddress())
            ).to.be.revertedWith("only master");

            await nexus_
                .connect(accounts_[1])
                .setGuardian(await accounts_[1].getAddress());

            expect(await nexus_.guardian()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Only master should be able to se the rewarder", async function () {
            await expect(
                nexus_
                    .connect(accounts_[0])
                    .setRewarder(await accounts_[1].getAddress())
            ).to.be.revertedWith("only master");

            await nexus_
                .connect(accounts_[1])
                .setRewarder(await accounts_[1].getAddress());

            expect(await nexus_.rewarder()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Only master should be able to set the NFT", async function () {
            await expect(
                nexus_
                    .connect(accounts_[0])
                    .setNFT(await accounts_[1].getAddress())
            ).to.be.revertedWith("only master");

            await nexus_.connect(accounts_[1]).setNFT(profileNFT_.target);

            expect(await nexus_.NFT()).to.equal(profileNFT_.target);
        });

        it("Only master should be able to set the account implementation", async function () {
            await expect(
                nexus_
                    .connect(accounts_[0])
                    .setAccountImpl(await accounts_[1].getAddress())
            ).to.be.revertedWith("only master");

            await nexus_
                .connect(accounts_[1])
                .setAccountImpl(ethers.ZeroAddress);

            expect(await nexus_.accountImplementation()).to.equal(
                ethers.ZeroAddress
            );

            // Swap back account implementation for creating profile later on
            await nexus_
                .connect(accounts_[1])
                .setAccountImpl(erc6551_.account.target);
        });

        it("Only master should be able to set the tax manager", async function () {
            await expect(
                nexus_
                    .connect(accounts_[0])
                    .setTaxManager(await accounts_[1].getAddress())
            ).to.be.revertedWith("only master");

            await nexus_
                .connect(accounts_[1])
                .setTaxManager(await accounts_[1].getAddress());

            expect(await nexus_.taxManager()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Only master should be able to set the tier manager", async function () {
            await expect(
                nexus_
                    .connect(accounts_[0])
                    .setTierManager(await accounts_[1].getAddress())
            ).to.be.revertedWith("only master");

            await nexus_
                .connect(accounts_[1])
                .setTierManager(await accounts_[1].getAddress());

            expect(await nexus_.tierManager()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Only master should be able to view the guardian", async function () {
            await expect(
                nexus_.connect(accounts_[0]).getGuardian()
            ).to.be.revertedWith("only master");

            const guardian = await nexus_.connect(accounts_[1]).getGuardian();

            expect(guardian).to.equal(await accounts_[1].getAddress());
        });

        it("Should be able to createProfile of a handler account that matches the registry", async function () {
            const handlerAddress = await nexus_
                .connect(accounts_[1])
                .createProfile(
                    0,
                    await accounts_[2].getAddress(),
                    "ProfileLinkGoesHere"
                );

            const receipt =
                (await handlerAddress.wait()) as ContractTransactionReceipt;

            expect(receipt).to.be.ok;

            const eventLogs = receipt.logs.find(
                (log) =>
                    nexus_.interface.parseLog(log as any)?.name ===
                    "NewProfileIssuance"
            );

            expect(eventLogs).to.be.ok;

            const keys = ["nftId", "handlerAddress"]; // replace with your actual keys

            const newProfileIssuance = parseEventLogs(
                receipt.logs,
                nexus_.interface,
                "NewProfileIssuance",
                keys
            );

            const account = await erc6551_.registry.account(
                erc6551_.account.target,
                ethers.ZeroHash,
                43112,
                profileNFT_.target,
                1
            );

            expect(newProfileIssuance.nftId).to.equal(1);
            expect(newProfileIssuance.handlerAddress).to.equal(account);
        });
    });

    describe("Integration Tests", function () {});
});
