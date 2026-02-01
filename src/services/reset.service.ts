import type { ILogger } from "@xmer/consumer-shared";
import type {
	IGamesRepository,
	IResetService,
	ResetMessage,
	ResetServiceOptions,
} from "../types/index.js";

const SERVICE_TARGET = "discord-notifier";

export class ResetService implements IResetService {
	private readonly gamesRepository: IGamesRepository;
	private readonly logger: ILogger;

	constructor(options: ResetServiceOptions) {
		this.gamesRepository = options.gamesRepository;
		this.logger = options.logger.child({ component: "ResetService" });
	}

	async handleReset(message: ResetMessage): Promise<void> {
		const { source, target, reason } = message;

		// Skip if message targets a different service
		if (target && target !== SERVICE_TARGET && target !== "all") {
			this.logger.debug("Reset message not for this service, skipping", {
				source,
				target,
				expectedTarget: SERVICE_TARGET,
			});
			return;
		}

		this.logger.info("Processing reset request", {
			source,
			target: target ?? "all",
			reason,
		});

		const deletedCount = await this.gamesRepository.deleteAll();

		this.logger.info("Reset complete", {
			source,
			deletedCount,
			reason,
		});
	}
}
