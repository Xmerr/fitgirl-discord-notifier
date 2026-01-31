import { BaseConsumer, NonRetryableError } from "@xmer/consumer-shared";
import type { ConsumeMessage } from "amqplib";
import type {
	ButtonInteractionConsumerOptions,
	ButtonInteractionMessage,
	IButtonInteractionService,
} from "../types/index.js";

const FITGIRL_PREFIX = "fitgirl_";

export class ButtonInteractionConsumer extends BaseConsumer {
	private readonly buttonInteractionService: IButtonInteractionService;

	constructor(options: ButtonInteractionConsumerOptions) {
		super(options);
		this.buttonInteractionService = options.buttonInteractionService;
	}

	protected async processMessage(
		content: Record<string, unknown>,
		_message: ConsumeMessage,
	): Promise<void> {
		const customId = content.custom_id;
		if (typeof customId !== "string" || !customId.startsWith(FITGIRL_PREFIX)) {
			// Not a fitgirl button, ignore silently
			return;
		}

		const message = this.validateMessage(content);
		await this.buttonInteractionService.handleInteraction(message);
	}

	private validateMessage(
		content: Record<string, unknown>,
	): ButtonInteractionMessage {
		if (
			typeof content.custom_id !== "string" ||
			content.custom_id.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing custom_id field",
				"ERR_INVALID_MESSAGE",
				{ custom_id: content.custom_id },
			);
		}

		if (typeof content.user_id !== "string" || content.user_id.length === 0) {
			throw new NonRetryableError(
				"Invalid or missing user_id field",
				"ERR_INVALID_MESSAGE",
				{ user_id: content.user_id },
			);
		}

		if (
			typeof content.message_id !== "string" ||
			content.message_id.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing message_id field",
				"ERR_INVALID_MESSAGE",
				{ message_id: content.message_id },
			);
		}

		return content as unknown as ButtonInteractionMessage;
	}
}
