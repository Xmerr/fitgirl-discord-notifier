import { BaseConsumer, NonRetryableError } from "@xmer/consumer-shared";
import type { ConsumeMessage } from "amqplib";
import type {
	DownloadCompleteConsumerOptions,
	DownloadCompleteMessage,
	IDownloadCompleteService,
} from "../types/index.js";

const GAMES_CATEGORY = "games";

export class DownloadCompleteConsumer extends BaseConsumer {
	private readonly downloadCompleteService: IDownloadCompleteService;

	constructor(options: DownloadCompleteConsumerOptions) {
		super(options);
		this.downloadCompleteService = options.downloadCompleteService;
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
		await this.downloadCompleteService.handleComplete(message);
	}

	private validateMessage(
		content: Record<string, unknown>,
	): DownloadCompleteMessage {
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

		if (
			typeof content.save_path !== "string" ||
			content.save_path.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing save_path field",
				"ERR_INVALID_MESSAGE",
				{ save_path: content.save_path },
			);
		}

		return content as unknown as DownloadCompleteMessage;
	}
}
