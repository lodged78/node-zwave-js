import { CommandClass } from "@zwave-js/cc";
import { type Message } from "@zwave-js/serial";
import { ApplicationCommandRequest } from "./application/ApplicationCommandRequest";
import { BridgeApplicationCommandRequest } from "./application/BridgeApplicationCommandRequest";
import { type SendDataMessage, isSendData } from "./transport/SendDataShared";

export type CommandRequest =
	| ApplicationCommandRequest
	| BridgeApplicationCommandRequest;

export function isCommandRequest(
	msg: Message,
): msg is CommandRequest {
	return msg instanceof ApplicationCommandRequest
		|| msg instanceof BridgeApplicationCommandRequest;
}

export interface MessageWithCC {
	serializedCC: Buffer | undefined;
	command: CommandClass | undefined;
}

export function isMessageWithCC(
	msg: Message,
): msg is
	| SendDataMessage
	| CommandRequest
{
	return isSendData(msg) || isCommandRequest(msg);
}

export interface ContainsSerializedCC {
	serializedCC: Buffer;
}

export function containsSerializedCC<T extends object>(
	container: T | undefined,
): container is T & ContainsSerializedCC {
	return !!container
		&& "serializedCC" in container
		&& Buffer.isBuffer(container.serializedCC);
}

export interface ContainsCC<T extends CommandClass = CommandClass> {
	command: T;
}

export function containsCC<T extends object>(
	container: T | undefined,
): container is T & ContainsCC {
	return !!container
		&& "command" in container
		&& container.command instanceof CommandClass;
}