import { BaseConsumer, NonRetryableError } from "@xmer/consumer-shared";
import type { ConsumeMessage } from "amqplib";
import type {
	DownloadProgressConsumerOptions,
	DownloadProgressMessage,
	IDownloadProgressService,
} from "../types/index.js";

const GAMES_CATEGORY = "games";

export class DownloadProgressConsumer extends BaseConsumer {
	private readonly downloadProgressService: IDownloadProgressService;

	constructor(options: DownloadProgressConsumerOptions) {
		super(options);
		this.downloadProgressService = options.downloadProgressService;
	}

	protected async processMessage(
		content: Record<string, unknown>,
		_message: ConsumeMessage,
	): Promise<void> {
		// Filter by category - only process games downloads
		if (content.category !== GAMES_CATEGORY) {
			return;
		}

		const message = this.validateMessage(content);
		await this.downloadProgressService.handleProgress(message);
	}

	private validateMessage(
		content: Record<string, unknown>,
	): DownloadProgressMessage {
		if (typeof content.hash !== "string" || content.hash.length === 0) {
			throw new NonRetryableError(
				"Invalid or missing hash field",
				"ERR_INVALID_MESSAGE",
				{ hash: content.hash },
			);
		}

		if (typeof content.name !== "string" || content.name.length === 0) {
			throw new NonRetryableError(
				"Invalid or missing name field",
				"ERR_INVALID_MESSAGE",
				{ name: content.name },
			);
		}

		if (typeof content.progress !== "number") {
			throw new NonRetryableError(
				"Invalid or missing progress field",
				"ERR_INVALID_MESSAGE",
				{ progress: content.progress },
			);
		}

		return content as unknown as DownloadProgressMessage;
	}
}
