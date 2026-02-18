import { BaseConsumer, NonRetryableError } from "@xmer/consumer-shared";
import type { ConsumeMessage } from "amqplib";
import type {
	ISteamEnrichedService,
	SteamEnrichedConsumerOptions,
	SteamEnrichedMessage,
} from "../types/index.js";

export class SteamEnrichedConsumer extends BaseConsumer {
	private readonly steamEnrichedService: ISteamEnrichedService;

	constructor(options: SteamEnrichedConsumerOptions) {
		super(options);
		this.steamEnrichedService = options.steamEnrichedService;
	}

	protected async processMessage(
		content: Record<string, unknown>,
		_message: ConsumeMessage,
	): Promise<void> {
		const message = this.validateMessage(content);
		await this.steamEnrichedService.handleEnriched(message);
	}

	private validateMessage(
		content: Record<string, unknown>,
	): SteamEnrichedMessage {
		if (typeof content.gameId !== "number") {
			throw new NonRetryableError(
				"Invalid or missing gameId field",
				"ERR_INVALID_MESSAGE",
				{ gameId: content.gameId },
			);
		}

		if (
			typeof content.timestamp !== "string" ||
			content.timestamp.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing timestamp field",
				"ERR_INVALID_MESSAGE",
				{ timestamp: content.timestamp },
			);
		}

		return content as unknown as SteamEnrichedMessage;
	}
}
