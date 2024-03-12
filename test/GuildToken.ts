import {
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import {
    GuildXp,
} from "../typechain-types";
import {
    full_integration_fixture,
} from "./helpers/fixtures";

describe("Guild Token (XP Token)", function () {
    async function mockAccounts(): Promise<Signer[]> {
        const [owner, user1, user2, user3, user4, user5, user6] =
            await ethers.getSigners();

        return [owner, user1, user2, user3, user4, user5, user6];
    }

    async function fixture_intergration_tests() {
        const accounts = await mockAccounts();
        return await full_integration_fixture(accounts);
    }

    describe("XP Token", function () {
        let accounts_: {
            owner: Signer;
            seeker: Signer;
            solver: Signer;
        },
            xpToken: GuildXp;

        it("Tax manager should be deployed, and initialized", async function () {
            const {
                accounts,
                contracts
            } = await loadFixture(fixture_intergration_tests);

            expect(await contracts.xpToken.owner()).to.equal(await accounts.owner.getAddress());
            expect(await contracts.xpToken.decimals()).to.equal(2);

            xpToken = contracts.xpToken;
            accounts_ = accounts;
        });

        it("Only owner should be able to mint", async function () {
            await expect(xpToken.connect(accounts_.seeker).mint(await accounts_.seeker.getAddress(), 100))
                .to.be.revertedWithCustomError(xpToken, "OwnableUnauthorizedAccount");
        });

        it("Owner should be able to mint", async function () {
            await xpToken.connect(accounts_.owner).mint(await accounts_.seeker.getAddress(), 100);
            expect(await xpToken.balanceOf(await accounts_.seeker.getAddress())).to.equal(100);
        });

        it("Only owner should be able to burn", async function () {
            await expect(xpToken.connect(accounts_.seeker).burn(await accounts_.seeker.getAddress(), 100))
                .to.be.revertedWithCustomError(xpToken, "OwnableUnauthorizedAccount");
        });

        it("Owner should be able to burn", async function () {
            await xpToken.connect(accounts_.owner).burn(await accounts_.seeker.getAddress(), 100);
            expect(await xpToken.balanceOf(await accounts_.seeker.getAddress())).to.equal(0);
        });

        it("Tokens should not be transferrable", async function () {
            await xpToken.connect(accounts_.owner).mint(await accounts_.seeker.getAddress(), 100);

            await expect(xpToken.connect(accounts_.seeker).transfer(await accounts_.solver.getAddress(), 100))
                .to.be.revertedWith("NonTransferableToken: transfer not allowed");
        });

        it("Should not be able to transferFrom unless given approval", async function () {
            await xpToken.connect(accounts_.owner).mint(await accounts_.owner.getAddress(), 100);

            await expect(xpToken.connect(accounts_.owner).transferFrom(await accounts_.seeker.getAddress(), await accounts_.solver.getAddress(), 100))
                .to.be.revertedWith("OwnerTransferOnlyToken: transfers are allowed only from the owner");

            await expect(xpToken.connect(accounts_.seeker).transferFrom(await accounts_.owner.getAddress(), await accounts_.solver.getAddress(), 100))
                .to.be.revertedWithCustomError(xpToken, "ERC20InsufficientAllowance");

            await xpToken.connect(accounts_.owner).approve(await accounts_.seeker.getAddress(), 100);

            await xpToken.connect(accounts_.seeker).transferFrom(await accounts_.owner.getAddress(), await accounts_.solver.getAddress(), 100);

            expect(await xpToken.balanceOf(await accounts_.solver.getAddress())).to.equal(100);
        });
    });
});
