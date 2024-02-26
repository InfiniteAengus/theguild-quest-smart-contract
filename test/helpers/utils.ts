import { ERC6551Registry } from "../../typechain-types";
import { AccountDetails } from "./types";
import { Signer } from "ethers";
import { Log, Interface } from "ethers";

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

// Searches a specific event name, and returns the parsed object
// Does not work when there are multiple events with the same name
// Returns an empty object if the event is not found
export function parseEventLogs(
    logs: Log[],
    contractInterface: Interface,
    eventName: string,
    keys: string[]
) {
    const eventLog = logs.find(
        (log) => contractInterface.parseLog(log as any)?.name === eventName
    );

    const parsedObject: any = {};

    if (eventLog) {
        const parsedLog = contractInterface.parseLog(eventLog as any);
        if (parsedLog) {
            for (let i = 0; i < keys.length; i++) {
                parsedObject[keys[i]] = parsedLog.args[i];
            }
        }
    }

    return parsedObject;
}
