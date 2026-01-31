import { BaseConsumer, NonRetryableError } from "@xmer/consumer-shared";
import type { ConsumeMessage } from "amqplib";
import type {
	IModalInteractionService,
	ModalInteractionConsumerOptions,
	ModalInteractionMessage,
} from "../types/index.js";

const FITGIRL_MODAL_PREFIX = "fitgirl_fixsteam_modal_";

export class ModalInteractionConsumer extends BaseConsumer {
	private readonly modalInteractionService: IModalInteractionService;

	constructor(options: ModalInteractionConsumerOptions) {
		super(options);
		this.modalInteractionService = options.modalInteractionService;
	}

	protected async processMessage(
		content: Record<string, unknown>,
		_message: ConsumeMessage,
	): Promise<void> {
		const customId = content.custom_id;
		if (
			typeof customId !== "string" ||
			!customId.startsWith(FITGIRL_MODAL_PREFIX)
		) {
			// Not a fitgirl modal, ignore silently
			return;
		}

		const message = this.validateMessage(content);
		await this.modalInteractionService.handleModalSubmission(message);
	}

	private validateMessage(
		content: Record<string, unknown>,
	): ModalInteractionMessage {
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
			typeof content.interaction_id !== "string" ||
			content.interaction_id.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing interaction_id field",
				"ERR_INVALID_MESSAGE",
				{ interaction_id: content.interaction_id },
			);
		}

		if (
			typeof content.interaction_token !== "string" ||
			content.interaction_token.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing interaction_token field",
				"ERR_INVALID_MESSAGE",
				{ interaction_token: content.interaction_token },
			);
		}

		if (
			typeof content.inputs !== "object" ||
			content.inputs === null ||
			Array.isArray(content.inputs)
		) {
			throw new NonRetryableError(
				"Invalid or missing inputs field",
				"ERR_INVALID_MESSAGE",
				{ inputs: content.inputs },
			);
		}

		const inputs = content.inputs as Record<string, unknown>;
		if (typeof inputs.steam_url !== "string" || inputs.steam_url.length === 0) {
			throw new NonRetryableError(
				"Invalid or missing steam_url in inputs",
				"ERR_INVALID_MESSAGE",
				{ inputs },
			);
		}

		return content as unknown as ModalInteractionMessage;
	}
}
