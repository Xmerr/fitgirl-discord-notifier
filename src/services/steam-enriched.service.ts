import type { ILogger } from "@xmer/consumer-shared";
import type {
	IGamesRepository,
	ISteamEnrichedService,
	SteamEnrichedMessage,
	SteamEnrichedServiceOptions,
} from "../types/index.js";

export class SteamEnrichedService implements ISteamEnrichedService {
	private readonly gamesRepository: IGamesRepository;
	private readonly logger: ILogger;

	constructor(options: SteamEnrichedServiceOptions) {
		this.gamesRepository = options.gamesRepository;
		this.logger = options.logger.child({ component: "SteamEnrichedService" });
	}

	async handleEnriched(message: SteamEnrichedMessage): Promise<void> {
		this.logger.info("Processing steam enriched message", {
			gameId: message.gameId,
			steamFound: message.steam !== null,
		});

		await this.gamesRepository.updateSteamData(message.gameId, message.steam);

		this.logger.info("Steam data updated", {
			gameId: message.gameId,
		});
	}
}
