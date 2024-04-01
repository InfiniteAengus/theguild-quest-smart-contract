# The Guild Deployment Checklist

## Pre-Requisites

-   [ ] Accounts Required

    -   [ ] `Nexus` Master - Deployer
    -   [ ] `Nexus` Guardian
    -   [ ] `ProfileNFT` Counselor - Deployer
    -   [ ] `Rewarder` Steward
    -   [ ] `Tavern` Owner - Deployer
    -   [ ] `Tavern` Barkeeper
    -   [ ] `Tavern` Mediator
    -   [ ] `TaxManager` Custodian - Deployer
    -   [ ] `TaxManager` Platform Treasury
    -   [ ] `TaxManager` Platform Revenue Pool
    -   [ ] `TaxManager` Referral Tax Treasury
    -   [ ] `TaxManager` Dispute Fees Treasury
    -   [ ] `TierManager` Magistrate - Deployer
    -   [ ] `GuildXP` Owner

    NOTE: Deployer related accounts will need to be configured within the hardhat config file through a .env

-   [ ] Parameters

    -   [ ] `TierManager` Tier Conditions
    -   [ ] `TaxManager` Referral Rates
    -   [ ] `TaxManager` Dispute Deposit Rate
    -   [ ] `TaxManager` Solver Fees
    -   [ ] `TaxManager` Seeker Fees
    -   [ ] `Tavern` Review Period

## Deployment Steps

1. ERC6551 Contract Deployment
    - Deploy Registry - `ERC6551Registry.sol`
    - Deploy Account - `ReferralHandlerERC6551Account.sol`
2. Nexus Contract Deployment
    - Requires - Registry and Account Contract Address
    - Deployer will be set as `Master` on the `Nexus` Contract
    - Deploy Nexus - `Nexus.sol`
3. Rewarder Contract Deployment
    - Requires - `Steward` Address and Nexus Contract Address
    - Deploy Rewarder - `Rewarder.sol`
4. Profile NFT Contract Deployment
    - Requires - `Nexus` Contract Address
    - Deployer will be set as `Counselor` on the `ProfileNFT` Contract
    - Deploy Profile NFT - `ProfileNFT.sol`
5. Escrow Implementations Deployment
    - Deploy Escrow Native - `EscrowNative.sol`
    - Deploy Escrow Token - `EscrowToken.sol`
6. Quest Implementation Deployment
    - Deploy Quest - `Quest.sol`
7. Tavern Contract Deployment
    - Requires
        - `Quest` Implementation Address
        - `EscrowNative` Implementation Address
        - `EscrowToken` Implementation Address
        - `Nexus` Contract Address
    - Deployer will be set as `Owner` on the `Tavern` Contract
    - Deploy Tavern - `Tavern.sol`
8. GuildXp Token Contract Deployment
    - Requires - Owner Address
    - Deploy GuildXp Token - `GuildXp.sol`
9. Tax Manager Contract Deployment
    - Deployer will be set as `Custodian` on the `TaxManager`
    - Deploy Tax Manager - `TaxManager.sol`
10. Tier Manager Contract Deployment
    - Requires - GuildXp Token Address
    - Deployer will be set as `Magistrate` on the `TierManager`
    - Deploy Tier Manager - `TierManager.sol`
11. Nexus Addresses Setup
    - `setGuardian()` with Guardian Address
    - `setRewarder()` with Rewarder Contract Address
    - `setNFT()` with ProfileNFT Contract Address
    - `setTaxManager()` with TaxManager Contract Address
    - `setTierManager()` with TierManager Contract Address
12. Tavern Admin Addresses and Review Period Setup
    - `setBarkeeper()` with Barkeeper Address
    - `setMediator()` with Mediator Address
    - `setReviewPeriod()` with Review Period
13. Tax Manager Addresses Setup
    - `setPlatformTreasuryPool()` with Platform Treasury Address
    - `setPlatformRevenuePool()` with Platform Revenue Pool Address
    - `setReferralTaxTreasury()` with Referral Tax Treasury Address
    - `setDisputeFeesTreasury()` with Dispute Fees Treasury Address
14. Tax Manager Fees Setup
    - Fees individual and total value for each type needs to be 10_000 or less
    - `setSeekerFees()` with Referral Reward Tax and Platform Revenue Tax
    - `setSolverFees()` with Referral Reward Tax, Platform Revenue Tax, and Platform Treasury Tax
    - `setDisputeDepositRate()` with Dispute Tax Amount
    - `setBulkReferralRate()` for referral rates based on tiers and layers
15. Tier Manager Tier Up Condition Setup
    - Set Conditions for Tiers 1 - 5, including values for each reference level
16. Tavern Review Period Setup
    - `setReviewPeriod()` with Review Period

