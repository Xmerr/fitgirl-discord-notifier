import { BaseConsumer, NonRetryableError } from "@xmer/consumer-shared";
import type { ConsumeMessage } from "amqplib";
import type {
	FitGirlRelease,
	IReleaseNewService,
	ReleaseNewConsumerOptions,
} from "../types/index.js";

export class ReleaseNewConsumer extends BaseConsumer {
	private readonly releaseNewService: IReleaseNewService;

	constructor(options: ReleaseNewConsumerOptions) {
		super(options);
		this.releaseNewService = options.releaseNewService;
	}

	protected async processMessage(
		content: Record<string, unknown>,
		_message: ConsumeMessage,
	): Promise<void> {
		const release = this.validateMessage(content);
		await this.releaseNewService.processRelease(release);
	}

	private validateMessage(content: Record<string, unknown>): FitGirlRelease {
		if (typeof content.guid !== "string" || content.guid.length === 0) {
			throw new NonRetryableError(
				"Invalid or missing guid field",
				"ERR_INVALID_MESSAGE",
				{ guid: content.guid },
			);
		}

		if (
			typeof content.game_name !== "string" ||
			content.game_name.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing game_name field",
				"ERR_INVALID_MESSAGE",
				{ game_name: content.game_name },
			);
		}

		if (
			typeof content.title_raw !== "string" ||
			content.title_raw.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing title_raw field",
				"ERR_INVALID_MESSAGE",
				{ title_raw: content.title_raw },
			);
		}

		if (
			typeof content.fitgirl_url !== "string" ||
			content.fitgirl_url.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing fitgirl_url field",
				"ERR_INVALID_MESSAGE",
				{ fitgirl_url: content.fitgirl_url },
			);
		}

		if (typeof content.pub_date !== "string" || content.pub_date.length === 0) {
			throw new NonRetryableError(
				"Invalid or missing pub_date field",
				"ERR_INVALID_MESSAGE",
				{ pub_date: content.pub_date },
			);
		}

		if (
			typeof content.size_original !== "string" ||
			content.size_original.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing size_original field",
				"ERR_INVALID_MESSAGE",
				{ size_original: content.size_original },
			);
		}

		if (
			typeof content.size_repack !== "string" ||
			content.size_repack.length === 0
		) {
			throw new NonRetryableError(
				"Invalid or missing size_repack field",
				"ERR_INVALID_MESSAGE",
				{ size_repack: content.size_repack },
			);
		}

		return content as unknown as FitGirlRelease;
	}
}
