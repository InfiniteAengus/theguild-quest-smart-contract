import {
    loadFixture,
    impersonateAccount,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import {
    ReferralHandlerERC6551Account,
    ProfileNFT,
    Nexus,
    MockToken,
} from "../typechain-types";
import {
    fixture_profile_nft_integration_tests,
    fixture_profile_nft_unit_tests,
    full_integration_fixture,
} from "./helpers/fixtures";
import {
    mockFailReceiverSetup,
    mockTokenSetup,
    selfDestructSetup,
} from "./helpers/setup";

describe("ProfileNFT", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_unit_tests() {
        const accounts = await mockAccounts();
        return await fixture_profile_nft_unit_tests(accounts);
    }

    async function fixture_integration_tests() {
        const accounts = await mockAccounts();
        return await full_integration_fixture(accounts);
    }

    // Unit tests to test the ProfileNFT contract
    describe("Unit Tests", function () {
        let accounts_: Signer[], profileNFT_: ProfileNFT;

        it("Profile NFT should be deployed correctly", async function () {
            const { accounts, profileNFT, nexus } = await loadFixture(
                fixture_unit_tests
            );

            expect(await profileNFT.name()).to.equal("The Guild profile NFT");
            expect(await profileNFT.symbol()).to.equal("GuildNFT");
            expect(await profileNFT.nexus()).to.equal(
                await accounts[0].getAddress()
            );
            expect(await profileNFT.counselor()).to.equal(
                await accounts[0].getAddress()
            );

            accounts_ = accounts;
            profileNFT_ = profileNFT;
        });

        it("Should be able to issue profile to a user with a designated tokenURI", async function () {
            const tokenURI = "https://www.example.com";

            await profileNFT_.issueProfile(
                await accounts_[1].getAddress(),
                tokenURI
            );

            const balance = await profileNFT_.balanceOf(
                await accounts_[1].getAddress()
            );

            // The account should have 1 profile minted to it
            expect(balance).to.equal(1);

            expect(await profileNFT_.ownerOf(1)).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Should return the correct token URI for the profile", async function () {
            const tokenURI = await profileNFT_.tokenURI(1);

            expect(tokenURI).to.equal("https://www.example.com");
        });

        it("Should be able to transfer profile to another address", async function () {
            await profileNFT_
                .connect(accounts_[1])
                .transfer(await accounts_[2].getAddress(), 1);

            let balance = await profileNFT_.balanceOf(
                await accounts_[1].getAddress()
            );

            // The account should have 0 profiles nft now
            expect(balance).to.equal(0);

            balance = await profileNFT_.balanceOf(
                await accounts_[2].getAddress()
            );

            // Account 2 should now have 1 profile nft
            expect(balance).to.equal(1n);
        });

        it("Other users shouldn't be able to transfer without prior approval", async function () {
            await expect(
                profileNFT_
                    .connect(accounts_[1])
                    .transferFrom(
                        await accounts_[2].getAddress(),
                        await accounts_[3].getAddress(),
                        1
                    )
            ).to.be.revertedWithCustomError(
                profileNFT_,
                "ERC721InsufficientApproval"
            );
        });

        it("Should be able to transfer once approval is given", async function () {
            await profileNFT_
                .connect(accounts_[2])
                .approve(await accounts_[1].getAddress(), 1);

            await profileNFT_
                .connect(accounts_[1])
                .transferFrom(
                    await accounts_[2].getAddress(),
                    await accounts_[3].getAddress(),
                    1
                );

            let balance = await profileNFT_.balanceOf(
                await accounts_[2].getAddress()
            );

            // The account should have 0 profiles nft now
            expect(balance).to.equal(0);

            balance = await profileNFT_.balanceOf(
                await accounts_[3].getAddress()
            );

            // Account 3 should now have 1 profile nft
            expect(balance).to.equal(1n);
        });

        it("Only counselor should be able to change the counselor address", async function () {
            await expect(
                profileNFT_
                    .connect(accounts_[1])
                    .setCounselor(await accounts_[1].getAddress())
            ).to.be.revertedWith("only Counselor");
        });

        it("counselor should be able to change the counselor address", async function () {
            await profileNFT_
                .connect(accounts_[0])
                .setCounselor(await accounts_[1].getAddress());

            expect(await profileNFT_.counselor()).to.equal(
                await accounts_[1].getAddress()
            );
        });

        it("Only counselor should be able to change the nexus address", async function () {
            await expect(
                profileNFT_
                    .connect(accounts_[2])
                    .setNexus(await accounts_[2].getAddress())
            ).to.be.revertedWith("only Counselor");
        });

        it("counselor should be able to change the nexus address", async function () {
            await profileNFT_
                .connect(accounts_[1])
                .setNexus(await accounts_[2].getAddress());

            expect(await profileNFT_.nexus()).to.equal(
                await accounts_[2].getAddress()
            );
        });

        let mockToken_: MockToken;

        it("Should not be able to recover tokens if the caller is not the counselor", async function () {
            mockToken_ = await mockTokenSetup("mockToken", "mToken", 18, true);

            await expect(
                profileNFT_
                    .connect(accounts_[0])
                    .recoverTokens(
                        mockToken_.target,
                        await accounts_[0].getAddress()
                    )
            ).to.be.revertedWith("only Counselor");
        });

        it("counselor should be able to recover Native tokens from the contract", async function () {
            // Self destruct method to simulate force sending native tokens to the contract
            const selfDestruct = await selfDestructSetup(true);

            await accounts_[1].sendTransaction({
                to: selfDestruct.target,
                value: ethers.parseEther("1"),
            });

            let balance = await ethers.provider.getBalance(selfDestruct.target);

            expect(balance).to.equal(ethers.parseEther("1"));

            await selfDestruct.sendEther(profileNFT_.target);

            balance = await ethers.provider.getBalance(selfDestruct.target);

            expect(balance).to.equal(0);

            balance = await ethers.provider.getBalance(profileNFT_.target);

            expect(balance).to.equal(ethers.parseEther("1"));

            let balanceBefore = await ethers.provider.getBalance(
                await accounts_[6].getAddress()
            );

            await profileNFT_
                .connect(accounts_[1])
                .recoverTokens(
                    ethers.ZeroAddress,
                    await accounts_[6].getAddress()
                );

            let balanceAfter = await ethers.provider.getBalance(
                await accounts_[6].getAddress()
            );

            expect(balanceAfter - balanceBefore).to.equal(
                ethers.parseEther("1")
            );
        });

        it("Councelor should be able to recover ERC20 tokens from the contract", async function () {
            await mockToken_.mint(profileNFT_.target, 1000);

            let balance = await mockToken_.balanceOf(profileNFT_.target);

            expect(balance).to.equal(1000);

            balance = await mockToken_.balanceOf(
                await accounts_[6].getAddress()
            );

            expect(balance).to.equal(0);

            await profileNFT_
                .connect(accounts_[1])
                .recoverTokens(
                    mockToken_.target,
                    await accounts_[6].getAddress()
                );

            balance = await mockToken_.balanceOf(
                await accounts_[6].getAddress()
            );

            expect(balance).to.equal(1000);
        });

        it("Native token recoverTokens can fail if destination doesn't have a payable fallback", async function () {
            const mockFailReceiver = await mockFailReceiverSetup(true);

            await profileNFT_
                .connect(accounts_[1])
                .setCounselor(mockFailReceiver.target);

            await expect(
                mockFailReceiver.targetRecoverTokens(profileNFT_.target)
            ).to.be.revertedWith("Send error");
        });
    });

    describe("Integration Tests", function () {
        let nexus_: Nexus,
            accounts_: {
                owner: Signer;
                seeker: Signer;
                solver: Signer;
            },
            profileNFT_: ProfileNFT;

        it("Should be deployed correctly", async function () {
            const { accounts, contracts } = await loadFixture(
                fixture_integration_tests
            );

            expect(await contracts.profileNFT.nexus()).to.equal(
                contracts.nexus.target
            );
            expect(await contracts.profileNFT.counselor()).to.equal(
                await accounts.owner.getAddress()
            );

            await contracts.nexus.setNFT(contracts.profileNFT.target);
            await contracts.nexus.setGuardian(
                await accounts.owner.getAddress()
            );

            accounts_ = accounts;
            profileNFT_ = contracts.profileNFT;
            nexus_ = contracts.nexus;
        });

        let profileCreated: ReferralHandlerERC6551Account;

        it("Only nexus contract should be able to issue a profile nft", async function () {
            await expect(
                profileNFT_
                    .connect(accounts_.seeker)
                    .issueProfile(
                        await accounts_.seeker.getAddress(),
                        "https://www.example.com"
                    )
            ).to.be.revertedWith("only nexus");
        });

        it("Should be able to issue a profile nft to a user through the Nexus contract", async function () {
            await nexus_
                .connect(accounts_.owner)
                .createProfile(
                    0,
                    await accounts_.seeker.getAddress(),
                    "https://www.example.com"
                );

            const balance = await profileNFT_.balanceOf(
                await accounts_.seeker.getAddress()
            );

            expect(balance).to.equal(1);

            expect(await profileNFT_.ownerOf(1)).to.equal(
                await accounts_.seeker.getAddress()
            );

            const handlerAddress = await nexus_.getHandler(1);

            profileCreated = await ethers.getContractAt(
                "ReferralHandlerERC6551Account",
                handlerAddress
            );
        });

        it("Should be able to get the correct tier of the token owner's handler based from the tokenID", async function () {
            const tier = await profileNFT_.getTier(1);

            expect(tier).to.equal(1);
        });

        it("Should not be able to change the URI unless the caller is the Handler contract", async function () {
            await expect(
                profileNFT_
                    .connect(accounts_.seeker)
                    .changeURI(1, "https://www.example2.com")
            ).to.be.revertedWith("Only Guardian can update Token's URI");
        });

        it("Should be able to change the URI if the caller is the Guardian", async function () {
            // Updating the URI
            await profileNFT_
                .connect(accounts_.owner)
                .changeURI(1, "https://www.example2.com");

            const tokenURI = await profileNFT_.tokenURI(1);

            expect(tokenURI).to.equal("https://www.example2.com");
        });

        it("Should increase a profile's tier count whenever it is used as a referral", async function () {
            // Tier counts should be 0 for tier 1
            const tierCountsBefore = await profileCreated.getTierCounts();

            expect(tierCountsBefore).to.deep.equal([0n, 0n, 0n, 0n, 0n]);

            await nexus_.createProfile(
                1,
                await accounts_.solver.getAddress(),
                "https://www.example.com"
            );

            await nexus_.createProfile(
                1,
                await accounts_.solver.getAddress(),
                "https://www.example.com"
            );

            await nexus_.createProfile(
                1,
                await accounts_.solver.getAddress(),
                "https://www.example.com"
            );

            await nexus_.createProfile(
                1,
                await accounts_.solver.getAddress(),
                "https://www.example.com"
            );

            const tierCountsAfter = await profileCreated.getTierCounts();

            expect(tierCountsAfter).to.deep.equal([4n, 0n, 0n, 0n, 0n]);
        });
    });
});
