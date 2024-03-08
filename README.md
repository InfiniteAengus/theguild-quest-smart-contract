# The Guild contracts Repository

### Connect. Collaborate. Conquer.

## Contains contracts for:
- The Guild Referral System (Nexus, Rewarder, TaxManager, TierManager)
- User accounts(profiles) and referral handlers (one contract: ERC6551Account)
- NFT for profiles (ProfileNFT)
- Quest Factory (Tavern)
- Quest Implementation (Quest)
- Escrows for Quests (EscrowNative, EscrowToken)
- XpTokens for onchain reputation (XpToken)
- Canonical ERC6551Registry (ERC6551Registry)
- Interfaces for the above contracts

On-chain architecture can be found here:
https://www.figma.com/file/QWbX9rVXy4BEzbQDxC5sNa/The-Guild-Public?type=whiteboard&node-id=0-1&t=VPlS18CdOa9109NC-0

## Notation:

Referral - the identity that was referred.
Referrer - the identity that referred. 

Referrer referred the referral.
Referral was referred by referrer. 

### Admins for contracts
Contract/AdminName

Nexus/Master+Guardian

ProfileNFT/Counselor

Rewarder/Steward

TaxManager/Custodian

TierManager/Magistrate

XpToken/Owner

Tavern/Owner+Barkeeper



