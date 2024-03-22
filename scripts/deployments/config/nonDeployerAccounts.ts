import { NonDeployerConfigAccounts } from "../../../test/helpers/types";

import { load } from "ts-dotenv";

const env = load({
    GUILD_MASTER_PUBLIC_KEY: String,
});

export const nonDeployerConfigAccounts: NonDeployerConfigAccounts = {
    // Addresses to be replaced with actual values
    nexusGuardian: env.GUILD_MASTER_PUBLIC_KEY,
    rewarderSteward: env.GUILD_MASTER_PUBLIC_KEY,
    tavernBarkeeper: env.GUILD_MASTER_PUBLIC_KEY,
    tavernMediator: env.GUILD_MASTER_PUBLIC_KEY,
    taxManagerPlatformTreasury: env.GUILD_MASTER_PUBLIC_KEY,
    taxManagerPlatformRevenuePool: env.GUILD_MASTER_PUBLIC_KEY,
    taxManagerReferralTaxTreasury: env.GUILD_MASTER_PUBLIC_KEY,
    taxManagerDisputeFeesTreasury: env.GUILD_MASTER_PUBLIC_KEY,
    guildXpOwner: env.GUILD_MASTER_PUBLIC_KEY,
};
