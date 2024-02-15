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
} from "./helpers/fixtures";

describe("ERC6551", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_unit_tests() {
        const accounts = await mockAccounts();
        return await fixture_6551_unit_tests(accounts);
    }

    async function fixture_integration_tests() {
        const accounts = await mockAccounts();
        return await fixture_6551_integration_tests(accounts);
    }

    // Unit tests to test the ERC6551 Specific Core Requirements
    describe("Unit Tests", function () {
        describe("Registry", function () {
            it("Should be able to create account", async function () {
                const erc6551 = await loadFixture(fixture_6551);

                // Create account from mock data
                const accountCreated = await erc6551.registry.createAccount(
                    erc6551.account.target,
                    ethers.encodeBytes32String("1"),
                    43112,
                    ethers.ZeroAddress,
                    0
                );

                // Transaction should emit ERC6551AccountCreated event
                await expect(accountCreated).to.emit(
                    erc6551.registry,
                    "ERC6551AccountCreated"
                );

                // Transaction should be successful and not return null
                expect(accountCreated).to.be.ok;
            });

            it("Account should be determinstic and the same as created account", async function () {
                const erc6551 = await loadFixture(fixture_6551);

                // Precompile account creation address
                const accountPrecompile = await erc6551.registry.account(
                    erc6551.account.target,
                    ethers.encodeBytes32String("1"),
                    43112,
                    ethers.ZeroAddress,
                    0
                );

                // Account should be a valid address
                expect(accountPrecompile).to.satisfy((account: string) =>
                    ethers.isAddress(account)
                );

                // Create the same account as precompile
                const accountCreated = await erc6551.registry.createAccount(
                    erc6551.account.target,
                    ethers.encodeBytes32String("1"),
                    43112,
                    ethers.ZeroAddress,
                    0
                );

                // Get transaction receipt
                const receipt =
                    (await accountCreated.wait()) as ContractTransactionReceipt;

                // Transaction should be successful
                expect(receipt).to.be.ok;

                // Filter for ERC6551AccountCreated event
                const eventLogs = receipt.logs.find(
                    (log) =>
                        erc6551.registry.interface.parseLog(log as any)
                            ?.name === "ERC6551AccountCreated"
                );

                // Event should be found
                expect(eventLogs).to.be.ok;

                // Get event arguments
                const eventLogArgs = (eventLogs as FilteredLogEvent | EventLog)
                    .args;

                const accountCreatedEvent = {
                    account: eventLogArgs[0],
                    implementation: eventLogArgs[1],
                    salt: eventLogArgs[2],
                    chainId: eventLogArgs[3],
                    tokenContract: eventLogArgs[4],
                    tokenId: eventLogArgs[5],
                };

                // Account created should be the same as precompile
                expect(accountPrecompile).to.equal(accountCreatedEvent.account);
            });
        });

        // Only the ERC6551Account Core Requirements are tested here
        describe("Account", function () {
            it("Should support ERC165", async function () {
                const erc6551 = await loadFixture(fixture_6551);

                // Account should support ERC165
                expect(await erc6551.account.supportsInterface("0x01ffc9a7")).to
                    .be.true;

                // Account should also support IERC6551Account interface
                expect(await erc6551.account.supportsInterface("0x6faff5f1")).to
                    .be.true;

                // Account should also support IERC6551Executable interface
                expect(await erc6551.account.supportsInterface("0x51945447")).to
                    .be.true;

                // Account should not support random interface
                expect(await erc6551.account.supportsInterface("0x12345678")).to
                    .be.false;
            });

            let accounts: Signer[],
                erc6551: ERC6551Setup,
                newAccountInstance: ReferralHandlerERC6551Account,
                accountDetails: AccountDetails,
                mockExecutes: MockExecutes;

            it("Should be able to get the correct token details for the token", async function () {
                const data = await loadFixture(fixture_unit_tests);

                accounts = data.accounts;
                erc6551 = data.erc6551;
                newAccountInstance = data.newAccountInstance;
                accountDetails = data.accountDetails;
                mockExecutes = data.mockExecutes;

                const tokenDetails = await newAccountInstance.token();

                const chainID = Number(tokenDetails[0]);
                const tokenContract = tokenDetails[1];
                const tokenId = Number(tokenDetails[2]);

                expect(chainID).to.equal(accountDetails.chainId);
                expect(tokenContract).to.equal(accountDetails.tokenContract);
                expect(tokenId).to.equal(accountDetails.tokenId);
            });

            it("Should be able to get the owner of the account", async function () {
                const owner = await newAccountInstance.owner();

                expect(owner).to.equal(await accounts[0].getAddress());
            });

            it("Owner of the NFT should be the valid signer", async function () {
                const validSigner = await newAccountInstance.isValidSigner(
                    await accounts[0].getAddress(),
                    "0x"
                );

                expect(validSigner).to.be.ok;
                expect(validSigner).to.equal("0x523e3260");
            });

            it("Other users should not be valid signers", async function () {
                const invalidSigner = await newAccountInstance.isValidSigner(
                    await accounts[1].getAddress(),
                    "0x"
                );

                expect(invalidSigner).to.be.ok;
                expect(invalidSigner).to.equal("0x00000000");
            });

            it("Should be able to provide a valid signature as the owner", async function () {
                const messageHash = ethers.hashMessage("Hello world!");
                const signature = await accounts[0].signMessage("Hello world!");

                const validSignature = await newAccountInstance
                    .connect(accounts[0])
                    .isValidSignature(messageHash, signature);

                expect(validSignature).to.be.ok;
                expect(validSignature).to.equal("0x1626ba7e");
            });

            it("Should not be able to provide a valid signature as a non-owner", async function () {
                const messageHash = ethers.hashMessage("Hello world!");
                const signature = await accounts[1].signMessage("Hello world!");

                const validSignature = await newAccountInstance
                    .connect(accounts[1])
                    .isValidSignature(messageHash, signature);

                expect(validSignature).to.be.ok;
                expect(validSignature).to.equal("0x00000000");
            });

            it("Should not be able to support an operation that is not supported", async function () {
                await accounts[0].sendTransaction({
                    to: newAccountInstance.target,
                    value: 10000,
                });

                await expect(
                    newAccountInstance
                        .connect(accounts[0])
                        .execute(
                            mockExecutes.mockExecuteEth.target,
                            10000,
                            "0x",
                            1
                        )
                ).to.be.revertedWith("Only call operations are supported");
            });

            it("Should be able to execute a simple transfer to a contract as an account", async function () {
                await accounts[0].sendTransaction({
                    to: newAccountInstance.target,
                    value: 10000,
                });

                await newAccountInstance
                    .connect(accounts[0])
                    .execute(
                        mockExecutes.mockExecuteEth.target,
                        10000,
                        "0x",
                        0
                    );

                const balance = await ethers.provider.getBalance(
                    mockExecutes.mockExecuteEth.target
                );

                expect(balance).to.equal(10000);
            });

            it("Should be able to execute a simple function call as an account", async function () {
                const currentValue = await mockExecutes.mockExecuteEth.value();

                expect(ethers.decodeBytes32String(currentValue)).to.equal("0x");

                const bytesData =
                    mockExecutes.mockExecuteEth.interface.encodeFunctionData(
                        "changeValue",
                        [ethers.encodeBytes32String("Hello world!")]
                    );

                const result = await newAccountInstance
                    .connect(accounts[0])
                    .execute(
                        mockExecutes.mockExecuteEth.target,
                        0,
                        bytesData,
                        0
                    );

                const receipt =
                    (await result.wait()) as ContractTransactionReceipt;

                expect(receipt).to.be.ok;

                const eventLogs = receipt.logs.find(
                    (log) =>
                        erc6551.account.interface.parseLog(log as any)?.name ===
                        "ExecutionResult"
                );

                expect(eventLogs).to.be.ok;

                const eventLogArgs = (eventLogs as FilteredLogEvent | EventLog)
                    .args;

                expect(BigInt(eventLogArgs[0]).toString()).to.equal("1");
                expect(BigInt(eventLogArgs[1]).toString()).to.equal("1");
            });

            it("Should not be able to transfer to an address that doesn't accept ETH", async function () {
                await accounts[0].sendTransaction({
                    to: newAccountInstance.target,
                    value: 10000,
                });

                // No error should be thrown
                await expect(
                    newAccountInstance
                        .connect(accounts[0])
                        .execute(
                            mockExecutes.mockExecute.target,
                            10000,
                            "0x",
                            0
                        )
                ).to.be.revertedWithoutReason();
            });
        });
    });

    describe("Integration Tests", function () {
        describe("Registry", function () {
            let erc6551_: ERC6551Setup,
                profileNFT_: ProfileNFT,
                created6551Account_: ReferralHandlerERC6551Account,
                nftId_: string;

            it("Should be able to create an account through the Nexus", async function () {
                const { nexus, accounts, profileNFT, erc6551 } =
                    await loadFixture(fixture_integration_tests);

                // Should not have an nft before hand
                expect(
                    await profileNFT.balanceOf(await accounts[1].getAddress())
                ).to.equal(0);

                // Create a new profile and account
                const handlerAddress = await nexus.createProfile(
                    0,
                    await accounts[1].getAddress(),
                    "ProfileLinkAsTokenURI"
                );

                const receipt =
                    (await handlerAddress.wait()) as ContractTransactionReceipt;

                expect(receipt).to.be.ok;

                // Get profile NewProfileIssuance event
                const profileLogs = receipt.logs.find(
                    (log) =>
                        nexus.interface.parseLog(log as any)?.name ===
                        "NewProfileIssuance"
                ) as EventLog;

                expect(profileLogs).to.be.ok;

                // Get nft Transfer event
                const nftLogs = receipt.logs.find(
                    (log) =>
                        profileNFT.interface.parseLog(log as any)?.name ===
                        "Transfer"
                ) as EventLog;

                expect(nftLogs).to.be.ok;

                // Gets the nft and account address from the logs
                const profileLogArgs = (
                    profileLogs as FilteredLogEvent | EventLog
                ).args;

                // User should now have a nft
                expect(
                    await profileNFT.balanceOf(await accounts[1].getAddress())
                ).to.equal(1);

                // Creates new account instance with the address emitted from the event
                const addressInstance = erc6551.account.attach(
                    profileLogArgs[1]
                ) as ReferralHandlerERC6551Account;

                // Address emitted from the event should be have the accounts interface if its an account
                expect(await addressInstance.supportsInterface("0x6faff5f1")).to
                    .be.true;

                // Parse nft event log as a LogDescription type
                const nftParsedLogs = profileNFT.interface.parseLog(
                    nftLogs as any
                );

                // Get the arguments from the nft event log
                const nftLogArgs = (nftParsedLogs as any).args;

                // Nft should be transferred to the user
                expect(nftLogArgs[1]).to.equal(await accounts[1].getAddress());

                // Token id should be 1
                expect(nftLogArgs[2]).to.equal("1");

                erc6551_ = erc6551;
                profileNFT_ = profileNFT;

                nftId_ = nftLogArgs[2];
                created6551Account_ = addressInstance;
            });

            it("Account created should be the same as the one simulated from registry", async function () {
                const accountSimulated = await erc6551_.registry.account(
                    erc6551_.account.target.toString(),
                    ethers.ZeroHash,
                    43112,
                    profileNFT_.target.toString(),
                    nftId_
                );

                expect(accountSimulated).to.equal(created6551Account_.target);
            });
        });

        describe("Account", function () {
            let nexus_: Nexus,
                accounts_: Signer[],
                erc6551_: ERC6551Setup,
                createdAccount_: ReferralHandlerERC6551Account,
                createdAccount2_: ReferralHandlerERC6551Account,
                managers_: Managers,
                mockExecutes_: MockExecutes;

            it("Should be able to get the correct token details for Profile NFT", async function () {
                const {
                    nexus,
                    accounts,
                    profileNFT,
                    erc6551,
                    managers,
                    mockExecutes,
                } = await loadFixture(fixture_integration_tests);

                // Create a new profile and account
                const handlerAddress = await nexus.createProfile(
                    0,
                    await accounts[1].getAddress(),
                    "ProfileLinkAsTokenURI1"
                );

                const receipt =
                    (await handlerAddress.wait()) as ContractTransactionReceipt;

                expect(receipt).to.be.ok;

                // Get profile NewProfileIssuance event
                const profileLogs = receipt.logs.find(
                    (log) =>
                        nexus.interface.parseLog(log as any)?.name ===
                        "NewProfileIssuance"
                ) as EventLog;

                expect(profileLogs).to.be.ok;

                // Get event arguments
                const profileLogArgs = (
                    profileLogs as FilteredLogEvent | EventLog
                ).args;

                // Create new account instance with the address emitted from the event
                const accountInstance = erc6551.account.attach(
                    profileLogArgs[1]
                ) as ReferralHandlerERC6551Account;

                // Account instance should satisfy the IERC6551Account interface
                expect(await accountInstance.supportsInterface("0x6faff5f1")).to
                    .be.true;

                // Get the token details
                const token = await accountInstance.token();

                const tokenDetails = {
                    chainId: Number(token[0]),
                    tokenContract: token[1],
                    tokenId: Number(token[2]),
                };

                expect(tokenDetails).to.deep.equal({
                    chainId: 43112,
                    tokenContract: profileNFT.target,
                    tokenId: 1,
                });

                // NFT address and token ID can also be retrieved with view functions
                const nftAddress = await accountInstance.getNft();

                expect(nftAddress).to.equal(profileNFT.target);

                const tokenId = await accountInstance.getNftId();

                expect(tokenId).to.equal(1);

                nexus_ = nexus;
                accounts_ = accounts;
                erc6551_ = erc6551;
                managers_ = managers;

                createdAccount_ = accountInstance;

                mockExecutes_ = mockExecutes;
            });

            it("Should not be able to call initialize once the account is created", async function () {
                await expect(
                    createdAccount_.initialize(ethers.ZeroAddress)
                ).to.be.revertedWith("Already initialized");
            });

            it("Owner of the account should be the valid signer", async function () {
                const owner = await createdAccount_.owner();

                expect(owner).to.equal(await accounts_[1].getAddress());
            });

            it("Owner of the NFT should be the valid signer", async function () {
                const validSigner = await createdAccount_.isValidSigner(
                    await accounts_[1].getAddress(),
                    "0x"
                );

                expect(validSigner).to.be.ok;
                expect(validSigner).to.equal("0x523e3260");
            });

            it("Other users should not be valid signers", async function () {
                const invalidSigner = await createdAccount_.isValidSigner(
                    await accounts_[0].getAddress(),
                    "0x"
                );

                expect(invalidSigner).to.be.ok;
                expect(invalidSigner).to.equal("0x00000000");
            });

            it("Should be able to provide a valid signature as the owner", async function () {
                const messageHash = ethers.hashMessage("Hello world!");
                const signature = await accounts_[1].signMessage(
                    "Hello world!"
                );

                const validSignature = await createdAccount_.isValidSignature(
                    messageHash,
                    signature
                );

                expect(validSignature).to.be.ok;
                expect(validSignature).to.equal("0x1626ba7e");
            });

            it("Should not be able to provide a valid signature as a non-owner", async function () {
                const messageHash = ethers.hashMessage("Hello world!");
                const signature = await accounts_[0].signMessage(
                    "Hello world!"
                );

                const validSignature = await createdAccount_.isValidSignature(
                    messageHash,
                    signature
                );

                expect(validSignature).to.be.ok;
                expect(validSignature).to.equal("0x00000000");
            });

            it("State of the contract should be at 0 since there has been no execution", async function () {
                const state = await createdAccount_.state();

                expect(state).to.equal(0);
            });

            it("Should be able to execute a simple transfer to a contract as an account", async function () {
                await accounts_[1].sendTransaction({
                    to: createdAccount_.target,
                    value: 10000,
                });

                await createdAccount_
                    .connect(accounts_[1])
                    .execute(
                        mockExecutes_.mockExecuteEth.target,
                        10000,
                        "0x",
                        0
                    );

                const balance = await ethers.provider.getBalance(
                    mockExecutes_.mockExecuteEth.target
                );

                expect(balance).to.equal(10000);
            });

            it("Invalid signer should not be able to use the execute function", async function () {
                await accounts_[0].sendTransaction({
                    to: createdAccount_.target,
                    value: 10000,
                });

                await expect(
                    createdAccount_
                        .connect(accounts_[0])
                        .execute(
                            mockExecutes_.mockExecuteEth.target,
                            10000,
                            "0x",
                            0
                        )
                ).to.be.revertedWith("Invalid signer");
            });

            it("State of the contract should be incremented by 1 after execution", async function () {
                const state = await createdAccount_.state();

                expect(state).to.equal(1);
            });

            it("Current account tier level should be at 0 since there are no referrals to this account", async function () {
                const tierLevel = await createdAccount_.getTier();

                expect(tierLevel).to.equal(0);
            });

            it("Tier counts should be at 0 since there are no referrals to this account", async function () {
                const tierCounts = await createdAccount_.getTierCounts();

                // Should have no refferals at any tier levels
                expect(tierCounts).to.deep.equal([0n, 0n, 0n, 0n, 0n]);
            });

            it("Tier manager and Tax manager should return a valid address", async function () {
                const tierManager = await createdAccount_.getTierManager();

                expect(tierManager).to.equal(managers_.tierManager.target);

                const taxManager = await createdAccount_.getTaxManager();

                expect(taxManager).to.equal(managers_.taxManager.target);
            });

            it("Attempt to tier up should fail since there are no referrals", async function () {
                await expect(createdAccount_.tierUp()).to.be.revertedWith(
                    "Tier upgrade condition not met"
                );
            });

            it("Tier level should still be at 0 after failed tier up attempt", async function () {
                const tierLevel = await createdAccount_.getTier();

                expect(tierLevel).to.equal(0);
            });

            it("Only master should be able to change the eligibility for a level up", async function () {
                await expect(
                    createdAccount_
                        .connect(accounts_[1])
                        .changeEligibility(true)
                ).to.be.revertedWith("only master");
            });

            it("tierUp should not be possible if eligibility is changed by master", async function () {
                await createdAccount_.changeEligibility(false);

                await expect(createdAccount_.tierUp()).to.be.revertedWith(
                    "Can't increase the tier"
                );
            });

            it("Create another account with the first account as the referrer", async function () {
                const handlerAddress = await nexus_.createProfile(
                    1,
                    await accounts_[2].getAddress(),
                    "ProfileLinkAsTokenURI2"
                );

                const receipt =
                    (await handlerAddress.wait()) as ContractTransactionReceipt;

                expect(receipt).to.be.ok;

                const profileLogs = receipt.logs.find(
                    (log) =>
                        nexus_.interface.parseLog(log as any)?.name ===
                        "NewProfileIssuance"
                ) as EventLog;

                expect(profileLogs).to.be.ok;

                const profileLogArgs = (
                    profileLogs as FilteredLogEvent | EventLog
                ).args;

                const accountInstance = erc6551_.account.attach(
                    profileLogArgs[1]
                ) as ReferralHandlerERC6551Account;

                expect(await accountInstance.supportsInterface("0x6faff5f1")).to
                    .be.true;

                createdAccount2_ = accountInstance;
            });

            it("RefferedBy should return the address of the first account", async function () {
                const referrer = await createdAccount2_.referredBy();

                expect(referrer).to.equal(createdAccount_.target);
            });

            it("Created account 1 should return 1 tier count for the first tier because it referred Account 2", async function () {
                const tierCounts = await createdAccount_.getTierCounts();

                expect(tierCounts).to.deep.equal([1n, 0n, 0n, 0n, 0n]);
            });

            it("Account 1 should still not be able to tier up since it doesn't have higher depth of refferals", async function () {
                await createdAccount_.changeEligibility(true);

                await expect(createdAccount_.tierUp()).to.be.revertedWith(
                    "Tier upgrade condition not met"
                );
            });

            let createdAccount3_: ReferralHandlerERC6551Account,
                createdAccount4_: ReferralHandlerERC6551Account,
                createdAccount5_: ReferralHandlerERC6551Account,
                createdAccount6_: ReferralHandlerERC6551Account;

            it("Create more accounts to increase Account 1's refferals", async function () {
                await nexus_.createProfile(
                    2,
                    await accounts_[3].getAddress(),
                    "ProfileLinkAsTokenURI3"
                );
                await nexus_.createProfile(
                    3,
                    await accounts_[4].getAddress(),
                    "ProfileLinkAsTokenURI4"
                );
                await nexus_.createProfile(
                    4,
                    await accounts_[5].getAddress(),
                    "ProfileLinkAsTokenURI5"
                );
                await nexus_.createProfile(
                    5,
                    await accounts_[6].getAddress(),
                    "ProfileLinkAsTokenURI6"
                );

                const account3 = await nexus_.getHandler(3);

                const createdAccount3 = erc6551_.account.attach(
                    account3
                ) as ReferralHandlerERC6551Account;

                createdAccount3_ = createdAccount3;

                const account4 = await nexus_.getHandler(4);

                const createdAccount4 = erc6551_.account.attach(
                    account4
                ) as ReferralHandlerERC6551Account;

                createdAccount4_ = createdAccount4;

                const account5 = await nexus_.getHandler(5);

                const createdAccount5 = erc6551_.account.attach(
                    account5
                ) as ReferralHandlerERC6551Account;

                createdAccount5_ = createdAccount5;

                const account6 = await nexus_.getHandler(6);

                const createdAccount6 = erc6551_.account.attach(
                    account6
                ) as ReferralHandlerERC6551Account;

                createdAccount6_ = createdAccount6;

                const tierCounts = await createdAccount_.getTierCounts();
                const tierCounts2 = await createdAccount2_.getTierCounts();
                const tierCounts3 = await createdAccount3.getTierCounts();
                const tierCounts4 = await createdAccount4.getTierCounts();
                const tierCounts5 = await createdAccount5.getTierCounts();
                const tierCounts6 = await createdAccount6.getTierCounts();

                // The 1st created account will only have 4 referrals with 1 tier value, wont increase beyond this because only up to 4 depth is taken into account
                expect(tierCounts).to.deep.equal([4n, 0n, 0n, 0n, 0n]);
                // The 2nd created account will only have 4 referrals with 1 tier value
                expect(tierCounts2).to.deep.equal([4n, 0n, 0n, 0n, 0n]);
                // The 3rd created account will only have 3 referrals with 1 tier value
                expect(tierCounts3).to.deep.equal([3n, 0n, 0n, 0n, 0n]);
                // The 4th created account will only have 2 referrals with 1 tier value
                expect(tierCounts4).to.deep.equal([2n, 0n, 0n, 0n, 0n]);
                // The 5th created account will only have 1 referrals with 1 tier value
                expect(tierCounts5).to.deep.equal([1n, 0n, 0n, 0n, 0n]);
                // The 6th created account will only have 0 referrals with 1 tier value
                expect(tierCounts6).to.deep.equal([0n, 0n, 0n, 0n, 0n]);
            });

            it("Should not be able to go out of search bounds when running checkReferralExistence", async function () {
                await expect(
                    createdAccount_.checkReferralExistence(
                        10,
                        createdAccount6_.target
                    )
                ).to.be.revertedWith("Invalid depth");
            });

            it("Should not be able to search for a non-existent account", async function () {
                await expect(
                    createdAccount_.checkReferralExistence(
                        1,
                        ethers.ZeroAddress
                    )
                ).to.be.revertedWith("Invalid referred address");
            });

            it("checkReferralExistence should return default tier of 1 for all of the accounts when queried on account 1", async function () {
                let referralExistence =
                    await createdAccount_.checkReferralExistence(
                        1,
                        createdAccount2_.target
                    );

                expect(referralExistence).to.equal(1);

                referralExistence =
                    await createdAccount_.checkReferralExistence(
                        2,
                        createdAccount3_.target
                    );

                expect(referralExistence).to.equal(1);

                referralExistence =
                    await createdAccount_.checkReferralExistence(
                        3,
                        createdAccount4_.target
                    );

                expect(referralExistence).to.equal(1);

                referralExistence =
                    await createdAccount_.checkReferralExistence(
                        4,
                        createdAccount5_.target
                    );

                expect(referralExistence).to.equal(1);
            });

            it("Unable to addToReferralTree unless called from the Nexus createProfile function", async function () {
                await expect(
                    createdAccount_.addToReferralTree(1, ethers.ZeroAddress, 1)
                ).to.be.revertedWith("only nexus");
            });

            it("Should not be able to updateReferralTree if values out of range", async function () {
                await expect(
                    createdAccount_.updateReferralTree(10, 10)
                ).to.be.revertedWith("Invalid depth");
            });

            it("Should be able to change the tiers of the accounts as the account owners", async function () {
                const account3Data =
                    createdAccount3_.interface.encodeFunctionData(
                        "updateReferralTree",
                        [2, 2]
                    );
                const account4Data =
                    createdAccount4_.interface.encodeFunctionData(
                        "updateReferralTree",
                        [3, 3]
                    );
                const account5Data =
                    createdAccount5_.interface.encodeFunctionData(
                        "updateReferralTree",
                        [4, 4]
                    );

                await createdAccount3_
                    .connect(accounts_[3])
                    .execute(createdAccount_.target, 0, account3Data, 0);

                await createdAccount4_
                    .connect(accounts_[4])
                    .execute(createdAccount_.target, 0, account4Data, 0);

                await createdAccount5_
                    .connect(accounts_[5])
                    .execute(createdAccount_.target, 0, account5Data, 0);

                const tierCounts = await createdAccount_.getTierCounts();

                // Account 1's tier count should be updated like so
                expect(tierCounts).to.deep.equal([1n, 1n, 1n, 1n, 0n]);
            });

            it("Should not be able to update a non-existent referral tree entry", async function () {
                await expect(
                    createdAccount_.updateReferralTree(1, 1)
                ).to.be.revertedWith("Cannot update non-existant entry");

                await expect(
                    createdAccount_.updateReferralTree(2, 1)
                ).to.be.revertedWith("Cannot update non-existant entry");

                await expect(
                    createdAccount_.updateReferralTree(3, 1)
                ).to.be.revertedWith("Cannot update non-existant entry");

                await expect(
                    createdAccount_.updateReferralTree(4, 1)
                ).to.be.revertedWith("Cannot update non-existant entry");
            });

            it("checkReferralExistence tier level for the accounts should be updated", async function () {
                let referralExistence =
                    await createdAccount_.checkReferralExistence(
                        1,
                        createdAccount2_.target
                    );

                expect(referralExistence).to.equal(1);

                referralExistence =
                    await createdAccount_.checkReferralExistence(
                        2,
                        createdAccount3_.target
                    );

                expect(referralExistence).to.equal(2);

                referralExistence =
                    await createdAccount_.checkReferralExistence(
                        3,
                        createdAccount4_.target
                    );

                expect(referralExistence).to.equal(3);

                referralExistence =
                    await createdAccount_.checkReferralExistence(
                        4,
                        createdAccount5_.target
                    );

                expect(referralExistence).to.equal(4);
            });

            it("Should be able to tier up after the the referral tree is updated by the referrers", async function () {
                let tierLevel = await createdAccount_.getTier();

                // Tier level should be at 0 before tierUp
                expect(tierLevel).to.equal(0);

                await createdAccount_.tierUp();

                tierLevel = await createdAccount_.getTier();

                // Tier level should increase to 1 after tierUp
                expect(tierLevel).to.equal(1);
            });

            it("Only the protocol should be able to set the tier", async function () {
                await expect(
                    createdAccount5_.connect(accounts_[1]).setTier(10)
                ).to.be.revertedWith("only master or nexus");
            });

            it("The protocol should be able to set the tier level of the account while updating the referrers above", async function () {
                let tierCount = await createdAccount2_.getTierCounts();

                // Account 2's original tier counts should all be level 1
                expect(tierCount).to.deep.equal([4n, 0n, 0n, 0n, 0n]);

                // Should not be able to set a tier out of range
                await expect(createdAccount5_.setTier(10)).to.be.revertedWith(
                    "Invalid Tier"
                );

                await createdAccount5_.setTier(3);

                tierCount = await createdAccount2_.getTierCounts();

                // Account 2's tier counts should be updated to reflect the change
                expect(tierCount).to.deep.equal([3n, 0n, 0n, 1n, 0n]);
            });

            it("Should be able to setTier for an account that does not have any referrals within some of the depths", async function () {
                let tierCount = await createdAccount_.getTierCounts();

                // Account 1's original tier counts should all be level 1
                expect(tierCount).to.deep.equal([1n, 1n, 1n, 1n, 0n]);

                await createdAccount_.setTier(2);

                tierCount = await createdAccount_.getTierCounts();

                // Account 1's tier should not have any changes
                expect(tierCount).to.deep.equal([1n, 1n, 1n, 1n, 0n]);

                tierCount = await createdAccount2_.getTierCounts();

                // Account 2's original tier counts should have 3 at level 1 and 1 at level 4
                expect(tierCount).to.deep.equal([3n, 0n, 0n, 1n, 0n]);

                await createdAccount2_.setTier(2);

                tierCount = await createdAccount2_.getTierCounts();

                // Account 2's should not have any changes
                expect(tierCount).to.deep.equal([3n, 0n, 0n, 1n, 0n]);

                tierCount = await createdAccount_.getTierCounts();

                // Account 1's should have a change at level 3
                expect(tierCount).to.deep.equal([0n, 1n, 2n, 1n, 0n]);

                tierCount = await createdAccount3_.getTierCounts();

                // Account 3's original tier counts should all be level 1 but 1 at level 4
                expect(tierCount).to.deep.equal([2n, 0n, 0n, 1n, 0n]);

                await createdAccount3_.setTier(2);

                tierCount = await createdAccount3_.getTierCounts();

                // Account 3's should not have any changes
                expect(tierCount).to.deep.equal([2n, 0n, 0n, 1n, 0n]);

                tierCount = await createdAccount_.getTierCounts();

                // Account 1's should have a change at level 3
                expect(tierCount).to.deep.equal([0n, 0n, 3n, 1n, 0n]);

                tierCount = await createdAccount2_.getTierCounts();

                // Account 2's should have a change at level 3
                expect(tierCount).to.deep.equal([2n, 0n, 1n, 1n, 0n]);

                tierCount = await createdAccount4_.getTierCounts();

                // Account 4's original tier counts should be at level 1 and at level 4
                expect(tierCount).to.deep.equal([1n, 0n, 0n, 1n, 0n]);

                await createdAccount4_.setTier(2);

                tierCount = await createdAccount4_.getTierCounts();

                // Account 4's should not have any changes
                expect(tierCount).to.deep.equal([1n, 0n, 0n, 1n, 0n]);

                tierCount = await createdAccount_.getTierCounts();

                // Account 1's should have a change at level 3
                expect(tierCount).to.deep.equal([0n, 0n, 3n, 1n, 0n]);

                tierCount = await createdAccount2_.getTierCounts();

                // Account 2's should have a change at level 3
                expect(tierCount).to.deep.equal([1n, 0n, 2n, 1n, 0n]);

                tierCount = await createdAccount3_.getTierCounts();

                // Account 3's should have a change at level 3
                expect(tierCount).to.deep.equal([1n, 0n, 1n, 1n, 0n]);
            });

            it("Only the master should be able to set the nexus contract address", async function () {
                await expect(
                    createdAccount2_
                        .connect(accounts_[4])
                        .setNexus(ethers.ZeroAddress)
                ).to.be.revertedWith("only master");

                await createdAccount2_
                    .connect(accounts_[0])
                    .setNexus(ethers.ZeroAddress);

                expect(await createdAccount2_.nexus()).to.equal(
                    ethers.ZeroAddress
                );
            });
        });
    });
});
