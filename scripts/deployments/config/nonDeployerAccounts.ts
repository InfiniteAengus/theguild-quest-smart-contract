import { NonDeployerConfigAccounts } from "../../../test/helpers/types";

require("dotenv").config();

const masterPublicKey = process.env.GUILD_MASTER_PUBLIC_KEY as string;

export const nonDeployerConfigAccounts: NonDeployerConfigAccounts = {
    // Addresses to be replaced with actual values
    nexusGuardian: masterPublicKey,
    rewarderSteward: masterPublicKey,
    tavernBarkeeper: masterPublicKey,
    tavernMediator: masterPublicKey,
    taxManagerPlatformTreasury: masterPublicKey,
    taxManagerPlatformRevenuePool: masterPublicKey,
    taxManagerReferralTaxTreasury: masterPublicKey,
    taxManagerDisputeFeesTreasury: masterPublicKey,
    guildXpOwner: masterPublicKey,
};
