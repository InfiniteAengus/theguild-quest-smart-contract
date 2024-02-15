import { ERC6551Registry } from "../../typechain-types";
import { AccountDetails } from "./types";
import { Signer } from "ethers";

export async function createAndReturnRegistryAccount(
    createAccount: AccountDetails,
    registry: ERC6551Registry,
    signer: Signer
): Promise<string> {
    await registry
        .connect(signer)
        .createAccount(
            createAccount.implementation,
            createAccount.salt,
            createAccount.chainId,
            createAccount.tokenContract,
            createAccount.tokenId
        );

    return await registry.account(
        createAccount.implementation,
        createAccount.salt,
        createAccount.chainId,
        createAccount.tokenContract,
        createAccount.tokenId
    );
}
